# Backend Reference

API는 NestJS 11이며 모든 업무 endpoint는 `/api/v1` 아래에 둔다. OpenAPI는 `/api/v1/docs`다. 최신 실제 위치는 앱 manifest와 source에서 확인한다.

## 책임

- Presentation: Controller, Zod DTO 검증, auth guard, status code와 serialization.
- Application/Domain: `packages/core`의 ProjectService, 업무 규칙, Repository port.
- Infrastructure: `apps/api`의 Drizzle repository와 인증 crypto/session storage.
- Composition: Nest module/provider에서 port 구현체를 use case에 전달한다.

Controller에서 SQL을 쓰거나 React가 DB repository를 호출하지 않는다. API wire date와 DB Date는 repository mapping에서 명시적으로 변환한다.

## 인증과 권한

email/password 등록·로그인은 서버가 검증하며 비밀번호는 hash만 저장한다. 짧은 access JWT와 opaque refresh token을 발급하고 DB에 refresh hash를 저장한다. refresh는 원자적으로 회전하며 이미 사용되거나 만료/폐기된 token은 거절한다. logout은 session을 폐기한다.

ownerId는 요청 body를 믿지 않고 auth guard가 검증한 user id에서 얻는다. Project 목록/조회/수정/삭제의 SQL 조건에 ownerId를 포함한다. 타인의 id에는 존재를 노출하지 않는 404를 반환한다.

## 계약과 운영

Zod DTO는 shared contracts에서 만들고 validation, serialization, OpenAPI를 같은 원본으로 연결한다. 오류는 `code/message/requestId` 공통 형식으로 변환하며 stack, SQL, token, hash를 내보내지 않는다. request log는 request id/method/path/status/duration 중심이며 authorization/body를 기록하지 않는다.

환경은 서버 시작 시 검증한다. JWT secret은 최소 길이를 갖는 무작위 값이고 DB URL은 server-only다. CORS는 구체적인 허용 origin을 사용한다. 새 인증 endpoint에는 rate limit, account recovery, 이메일 검증 같은 production 요구를 별도로 검토한다.

API를 바꾸면 contracts, client, 소비자, integration을 함께 확인한다. 테스트는 development와 다른 PostgreSQL DB를 사용하고 자신이 만든 계정/Project만 정리한다.
