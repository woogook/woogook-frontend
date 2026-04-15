# 국회의원·지방의원 observability direct LLM 분석 설계

- 작성일: `2026-04-15`
- 소유 도메인: `common`
- 상태: `draft`
- 관련 문서:
  - [2026-04-12-frontend-observability-design.md](./2026-04-12-frontend-observability-design.md)
  - [2026-04-12-frontend-observability-local-stack-design.md](./2026-04-12-frontend-observability-local-stack-design.md)
  - [frontend-observability-local-runbook.md](../../common/runbooks/frontend-observability-local-runbook.md)
  - [vercel-deployment-runbook.md](../../common/runbooks/vercel-deployment-runbook.md)

## 배경

`woogook-frontend`는 이미 frontend observability `Phase A` 수준의 기반을 갖고 있다.

- 브라우저/서버/analyzer 공통 observability event envelope
- local NDJSON file 적재
- Loki push / query 연계
- Prometheus metrics endpoint
- Grafana local stack
- Discord alert 및 analyzer webhook route

하지만 현재 구현은 아래 한계를 가진다.

1. observability 적용 범위가 모든 도메인에 고르게 확장돼 있지 않다.
2. analyzer는 generic webhook 호출 구조만 있고, 저장소 안에서 직접 특정 LLM provider를 호출하지 않는다.
3. `Grafana alert -> analyzer -> LLM 해설 -> Discord 도착` 경로가 로컬 기준으로 닫혀 있지 않다.

또한 이번 작업 중 `local-election` 도메인은 다른 세션에서 병행 수정이 진행 중이다. 따라서 이번 세션은 코드 충돌을 피하기 위해 `assembly`와 `local-council`만 수정 대상으로 삼고, `local-election observability` 확장은 후속 작업으로 분리한다.

## 목표

- `assembly`와 `local-council` 도메인의 핵심 API route에 공통 observability를 확장한다.
- `Grafana` error alert가 analyzer route로 자동 전달되게 한다.
- analyzer가 `Upstage Solar Pro 2`를 저장소 내부에서 직접 호출해 incident summary를 보강하게 한다.
- analyzer가 최종 summary를 `Discord` message로 전송하게 한다.
- 동일 incident의 과도한 재분석과 self-alert loop를 방지한다.
- 이후 `relay` 방식으로 이관하거나 provider를 교체하기 쉬운 adapter 경계를 마련한다.

## 비목표

- 이번 세션에서 `local-election` 도메인 코드를 수정하지 않는다.
- 이번 세션에서 preview/production 배포 검증까지 완료하려 하지 않는다.
- analyzer 전용 별도 서비스나 worker를 새로 만들지 않는다.
- 운영용 장기 저장, HA, 멀티테넌트, 비용 최적화까지 이번 범위에 포함하지 않는다.
- `Grafana -> Discord direct alert`와 `LLM 보강 Discord alert`를 동시에 운영 기본 경로로 유지하지 않는다.

## 범위

### 이번 세션 구현 범위

- `assembly`
  - 의원 목록/상세/공약/공약 요약 관련 API route observability 확장
- `local-council`
  - 주소 resolve, roster, person detail 관련 API route 및 proxy observability 확장
- `common`
  - analyzer alert filtering
  - incident key 및 cooldown
  - `Upstage Solar Pro 2` direct provider adapter
  - analyzer -> Discord 최종 전송
  - runbook 및 env 문서화

### 후속 작업으로 남기는 범위

- `local-election` observability 확장
- direct provider 호출을 `relay` 기반 구조로 이관
- 운영 환경에서의 webhook/secret 관리 정교화
- alert rule profile의 운영값 재튜닝

## 선택지 비교

### 선택지 A. 기존 generic LLM webhook 구조 유지

- 장점:
  - frontend 저장소가 provider-agnostic 상태를 유지한다.
  - 추후 provider 교체 시 frontend 변경이 적다.
- 단점:
  - 이번 세션 목표인 저장소 기준 end-to-end 검증을 닫기 어렵다.
  - 별도 relay 또는 backend 의존성이 생긴다.
  - 디버깅 지점이 하나 더 늘어난다.

### 선택지 B. frontend analyzer가 `Upstage Solar Pro 2`를 직접 호출한다

- 장점:
  - 이번 세션에서 로컬 기준 `alert -> analyzer -> LLM -> Discord`를 닫을 수 있다.
  - 구성 요소 수가 적어 검증이 쉽다.
  - direct 호출이지만 adapter로 분리하면 이후 relay 이관이 가능하다.
- 단점:
  - provider API 형식과 auth 처리가 frontend 저장소에 들어온다.
  - secret, timeout, parsing 정책을 저장소 내부에서 책임져야 한다.

### 선택지 C. `woogook-backend`에 relay endpoint를 새로 만든다

- 장점:
  - 장기적으로 provider 관리 책임을 backend 쪽으로 모을 수 있다.
  - frontend analyzer는 더 얇아진다.
- 단점:
  - 이번 세션 범위를 벗어난다.
  - 별도 저장소 변경과 검증이 필요하다.
  - 현재 병행 세션과 무관하게 작업 범위가 커진다.

## 채택안

이번 작업에서는 `선택지 B`를 채택한다.

- analyzer는 이번 세션에서 `Upstage Solar Pro 2`를 직접 호출한다.
- 단, analyzer 내부는 provider adapter 구조로 분리한다.
- `relay` 방식은 후속 구조 개선으로 명시적으로 기록하고, env와 interface를 그 이행이 가능하도록 설계한다.

## 설계 원칙

1. 도메인마다 observability 구현을 따로 만들지 않고, route 이름과 label만 다르게 하며 공통 pipeline을 쓴다.
2. 사람 개입을 최소화하기 위해 alert 대상은 기본적으로 자동 포함하되, 예외를 명시적으로 제외하는 정책을 쓴다.
3. 동일 incident에 대한 중복 분석과 self-loop는 반드시 막는다.
4. LLM 호출 실패가 Discord alert 누락으로 이어지지 않도록 deterministic fallback summary를 유지한다.
5. 이번 세션의 도메인 범위는 `assembly`, `local-council`로 제한하고 `local-election`은 건드리지 않는다.
6. direct 호출 구현이라도 provider adapter와 mode env를 두어 relay 이행 비용을 낮춘다.

## 제안 아키텍처

### 전체 흐름

1. 브라우저 이벤트와 server/proxy 이벤트가 기존 observability pipeline으로 수집된다.
2. `assembly`와 `local-council`의 핵심 API route가 `observeRoute` 및 공통 backend proxy를 사용해 structured event를 남긴다.
3. `Prometheus` metrics와 `Loki` log를 바탕으로 `Grafana`가 error alert를 발화한다.
4. analyzer 대상 alert는 `Discord`로 직접 가지 않고 `/api/observability/analyzer` webhook으로 먼저 전달된다.
5. analyzer는 incident key를 만들고 recent event를 local file 또는 `Loki`에서 수집한다.
6. analyzer는 deterministic baseline summary를 만든 뒤 provider adapter를 통해 `Upstage Solar Pro 2`를 호출한다.
7. LLM 응답이 유효하면 baseline summary와 병합해 최종 incident summary를 만든다.
8. analyzer는 최종 summary를 `Discord` webhook으로 전송하고, `analysis_result` event를 저장한다.

### 계층별 책임

- 수집 계층:
  - route/proxy observability
  - browser/server/proxy event 생성
- alert 계층:
  - `Grafana` rule과 notification policy
- 분석 계층:
  - alert filtering
  - recent event retrieval
  - baseline summary
  - cooldown
  - provider adapter
- 알림 계층:
  - analyzer -> `Discord`
- 정책 계층:
  - self-alert 제외
  - 중복 분석 억제
  - provider fallback

## 도메인 적용 범위

### `assembly`

이번 세션에서 아래 경로는 공통 observability contract에 맞춘다.

- `GET /api/assembly/v1/members`
- `GET /api/assembly/v1/members/[mona_cd]/card`
- `GET /api/assembly/v1/members/[mona_cd]/pledges`
- `GET /api/assembly/v1/members/[mona_cd]/pledge-summary`

적용 결과:

- route별 request metric
- correlation id propagation
- backend proxy latency/status logging
- backend base URL 누락/요청 실패 시 structured error logging

### `local-council`

이번 세션에서 아래 경로는 공통 observability contract에 맞춘다.

- `GET /api/local-council/v1/resolve`
- `GET /api/local-council/v1/districts/[guCode]/roster`
- `GET /api/local-council/v1/persons/[personKey]`

현재 남아 있는 `console.error` 중심 proxy 경로를 공통 backend proxy 흐름으로 정리한다.

### `local-election`

이번 세션에서는 코드 수정 대상에서 제외한다.

이유:

- 다른 세션에서 병행 수정이 진행 중이다.
- helper 일반화 과정에서 충돌 가능성이 높다.
- 이번 세션 목표는 `assembly`와 `local-council`의 observability 확장 및 direct LLM analyzer 경로 완성이다.

후속 작업에서는 `local-election`을 이번 세션에서 도입한 공통 backend proxy/observability 경계로 합류시킨다.

## 파일 경계

### route observability

- 기존 `src/lib/observability/server.ts`의 `observeRoute`를 유지한다.
- `assembly`와 `local-council` route는 일관되게 `observeRoute`로 감싼다.

### backend proxy

- 새 공통 helper를 도메인 중립 위치에 둔다.
- 예시:
  - `src/app/api/_shared/backend-proxy.ts`
- 책임:
  - `WOOGOOK_BACKEND_BASE_URL` 확인
  - correlation id propagation
  - proxy success/failure logging
  - response relay

### 도메인별 thin wrapper

- `local-council` 전용 `_shared.ts`는 필요 시 thin wrapper로 줄이거나 제거한다.
- `local-election`의 기존 `_shared.ts`는 이번 세션에서 수정하지 않는다.

### analyzer/provider 경계

- provider 선택 및 API 형식은 adapter로 분리한다.
- 예시:
  - `src/lib/observability/providers/types.ts`
  - `src/lib/observability/providers/upstage.ts`
  - `src/lib/observability/providers/index.ts`

### analyzer 정책 경계

- analyzer route 본문에서 policy 코드를 분리한다.
- 예시:
  - `src/lib/observability/incident-policy.ts`
  - `src/lib/observability/discord.ts`

## Alert 정책

### 자동 포함 규칙

아래 조건을 모두 만족하면 analyzer 대상으로 본다.

- `status=firing`
- `team=frontend-observability`
- `severity=error`
- `llm_analysis=disabled`가 없음

이 규칙은 사람이 새 alert를 만들 때 별도 opt-in 라벨을 붙이지 않아도 기본 동작하게 한다.

### 기본 제외 규칙

- `status=resolved`
- `component=llm-analyzer`
- `signalType=pipeline_event`
- analyzer 내부 self-observability 성격의 alert

### 예외 규칙

noisy alert는 아래처럼 명시적으로 제외할 수 있게 한다.

- `llm_analysis=disabled`

## 중복 분석 및 self-loop 방지

### incident key

incident key는 아래 필드를 우선 조합해 만든다.

- `alertname`
- `route`
- `component`
- `environment`

`route`가 없으면 `component` 기준으로 축약한다.

### cooldown

- 동일 incident key는 일정 시간 동안 재분석하지 않는다.
- 기본값은 env로 조정 가능하게 둔다.
- 별도 DB는 도입하지 않고 최근 `analysis_result` event를 읽어 cooldown을 판단한다.

### self-loop 방지

- analyzer가 남긴 `analysis_result`와 `pipeline_event`가 다시 analyzer 대상 alert를 만들지 않게 한다.
- analyzer component 관련 alert는 alert filtering 단계에서 기본 제외한다.

## Analyzer summary 설계

### baseline summary

LLM 호출 전에도 항상 deterministic baseline summary를 만든다.

포함 항목:

- headline
- 영향 요약
- 원인 후보 3개 내외
- 다음 액션 3개 내외
- confidence

### LLM 보강

LLM에는 아래 payload를 전달한다.

- alert payload
- baseline summary
- recent events 요약

LLM은 아래 구조만 반환하게 요구한다.

- `headline`
- `impactSummary`
- `rootCauseCandidates`
- `nextActions`
- `confidence`

응답 형식이 깨지면 baseline summary를 그대로 사용한다.

## `Upstage Solar Pro 2` direct 호출 설계

### provider 결정

- 1차 provider: `Upstage Solar Pro 2`
- 후속 목표:
  - 다른 provider 추가
  - relay 모드 이관

### 호출 방식

- `Upstage`의 chat completions 형태를 사용한다.
- 서버 사이드에서만 API key를 읽는다.
- 모델, API URL, timeout은 env로 주입한다.

참고 근거:

- [Introducing Solar Pro 2](https://www.upstage.ai/news/solar-pro-2)
- [Upstage 공개 예시 - chat completions](https://www.upstage.ai/blog/ja/upstage-dp-synpro-withweave-part1)

### adapter contract

provider adapter는 아래 책임만 가진다.

- prompt payload 조립
- HTTP 호출
- 응답 파싱
- provider별 오류를 공통 오류로 변환

analyzer는 provider 세부 형식을 직접 알지 않는다.

## Discord 전송 설계

### 최종 알림 경로

LLM 분석 대상 alert의 기본 경로는 아래로 고정한다.

- `Grafana -> analyzer -> Discord`

즉, analyzer 대상 rule에 대해서는 `Grafana -> Discord` direct 경로를 기본값으로 두지 않는다. 그래야 raw alert와 LLM 보강 alert가 중복되지 않는다.

### Discord 본문

본문은 사람이 즉시 읽고 조치할 수 있도록 아래 항목을 포함한다.

- 환경
- alert 이름
- route / component
- 영향 요약
- 원인 후보
- 다음 액션
- confidence
- correlation 확인 단서

### fallback

- LLM 실패 시:
  - baseline summary를 Discord로 전송한다.
- Discord 실패 시:
  - analyzer는 `pipeline_event`로 실패를 기록한다.

## 환경변수

### direct/relay 모드

- `WOOGOOK_OBSERVABILITY_LLM_MODE=direct|relay`
  - 이번 세션 기본값은 `direct`

### provider 선택

- `WOOGOOK_OBSERVABILITY_LLM_PROVIDER=upstage`
- `WOOGOOK_OBSERVABILITY_LLM_MODEL`
- `WOOGOOK_OBSERVABILITY_LLM_API_URL`
- `WOOGOOK_OBSERVABILITY_LLM_API_KEY`

### analyzer 정책

- `WOOGOOK_OBSERVABILITY_LLM_COOLDOWN_SECONDS`
- `WOOGOOK_OBSERVABILITY_OUTBOUND_TIMEOUT_MS`
- `WOOGOOK_OBSERVABILITY_ANALYZER_LOOKBACK_MINUTES`

### Discord

- `WOOGOOK_OBSERVABILITY_DISCORD_WEBHOOK_URL`

### relay 호환

- 기존 `WOOGOOK_OBSERVABILITY_LLM_WEBHOOK_URL`은 바로 제거하지 않는다.
- `relay` 모드에서 재사용 가능한 호환 env로 유지한다.

## 보안 원칙

- API key와 webhook URL은 서버 사이드에서만 읽는다.
- provider request body, full response, webhook URL 자체는 로그에 남기지 않는다.
- Discord 본문에는 필요한 요약만 보내고 raw stack/context는 제한한다.
- analyzer 오류를 직렬화할 때 secret이 포함된 객체를 그대로 기록하지 않는다.

## Grafana 연동 설계

### alert rule label

LLM 분석 대상 rule은 아래 label을 포함한다.

- `team=frontend-observability`
- `severity=error`

필요 시 예외 label:

- `llm_analysis=disabled`

### notification policy

- analyzer 대상 rule은 analyzer webhook receiver로 라우팅한다.
- analyzer 비대상 rule은 기존 `Discord` direct 경로를 유지할 수 있다.

## 검증 전략

### 단위 테스트

- alert filtering
- incident key 생성
- cooldown 판단
- provider adapter response parsing
- baseline summary fallback

### 통합 테스트

- analyzer route에서
  - `Grafana payload -> recent events retrieval -> Upstage mock -> Discord mock`
  - 전체 흐름 검증

### 로컬 실제 검증

1. `Grafana + Loki + Prometheus + frontend`를 로컬에서 띄운다.
2. `assembly` 또는 `local-council` 경로에서 실제 error/5xx를 발생시킨다.
3. `Grafana` alert가 analyzer webhook으로 도달하는지 확인한다.
4. analyzer가 `Upstage Solar Pro 2`를 실제 호출하는지 확인한다.
5. LLM 보강 summary가 `Discord`에 도착하는지 확인한다.

## 문서 반영 원칙

### runbook

- direct `Upstage` 호출용 env 준비 절차
- analyzer webhook receiver 구성 확인 절차
- 실제 `Discord` 수신 확인 절차
- cooldown 및 self-loop troubleshooting

### README

- direct `LLM provider` env 추가
- analyzer 경로가 `Discord` 최종 알림을 담당함을 명시

### ADR

- 이번 세션 범위는 `assembly`, `local-council`
- `local-election`은 후속 작업으로 분리
- analyzer는 이번 세션에서 direct provider 호출
- 장기적으로 relay 이관 예정

## 후속 계획

### 후속 작업 1. `local-election` observability 확장

- 다른 세션 작업이 끝난 뒤 이번 세션에서 도입한 공통 backend proxy/route observability 구조로 합류시킨다.

### 후속 작업 2. relay 방식 이관

장기적으로는 아래 구조를 목표로 한다.

- 현재:
  - `Grafana -> frontend analyzer -> Upstage -> Discord`
- 이후:
  - `Grafana -> frontend analyzer -> relay -> provider -> analyzer/relay -> Discord`

이 이관을 위해 이번 세션에서 아래를 유지한다.

- `LLM_MODE`
- provider adapter interface
- relay 호환 env

### 후속 작업 3. 운영 rule/profile 정교화

- severity 정책 정리
- route/component label 정규화
- 운영 환경 threshold 재조정
- analyzer self-observability 별도 channel 분리

## 결정 요약

- 이번 세션 범위는 `assembly`와 `local-council`로 한정한다.
- analyzer는 `Upstage Solar Pro 2`를 저장소 내부에서 직접 호출한다.
- alert 대상은 자동 포함(`firing + team + severity`)에 명시적 예외(`llm_analysis=disabled`)를 얹는 정책을 쓴다.
- analyzer는 cooldown과 self-loop 방지를 포함해 최종 summary를 `Discord`로 보낸다.
- `local-election` observability 확장과 relay 이관은 후속 작업으로 문서에 명시한다.
