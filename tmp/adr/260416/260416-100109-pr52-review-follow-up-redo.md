# 배경

- PR #52 review follow-up을 진행하던 중, 저장소 harness의 `requested-pr-review-follow-up` workflow가 요구하는 `수정 -> 검증 -> commit -> push 확인 -> thread reply` 순서를 최근 turn들에서 끝까지 따르지 못했다.
- 특히 Codex inline review thread에 대해 코드 수정과 push만 수행하고, thread reply 및 resolved 처리를 남기지 않은 상태였다.
- 최신 non-outdated unresolved thread 1건은 `buildBillActivityCardViewModel`의 collapsed meta에서 legacy `bill_date` fallback이 빠진 회귀를 지적하고 있었다.

# 변경 사항

- `src/features/local-council/detail.ts`에서 bill card `meta`가 `proposed_at`만 보지 않고, detail row와 동일하게 `proposed_at`/`bill_date` fallback을 사용하도록 수정했다.
- `tests/local_council_detail.test.ts`에 `buildBillActivityCardViewModel falls back to legacy bill_date in meta` 회귀 테스트를 추가했다.
- 이번 follow-up turn은 저장소 harness 순서를 다시 적용해 `검증 -> commit -> push -> thread reply -> resolve`까지 마무리하는 것을 목표로 재수행했다.

# 비채택안

- bill adapter 전체를 generic helper로 다시 추상화하는 정리는 반영하지 않았다.
  현재 review 지적은 legacy `bill_date` fallback 회귀 1건에 국한돼 있고, 이 turn의 목적도 이전 follow-up의 하네스 미준수를 좁게 바로잡는 데 있으므로 범위를 넓히지 않았다.
- 기존 outdated review thread들에 일괄 top-level PR comment를 남기는 방식은 선택하지 않았다.
  저장소 workflow는 reviewer-specific inline thread에 짧고 구체적인 reply를 남기도록 요구하므로, 현재 non-outdated unresolved Codex thread에만 해당 절차를 적용한다.

# 검증

- `npm run lint`
- `npm run test:local-council-samples`
- `python3 scripts/validate_agents_harness.py`
- `npx --yes tsx --test tests/local_council_api_client.test.ts tests/local_council_proxy.test.ts tests/local_council_detail.test.ts`
- `npm run build`
- `git diff --check`

# 후속 메모

- Codex inline review thread에는 실질 답글을 남긴 직후 바로 resolved 처리해야 한다.
- 코드 변경이 반영된 thread 답글 마지막 줄에는 최신 commit hash를 남긴다.
- 이후 PR review follow-up에서는 GitHub write safety만 따로 해석하지 말고, 저장소 workflow의 thread reply/resolve 요구를 우선 적용한다.
