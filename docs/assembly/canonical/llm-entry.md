# 국회 도메인 LLM 진입 문서

## 먼저 읽을 문서

1. `glossary.md`
2. `.agents/README.md`
3. `.agents/entry/assembly.md`
4. `docs/assembly/onboarding/assembly-team-onboarding.md`
5. `docs/assembly/workflows/assembly-development-scope.md`
6. 현재 단계에 맞는 `.agents/workflows/*.md`

## 현재 상태 빠른 확인

- 사람이 현재 제품 범위를 빠르게 파악하려면 `docs/assembly/notes/current/assembly-current-status-brief.md`를 먼저 본다.
- backend API 계약과 함께 보려면 `../woogook-backend/docs/국회의원/notes/260403-214500-assembly-current-status-brief.md`와 backend `app/api/assembly/v1/members.py`를 같이 확인한다.

## 기본 수정 경로

- `src/app/assembly/**`
- `src/features/assembly/**`
- `docs/assembly/**`
