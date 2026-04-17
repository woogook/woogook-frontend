# 배경

- 운영 배포 후 `/local-council`에서 서울특별시 강동구 주소를 선택하면 backend가 `local council roster not found: 11740`, `local council person not found: ...` 형태의 404를 반환했다.
- 기존 frontend는 강동구 샘플 fixture가 있으면 운영 환경에서도 조용히 `local_sample`로 fallback했다.
- 사용자는 운영 환경에서 오류가 숨겨지지 않고, 공식 데이터 장애를 명시적으로 안내하길 요청했다.

# 변경 사항

- `src/lib/api-client.ts`
  - `process.env.NODE_ENV !== "production"`일 때만 강동구 샘플 fallback을 허용하도록 분기했다.
  - 운영 환경에서는 강동구 projection 누락 404와 backend 503/네트워크 오류를 사용자용 503 메시지로 변환한다.
  - 인물 상세에서도 `local council person not found:` 404를 운영 환경에서는 샘플로 숨기지 않고 오류로 노출한다.
- `src/features/local-council/LocalCouncilPage.tsx`
  - `resolve` 응답에 이미 roster가 포함돼 있으므로, 추가 `fetchLocalCouncilRoster` 호출과 그 실패를 조용히 삼키던 경로를 제거했다.
- `src/features/local-council/components/*`
  - 샘플 데이터 안내 문구를 개발·로컬 미리보기 기준으로 정리했다.
- `tests/local_council_api_client.test.ts`
  - 운영/개발 분기 테스트를 추가하고, 실제 production 장애 형태인 projection 누락 404를 회귀 테스트로 고정했다.
- `package.json`
  - `npm run test`가 Vitest와 `tests/*.test.ts` node:test 스위트를 모두 실행하도록 정리했다.
- `src/lib/local-election-backend.test.ts`, `tests/api_client_region_fallback.test.ts`, `tests/assembly_proxy_route.test.ts`
  - 현재 구현 기준으로 stale expectation과 mock 경로를 정리해, pre-push review에서 발견된 숨은 테스트 실패를 제거했다.

# 비채택안

- 운영에서도 강동구 샘플 fallback 유지:
  - 사용자에게는 정상처럼 보이지만 실제 projection 누락을 감춘다.
  - 이번 이슈의 핵심 요구와 충돌하므로 제외했다.
- `resolve` 성공 후 `roster` 재호출을 유지하면서 경고만 로그로 남기기:
  - 사용자 관점에서는 여전히 오류가 조용히 무시된다.
  - `resolve` payload가 이미 roster를 포함하므로 중복 호출 이점이 작아 제외했다.

# 검증

- `npx --yes tsx --test tests/local_council_api_client.test.ts`
  - 20 passed
- `npx vitest run scripts/e2e/local-council-config.test.mjs`
  - 17 passed
- `npm run e2e:smoke`
  - 4 passed
- `npm run lint`
  - exit 0
- `npm run build`
  - exit 0
- `npm run test`
  - 17 Vitest files / 78 tests passed
  - 86 node:test tests passed
- `npm run test:local-council-samples`
  - `validated 3 local council person dossier samples`
- `npm run e2e:integration`
  - 2 passed

# 후속 메모

- 운영 backend에는 `local_council_district_roster`, `local_council_person_dossier` projection 적재 상태를 별도로 점검해야 한다.
