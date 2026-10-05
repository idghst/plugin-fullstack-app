# ADR 0002: pnpm workspace + Turborepo

- 상태: Accepted
- 결정일: 2026-10-06

## 맥락

여러 앱과 공유 패키지의 dependency와 build 순서를 재현해야 한다. 한 앱만 바뀌었을 때 전체 작업을 반복할 필요가 없어야 한다.

## 결정

pnpm 10.32.1 workspace, workspace:* dependencies, committed lockfile과 Turborepo를 사용한다. build는 dependency build 뒤에 수행하고 persistent dev는 cache하지 않는다. 환경에 의존하는 task는 실제 입력을 turbo 설정에 명시한다.

## 대안

npm workspace만으로 구성할 수도 있으나 이번 저장소는 task graph/cache를 함께 사용하는 pnpm/Turbo를 선택했다. Nx의 추가 generator/project configuration은 현재 크기에 필요하지 않다.

## 영향

workspace namespace와 lockfile이 내부 API다. 앱을 제외한 scaffold는 stale importer를 유지하지 않고 pnpm install로 새 lockfile을 만든다. cache key에 secret 원문을 넣지 않는다.

## 근거

[pnpm workspaces](https://pnpm.io/workspaces), [Turborepo task configuration](https://turbo.build/repo/docs/crafting-your-repository/configuring-tasks)
