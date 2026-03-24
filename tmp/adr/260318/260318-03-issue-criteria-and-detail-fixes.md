# 이슈 기준 표시와 후보 상세 보완

## 배경

- 자유 키워드를 추가해도 이슈 단계와 후보 상세에서 해석 결과가 일관되게 보이지 않았다.
- `이슈 없이 보기` 이후 후보 목록과 상세 화면에 불필요한 빈 이슈 섹션이 남아 있었다.
- 글로벌 네비게이션 제목 문구 수정 요청이 함께 들어왔다.

## 변경 사항

- `src/app/data.ts`
  - 선택 이슈와 자유 키워드를 공통 기준 목록으로 다루는 `IssueCriterionEntry`와 관련 helper를 추가했다.
  - 자유 키워드가 taxonomy에 매핑되면 같은 권한 힌트를 재사용하고, 매핑되지 않으면 일반 안내 문구를 보여줄 수 있게 했다.
- `src/app/components/IssueStep.tsx`
  - `현재 해석된 비교 기준`을 선택 이슈와 자유 키워드 모두 포함하도록 바꿨다.
  - 자유 키워드도 각 항목별 권한/해석 문구가 노출되도록 수정했다.
- `src/app/components/CandidateCards.tsx`
  - `이슈 없이 보기` 상태에서는 `나의 관심 이슈` 섹션을 숨기도록 조정했다.
- `src/app/components/DetailView.tsx`
  - 관심 이슈가 있을 때만 `관심 이슈 기준 요약` 섹션을 노출하도록 변경했다.
  - 자유 키워드도 상세 요약에 포함되도록 수정했다.
- `src/app/page.tsx`
  - 글로벌 네비게이션 제목을 `우리동네 국회의원`으로 변경했다.

## 검증

- `npm run lint`
  - 에러 없이 통과
  - 기존 `CandidateCards.tsx`의 `<img>` warning 1건 유지

## 후속 메모

- 자유 키워드가 candidate sort score에 반영되는 방식은 여전히 taxonomy 매핑 결과에 의존한다.
- taxonomy에 없는 키워드의 정렬/매칭 고도화는 추후 별도 작업으로 다루는 편이 적절하다.

## 기타

- git
  - 브랜치 이름 후보 1: `codex/fix-issue-criteria-visibility`
  - 브랜치 이름 후보 2: `codex/fix-local-election-detail-issue-ui`
  - 브랜치 이름 후보 3: `codex/update-free-keyword-issue-summary`
  - 커밋 메시지: `fix: align free keyword issue criteria across local election views`
  - PR 제목: `fix: 자유 키워드 이슈 기준 표시와 후보 상세 노출 정리`
  - PR 본문:
    - 배경
      - 자유 키워드가 이슈 단계와 후보 상세에서 일관되게 보이지 않았고, 빈 이슈 섹션이 남아 있었습니다.
    - 변경 사항
      - 선택 이슈와 자유 키워드를 공통 기준 목록으로 통합했습니다.
      - 관심 이슈가 없을 때 후보 목록/상세의 빈 이슈 섹션을 숨겼습니다.
      - 글로벌 네비게이션 제목 문구를 요청 사항에 맞게 수정했습니다.
    - 검증
      - `npm run lint`
