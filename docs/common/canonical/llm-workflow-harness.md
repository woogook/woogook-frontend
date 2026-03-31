# 공통 LLM Workflow Harness 기준

## 목적

- 프론트 저장소에서 `Issue -> work-log -> PR` 흐름을 일관되게 운영한다.
- 도메인 문서와 GitHub 상태 변경 규칙을 한 곳에서 정리한다.

## 공통 계약

- `프로젝트 실행`일 때만 GitHub workflow를 시작한다.
- 기존 open Issue를 먼저 찾고, 없으면 새 이슈를 만든다.
- 유의미한 진행 상황과 검증 결과는 기준 Issue의 work-log 댓글에 남긴다.
- GitHub 상태 변경은 `gh` 또는 `gh api`를 기본 경로로 사용한다.
- PR 전에는 최소 `npm run lint`, 필요 시 `npm run build`를 통과한다.

## 기본 흐름

1. 기존 open Issue 탐색
2. 새 Issue 생성 또는 기존 Issue 보강
3. 구현 및 문서 변경
4. work-log 갱신
5. PR 본문 생성
6. 로컬 검증
7. PR 생성

## 관련 helper

- `scripts/llm_workflow_sync.py`
- `scripts/prepare_pr.py`
- `scripts/validate_llm_workflow.py`
