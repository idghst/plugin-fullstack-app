# Feature Spec 작성 템플릿

아래는 이 starter의 실제 Project slice를 바탕으로 한 완성 예시다. 새 기능을 만들 때 사용자의 요구와 기존 코드를 확인해 각 항목을 해당 기능에 맞게 다시 작성한다. 확인되지 않은 요구를 기본값처럼 추가하지 않는다.

## 목표와 사용자 행동

로그인한 사용자는 자기 Project의 이름과 설명을 관리한다. Project 목록에서 생성·조회·수정·삭제하고 작업 실패 시 사용자에게 원인을 표시한다.

## 계약과 업무 규칙

- Create: name 1–100자, trim; description 최대 2000자, 기본 빈 문자열.
- Update: name 또는 description 중 적어도 하나가 필요하다. unknown property는 거절한다.
- Response: UUID id, name, description, ISO datetime createdAt/updatedAt.
- List: items 배열이며 사용자가 소유한 행만 반환한다.
- 오류: VALIDATION_ERROR, UNAUTHORIZED, NOT_FOUND와 requestId 공통 형식.

## 권한과 데이터

ownerId는 access JWT에서 검증한 user id다. 클라이언트 body에 ownerId를 받지 않는다. 타인의 Project는 404로 처리한다. PostgreSQL의 user-project FK로 관계를 보장한다.

## 변경할 경계

contracts의 Zod schema → core의 ProjectService/ProjectRepository → API repository/controller → typed api-client → web/desktop shared React 화면 및 mobile native 화면 순서로 구현한다. 기존 API 소비자와 migration 영향은 함께 기록한다.

## 인수 시나리오

1. 가입/로그인한 A는 Project를 만들고 목록에서 조회한다.
2. A가 이름과 설명을 수정하면 재조회에 변경값이 나타난다.
3. 빈 이름과 빈 patch는 검증 오류로 거절된다.
4. B는 A의 목록/Project를 읽거나 수정/삭제할 수 없다.
5. access 만료 후 refresh가 회전하고 원래 요청은 한 번 재시도된다.
6. logout 후 새 보호 요청은 인증을 요구한다.
7. 삭제 후 목록에서 사라지고 재조회는 404다.

## 검증과 rollout

core/contracts 단위 테스트, owner/refresh/API integration, 브라우저 CRUD, 모바일/desktop 실제 조작을 확인한다. 변경된 플랫폼만 추가 검증하고 미실행 조건은 보고한다. schema 변경이 있으면 SQL migration 검토와 test DB 적용을 먼저 완료한다.
