# Fullstack Starter Agent Rules

이 파일이 저장소의 유일한 공통 Agent 규칙이다. `CLAUDE.md`는 이 파일을 참조한다. 사용자 지시와 실제 프로젝트 요구를 우선한다.

## 작업 시작

- 요청 범위를 정하고 `rg`로 관련 코드, package manifest, 테스트를 먼저 확인한다.
- 기본 답변은 한국어이며 코드·명령·경로·API 이름은 원문을 유지한다.
- 이 저장소를 사용할 때 [fullstack-starter skill](skills/fullstack-starter/SKILL.md)을 읽고 필요한 reference만 추가로 읽는다.
- 새 비즈니스 모델부터 만들지 말고 실행 중인 Project CRUD의 계약 → 업무 규칙 → 어댑터 → 화면 흐름을 따른다.
- 사용자 수정은 보존하고 요청에 직접 필요한 최소 변경을 한다. 의존성과 범용 추상화를 추가하기 전에 기존 코드와 native API를 확인한다.
- 독립된 조사·구현·리뷰 영역이 둘 이상이면 서브에이전트를 사용할 수 있다. 같은 파일의 동시 수정과 중첩 위임은 피한다.

## 의존성과 책임

- `packages/core`는 순수 Domain과 Application이다. NestJS, React, Drizzle, HTTP, 환경변수, 파일 시스템, 네트워크를 import하지 않는다.
- `packages/contracts`는 Zod 입력/출력 스키마와 API 타입의 단일 원본이다. DB 테이블 모델과 클라이언트 DTO를 같은 것으로 취급하지 않는다.
- UI는 `@starter/api-client`와 `@starter/contracts`를 사용한다. 앱 간 직접 import, 상대경로로 다른 패키지 내부 접근, 클라이언트의 `@starter/db` import를 금지한다.
- Infrastructure가 Repository port를 구현하고 Application에 주입한다. 소유자 권한은 서버가 인증한 user id로 검사한다.
- 웹/데스크톱은 `@starter/ui`의 shadcn 기반 HTML primitive를 재사용한다. Expo는 React Native UI를 사용한다. DOM 컴포넌트를 모바일에 억지로 공유하지 않는다.
- 비즈니스 이름이 있는 로직은 feature에 둔다. 재사용 증거가 없는 코드를 `utils`로 옮기지 않는다.

## 계약·보안·DB

- API를 바꾸면 계약 스키마, 서버 검증, API Client, 각 소비자와 테스트를 함께 확인한다. breaking change는 버전 또는 호환 경로를 설계한다.
- `/api/v1` prefix와 공통 오류 형식을 유지한다. raw SQL 오류, stack, password hash, refresh hash를 응답에 넣지 않는다.
- 브라우저의 토큰은 현재 구현처럼 메모리에 둔다. `localStorage` 저장을 새로 추가하지 않는다. 모바일 영속 저장은 SecureStore 경계를 사용한다.
- DB 변경은 `packages/db/src/schema.ts` → migration 생성 → SQL 검토 → 테스트 DB 검증 순서다. 공유 환경에서 `drizzle-kit push`를 사용하지 않는다.
- 데이터 손실·권한 확대·운영 migration은 사용자의 명시 요청 범위와 영향을 확인한다. 생성된 과거 migration을 수정하지 말고 새 migration을 추가한다.
- `.env`, credentials, access/refresh token, password와 비밀값을 출력·커밋·플러그인에 포함하지 않는다. `pnpm env:setup`은 기존 파일을 보존한다.

## 검증과 완료

- 업무 규칙·인증·생성기 안전성 변경은 실패하는 테스트를 먼저 만든다. UI 없는 문서·설정 수정은 diff와 내용 확인으로 충분하다.
- 변경 위험에 맞춰 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`를 실행한다. 패키지 경계는 `node tooling/scripts/check-boundaries.mjs`로 확인한다.
- 기능·코드 변경 완료 전에는 루트에서 `pnpm check`를 실행한다. 실패한 검증을 숨기거나 검사를 우회하지 않는다.
- API는 별도 PostgreSQL test DB로 통합 테스트한다. 웹은 브라우저로 실제 화면과 CRUD를 확인하고, 모바일은 시뮬레이터/에뮬레이터, 데스크톱은 Tauri 창에서 확인한다.
- Expo export, Vite build, Rust check는 native UI 실행 성공을 의미하지 않는다. 실행하지 못한 플랫폼과 원인을 사실대로 남긴다.
- 완료 보고는 변경점, 검증 명령/결과, 남은 한계만 간결하게 쓴다.
- 커밋·푸시가 요청되면 이번 세션 변경만 한글 제목으로 커밋하고 현재 브랜치를 push한다. 비밀값과 무관한 dirty 파일은 제외한다. force push와 자동 rebase를 하지 않는다.

## SI / SM 변경

- SI에서는 새 시스템의 계약·업무 규칙·DB migration·인수 시나리오를 한 vertical slice로 구현한다. 필요하지 않은 공통 모듈을 선행 제작하지 않는다.
- SM에서는 먼저 기존 재현 시나리오를 확보한다. 호환성을 유지하며 regression test와 배포/롤백 영향을 함께 검토한다.
- Redis, 파일 저장소, 결제, 알림, 검색, AI, 라이선스는 필요가 생긴 뒤 port와 실제 adapter를 추가한다. 비어 있는 module이나 가짜 integration을 만들지 않는다.
