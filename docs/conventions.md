# 작업 규칙

## SI: 새로운 시스템

한 번에 하나의 기능을 계약 → 업무 규칙 → Repository → API → 화면 순서로 완성한다. 각 slice에 입력 검증, 인증/권한, loading/error/empty 상태와 인수 시나리오를 포함한다. 공통화는 실제로 둘 이상의 소비자가 있고 API가 안정된 뒤 한다.

새 Domain은 업무 이름을 사용한다. HTTP DTO는 contracts에, Domain은 core에, SQL mapping은 Infrastructure에 둔다. controller나 React component에 업무 정책을 숨기지 않는다.

## SM: 기존 시스템

먼저 기존 성공/실패 동작과 데이터 조건을 재현한다. 오류를 regression test로 고정하고 최소 변경으로 해결한다. 공개 계약이나 migration이 바뀌면 이전 클라이언트·기존 행·롤백 가능성을 검토한다.

운영에서 이미 적용한 migration을 수정하지 않는다. 컬럼 추가는 가능한 한 호환성을 유지하고 backfill 이후 제약을 강화한다. 컬럼 삭제나 의미 변경은 소비자 전환을 먼저 완료한다. 파괴적 migration은 요청 대상과 영향을 명시한다.

## TypeScript와 코드

- strict 설정을 유지한다. `any`, `@ts-ignore`로 오류를 숨기지 않는다.
- 패키지는 공개 export를 사용하고 다른 패키지 `src/`를 직접 import하지 않는다.
- 오류는 공통 계약으로 변환하고 사용자 메시지와 진단 로그를 구분한다.
- DB/HTTP/native IO에는 명시적인 경계와 실패 처리가 있어야 한다.
- 새 dependencies는 정확한 버전으로 고정하고 pnpm lockfile을 함께 갱신한다.
- 기술·라이브러리 선택이 바뀌면 관련 ADR의 결정과 이유도 갱신한다.
- 문서에 써 둔 명령과 실제 package scripts를 일치시킨다.

## 리뷰와 완료

계약 영향, 소유자 권한, migration, 클라이언트 소비자, 설정/secret 처리, 실제 플랫폼 검증을 확인한다. 코드가 바뀌지 않은 문서·설정은 내용/diff로 검증한다. 코드 변경은 위험에 맞는 자동 테스트와 실제 화면 조작 결과를 보고한다.

AI는 추측한 실행 성공을 적지 않는다. unavailable SDK, test DB 미시작, 미확인 native build 등 남은 조건을 명시한다. 프로젝트 전체 포맷이나 관계없는 리팩터링을 요청에 끼워 넣지 않는다.
