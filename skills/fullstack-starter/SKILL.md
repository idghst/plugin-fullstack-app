---
name: fullstack-starter
description: Use when creating or maintaining a TypeScript fullstack product with Next.js web, Expo mobile, Tauri desktop, NestJS API, shared Zod contracts and PostgreSQL/Drizzle; also use for SI/SM feature work, architecture boundaries and starter generation in this repository.
---

# Fullstack Starter

이 스킬은 실행 가능한 저장소의 작업 흐름을 안내한다. MCP server나 배포된 서비스는 제공하지 않는다. 호스트의 파일·명령·브라우저 도구를 사용하며 설치된 다른 도구를 있다고 가정하지 않는다.

## 먼저 확인할 것

1. 작업 대상 저장소의 `AGENTS.md`, `package.json`, `pnpm-workspace.yaml`을 읽는다. 이 플러그인이 설치된 경로와 사용자 프로젝트 경로를 혼동하지 않는다.
2. 요청을 새 시스템 구축(SI), 기존 시스템 유지보수(SM), 플랫폼 작업, 생성기 작업 중 하나로 정하고 필요한 실제 파일을 확인한다.
3. 공통 경계는 [architecture](references/architecture.md), 코드 규칙은 [conventions](references/conventions.md), 검증은 [testing](references/testing.md)을 따른다.
4. 필요한 reference만 읽는다: [backend](references/backend.md), [frontend](references/frontend.md), [mobile](references/mobile.md), [desktop](references/desktop.md), [database](references/database.md).

작업 명세는 [feature spec 완성 예시](templates/feature-spec.md)를 해당 요청에 맞게 작성한다. manifest와 실제 명령을 빠르게 확인할 때는 [read-only inspector](scripts/inspect-project.mjs)를 실행한다. 스크립트는 private env를 읽거나 명령을 실행하지 않는다.

```sh
node /absolute/plugin/path/skills/fullstack-starter/scripts/inspect-project.mjs /absolute/project/path
```

보고서의 missingCommands는 작업 대상의 차이를 보여주며 무조건 새로운 script를 추가하라는 뜻은 아니다.

## 기능 구현 순서

- 한 기능의 성공/오류/권한 시나리오를 정한다. Project 샘플에서는 로그인한 사용자만 자기 Project를 생성·조회·수정·삭제한다.
- `@starter/contracts`에서 입력과 출력 Zod 스키마를 정의하고 소비자를 찾는다.
- `@starter/core`에서 프레임워크를 모르는 업무 규칙과 Repository port를 정의한다. 규칙/인증 경계는 실패 테스트를 먼저 확인한다.
- NestJS Application에서 port를 호출하고 Infrastructure에서 Drizzle을 사용한다. Controller는 HTTP 변환과 검증에 집중한다.
- `@starter/api-client`에 typed endpoint를 연결한다. 토큰 저장은 플랫폼 어댑터에 남기며 브라우저에 Node 패키지를 넣지 않는다.
- 실제 웹/모바일/데스크톱 화면을 연결한다. 상태·오류·로딩·권한 거절·로그아웃을 처리한다.
- [testing](references/testing.md)의 해당 명령과 실제 플랫폼 조작으로 확인한다. 수행하지 못한 검증은 그대로 보고한다.

## 생성·플러그인 작업

원본 저장소에서 `pnpm create:project my-service`를 실행하면 현재 디렉터리 아래 새 프로젝트를 만든다. `--no-web`, `--no-mobile`, `--no-desktop`과 `--interactive`를 지원한다. 기존 경로를 덮어쓰거나 폴더 밖으로 나가지 않는다. 인증/DB는 샘플의 필수 경계이므로 `--no-auth`와 `--no-database`는 오류로 중단한다. 이 플래그를 작동한다고 설명하지 않는다.

생성 후 `pnpm install`, `pnpm env:setup`, PostgreSQL 시작, migration, seed 순서로 진행한다. UI 앱을 제외하면 lockfile을 재생성해야 한다. package namespace `@starter/*`는 내부 계약이므로 root 프로젝트 이름만 바꾼다.

플러그인 수정 시 root `plugin.json`, `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`의 name/version/description을 함께 갱신하고 `pnpm plugin:package`로 검증·패키징한다. 설치·계정 업로드·디렉터리 공개는 사용자가 요청한 범위에서만 수행한다.

## SI / SM

SI는 계약에서 화면까지 하나의 작은 vertical slice를 완성하고 다음 기능으로 간다. SM은 변경 전 재현과 회귀 테스트를 확보하며 기존 데이터와 API 소비자 호환성을 보존한다. 추가 인프라가 필요할 때만 port, 설정 검증, 실제 adapter, 장애 시나리오를 구현한다. 미래 module을 stub으로 채우지 않는다.
