# 국회 공약(Assembly) HTTP API 초안 — 스펙 회의용

> **상태:** 초안 (Draft)  
> **목적:** 프론트 `/assembly` 플로우와 DB 공약 테이블 스키마를 맞춘 **GET 중심** API 계약 초안.  
> **DB 정렬:** 공약 원장 테이블 컬럼명 기준 — 식별자는 `**mona_cd`**, 광역은 `**region**`, 의원명은 `**member_name**`, 정당은 `**party_name**`.

---

## 1. 참조: 공약 테이블(원장) 컬럼

수집·크롤 기준 행 예시와 동일한 의미를 API에서도 유지한다.


| 컬럼                                          | 예시              | 설명                                                         |
| ------------------------------------------- | --------------- | ---------------------------------------------------------- |
| `id`                                        | `6394`          | 테이블 내부 PK (API에서는 원칙적으로 노출 최소화 가능)                         |
| `promise_id`                                | `A494529E-0001` | 공약 단위 고유 ID                                                |
| `mona_cd`                                   | `A494529E`      | **국회의원 식별 코드** — API 경로·쿼리의 **의원 키는 `mona_cd` 사용**         |
| `member_name`                               | `천준호`           | 의원 이름                                                      |
| `region`                                    | `서울특별시`         | 시·도 (프론트에서 과거에 부르던 `city` 대신 `**region`**)                 |
| `district`                                  | `강북구갑`          | 선거구/지역구 표기 (구 이름만이 아닐 수 있음, 예: `강북구갑`)                     |
| `section_title`                             | `강북구갑 공통·종합 공약` | 공약 섹션 제목                                                   |
| `promise_text`                              | `더 빠르고 편리하게...` | 공약 본문                                                      |
| `item_index`                                | `1`             | 항목 순번                                                      |
| `party_name`                                | `더불어민주당`        | 정당명 — API 필드명 `**party_name**` 권장 (`party` 단독 명칭은 사용하지 않음) |
| `source_url`, `collected_at`, `source_hash` | —               | 출처·수집 메타                                                   |
| `created_at`, `updated_at`                  | —               | 감사용 타임스탬프                                                  |


**표시용 `display_label` (DB에 없음 — API에서 조합)**  

- **구현 합의:** `"{district} · {member_name}"` (중간 구분 ` · `).  
- API A 응답 `items[].display_label`에 위 규칙으로 채움.

---

## 2. 공통 규칙

- **메서드:** 조회 위주 `**GET`** (목록·요약·카테고리 상세).
- **의원 식별자:** 경로·쿼리 모두 `**mona_cd`** (기존 초안의 `member_id` **사용 안 함**).
- **광역 지역:** 쿼리 파라미터 이름 `**region`** (값 예: `서울특별시`). 기존 초안의 `city` **사용 안 함**.
- **정당·이름:** 응답 JSON 키는 DB와 맞춰 `**member_name`**, `**party_name**`.
- **카테고리 라벨:** 백엔드 `routing_llm_gate._POLICY_CATEGORY_LABELS` 문자열과 **동일**하게 맞출 것 (프론트 `ASSEMBLY_PLEDGE_CATEGORY_LABELS`와 일치).
- **시간대:** ISO 8601, 가능하면 `+09:00` 명시 (API A `meta`에는 시각 필드 없음).

---

## 3. API A — 구·선거구 단위 국회의원 목록

**목적:** `AssemblyPledgeForm`의 「국회의원 선택」 옵션 채우기.

**구현 메모 (백엔드 조율 반영)**  

- **데이터 원천:** `public.assembly_promise_item`. 동일 `mona_cd`당 1행만 목록에 포함(PostgreSQL `DISTINCT ON (mona_cd)`).  
- **필터:** `region`은 **동등 비교**, `district` 쿼리 값은 **접두 일치**로 매칭 — SQL `district LIKE :prefix || '%'` (예: `송파구` → `송파구갑`, `송파구을` 포함).  
- **광역 `region` 화이트리스트:** 백엔드에서 강제하지 않음. 프론트는 당분간 `서울특별시`만 보낸다는 가정. 전국 확대 시 서버 검증·허용 목록을 추가할 수 있음.  
- **결과 없음:** `200`, `items: []`. (매칭 행이 없을 때 404 아님.)  
- **합선거구·행정구 표기:** `중구성동구갑` 등은 시군구 UI에서 묶음 항목으로 보여 주고, API에 넘기는 `district` 접두만 DB 문자열과 맞추면 됨(별도 백엔드 OR 분기 없음).

### `GET /api/assembly/v1/members`

**상태: 구현 완료** (백엔드 API + 프론트 `/assembly` 랜딩 폼 연동 검증됨.)

- **백엔드:** `woogook-backend` — `GET /api/assembly/v1/members` (Repository·Service·스키마).
- **프론트:** 동일 출처 `GET /api/assembly/v1/members` — `src/app/api/assembly/v1/members/route.ts` 가 `WOOGOOK_BACKEND_BASE_URL` 로 프록시. `src/lib/api-client.ts` 의 `fetchAssemblyMembers` / `assemblyMembersQueryOptions`, `AssemblyPledgeForm` 에서 시군구 선택 후 의원 목록 표시. 제출 시 `/assembly/pledge?city=…&sigungu=…&mona_cd=…` (쿼리 키 `mona_cd` — `assemblyPledgeQuery.assemblyPledgeContextParams`).

| Query      | 필수 | 설명 |
| ---------- | --- | --- |
| `region`   | 예  | 시·도 문자열. 예: `서울특별시` |
| `district` | 예  | `assembly_promise_item.district`에 대한 **접두**로 사용. 예: `송파구`(→ 갑/을 모두 후보), `중구성동구`(합선거구 묶음 시) |

프론트 지역 API(`GET /api/regions/sigungu?city=...`)의 **라벨**과 쿼리 `district` 문자열이 1:1이 아닐 수 있음 — 선택 값만 DB 접두와 일치시키면 됨.


**요청 예시**

```http
GET /api/assembly/v1/members?region=%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C&district=%EC%86%A1%ED%8C%8C%EA%B5%AC
```

**응답 `200` — body 예시**

```json
{
  "meta": {
    "region": "서울특별시",
    "district": "송파구"
  },
  "items": [
    {
      "mona_cd": "A494529E",
      "member_name": "홍길동",
      "party_name": "국민의힘",
      "region": "서울특별시",
      "district": "송파구갑",
      "display_label": "송파구갑 · 홍길동"
    },
    {
      "mona_cd": "B1234567",
      "member_name": "김영희",
      "party_name": "더불어민주당",
      "region": "서울특별시",
      "district": "송파구을",
      "display_label": "송파구을 · 김영희"
    }
  ]
}
```

- `meta`에는 시각 필드(`as_of`) 없음.  
- `display_label`은 DB 컬럼이 아니라 서버 조합 문자열(위 1절 규칙과 동일).

---

## 4. API B — 의원 요약 + 전체·카테고리별 이행률

**목적:** `/assembly/pledge` (프로필, 전체 %, 카테고리별 %).

### `GET /api/assembly/v1/members/{mona_cd}/pledge-summary`

**경로 파라미터**


| 이름        | 설명                    |
| --------- | --------------------- |
| `mona_cd` | 공약 테이블의 `mona_cd`와 동일 |


**요청 예시**

```http
GET /api/assembly/v1/members/A494529E/pledge-summary
```

**응답 `200` — body 예시**

```json
{
  "member": {
    "mona_cd": "A494529E",
    "member_name": "천준호",
    "party_name": "더불어민주당",
    "region": "서울특별시",
    "district": "강북구갑",
    "photo_url": null
  },
  "fulfillment": {
    "overall_rate_percent": 52,
    "overall_rate_display": "52%",
    "categories": [
      {
        "category_label": "경제·산업·재정",
        "rate_percent": 58,
        "rate_display": "58%"
      },
      {
        "category_label": "노동·일자리·기업활력",
        "rate_percent": 44,
        "rate_display": "44%"
      }
    ]
  },
  "meta": {
    "data_source": "공약 평가 파이프라인"
  }
}
```

- `categories` 배열은 **정책 카테고리 8개 전부**를 내려줄지, 부분만 내려줄지는 백엔드·제품 합의.

### (선택) 쿼리만으로 식별

`mona_cd`를 모를 때만 사용. DB 스키마와의 일치를 위해 `**region` + `district` 조합** 권장.

```http
GET /api/assembly/v1/pledge-summary?region=%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C&district=%EA%B0%95%EB%B6%81%EA%B5%AC%EA%B0%91
```

응답 형식은 위 `pledge-summary`와 동일.

---

## 5. API C — 카테고리별 공약 TOP N (상태 + 판단 근거)

**목적:** `/assembly/pledge/category` — 이행 평가 상위 공약 목록.

### `GET /api/assembly/v1/members/{mona_cd}/pledges`


| Query      | 필수  | 설명                                      |
| ---------- | --- | --------------------------------------- |
| `category` | 예   | URL 인코딩된 **정책 카테고리 라벨** (예: `경제·산업·재정`) |
| `limit`    | 선택  | 기본 `5`, 상한은 팀 정책                        |


**요청 예시**

```http
GET /api/assembly/v1/members/A494529E/pledges?category=%EA%B2%BD%EC%A0%9C%C2%B7%EC%82%B0%EC%97%85%C2%B7%EC%9E%AC%EC%A0%95&limit=5
```

**응답 `200` — body 예시**

```json
{
  "mona_cd": "A494529E",
  "category_label": "경제·산업·재정",
  "limit": 5,
  "items": [
    {
      "rank": 1,
      "promise_id": "A494529E-0001",
      "promise_text": "더 빠르고 편리하게 도시철도 신강북선 추진!",
      "status": "진행중",
      "rationale_lines": [
        "국회 회의록 키워드 매칭 결과 관련 안건이 심의됨.",
        "예산안 대조 시 동일 정책 분야 편성이 확인됨."
      ],
      "confidence": 0.85,
      "updated_at": "2026-03-30T09:00:00+09:00"
    }
  ],
  "meta": {
    "total_in_category": 42
  }
}
```

- `status`: `미착수`, `진행중`, `완료` 중 하나 (프론트 `PledgeProgressBadge` enum과 동일 권장).
- `promise_id`는 공약 테이블의 `promise_id`와 동일.

---

## 6. 에러 응답 (예시)

```json
{
  "error": "member_not_found",
  "message": "mona_cd에 해당하는 의원을 찾을 수 없습니다.",
  "mona_cd": "UNKNOWN"
}
```

```json
{
  "error": "invalid_category",
  "message": "허용되지 않은 category_label 입니다."
}
```

---

## 7. 프론트·DB 간 매핑 메모

1. **시군구 목록**은 `GET /api/regions/sigungu?city=서울특별시` 등으로 쓰고, **의원 목록**은 API A로 조회. `district` 쿼리는 **LIKE 접두**이므로, 행정구명만 보내도 갑·을이 함께 걸릴 수 있음(예: `송파구%`). 합선거구는 UI에서 항목을 묶어 표시하고, API A에 넘기는 `district`만 원장 문자열 접두와 맞춤.
2. **`display_label`** 은 DB 컬럼 없음 — API A에서 `district · member_name` 형태로 조합.
3. 이행률·카테고리·상태(API B/C)는 **별 파이프라인/테이블** 전제 — 본 문서 API A는 **공약 원장만**으로 구현.

---

## 8. 변경 이력


| 날짜         | 내용                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------- |
| 2026-03-31 | 초안: `member_id`→`mona_cd`, `city`→`region`, `name`/`party`→`member_name`/`party_name`, 공약 테이블 컬럼 정렬 |
| 2026-03-31 | API A 구현 조율: `district` 접두 LIKE, 원장 `DISTINCT ON (mona_cd)`, `meta`에 `as_of` 없음, 광역 화이트리스트 비강제·빈 목록 200, `display_label` 단일 규칙, §7 매핑 정리 |
| 2026-03-31 | **API A 구현 완료** — 백엔드 엔드포인트·프론트 프록시·`AssemblyPledgeForm` 연동·URL `mona_cd` 반영. API B/C는 미구현(문서 초안 유지). |


