# ADR 0008: Drizzle schema + versioned SQL migration

- 상태: Accepted
- 결정일: 2026-10-06

## 맥락

TypeScript schema와 실제 PostgreSQL SQL을 함께 검토하고 이력을 재현해야 한다.

## 결정

Drizzle ORM 0.45.3과 drizzle-kit으로 schema를 정의하고 versioned SQL migration을 생성·커밋·적용한다. Repository mapping은 API Infrastructure에 두고 core와 HTTP DTO에서 DB schema를 분리한다.

## 대안

Prisma도 가능하나 이번 구성은 generated client 없이 SQL에 가까운 query와 명시적 migration 검토를 선택했다. raw SQL만 쓰는 경우의 schema/type mapping 반복도 줄인다.

## 영향

ORM은 migration review와 권한 검증을 대체하지 않는다. 공유/운영 DB에 schema push를 하지 않는다. 적용된 migration을 수정하지 않고 새 파일로 변경한다. seed는 등록된 사용자에만 idempotent sample data를 추가한다.

## 근거

[Drizzle migrations](https://orm.drizzle.team/docs/migrations), [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
