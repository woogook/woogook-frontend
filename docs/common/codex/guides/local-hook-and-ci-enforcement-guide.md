# 로컬 훅 및 CI 강제 기준

## 필수 검증

- 코드/설정 변경: `npm run lint`
- 라우팅, 빌드, 타입, API route 변경: `npm run build`
- 문서만 변경: 링크와 경로 수동 검토 가능

## GitHub workflow helper 검증

- `python3 scripts/llm_workflow_sync.py find-open-issues`
- `python3 scripts/prepare_pr.py --issue <issue-number>`
- `python3 scripts/validate_llm_workflow.py tmp/pr-body.md`
