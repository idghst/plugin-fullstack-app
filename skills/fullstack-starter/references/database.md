# Database Reference

PostgreSQL을 사용하며 schema와 SQL migration은 `packages/db`에 둔다. application core나 client는 Drizzle을 import하지 않는다.

## 개발과 테스트

dev DB는 localhost:55432/`starter`, test는 localhost:55433/`starter_test`로 분리한다. test DB는 test profile과 임시 storage를 사용한다. 테스트에서 development DB를 초기화하지 않는다.

```sh
pnpm env:setup
docker compose up -d --wait postgres
pnpm db:migrate
docker compose --profile test up -d --wait postgres-test
pnpm test:integration
```

## migration

schema.ts를 바꾼 뒤 `pnpm db:generate`로 SQL을 생성하고 내용을 검토한다. FK/index/unique/nullability, 데이터 backfill, lock과 rollback 영향도 확인한다. 과거 적용된 파일을 수정하지 않는다. 공유/운영 DB에는 schema push를 사용하지 않는다.

ORM은 소유자 권한을 자동 해결하지 않는다. Project query는 ownerId 조건을 포함하고 user-project-session 관계를 DB 제약으로 보완한다. session rotation 같은 동시성 경계는 transaction으로 처리한다.

## seed와 비밀

가입한 사용자의 이메일을 `SEED_USER_EMAIL`에 설정하고 `pnpm db:seed`로 빈 사용자에게 sample Project 두 개를 만든다. seed는 기본 관리자/비밀번호를 만들지 않는다.

DATABASE_URL과 비밀값은 server/tooling 전용이다. env setup은 무작위 JWT secret을 local ignored 파일에 만들며 existing 파일을 보존한다. secret이나 connection string을 로그와 artifact에 출력하지 않는다. volume 삭제와 production 데이터 수정은 요청 대상과 영향을 확인한다.
