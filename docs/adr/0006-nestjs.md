# ADR 0006: NestJS 11 + Zod contracts

- 상태: Accepted
- 결정일: 2026-10-06

## 맥락

업무 API는 여러 클라이언트가 소비하고 입력 검증·인증·DB lifecycle·OpenAPI를 일관되게 제공해야 한다.

## 결정

NestJS 11.2.7과 nestjs-zod 5.5.0을 사용한다. Zod DTO에서 validation/serialization/OpenAPI를 연결하고 /api/v1 prefix를 둔다. Controller는 core use case를 호출하며 DB repository는 주입한다.

## 대안

NestJS의 더 새 major는 선택한 nestjs-zod peer 범위와 맞지 않아 이번 구성에서 채택하지 않았다. Express 단독도 가능하지만 module/DI/lifecycle를 직접 반복 구현하게 된다.

## 영향

Nest decorator가 core에 침투하지 않게 adapter에서 composition한다. framework 변경 시 계약과 use case가 남아야 한다. dependency upgrade는 peer range와 실제 통합 테스트를 함께 확인한다.

## 근거

[NestJS migration guide](https://docs.nestjs.com/migration-guide), [nestjs-zod source](https://github.com/BenLorantfy/nestjs-zod)
