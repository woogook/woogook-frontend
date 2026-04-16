# 현직 지방의원 frontend/backend 로컬 확인 가이드

## 주요 독자

- `local-council` 화면을 브라우저에서 직접 확인해야 하는 개발자, QA, 리뷰어
- backend seed부터 frontend proxy 확인까지 한 번에 따라가야 하는 팀원

## 이 문서를 먼저 볼 상황

- `frontend-only sample mode`와 `backend-connected live mode`를 둘 다 수동으로 검증해야 할 때
- 주소 입력, roster, detail, proxy 응답까지 사람 기준으로 합격 여부를 판정해야 할 때
- Playwright 자동 회귀만 실행하면 되는 상황이면 [Playwright E2E 실행 가이드](./playwright-e2e.md)를 먼저 본다.

## 목적

- `woogook-frontend`의 `/local-council` 화면을 로컬에서 직접 확인한다.
- `woogook-backend`를 함께 띄워 frontend가 실제 backend 응답을 읽는 경로까지 점검한다.
- backend가 아직 준비되지 않았을 때는 frontend fallback 경로로 먼저 확인할 수 있게 한다.

## 먼저 알아둘 점

- 현재 제품 범위에서 주소 해석과 실제 backend read API는 `서울특별시 강동구`만 지원한다.
- frontend는 backend가 없거나 `WOOGOOK_BACKEND_BASE_URL`이 비어 있으면 강동구 샘플로 fallback한다.
- `npm run dev`와 문서 예시는 `.nvmrc`와 같은 `Node.js 24.14.1` 기준으로 맞춘다.
- Next.js 최소 요구사항은 `Node.js 20.9+`지만, 팀 작업 기준은 `.nvmrc`를 따른다.
- backend 실연동까지 보려면 `local-election` seed, `local_council_member_profile` seed, `local_council` projection seed가 모두 필요하다.
- 아래 예시는 `woogook-frontend`와 `woogook-backend`가 같은 부모 디렉터리 아래에 있다고 가정한다.

## 권장 검증 순서

- 먼저 `frontend-only sample mode`를 확인한다.
- 다음으로 `backend-connected live mode`를 확인한다.
- 마지막으로 `frontend proxy`와 `최종 수동 확인 체크리스트`를 훑어본다.
- 강동구 외 주소는 성공 경로로 보지 말고 제한 안내 또는 backend 404 경계로 본다.

## 준비물

- Node.js `.nvmrc` 기준 `24.14.1` + npm
- Docker + `docker compose`
- `uv`
- 브라우저

## 빠른 선택

1. 화면만 빨리 보려면: [1. frontend만 먼저 확인](#1-frontend만-먼저-확인)
2. frontend와 backend를 함께 붙여 보려면: [2. backend까지 함께 확인](#2-backend까지-함께-확인)

## 수동 합격 기준

### frontend-only sample mode

- 이 경로는 backend 없이도 끝까지 확인되는지 보는 절차다.

#### 주소 화면과 결과 화면

- 주소 화면
  - `/local-council` 주소 화면이 열리고 `서울 강동구 천호동` sample 버튼이 보인다.
- 결과 화면
  - 결과 화면 상단 배지가 `로컬 미리보기 데이터`다.
  - 안내 문구에 `backend 없이 frontend만 실행 중이라 강동구 샘플 데이터로 미리보기합니다.`가 보인다.
  - roster에 `구청장`, `구의원` 카드가 모두 보이고, detail까지 이동된다.

#### sample detail 핵심 확인

- 공통 detail
  - `요약 설명`, `근거 현황`, `품질 신호`, `출처 계약 점검`, `신선도 계보`, `spot-check`가 함께 보인다.
  - `의안` 카드에 `대표발의` 또는 동등 participation badge가 보인다.
  - `bill_summary`가 있으면 카드 본문에 `의안 내용` 1문장 요약이 보인다.
  - bill locator가 있으면 액션 버튼이 `의안 상세 열기`처럼 locator-aware 문구로 보인다.
  - `meeting_activity`가 `supported`가 아니면 `직접 발언 확인`처럼 읽히지 않고 `공식 기록 위치는 확보됐지만 발언 요약은 아직 승격하지 않음` 같은 보수적 문구가 보인다.
- 구청장 detail
  - `보강 정보` 구역이 보이고 `준비 완료` 상태와 1건 이상의 overlay item을 확인할 수 있다.
  - 개인 `meeting_activity` 카드가 비어 있고 `district_head_official_minutes` 한계를 설명하는 진단 문구가 보인다.
- 구의원 detail
  - `보강 정보`가 `준비 중` 또는 비어 있는 상태라도 공식 결정적 결과 구역은 그대로 동작해야 한다.
  - `person_key`는 opaque key 예시를 따른다.

#### 식별자 역추적

- sample에는 fallback형 opaque `person_key` 패턴(`seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640`)을 사용하고, live backend는 `huboid`형 opaque key도 내려줄 수 있다.
- 필요하면 `spot_check.huboid`와 `member_source_docid`를 함께 보고 실제 대상 인물을 역추적한다.

### backend-connected live mode

- 이 경로는 frontend가 실제 backend 응답을 받는지 보는 절차다.

#### API와 proxy 확인

- backend API
  - `/api/local-council/v1/resolve`, `/districts/11740/roster`, `/persons/{person_key}`가 backend에서 200을 반환한다.
- frontend Next proxy
  - `/api/local-council/v1/resolve`
  - `/api/local-council/v1/districts/{gu_code}/roster`
  - `/api/local-council/v1/persons/{person_key}`
  - 위 경로들이 backend 응답을 relay해야 한다.

#### 화면 확인

- 상단 상태
  - `/local-council` 화면 상단 배지가 `공식 근거 데이터`다.
  - fallback 안내 문구가 사라지고, live roster/detail이 보인다.
- 범위 가드
  - non-Gangdong 입력은 계속 제한 안내 또는 backend 404 경계 안에 머문다.

#### live detail 핵심 확인

- diagnostics와 freshness
  - diagnostics에 `publishable_degraded / unavailable / skipped`가 보일 수 있는데, model env가 없는 local smoke에서는 이를 UI failure로 보지 않는다.
  - `evidence`, `diagnostics.quality_signals`, `diagnostics.source_contract_summary`, `freshness.lineage/staleness_bucket/explanation`, `spot_check.huboid/member_source_docid`가 사람이 읽는 문장으로 보여야 한다.
- overlay와 활동 카드
  - `overlay.status/support_tier/generated_at/basis/sections/disclaimers`가 내려오면 `보강 정보` 구역으로 렌더링되고, `overlay.status == "unavailable"`여도 공식 상세 카드가 깨지면 안 된다.
  - `의안` 카드에서는 `participation_type`, `bill_stage`, `ordinance_status`, `bill_summary`, `official_record_locator`가 badge/상태/요약/액션 라벨로 읽히게 보여야 한다.
  - `meeting_activity` 카드에서는 `record_grounding_level`과 `content_grounding.status`가 분리된 badge로 보이고 `activity_summary_line`은 `supported`일 때만 본문처럼 노출돼야 한다.
  - 구청장 상세에서는 `district_head_official_minutes`가 개인 활동으로 승격되지 않고 diagnostics copy로 한계가 설명돼야 한다.

## 1. frontend만 먼저 확인

가장 빠른 확인 경로다. backend 없이도 `/local-council` 화면, roster, dossier 상세를 모두 볼 수 있다.

### 1-1. frontend 실행

```bash
cd woogook-frontend
test -f .env || cp .env.example .env
npm install
```

`WOOGOOK_BACKEND_BASE_URL`을 넣은 `.env`가 이미 있다면 잠시 비워 둔다. 이 값이 있으면 frontend가 backend 연결을 시도한다.
`.env.local`이 남아 있다면 먼저 값을 `/.env`로 옮기고 `.env.local`은 지운다.
기본 `node`가 `.nvmrc`와 다르면 먼저 `nvm use`처럼 저장소 기준 버전으로 맞춘다. 최소 요구사항만 맞추는 우회 실행보다 저장소 기본 버전을 우선한다.

```bash
npm run dev
```

브라우저에서 아래 주소를 연다.

- `http://127.0.0.1:3000/local-council`

### 1-2. 화면에서 확인할 것

#### 주소 입력 화면

- 상단 문구
  - 배지: `지방의원`
  - 제목: `우리동네 지방의원을 확인하세요`
  - 버튼: `지방의원 확인하기`
- 샘플 주소
  - 샘플 버튼 `서울 강동구 천호동`을 누르거나 직접 같은 값을 선택한다.

#### 결과 화면

- 상단 상태
  - 상단 데이터 소스 배지가 `로컬 미리보기 데이터`다.
  - 안내 문구에 `backend 없이 frontend만 실행 중이라 강동구 샘플 데이터로 미리보기합니다.`가 보인다.
- roster
  - `구청장`, `구의원` 카드가 모두 보인다.

#### detail 화면

- 이동
  - 인물을 클릭해 dossier 상세로 이동한다.
- 확인 항목
  - `요약 설명`
  - `근거 현황`
  - `품질 신호`
  - `출처 계약 점검`
  - `신선도 계보`
  - `spot-check`
  - `보강 정보`

### 1-3. 여기서 막히면 먼저 볼 것

- 샘플 JSON 검증:

```bash
npm run test:local-council-samples
```

- fallback/client/proxy/detail 회귀 검증:

```bash
npx --yes tsx --test tests/local_council_api_client.test.ts tests/local_council_proxy.test.ts tests/local_council_detail.test.ts
```

- fallback은 `서울특별시 / 강동구` 조합에서만 동작한다. 다른 구를 선택하면 `현재 로컬 미리보기는 서울특별시 강동구만 준비되어 있습니다.`가 보일 수 있다.

## 2. backend까지 함께 확인

이 경로는 frontend가 `local_sample`이 아니라 실제 backend 응답을 읽는지 확인하는 절차다.

### 여기서 목표

- frontend proxy가 `resolve`, `roster`, `persons/{person_key}` 응답을 그대로 relay하는지 확인한다.
- sample fallback이 아니라 live payload를 화면에 보여 주는지 확인한다.
- overlay가 있어도 공식 상세 카드가 깨지지 않는지 확인한다.

## 2-1. backend 기본 기동

```bash
cd ../woogook-backend
test -f .env || cp .env.example .env
uv sync
docker compose up -d postgres api
docker compose exec api /bin/sh -lc "python -m alembic upgrade head"
```

헬스체크:

```bash
curl http://127.0.0.1:8000/health
```

기대 결과:

```json
{"status":"ok","database":"ok"}
```

### 2-2. DB URL을 호스트 터미널에도 맞춘다

host에서 `uv run woogook-seed ...`를 실행할 때는 container 내부 주소가 아니라 호스트 주소를 써야 한다.

```bash
export WOOGOOK_DATABASE_URL='postgresql+psycopg://woogook:woogook@127.0.0.1:5433/woogook'
```

주의:

- `.env` 안의 `WOOGOOK_DATABASE_URL` 기본값은 `postgres:5432`여도 된다.
- 그 값은 `docker compose`로 띄운 `api` 컨테이너가 사용한다.
- 위 `export`는 현재 셸에서 host-side seed 명령만 위해 덮어쓰는 값이다.

## 2-3. local-election 기본 seed를 먼저 넣는다

`basic_head` projection은 `local_election_candidacy.member_id`를 참조하므로 이 단계가 먼저 필요하다.

```bash
uv run woogook-seed seed-local-election-contests
uv run woogook-seed seed-local-election-candidates
```

## 2-4. 강동구의회 member profile seed를 넣는다

`basic_council` projection은 `local_council_member_profile.member_id`를 참조하므로 이 단계가 먼저 필요하다.

```bash
bash scripts/local_council_member/국회도서관/지방의정포털/collect/seoul_overnight_run.sh \
  --council-slug 서울_강동구의회_002003

uv run python scripts/local_council_member/국회도서관/지방의정포털/transform/build_member_data_dirs.py \
  --council-slug 서울_강동구의회_002003

uv run woogook-seed seed-local-council-members \
  --council-slug 서울_강동구의회_002003
```

메모:

- 첫 명령은 `CLIK_OPENAPI_KEY` 또는 `CLIK_OPENAPI_KEYS`가 준비돼 있어야 한다.
- 이미 같은 `council_slug` 결과가 있으면 수집기가 skip할 수 있다.

## 2-5. 강동구 district source latest를 준비한다

아래 다섯 source는 fixture 기반으로 재현할 수 있다.

```bash
uv run python scripts/local_council_member/district_source_pipeline/collect/collect_nec_current_holder.py \
  --district seoul-gangdong \
  --raw-snapshot tests/fixtures/local_council_member/fixtures/gangdong_pipeline/nec_current_holder/response_latest.json

uv run python scripts/local_council_member/district_source_pipeline/collect/collect_nec_council_elected_basis.py \
  --district seoul-gangdong \
  --raw-snapshot tests/fixtures/local_council_member/fixtures/gangdong_pipeline/nec_council_elected_basis

uv run python scripts/local_council_member/district_source_pipeline/collect/collect_local_finance_365.py \
  --district seoul-gangdong \
  --raw-snapshot tests/fixtures/local_council_member/fixtures/gangdong_pipeline/local_finance_365/response_latest.json

uv run python scripts/local_council_member/district_source_pipeline/collect/collect_gangdong_district_head_official_profile.py \
  --district seoul-gangdong \
  --raw-snapshot tests/fixtures/local_council_member/fixtures/gangdong_pipeline/gangdong_district_head_official_profile

uv run python scripts/local_council_member/district_source_pipeline/collect/collect_gangdong_council_official_activity.py \
  --district seoul-gangdong \
  --raw-snapshot tests/fixtures/local_council_member/fixtures/gangdong_pipeline/gangdong_council_official_activity
```

`local_council_portal_members`는 현재 fixture latest가 저장소에 커밋돼 있지 않다. 둘 중 하나를 선택한다.

#### 선택지 A. 처음 세팅이면 실데이터 수집

```bash
uv run python scripts/local_council_member/district_source_pipeline/collect/collect_local_council_portal_members.py \
  --district seoul-gangdong
```

#### 선택지 B. 이미 canonical latest가 있으면 재사용

```bash
uv run python scripts/local_council_member/district_source_pipeline/collect/collect_local_council_portal_members.py \
  --district seoul-gangdong \
  --skip-portal-collect
```

`response_latest.json`이 생겼는지 확인한다.

```bash
ls -lah data/local_council_member/district_source_pipeline/seoul-gangdong/latest/local_council_portal_members
```

## 2-6. projection bundle을 만들고 seed한다

bundle 생성:

```bash
PYTHONPATH=. uv run python - <<'PY'
from app.core.paths import build_backend_paths
from pathlib import Path
from scripts.local_council_member.district_source_pipeline.build.build_projection_bundle import build_local_council_projection_bundle

paths = build_backend_paths(Path.cwd())
result = build_local_council_projection_bundle(
    district_slug="seoul-gangdong",
    output_root=paths.local_council_member.district_source_pipeline_root,
)
print(result["bundle_run_id"])
print(result["paths"]["bundle_manifest_path"])
PY
```

projection seed:

```bash
uv run python -m app.seed.cli seed-local-council-projections \
  --district seoul-gangdong
```

## 2-7. backend API를 직접 확인한다

주소 resolve:

```bash
curl 'http://127.0.0.1:8000/api/local-council/v1/resolve?address=서울특별시%20강동구%20천호동%20123'
```

roster:

```bash
curl 'http://127.0.0.1:8000/api/local-council/v1/districts/11740/roster'
```

구청장 dossier:

```bash
curl 'http://127.0.0.1:8000/api/local-council/v1/persons/seoul-gangdong%3Adistrict-head'
```

기대 결과:

- `resolve` 응답에 `resolution_status: "resolved"`
- `district.gu_code == "11740"`
- `roster.district_head`와 `roster.council_members`가 채워짐
- `persons/seoul-gangdong%3Adistrict-head` 응답에 `summary`, `evidence`, `diagnostics`, `spot_check`, `official_profile`, `bills`, `meeting_activity`, `finance_activity`, `elected_basis`, `source_refs`, `freshness`, `overlay`가 존재함
- 출처 계약 요약은 기본적으로 `diagnostics.source_contract_summary`에서 확인함

## 2-8. frontend를 backend에 연결한다

이제 다시 frontend 저장소로 돌아간다.

```bash
cd ../woogook-frontend
npm install
```

루트 `/.env`를 만들거나 수정해 아래 값을 넣는다.

```dotenv
WOOGOOK_BACKEND_BASE_URL=http://127.0.0.1:8000
```

frontend 실행:

```bash
npm run dev
```

브라우저에서 아래 주소를 연다.

- `http://127.0.0.1:3000/local-council`

확인 순서:

#### roster 진입

- `서울 강동구 천호동` 샘플을 선택한다.
- resolve가 성공하면 상단 배지가 `공식 근거 데이터`인지 본다.
- `backend 없이 frontend만 실행 중이라 ...` 안내 문구가 더 이상 보이지 않는지 본다.

#### detail 진입 후 확인

- 구청장 또는 구의원 카드를 눌러 상세로 들어간다.
- 상세에서 `근거 요약`, `설명 가능한 진단`, `당선 근거`, `출처`, `보강 정보`가 보이는지 확인한다.
- 구청장 상세에서 district-head payload에 overlay item이 있으면 `원문 보기`, `신뢰 높음`, `허용 소스`가 함께 보이는지 확인한다.
- 구의원 상세에서는 `보강 정보`가 `준비 중`이어도 기존 `근거 요약`, `설명 가능한 진단`, 세부 섹션이 그대로 보이는지 확인한다.

## 2-9. frontend proxy 경로를 직접 확인한다

frontend가 backend 직접 호출이 아니라 Next proxy를 경유하는지 따로 확인한다.

frontend resolve proxy:

```bash
curl 'http://127.0.0.1:3000/api/local-council/v1/resolve?address=서울특별시%20강동구%20천호동%20123'
```

frontend person proxy:

```bash
curl 'http://127.0.0.1:3000/api/local-council/v1/persons/seoul-gangdong%3Adistrict-head'
```

frontend roster proxy:

```bash
curl 'http://127.0.0.1:3000/api/local-council/v1/districts/11740/roster'
```

기대 결과:

- 세 요청 모두 200이다.
- resolve proxy 응답의 `district.gu_code == "11740"`다.
- roster proxy 응답에 `district_head.person_key`와 `council_members[*].person_key`가 존재한다.
- person proxy 응답에 `summary`, `evidence`, `diagnostics`, `spot_check`, `source_refs`, `freshness`가 존재한다.
- person proxy에서 출처 계약 요약은 기본적으로 `diagnostics.source_contract_summary` 아래에서 확인한다.
- person proxy 응답에 `overlay.status`, `overlay.support_tier`, `overlay.basis`, `overlay.sections`, `overlay.disclaimers` shape가 그대로 relay된다.
- backend live payload가 degraded 상태여도 proxy 자체는 shape를 보존해 전달한다.

## 2-10. 최종 수동 확인 체크리스트

#### mode별 확인

- frontend-only sample mode에서 `로컬 미리보기 데이터` 배지와 fallback 안내 문구를 확인했다.
- backend-connected live mode에서 `공식 근거 데이터` 배지와 live roster/detail을 확인했다.

#### API와 범위 가드

- backend API와 frontend proxy API가 모두 강동구 resolve/roster/person 요청에 200을 반환했다.
- 강동구 외 입력은 제한 안내 또는 backend 404 경계 안에 머문다.

#### detail 렌더링

- detail 화면에서 `summary`, `evidence`, `diagnostics`, `freshness`, `diagnostics.source_contract_summary`, `source_refs`가 렌더링된다.
- detail 화면에서 `overlay`가 있으면 `보강 정보` 구역이 렌더링되고, `overlay`가 비어 있거나 `unavailable`이어도 deterministic core는 그대로 렌더링된다.
- model env가 없는 live backend라면 `publishable_degraded / unavailable / skipped` 조합을 UI failure로 보지 않는다.

## 자주 걸리는 지점

- frontend에 `WOOGOOK_BACKEND_BASE_URL`이 없으면 backend가 켜져 있어도 fallback으로 동작한다.
- frontend `/.env`에 `WOOGOOK_BACKEND_BASE_URL=http://localhost:8000`를 넣어도 보통 동작하지만, 문서와 curl 예시는 모두 `127.0.0.1`로 통일한다.
- `seed-local-council-projections`가 실패하면 보통 아래 둘 중 하나다.
  - `seed-local-election-candidates`가 아직 안 들어가 `basic_head` member_id를 못 찾음
  - `seed-local-council-members --council-slug 서울_강동구의회_002003`가 아직 안 들어가 `basic_council` member_id를 못 찾음
- `local_council_portal_members` latest가 없으면 projection bundle이 완성되지 않는다.
- 현재 제품 범위상 `강동구` 외 주소는 backend에서도 404가 정상일 수 있다.

## 더 자세한 backend 정본 문서

- `../woogook-backend/docs/evidence/RUNBOOK.md`
- `../woogook-backend/docs/db/db-setting-guide.md`
- `../woogook-backend/docs/지방의원/canonical/gangdong-local-council-vertical-slice-validation-runbook.md`
