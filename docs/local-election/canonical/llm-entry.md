# 지방선거 도메인 LLM 진입 문서

## 먼저 읽을 문서

1. `glossary.md`
2. `.agents/README.md`
3. `.agents/entry/local-election.md`
4. 현재 단계에 맞는 `.agents/workflows/*.md`

## 현재 상태 빠른 확인

- 사람이 현재 구현 범위를 빠르게 파악하려면 `docs/local-election/notes/current/local-election-current-status-brief.md`를 먼저 본다.
- compare assistant backend 계약까지 같이 보려면 `../woogook-backend/docs/지방선거/notes/260403-214600-local-election-current-status-brief.md`와 backend `app/api/local_election/v1/chat.py`를 함께 확인한다.

## 기본 수정 경로

- `src/app/local-election/**`
- `src/features/local-election/**`
- `docs/local-election/**`
