# 검증

## 자동 검사

`pnpm env:setup`의 기본 external은 별도 TEST_DATABASE_URL을 직접 설정한다. 로컬 Docker 테스트 환경을 새로 만들 때는 `pnpm env:setup --database local`을 먼저 실행한다. 기존 `.env`는 덮어쓰지 않는다.

```sh
# POSIX shell: replace these with the real production API when validating a release.
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1 \
EXPO_PUBLIC_API_BASE_URL=https://api.example.com/api/v1 \
VITE_API_BASE_URL=https://api.example.com/api/v1 pnpm check
# Optional local test DB; configure TEST_DATABASE_URL separately for external DB.
docker compose --profile test up -d --wait postgres-test
pnpm test:integration
pnpm test:e2e
```

fresh `env:setup`은 HTTP localhost 개발 주소를 만든다. production build를 포함하는 `check`에는 위처럼 세 HTTPS public API URL을 주입한다. `api.example.com`은 컴파일 검사 예시이며 연결 가능한 운영 API의 증거가 아니다. release UI 검증에는 실제 API 주소가 필요하다. PowerShell에서는 각 변수를 `$env:NEXT_PUBLIC_API_BASE_URL`, `$env:EXPO_PUBLIC_API_BASE_URL`, `$env:VITE_API_BASE_URL`에 먼저 설정하고 `pnpm check`를 실행한다.

`check`는 lint, 타입, 단위 테스트, JS build 및 package boundary 검사다. 자동 API integration은 HTTP 검증·권한·CRUD·refresh/logout을 실제 PostgreSQL에서 확인한다. Playwright는 브라우저 가입/로그인과 Project CRUD를 확인한다.

## 변경별 기준

| 변경             | 필요한 검증                                                 |
| ---------------- | ----------------------------------------------------------- |
| core 규칙        | 실패 regression 또는 TDD + 단위 테스트                      |
| contracts/client | 입력/출력 schema, HTTP 오류, refresh/retry 소비자           |
| DB/API           | 별도 DB migration + 실제 HTTP 통합                          |
| Web              | build + 브라우저에서 성공/오류/CRUD 화면 조작               |
| Mobile           | export/typecheck + iOS simulator 또는 Android emulator 조작 |
| Desktop          | frontend build + Tauri native 창의 인증·CRUD 조작           |
| Generator        | overwrite, traversal, secret exclusions, 옵션별 output      |
| Plugin           | manifest 일치, frontmatter, archive 내용·secret 제외        |
| 단순 문서/설정   | 내용, diff와 링크 확인                                      |

## Native

```sh
pnpm --filter @starter/mobile ios
pnpm --filter @starter/mobile android
pnpm dev:desktop
pnpm --filter @starter/desktop build:native
```

Expo export는 native 앱 설치나 SecureStore의 기기 동작을 증명하지 않는다. Vite build는 Rust shell/capability 검증을 대체하지 않는다. native 실행은 실제 화면, 가입/로그인, 데이터 생성·수정·삭제·로그아웃을 조작하고 결과를 확인한다.

도구가 없는 경우 성공으로 표시하지 말고 SDK/Rust/OS 조건과 수행한 검증 범위를 기록한다. CI에서 실행 가능한 headless 검사와 사람이 수행하는 native 인수는 구분한다.

2026-10-06 [native desktop CI](https://github.com/idghst/plugin-fullstack-app/actions/runs/37368661201)에서 macOS/Windows `tauri build`를 모두 확인했다. 이 결과는 Rust 컴파일과 bundling 검증이며 Tauri 창의 수동 인수를 뜻하지 않는다. iOS 26.4 simulator에서는 Expo Go로 로그인·Project CRUD·로그아웃을 실제 조작했다.

## 데이터와 비밀

test DB는 development와 분리하고 각 테스트는 자신이 만든 데이터만 정리한다. test artifact에 password/token/환경변수가 노출되지 않는지 확인한다. 개발 DB의 초기화나 운영 migration을 테스트의 부수 효과로 수행하지 않는다.
