# 국회팀 온보딩

## 이 문서의 목적

- 국회팀 신규 참여자가 첫날 어떤 경로와 문서를 기준으로 작업해야 하는지 빠르게 이해하게 한다.

## 기본 작업 경로

- `src/app/assembly/**`
- `src/features/assembly/**`
- `docs/assembly/**`

## 공용 경로

- `src/components/ui/**`
- `src/lib/**`
- `docs/common/**`

공용 경로를 수정하면 영향 범위를 work-log와 PR 본문에 함께 남긴다.

## 기본 읽기 순서

1. `AGENTS.md`
2. `.agents/README.md`
3. `.agents/entry/assembly.md`
4. `docs/assembly/canonical/llm-entry.md`
5. 이 문서
6. 현재 단계에 맞는 `.agents/workflows/*.md`

## 기본 검증

- 문서만 수정: 링크/경로 수동 검토
- 라우팅/빌드 영향: `npm run lint`, `npm run build`
