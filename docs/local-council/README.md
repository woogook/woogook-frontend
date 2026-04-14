# 현직 지방의원 문서 안내

## 이 문서를 먼저 보는 이유

- 사람이 `현직 지방의원` frontend 현재 상태를 빠르게 파악하기 위한 진입 문서다.
- 현재 제품 범위는 `서울특별시 강동구` 한정 V1과 운영 안정화까지다.
- 실제 확인 순서는 `brief -> runbook`으로 읽으면 가장 빠르다.

## 사람용 문서

- 현재 현황: `docs/local-council/notes/current/local-council-member-current-status-brief.md`
- 실행 가이드: `docs/local-council/runbooks/local-frontend-backend-check-guide.md`

## 이렇게 읽으면 된다

- 구현 범위와 합격 기준을 먼저 파악하려면 `brief`를 읽는다.
- sample fallback과 backend live smoke를 실제로 따라가려면 `runbook`을 읽는다.
- backend 계약과 함께 보려면 `woogook-backend/docs/지방의원/**` 문서를 같이 확인한다.

## LLM / agent 문서

- agent/LLM 진입 문서는 별도로 유지한다.
- LLM 진입: `docs/local-council/canonical/llm-entry.md`
