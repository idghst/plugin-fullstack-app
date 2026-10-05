# Project Generator

`tooling/generators/create-project.mjs`는 Node.js builtins만 사용한다. 설치된 package API나 별도의 scaffold 서버에 의존하지 않는다.

```sh
pnpm create:project my-service
pnpm create:project web-service --no-mobile --no-desktop
pnpm create:project api-service --no-web --no-mobile --no-desktop
pnpm create:project my-service --interactive
pnpm create:project --help
```

name은 1–64자 소문자·숫자·hyphen이며 알파벳으로 시작한다. 절대경로, 상대경로 traversal, slash, uppercase를 허용하지 않는다. interactive는 TTY가 있어야 하며 CI에서는 name과 flag를 직접 전달한다.

## 옵션

| 옵션            | 결과                                                      |
| --------------- | --------------------------------------------------------- |
| 기본값          | API + Web + Mobile + Desktop + Auth + PostgreSQL          |
| `--no-web`      | web 폴더, dev:web, test:e2e 제거; dev에서 web filter 제거 |
| `--no-mobile`   | mobile 폴더와 dev:mobile 제거                             |
| `--no-desktop`  | desktop 폴더, dev:desktop, native desktop workflow 제거   |
| `--no-auth`     | 지원하지 않음을 명시하고 생성 전 중단                     |
| `--no-database` | 지원하지 않음을 명시하고 생성 전 중단                     |
| 알 수 없는 flag | 생성 전 오류                                              |

인증 없는 제품이나 DB 없는 제품은 요구사항에 맞춰 Project slice와 session adapter를 다시 설계해야 한다. 이 템플릿은 이를 처리하지 않은 채 옵션만 있다고 주장하지 않는다. 향후 이 옵션을 구현하면 contracts, server, UI, seed, integration/CI까지 제거하거나 실제 대체 adapter로 바꾸고 옵션별 실행 검증을 추가해야 한다.

## 안전과 결과

복사와 설정 변경은 현재 디렉터리의 staging 폴더에서 수행한다. 대상 폴더가 있으면 시작하지 않고, 준비가 끝나면 `mkdir`로 새 대상 디렉터리를 exclusive하게 확보한 뒤 staging 항목을 그 안으로 하나씩 이동한다. Windows에서도 기존 디렉터리를 교체하지 않는다. 항목 이동 중 오류가 나면 staging과 이번 생성에서 확보한 대상 디렉터리를 정리하며 기존 대상은 삭제하지 않는다. 프로젝트 전체가 한 번에 공개되는 atomic 작업은 아니므로, 성공 메시지가 나오기 전에 대상 파일을 사용하지 않는다.

생성기 CI는 Node.js 22에서 Linux, macOS, Windows를 검사한다. 회귀 테스트는 기존 디렉터리 교체를 거부하는 Windows 동작, 항목 이동 중 실패 시 정리, 기존 파일 보존을 포함한다.

source에서 등록된 template 디렉터리·설정만 복사한다. `.git`, dependencies, caches, build output, generated native ios/android, artifact, report, DB/binary/archive, credentials, private env와 symlink를 제외한다. 파일 하나가 5 MiB를 초과해도 제외한다. `.env.example` 및 이름이 같은 환경 example만 보존한다. 임의 source 파일의 내용까지 secret detector로 판정하는 도구는 아니므로 example에 실 secret을 쓰지 않는다.

root `package.json.name`만 요청한 이름으로 바꾼다. plugin name과 internal `@starter/*` namespace는 유지한다. UI 앱을 제외하면 기존 lockfile을 제거하여 stale importer를 피하고 `pnpm install`에서 재생성한다. 기본 전체 복사는 원본 lockfile을 유지한다.

marketplace catalog는 `.agents/plugins/marketplace.json`과 `.claude-plugin/marketplace.json`을 보존한다. `.agents` 아래의 다른 개인 설정·스킬은 복사하지 않는다. Next.js/Expo가 생성하는 `next-env.d.ts`, `expo-env.d.ts`는 제외하고 각 framework가 다시 생성하게 둔다.

출력 후 git history나 remote는 없다. 새 제품의 저장소를 직접 초기화하고 연결한다. 생성된 README는 기본 전체 템플릿의 설명을 포함하므로 제외한 앱의 명령은 실행하지 않는다.
