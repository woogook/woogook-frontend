# 프론트엔드 로그 수집·통합 모니터링·LLM 분석 설계

- 작성일: 2026-04-12
- 소유 도메인: `common`
- 관련 문서:
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/docs/common/canonical/frontend-deployment-decision.md`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/docs/common/runbooks/vercel-deployment-runbook.md`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/README.md`

## 배경

현재 `woogook-frontend`는 `Next.js 16` 기반 프런트엔드이며, 로컬 실행은 `npm run dev`, 운영 배포는 `Vercel Hobby + GitHub Actions + Vercel CLI` 경로를 전제로 한다. 에러는 주로 `console.error`로만 남고 있으며, 로컬과 운영 모두에서 장기 보존 가능한 구조화 로그와 통합 관측성 체계는 아직 없다.

팀은 frontend 전용 로그와 관측 신호를 파일과 대시보드에 남기고, 장애 발생 시 `Discord`로 알림을 보내며, 추가로 `LLM`이 최근 로그와 메트릭을 자동 해설하는 체계를 원한다. backend는 별도 observability 시스템을 구축할 예정이므로, 이번 설계는 `frontend-only observability`를 전제로 한다.

또한 `Vercel Hobby`는 플랫폼 로그 장기 보존과 log drain 기능에 제약이 있으므로, 앱 레벨 telemetry를 직접 설계해야 한다. 나중에 `EC2`에 frontend observability용 보조 컴포넌트를 붙일 수 있지만, 그 이전에도 frontend 로그는 끊기지 않고 쌓여야 한다.

## 목표

- 로컬 개발 환경에서 frontend 관련 모든 로그를 `severity`와 무관하게 파일로 기록한다.
- 로그 파일은 날짜와 크기 기준으로 분리되어 과도하게 커지지 않게 한다.
- 운영과 preview에서는 브라우저 오류, Next 서버 측 오류, 핵심 latency를 `Grafana Cloud Free`에 수집한다.
- `Discord`로 경보를 보내고, 같은 incident에 대해 `LLM` 해설 메시지를 후속으로 붙인다.
- `EC2` gateway가 아직 없는 시점에도 frontend observability가 동작하게 한다.
- 나중에 `EC2 frontend-observability gateway`를 붙여도 수집 경로를 뒤엎지 않게 한다.

## 비목표

- backend 애플리케이션 로그와 메트릭을 이번 시스템에 포함하지 않는다.
- `Vercel` 플랫폼 전체 runtime log를 무료 플랜 한도 내에서 완전 수집하려고 하지 않는다.
- request/response body를 기본 수집 대상으로 삼지 않는다.
- incident 자동 복구나 GitHub Issue 자동 생성은 이번 설계 범위에 넣지 않는다.

## 범위와 경계

이번 설계가 다루는 신호는 아래와 같다.

- 브라우저 실행 중 발생하는 `JavaScript error`, `unhandled rejection`, `route transition`, `Web Vitals`, `사용자 action breadcrumb`
- Next 서버 측 코드에서 발생하는 `API route`, `proxy`, `SSR/서버 렌더`, `same-origin API helper`의 오류와 latency
- frontend observability 파이프라인 자체의 수집 성공/실패, dropped event, Discord 전송 실패, LLM 분석 실패

이번 설계가 다루지 않는 신호는 아래와 같다.

- backend 애플리케이션 로그
- backend 메트릭과 backend alert
- DB 자체 모니터링
- Vercel 계정 차원의 조직 운영 지표

## 설계 원칙

1. 로컬은 `full-fidelity`, 운영 cloud는 `high-value signal first` 원칙을 따른다.
2. frontend와 backend observability는 분리한다.
3. alerting 자체와 LLM 해설을 분리해, LLM 장애가 있어도 원본 alert는 유지한다.
4. 수집 경로는 단계적으로 도입한다. `EC2`가 늦어져도 frontend 로그 수집은 먼저 돌아가야 한다.
5. 브라우저, 서버, analyzer 로그를 하나의 공통 envelope로 맞춰 상관관계 분석이 가능하게 한다.
6. 운영 로그는 허용된 범위 내에서 외부 LLM에 보낼 수 있지만, 명백한 민감 필드는 기본 마스킹한다.

## 제안 아키텍처

### 권고안

권고안은 `Grafana Cloud 중심 혼합형`이다.

- 브라우저: `Grafana Faro` 기반 frontend telemetry
- Next 서버 측: 구조화 JSON logger + 직접 전송 transport
- 대시보드/로그/alert: `Grafana Cloud Free`
- 메트릭 수집: `Prometheus` 계열 exporter + `Prometheus Agent mode` 또는 동등한 remote write 경로
- 알림 채널: `Discord webhook`
- 자동 해설: 별도 `LLM analyzer` webhook worker
- 장기 확장: `EC2 frontend-observability gateway` 프로세스 추가

이 구조는 무료 조건에서 대시보드, 로그, alert, LLM 후처리를 한 번에 묶기 쉽고, `Loki/Prometheus/Grafana` 저장소를 전부 직접 운영하지 않아도 된다.

### 비권고안

- 완전 자가 운영형: 운영 복잡도가 높고 프로젝트 규모에 비해 과하다.
- 로그 최소형: 빠르게 붙일 수는 있지만, 브라우저 오류와 서버 오류를 같은 incident로 엮는 능력이 약하다.

## 단계적 롤아웃

### Phase A. 로컬 파일 로깅 + cloud 직접 전송

`EC2`가 아직 없을 때의 기본 구조다.

- 로컬 개발:
  - 브라우저 이벤트와 서버 이벤트를 모두 로컬 파일로 적재한다.
  - 필요 시 opt-in으로 `Grafana Cloud` 미러링을 켠다.
- preview/production 브라우저:
  - `Faro -> Grafana Cloud`
- preview/production 서버:
  - `Next server -> Grafana Cloud Loki push API`
- alert:
  - `Grafana Alerting -> Discord`
  - `Grafana Alerting -> analyzer webhook`

이 단계만으로도 frontend 로그는 Grafana Cloud에 쌓이고, 브라우저와 서버 오류를 대시보드에서 볼 수 있다.

### Phase B. EC2 gateway 추가

frontend observability 전용 보조 컴포넌트를 `EC2`에 별도 프로세스로 추가한다.

- `frontend-observability-gateway`
  - frontend 서버 로그 수신
  - NDJSON 파일 적재
  - shipper용 로컬 버퍼 제공
- `Grafana Alloy`
  - 파일 또는 수신 source에서 로그를 읽어 `Grafana Cloud Loki`로 전송
- `Prometheus Agent` 또는 동등한 collector
  - gateway 상태와 노드 상태를 scrape 후 remote write
- `llm-analyzer-worker`
  - Grafana alert webhook 수신
  - 최근 로그/메트릭 조회
  - LLM 해설 생성 후 `Discord` 게시

이 단계에서 backend 앱은 수정하지 않는다. 추가되는 것은 backend와 분리된 별도 프로세스다.

### Phase C. 안정화 전환

- 초기에는 서버 로그를 짧은 기간 동안 `direct-to-loki`와 `gateway` 양쪽으로 이중 전송할 수 있다.
- 누락과 중복 여부를 확인한 뒤, 안정화되면 `gateway`를 기준 경로로 고정한다.
- 브라우저 telemetry는 계속 cloud 직행으로 유지해도 무방하다.

## 로컬 로그 파일 정책

로컬 개발 환경에서는 중요도와 관계 없이 모든 frontend 관련 로그를 파일로 기록한다.

### 기본 경로

- `./.logs/frontend/YYYY-MM-DD/browser.ndjson`
- `./.logs/frontend/YYYY-MM-DD/server.ndjson`
- `./.logs/frontend/YYYY-MM-DD/analyzer.ndjson`

### 분할 정책

- 기본 단위: `일별 디렉터리`
- 추가 분할: 단일 파일이 `50MB`를 넘으면 rollover
- 예시:
  - `server.ndjson`
  - `server.001.ndjson`
  - `server.002.ndjson`

### 압축·보존 정책

- 전일 로그부터 `gzip` 압축
- 로컬 기본 보존 기간: `7~14일`
- 보존 기간이 지난 로그는 자동 삭제

### 기록 범위

- `debug`
- `info`
- `warn`
- `error`

브라우저 로그는 브라우저가 파일에 직접 쓰는 것이 아니라, 로컬의 수집 endpoint로 보내고 서버 프로세스가 파일에 적재한다. 이렇게 해야 브라우저/서버 로그 포맷과 rotation 정책을 일관되게 유지할 수 있다.

## 공통 로그 스키마

브라우저, 서버, analyzer가 아래 공통 envelope를 공유한다.

- `timestamp`
- `level`
- `signal_type`
  - `browser_error`
  - `browser_event`
  - `server_error`
  - `server_request`
  - `analysis_result`
  - `pipeline_event`
- `service`: `woogook-frontend`
- `component`
  - `browser`
  - `next-api`
  - `next-ssr`
  - `proxy`
  - `gateway`
  - `llm-analyzer`
- `environment`
  - `local`
  - `preview`
  - `production`
- `release`
- `session_id`
- `request_id`
- `correlation_id`
- `route`
- `user_action`
- `error_name`
- `error_message`
- `stack`
- `http_method`
- `http_status`
- `latency_ms`
- `tags`
- `context`

핵심 키는 `session_id`, `request_id`, `correlation_id`다. 브라우저에서 API 호출을 시작할 때 `x-correlation-id`를 붙이고, 서버 로그도 같은 값을 남기면 `사용자 action -> API 실패 -> fallback 렌더`를 한 incident로 묶을 수 있다.

## 수집 대상

### 브라우저

- `JavaScript error`
- `unhandled rejection`
- 페이지 전환
- `Web Vitals`
- `fetch` 또는 API client 실패
- 사용자 action breadcrumb
- session 시작/종료
- release, environment, route metadata

### Next 서버 측

- API route 진입/종료
- proxy 호출과 upstream 상태 코드
- SSR/서버 렌더 오류
- route별 latency
- fallback 사용 여부
- 외부 collector 전송 성공/실패

### 관측 파이프라인 자체

- ingestion success/failure
- dropped event count
- queue length
- Discord 전송 성공/실패
- LLM 분석 성공/실패

## 대시보드 구성

최소 대시보드는 아래 패널을 포함한다.

1. `production browser error rate`
2. `production next server error rate`
3. route별 `p95 latency`
4. 최근 release 기준 error 변화
5. fallback 사용률
6. preview 오류 추이
7. analyzer/gateway health
8. top routes by error volume

초기 free 한도에서는 핵심 패널부터 시작하고, 필요 시 preview 대시보드를 축소한다.

## 알림 설계

alert source는 `Grafana Alerting`으로 통합한다.

### 알림 부류

#### 즉시 대응형

- production 브라우저 error rate 급증
- production Next API route 5xx 급증
- 특정 route latency 급증
- observability pipeline 정지

#### 관찰형

- preview에서 새 release 이후 오류 증가
- fallback 사용률 증가
- Web Vitals 악화

#### 품질 관리형

- 로그 누락률 증가
- Discord 전송 실패
- analyzer 실패율 증가

### 그룹핑과 중복 억제

알림은 개별 로그 한 줄이 아니라 incident fingerprint 기준으로 그룹핑한다.

예시 fingerprint:

- `environment=production`
- `component=next-api`
- `route=/api/ballots`
- `error_name=DatabaseUnavailableError`

같은 fingerprint는 일정 시간 동안 재통지하지 않게 해 Discord 폭주를 막는다.

## Discord 메시지 구조

### 1차 원본 알림

- 제목: `[prod][high] next-api error spike`
- 핵심 요약: 어디서 어떤 오류가 얼마나 발생했는지
- 링크:
  - Grafana dashboard
  - Explore query
  - silence link
  - 관련 runbook
- 메타:
  - `release`
  - `route`
  - `component`
  - `error_name`
  - `count`
  - `window`

### 2차 LLM 해설

- root cause 추정 1~3개
- 영향 범위 추정
- 우선 확인 로그/메트릭
- 직전 release 연관 가능성
- 지금 취할 액션 3개
- `confidence`
- 불확실성 명시

LLM 해설은 원본 알림을 대체하지 않고 후속 메시지 또는 thread reply로 게시한다.

## LLM analyzer 설계

### 역할

- alert webhook 수신
- 최근 로그/메트릭 조회
- 동일 incident의 브라우저 오류, API 오류, latency를 상관분석
- LLM에 전달할 로그 샘플과 메트릭 요약 생성
- 구조화 결과를 `Discord` 메시지로 변환

### 실행 규칙

- `severity=high` 이상만 즉시 분석
- 같은 fingerprint는 `15분` 동안 분석 1회만 허용
- 조회 범위는 최근 `10분`
- 로그 샘플 수와 payload 길이에 상한 적용
- LLM 실패 시 원본 alert는 그대로 유지

### 초기 배치

- Phase A: `Vercel`의 별도 analyzer webhook route
- Phase B: `EC2`의 별도 worker 프로세스로 이전

이렇게 역할을 분리하면 나중에 LLM 공급자나 analyzer 구현을 바꿔도 alerting 자체는 흔들리지 않는다.

## 민감정보와 마스킹 정책

운영 로그 원문을 외부 LLM API로 보낼 수는 있지만, 아래 필드는 기본 마스킹한다.

- `Authorization`
- `Cookie`
- `Set-Cookie`
- API token, password류 패턴
- 주민등록번호, 이메일 등 명백한 민감 식별자

또한 아래는 기본 비수집 또는 truncate 대상으로 둔다.

- request body
- response body
- 긴 stack trace
- 대형 context payload

## 실패 모드와 대응

### Grafana Cloud 전송 실패

- 로컬은 파일이 정본이므로 유실되지 않는다.
- 운영 direct push 실패는 짧은 재시도 후 포기하고, 실패 자체를 별도 카운터와 로그로 남긴다.

### Discord 전송 실패

- Grafana alert는 유지된다.
- analyzer는 Discord 실패를 내부 오류로 기록하고 제한된 재시도를 수행한다.

### LLM 분석 실패

- 원본 alert는 먼저 전송한다.
- LLM은 부가 기능으로 취급한다.
- 실패 메타는 `analyzer.ndjson`과 pipeline metric에 기록한다.

### 로그 폭주

- fingerprint 기반 dedupe
- 환경별 샘플링
- cloud 전송 시 `debug/info` 축소 또는 선택적 샘플링

## 무료 플랜 대응 전략

- 로컬은 full capture
- production cloud는 우선순위 높은 signal 위주
- preview는 보존과 샘플링을 더 공격적으로 적용
- 브라우저 breadcrumb 길이 제한
- stack trace와 context 크기 제한
- analyzer 조회 로그 수 제한
- dashboard와 alert를 핵심 지표 중심으로 유지

## 구현 순서 제안

1. 공통 구조화 logger와 로컬 NDJSON 적재기를 도입한다.
2. 브라우저 수집 endpoint와 로컬 rotation 정책을 구현한다.
3. 브라우저 `Faro` 계측과 correlation id 전파를 추가한다.
4. Next 서버 로그를 공통 envelope로 전환한다.
5. Grafana Cloud Loki direct push transport를 붙인다.
6. Grafana 대시보드와 alert rule을 추가한다.
7. Discord contact point와 analyzer webhook을 연결한다.
8. LLM analyzer의 최소 기능을 붙인다.
9. 이후 별도 시점에 `EC2 frontend-observability gateway`와 worker를 추가한다.

## 검증 계획

- 로컬에서 브라우저/서버/analyzer 로그가 모두 `.logs/frontend/YYYY-MM-DD/` 아래에 기록되는지 확인한다.
- 파일 rollover가 크기 기준으로 동작하는지 확인한다.
- gzip 압축과 보존 삭제가 기대대로 동작하는지 확인한다.
- `correlation_id`가 브라우저와 서버 로그에 동일하게 남는지 확인한다.
- preview/production에서 Grafana Cloud 로그와 메트릭이 들어오는지 확인한다.
- Grafana alert가 `Discord`와 analyzer webhook에 동시에 전달되는지 확인한다.
- analyzer가 최근 로그와 메트릭을 읽어 후속 요약을 게시하는지 확인한다.
- LLM 또는 Discord 장애 시 원본 alert가 유지되는지 확인한다.

## 참고 자료

- [Vercel Function Logs](https://vercel.com/docs/functions/logs)
- [Vercel Log Drains](https://vercel.com/docs/observability/log-drains)
- [Grafana Frontend Observability](https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/introduction/how-it-works/)
- [Grafana Faro](https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/instrument/faro/)
- [Grafana Alerting Contact Points](https://grafana.com/docs/grafana/latest/alerting/fundamentals/notifications/contact-points/)
- [Grafana Discord Contact Point](https://grafana.com/docs/grafana-cloud/alerting-and-irm/alerting/configure-notifications/manage-contact-points/integrations/configure-discord/)
- [Grafana Webhook Notifier](https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/webhook-notifier/)
- [Loki HTTP API](https://grafana.com/docs/loki/latest/reference/loki-http-api/)
- [Prometheus Agent Mode](https://prometheus.io/docs/prometheus/latest/prometheus_agent/)
