# region `emd` parent-label fallback

## 배경
- `#61` production 재검증 중 `GET /api/regions/cities`와 `GET /api/local-council/v1/resolve?...`는 `200`으로 회복된 것을 확인했다.
- 다만 `GET /api/regions/emd?city=서울특별시&sigungu=강동구`는 `200`이지만 본문이 `{"emd":["강동구"]}`로 내려와, 자식 동 목록 대신 부모 구 이름이 반환됐다.
- 이 응답은 schema 상으로는 통과하지만 실제 UI에서는 `읍/면/동` 선택지가 잘못 채워져 `local-council`과 `local-election` 주소 선택 흐름을 다시 깨뜨린다.

## 변경 사항
- `src/lib/api-client.ts`의 공통 region query 경로에서 응답 항목을 trim/dedupe한다.
- `sigungu`는 부모 `city`, `emd`는 부모 `city` 또는 `sigungu`가 자식 옵션으로 포함되면 malformed 응답으로 간주한다.
- malformed 응답은 shared fallback catalog로 대체하고, 사용자에게는 `데이터에 이상이 있습니다` 안내 메시지를 노출한다.
- 해당 회귀를 `tests/api_client_region_fallback.test.ts`에 node:test로 고정했다.

## 비채택안
- backend가 이미 `200`을 반환하므로 frontend는 그대로 신뢰한다.
  - schema만 맞으면 잘못된 계층 값도 UI에 노출되어 사용자가 잘못된 동을 고르게 된다.
- malformed 항목만 조용히 제거하고 안내 없이 계속 진행한다.
  - 운영 데이터 이상을 조용히 숨기는 방식이라 장애 감지가 늦어진다.

## 검증
- `npm test`
- `npm run lint`
- `npm run build`
- build 산출물 기준 Playwright route interception으로 `emd: ["강동구"]`를 주입했을 때:
  - `#region-dong` 옵션이 `["읍/면/동 선택", "천호동"]`로 복구됨
  - `읍/면/동 데이터에 이상이 있습니다. 일부 기본 지역 목록으로 계속 진행합니다.` 안내가 보임

## 후속 메모
- production backend가 계층형 region 응답을 다시 잘못 내리더라도, 현재 shared fallback catalog가 있는 범위에서는 UI가 안전하게 복구된다.
- backend 자체의 region 데이터 정합성은 별도 운영 추적으로 계속 보는 편이 맞다.
