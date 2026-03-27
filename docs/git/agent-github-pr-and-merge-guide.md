# GitHub PR & Merge Guide

## PR

### 공통으로 적용되는 사항

- 문서와 설명 문장은 `한글`로 작성하는 것을 원칙으로 하며, `영어` 표기가 더 정확하거나 자연스러운 경우에는 괄호를 사용해 한글과 영어를 함께 작성한다. 예: 강화학습(RL, Reinforcement Learning)
- 보편적으로 알려진 Git Convention, 특히 `Conventional Commits` 관례를 기본값으로 삼는다.

### 브랜치와 제목 정합성

- PR 대상 작업 브랜치는 가능하면 `<prefix>/<short-description>` 형식을 사용한다.
- PR 제목 `prefix`는 브랜치와 최근 `commit` 제목의 `prefix`와 맞춘다.
- 대표 `prefix` 예시는 `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `build`, `ci`다.
- 예: `docs/update-agent-guides` 브랜치라면 PR 제목도 `docs: 에이전트 Git 가이드 정리`처럼 맞춘다.

### 제목

- PR 제목은 `<prefix>: <작업 내용을 잘 요약한 문장>` 형식으로 작성한다.

### 본문

- PR의 배경과 목적을 짧게 정리한다.
- 주요 변경 사항을 검토자가 빠르게 이해할 수 있도록 요약한다.
- 수행한 검증 내용과 남아 있는 위험이나 후속 메모가 있으면 함께 적는다.

### metadata

특별한 지시가 없으면 아래 원칙에 따라 설정한다.

- `assignee`: 현재 작업자의 GitHub 계정에 맞게 설정한다.
- `project`: `우리동네 국회의원`
- `label`: 작업 성격에 맞는 적절한 값을 1개 이상 지정

## merge

- merge 수행 시 `rebase`나 `squash`는 선택하지 않는다.
