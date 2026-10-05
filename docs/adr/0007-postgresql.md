# ADR 0007: PostgreSQL 17

- 상태: Accepted
- 결정일: 2026-10-06

## 맥락

Users·Projects·Refresh Sessions는 관계와 transaction이 있는 영속 데이터다. 권한·세션 회전이 프로세스 재시작 후에도 일관되어야 한다.

## 결정

PostgreSQL 17을 Docker Compose의 dev/test 서비스로 제공한다. user-project/session 관계는 FK와 제약으로 관리하고 development/test는 DB 이름·포트·storage를 분리한다.

## 대안

SQLite는 간단하지만 production에 PostgreSQL을 사용할 때 동시성/SQL 차이를 가린다. 문서 DB와 in-memory 저장소는 현재 관계·transaction 요구에 맞지 않는다. Redis를 primary DB로 사용하지 않는다.

## 영향

DB URL은 서버 전용 secret이다. 운영은 별도 계정·backup·restore 정책을 결정한다. schema migration은 test DB와 기존 데이터에 검증하며 volume 삭제는 자동 수행하지 않는다.

## 근거

[PostgreSQL constraints](https://www.postgresql.org/docs/17/ddl-constraints.html), [Transactions](https://www.postgresql.org/docs/17/tutorial-transactions.html)
