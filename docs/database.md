# Database

기본값은 기존 Supabase/PostgreSQL에 연결하는 `external`이다. `pnpm env:setup`은 private `.env`의 DB URL을 빈 값으로 만들므로 서비스용 `DATABASE_URL`과 별도 `TEST_DATABASE_URL`을 직접 설정한다. URL에는 DB 접속 계정만 사용하며 브라우저/앱에 넘기지 않는다. Supabase를 DB로 연결해도 인증은 현재 API의 자체 로그인/JWT/session 구현이다.

로컬 DB를 원하는 경우 `pnpm env:setup --database local`로 선택한다. Docker Compose `postgres`는 127.0.0.1:55432, `postgres-test`는 55433/`starter_test`다. 개발 데이터는 named volume에 남고 test는 tmpfs다. 기존 env는 보존하므로 선택만 바꿔도 기존 URL을 덮어쓰지 않는다. `docker compose down -v`는 개발 데이터를 삭제하므로 명시된 경우에만 실행한다.

기존 운영 Supabase에서는 서비스별 별도 DB와 least-privilege runtime 계정을 우선 검토한다. 현재 테이블/FK/migration은 `public` 기준이며 arbitrary schema를 자동 격리하지 않는다. 같은 DB에서 schema를 나누려면 모델·FK·migration을 함께 바꿔야 한다. 기존 table 이름 충돌과 Data API 노출 여부를 먼저 확인한다. 외부 앱은 HTTPS API만 호출하며 privileged Supabase key를 포함하지 않는다.

schema 원본은 `packages/db/src/schema.ts`다. Users, Projects, Refresh Sessions가 실제 SQL migration으로 생성된다. Project는 owner user와 FK 관계를 가지며 refresh session에는 opaque token hash를 저장한다.

## 변경 순서

```sh
pnpm db:generate
# packages/db/migrations/*.sql 을 검토한다.
pnpm db:migrate
```

schema 변경을 generate에 전달하려면 먼저 `pnpm env:setup`을 완료한다. migration은 source control에 넣고 적용 이력은 Drizzle journal로 관리한다. 운영에서 직접 schema push를 하거나 과거 migration을 편집하지 않는다.

migration은 자동 개발 시작/production 프로세스 시작과 분리한다. DDL 권한의 migration 계정과 CRUD 권한의 runtime 계정도 분리한다. 제공 권한 SQL 예시는 실제 대상 role과 app 테이블을 검토한 뒤 수동 적용하며 기존 Supabase 권한을 전역 변경하지 않는다. 연결 URL을 바꾸는 것만으로 Docker DB의 데이터가 Supabase로 복사되지 않으며 이전은 별도 backup/restore와 검증 작업이다.

`DATABASE_MIGRATION_URL`이 설정되면 migration/generation은 이 별도 DDL 계정을 사용한다. runtime에는 `DATABASE_URL`만 필요하다. external 환경 생성은 `DATABASE_SSL_MODE=verify-full`, local은 `disable`이다. 외부 production DB는 인증서 검증을 요구하며 필요하면 `DATABASE_SSL_CA_FILE`로 CA 경로를 설정한다. 같은 서버의 private loopback DB는 실제 연결 경로를 확인한 뒤 `disable`을 사용할 수 있다. URL의 ssl 관련 query parameter 대신 명시 환경변수를 사용한다. role/RLS 예시는 `tooling/deploy/database-runtime-role.example.sql`이며 자동 migration이 아니다. RLS의 runtime role 정책이 사용자별 권한 검사를 대신하지 않는다.

빈 DB, 이전 schema의 DB, 기존 데이터가 있는 DB에서 변경을 검증한다. 운영 rollout은 deploy와 분리해 계획한다. migration 실패는 이후 서버를 시작하기 전에 해결하고, 반영되지 않은 migration을 성공으로 기록하지 않는다.

## Seed

웹 또는 API로 가입한 계정의 이메일을 `.env`의 `SEED_USER_EMAIL`에 설정한 뒤 `pnpm db:seed`를 실행한다. 사용자에게 데이터가 없을 때만 welcome Project 두 개를 넣는다. seed는 기본 비밀번호, 관리자 계정 또는 운영 샘플 데이터를 만들지 않는다.

## 환경

`DATABASE_URL`은 서버와 db tooling에서만 사용한다. public frontend 변수로 DB URL을 전달하지 않는다. integration test는 `TEST_DATABASE_URL`의 별도 test DB를 대상으로 한다. test 코드에서 production/development DB를 지우지 않는다.
