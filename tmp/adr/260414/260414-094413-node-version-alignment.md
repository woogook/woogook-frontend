# 배경

- `next build`가 Node.js `18.20.8` 환경에서 `>=20.9.0` 요구사항 때문에 중단됐다.
- 로컬 셸 `PATH`가 `~/.zshrc`에서 `/opt/homebrew/opt/node@18/bin`을 최우선으로 두고 있었다.

# 변경 사항

- Homebrew로 `node@22` (`22.22.2_1`)를 설치했다.
- `~/.zshrc`의 우선 Node 경로를 `/opt/homebrew/opt/node@22/bin`으로 변경했다.
- 저장소 루트에 `.nvmrc`를 추가해 프로젝트 기준 버전을 `22.22.2`로 명시했다.

# 비채택안

- 기존 Homebrew 기본 `node` (`25.8.1`) 사용: 기준은 만족하지만 LTS보다 변동성이 커 프로젝트 기본값으로는 채택하지 않았다.
- `node@18` 유지: `next@16.2.3`의 최소 요구 버전을 만족하지 못해 채택하지 않았다.

# 검증

- `zsh -ic 'node -v && npm -v && which node && which npm'`: `node 22.22.2`, `npm 10.9.7`, `/opt/homebrew/opt/node@22/bin/*` 사용을 확인했다.
- `zsh -ic 'cd /Users/eric/dev/upstage/woogook/woogook-frontend && npm run build'`: Next.js production build가 성공했다.

# 후속 메모

- 이미 열려 있던 터미널 세션은 `source ~/.zshrc` 또는 새 셸 시작 후 반영된다.
- `npm run lint`의 `.worktrees/.../.next` 산출물 스캔 문제는 별도 lint 설정 작업으로 분리하는 편이 적절하다.
