# Implementation Workflow

## 목적

- 기준 Issue에 맞게 구현과 테스트를 진행한다.
- 작업 중 도출된 중요한 사실과 결정을 필요한 만큼만 기록한다.

## 입력

- 기준 GitHub Issue
- 관련 도메인 정본 문서
- 현재 branch/worktree
- 필요한 테스트 또는 검증 방법

## 실행 순서

1. 구현 범위를 기준 Issue에 맞춘다.
2. 필요한 코드와 문서를 수정한다.
3. 작업 범위에 맞는 테스트와 검증을 수행한다.
4. 프론트엔드 코드, 설정, 라우팅, API route가 바뀌면 `npm run lint`와 필요한 경우 `npm run build`를 실행한다.
5. agent control-plane 또는 helper가 바뀌면 `python3 scripts/validate_agents_harness.py`와 관련 테스트를 실행한다.
6. 구현 과정에서 중요한 사실이나 결정이 생기면 Issue 또는 문서에 반영한다.
7. 문서 변경이 필요한 경우에는 도메인 정본과 control-plane 문서를 구분해서 수정한다.

## 완료 조건

- 기준 Issue 범위의 구현이 반영되어 있다.
- 필요한 테스트와 검증이 수행되어 있다.
- 중요한 사실과 결정이 필요한 위치에 기록되어 있다.
