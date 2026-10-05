# Fullstack Starter

웹·모바일·데스크톱·API를 같은 계약과 업무 규칙으로 개발하는 TypeScript 모노레포다. 로그인한 사용자의 Project CRUD를 실제 PostgreSQL에 저장하며, 소스 템플릿과 같은 저장소에서 AI Skill/Plugin을 배포한다.

[Public GitHub Template](https://github.com/idghst/plugin-fullstack-app)에서 **Use this template**으로 새 저장소를 만들거나 clone한 뒤 아래 생성기를 사용할 수 있다.

## 구성

| 영역      | 선택                                 | 책임                                          |
| --------- | ------------------------------------ | --------------------------------------------- |
| Web       | Next.js 16 App Router / React 19     | 웹 페이지, 클라이언트 인증·CRUD               |
| Mobile    | Expo SDK 57 / Expo Router            | React Native 화면, SecureStore 토큰 어댑터    |
| Desktop   | Tauri 2 / Vite / React               | 데스크톱 화면, 최소 native capability         |
| API       | NestJS 11 / nestjs-zod               | 검증, JWT/refresh session, 소유자 권한        |
| Data      | PostgreSQL 17 / Drizzle              | schema, versioned migration, seed             |
| Workspace | pnpm 10 / Turborepo / TypeScript 6.0 | 고정 버전, 태스크와 패키지 경계               |
| AI        | Agent Plugins 1.0 / Codex / Claude   | skills-only workflow, architecture references |

정확한 버전은 각 `package.json`과 `pnpm-lock.yaml`이 원본이다. TypeScript 6.0.3은 Expo SDK의 권장 범위와 lint 도구 호환성을 함께 확인해 고정했다. NestJS 11은 nestjs-zod의 peer 범위를 기준으로 선택했다. 새 버전으로 올릴 때는 [ADR](docs/adr/README.md)과 전체 검증을 함께 갱신한다.

## 시작

Node.js 22.13 이상과 pnpm 10.32.1, Docker Compose가 필요하다. 아래는 저장소 루트에서 실행한다.

```sh
corepack enable
corepack prepare pnpm@10.32.1 --activate
pnpm install
pnpm env:setup
docker compose up -d --wait postgres
pnpm db:migrate
pnpm dev
```

Git 저장소에서는 선택적으로 `pnpm hooks:install`을 실행해 staged 파일의 비밀값·형식 guard를 설치한다. 생성된 프로젝트에는 Git 이력이 없으므로 `git init` 후 설치한다. hook은 CI와 실제 검증을 대체하지 않는다.

`env:setup`은 루트 `.env`에 무작위 JWT secret을 만들고 클라이언트에는 public API URL만 쓴다. 기존 파일은 덮어쓰지 않는다. 예시 DB 계정은 localhost 개발 전용이다. 운영 환경은 별도 secret과 DB 계정을 주입한다.

| 서비스              | 로컬 주소                         |
| ------------------- | --------------------------------- |
| Web                 | http://localhost:3000             |
| API                 | http://localhost:4000/api/v1      |
| OpenAPI             | http://localhost:4000/api/v1/docs |
| Desktop Vite        | http://localhost:5173             |
| PostgreSQL dev/test | localhost:55432 / localhost:55433 |

웹에서 이메일과 비밀번호로 계정을 생성한 뒤 Project를 생성·수정·삭제할 수 있다. seed는 임의의 기본 계정을 만들지 않는다. 가입한 이메일을 루트 `.env`의 `SEED_USER_EMAIL`로 설정한 다음 `pnpm db:seed`를 실행하면 그 사용자의 초기 Project 두 개를 만든다. 데이터가 이미 있으면 건너뛴다.

모바일과 데스크톱은 API가 실행된 상태에서 각각 시작한다.

```sh
pnpm dev:mobile
pnpm dev:desktop
```

모바일 실기기에는 `localhost` 대신 개발 컴퓨터의 LAN IP가 필요하다. Android emulator는 보통 `http://10.0.2.2:4000/api/v1`를 사용한다. `apps/mobile/.env`의 `EXPO_PUBLIC_API_BASE_URL`을 바꾼 뒤 Metro를 다시 시작한다. iOS/Android native 실행에는 해당 SDK가, Tauri에는 Rust와 [OS prerequisites](https://v2.tauri.app/start/prerequisites/)가 필요하다.

## 새 프로젝트 생성

```sh
pnpm create:project my-service
pnpm create:project api-service --no-web --no-mobile --no-desktop
pnpm create:project my-service --interactive
```

새 폴더는 **현재 디렉터리 아래** 생성하며 기존 경로를 덮어쓰지 않는다. root name만 바꾸고 `@starter/*` 내부 패키지 namespace는 유지한다. 앱을 제외하면 관련 dev/E2E 스크립트와 기존 lockfile을 제거하므로 새 폴더에서 `pnpm install`로 lockfile을 다시 만든다.

인증과 DB는 현재 Project 샘플의 필수 요소다. `--no-auth`, `--no-database`는 원인을 표시하며 중단한다. DB 없는 가짜 저장소를 생성하거나 플래그를 무시하지 않는다. 선택 옵션과 복사 제외 기준은 [생성기 문서](docs/generator.md)에 있다.

## 개발 명령

| 명령                           | 동작                                          |
| ------------------------------ | --------------------------------------------- |
| `pnpm dev`                     | 공유 패키지 build 후 web + API 개발 서버      |
| `pnpm dev:mobile`              | Expo 개발 서버                                |
| `pnpm dev:desktop`             | Tauri native 개발 창                          |
| `pnpm db:generate`             | Drizzle migration SQL 생성                    |
| `pnpm db:migrate`              | development DB migration 적용                 |
| `pnpm db:seed`                 | 등록된 사용자에 샘플 데이터 추가              |
| `pnpm lint` / `pnpm typecheck` | 코드·형식·타입 검사                           |
| `pnpm test`                    | 단위/계약/생성기/플러그인 테스트              |
| `pnpm test:integration`        | 별도 PostgreSQL의 API 통합 테스트             |
| `pnpm test:e2e`                | Playwright 웹 가입·인증·CRUD                  |
| `pnpm build`                   | JS 앱과 공유 패키지 build, Expo export        |
| `pnpm check`                   | lint + typecheck + test + build + 의존성 경계 |
| `pnpm audit`                   | production 의존성 보안 advisory 조회          |
| `pnpm plugin:package`          | skill과 manifest를 tar.gz로 검증·패키징       |

API 통합 테스트 전에 test DB를 시작한다. test DB는 별도 포트·DB 이름·임시 볼륨으로 development 데이터와 분리한다.

```sh
docker compose --profile test up -d --wait postgres-test
pnpm test:integration
pnpm test:e2e
```

`pnpm build`가 성공해도 native 앱의 실행·서명·설치가 확인된 것은 아니다. 플랫폼별 실제 검증 기준은 [테스트 문서](docs/testing.md)에 있다.

## AI Skill / Plugin

[fullstack-starter](skills/fullstack-starter/SKILL.md)은 기능 구현, 계약 변경, SI/SM 유지보수와 플랫폼 검증을 안내한다. 규칙 원본은 [AGENTS.md](AGENTS.md) 하나이며 [CLAUDE.md](CLAUDE.md)는 이를 참조한다.

`plugin.json`은 portable Agent Plugins 1.0이고 `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`은 같은 name/version의 compatibility manifest다. 제공하는 기능은 skill과 references다. 별도 MCP tool, hosted API, 자동 외부 권한은 선언하지 않는다.

GitHub 저장소를 marketplace로 등록한 뒤 `fullstack-starter@idghst-fullstack`을 설치한다. 저장소를 clone하는 것만으로 설치되지는 않는다.

Codex CLI:

```sh
codex plugin marketplace add idghst/plugin-fullstack-app
codex plugin add fullstack-starter@idghst-fullstack
codex plugin list --marketplace idghst-fullstack --available --json
```

Claude Code:

```sh
claude plugin marketplace add idghst/plugin-fullstack-app
claude plugin install fullstack-starter@idghst-fullstack
claude plugin list
```

Claude 세션에서는 `/plugin marketplace add idghst/plugin-fullstack-app`과 `/plugin install fullstack-starter@idghst-fullstack`을 사용할 수 있다. `/plugin` 패널에서 설치 상태를 확인한다. catalog 구조와 업데이트 명령은 [플러그인 문서](docs/plugin.md)에 있다.

```sh
pnpm plugin:package
tar -tzf artifacts/fullstack-starter-0.1.0.tar.gz
```

아카이브는 `fullstack-starter/` 디렉터리 하나만 포함한다. 이미 같은 파일이 있으면 덮어쓰지 않으므로 이전 artifact를 이동한 뒤 다시 실행한다. 설치 예시와 공개 범위는 [플러그인 문서](docs/plugin.md)에 있다.

## 문서

- [아키텍처와 의존성 방향](docs/architecture.md)
- [8개 기술 결정 ADR](docs/adr/README.md)
- [SI/SM 작업 규칙](docs/conventions.md)
- [DB와 migration](docs/database.md)
- [플랫폼별 검증](docs/testing.md)
- [생성기](docs/generator.md), [플러그인](docs/plugin.md)

Redis, 파일 저장소, 결제, 알림, 검색, AI, 라이선스 integration은 아직 구현하지 않았다. 실제 요구가 생기면 port와 adapter, 설정 검증, 장애 테스트를 추가한다.

## 검증 기록

2026-10-06 로컬 검증: `pnpm check`, 공유 코드 테스트 23개, 생성기·도구 테스트 21개, 실제 PostgreSQL API 통합 12개, Playwright 웹 E2E 1개, Expo iOS/Android/Web export, production API Docker 이미지의 non-root 실행과 health check를 확인했다. 브라우저에서 웹 가입·CRUD와 Desktop Vite 화면을 조작하고, iOS 26.4 simulator의 Expo Go에서 로그인·Project 생성·수정·삭제·로그아웃을 실행했다. 웹에서 만든 Project를 iOS에서 수정하고 Desktop 화면에서 변경 내용을 확인했다. 생성기로 별도 임시 경로에 만든 전체 프로젝트도 `pnpm install --frozen-lockfile`, `pnpm env:setup`, `pnpm check`를 통과했다.

[GitHub Actions 전체 검증](https://github.com/idghst/plugin-fullstack-app/actions/runs/37367731023)도 Ubuntu/Node.js 22에서 설치·check·PostgreSQL 통합·웹 E2E·Docker image build를 통과했다. [생성기 portability workflow](https://github.com/idghst/plugin-fullstack-app/actions/runs/37367730971)의 Windows/macOS job도 통과했다.

Tauri Rust native build/창 조작과 Android emulator 실행은 이 환경에서 확인하지 못했다. `pnpm build`의 desktop 결과는 Vite frontend이고 mobile 결과는 Expo export다. macOS/Windows Tauri native build를 실행할 수 있는 수동 GitHub Actions workflow를 제공한다.

## 알려진 의존성 문제

2026-10-06 `pnpm audit --prod`에는 Expo 계열의 전이 의존성 advisory 3개가 남는다. audit을 숨기거나 성공으로 처리하지 않는다.

| 의존성                                                                          | 영향과 현재 제약                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [node-forge 1.4.0](https://github.com/advisories/GHSA-86w9-cpqp-85rv)           | High, RSA signature verification. Expo CLI 경로이며 현재 upstream patched release가 없다. API 인증은 Node crypto를 사용한다.                                                                                                                                                                                      |
| [braces 3.0.3](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)               | High, 깊게 중첩된 pattern의 stack exhaustion. Expo Metro 파일 탐색 경로이며 patched release가 없다.                                                                                                                                                                                                               |
| [decode-uri-component 0.2.2](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) | Moderate, 비정상 percent-encoded 입력의 decoding DoS. Expo Router → query-string 경로다. 수정 버전 0.5.0은 ESM이며 현재 query-string의 CommonJS `require()`와 바로 호환되지 않아 강제 override하지 않았다. 외부 deep link 입력을 사용하는 서비스는 upstream 호환 업그레이드 또는 검증된 adapter patch가 필요하다. |

호환 가능한 `xcode → uuid`와 `@nestjs/swagger → js-yaml`은 patched release로 좁게 override했다. 업그레이드 시 `pnpm audit`, Expo 호환 검사와 전체 build를 다시 실행한다. Desktop Vite build에는 chunk 크기 경고가 있으며 실제 서비스 화면이 늘어나면 route 단위 분할을 적용한다.

## 라이선스

[MIT](LICENSE).
