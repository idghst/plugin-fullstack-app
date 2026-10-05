# Database

개발 PostgreSQL은 Docker Compose의 `postgres` 서비스이며 127.0.0.1:55432에 바인딩한다. test는 별도 `postgres-test`, 55433, `starter_test`를 사용한다. 개발 데이터는 named volume에 남고 test 데이터는 tmpfs에 둔다. `docker compose down -v`는 개발 데이터를 삭제하므로 초기화가 명시된 경우에만 실행한다.

schema 원본은 `packages/db/src/schema.ts`다. Users, Projects, Refresh Sessions가 실제 SQL migration으로 생성된다. Project는 owner user와 FK 관계를 가지며 refresh session에는 opaque token hash를 저장한다.

## 변경 순서

```sh
pnpm db:generate
# packages/db/migrations/*.sql 을 검토한다.
pnpm db:migrate
```

schema 변경을 generate에 전달하려면 먼저 `pnpm env:setup`을 완료한다. migration은 source control에 넣고 적용 이력은 Drizzle journal로 관리한다. 운영에서 직접 schema push를 하거나 과거 migration을 편집하지 않는다.

빈 DB, 이전 schema의 DB, 기존 데이터가 있는 DB에서 변경을 검증한다. 운영 rollout은 deploy와 분리해 계획한다. migration 실패는 이후 서버를 시작하기 전에 해결하고, 반영되지 않은 migration을 성공으로 기록하지 않는다.

## Seed

웹 또는 API로 가입한 계정의 이메일을 `.env`의 `SEED_USER_EMAIL`에 설정한 뒤 `pnpm db:seed`를 실행한다. 사용자에게 데이터가 없을 때만 welcome Project 두 개를 넣는다. seed는 기본 비밀번호, 관리자 계정 또는 운영 샘플 데이터를 만들지 않는다.

## 환경

`DATABASE_URL`은 서버와 db tooling에서만 사용한다. public frontend 변수로 DB URL을 전달하지 않는다. integration test는 `TEST_DATABASE_URL`의 별도 test DB를 대상으로 한다. test 코드에서 production/development DB를 지우지 않는다.
