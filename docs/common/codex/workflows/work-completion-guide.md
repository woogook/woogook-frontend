# 작업 완료 가이드

## PR 전

- 기준 Issue와 work-log가 최신 상태인지 확인한다.
- PR 본문에 배경, 주요 변경 사항, 문서 영향, 검증 결과를 적는다.
- `npm run lint`, 필요 시 `npm run build`를 다시 실행한다.
- `scripts/validate_llm_workflow.py`로 PR 본문 필수 section 누락 여부를 확인한다.

## merge 전

- 리뷰 코멘트 반영 여부를 확인한다.
- 브랜치 상태와 검증 결과를 다시 점검한다.
