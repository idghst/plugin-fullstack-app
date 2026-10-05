# Conventions Reference

대상 저장소의 AGENTS.md와 사용자 요구가 최우선이다. 기본 답변은 한국어, code/API/path는 원문을 유지한다. 관련 파일만 먼저 확인하고 기존 구현을 최소 변경한다.

## SI / SM

SI는 계약·업무 규칙·DB·API·화면·인수 검증을 한 vertical slice로 완성한다. SM은 기존 오류 재현부터 확보하고 regression을 만든 뒤 호환성을 유지하며 바꾼다. 기존 dirty 파일과 사용자의 수정은 보존한다.

interface/port는 실제 경계를 위해 만들고 모든 기능을 service/repository factory로 추상화하지 않는다. 기능 이름이 있는 코드는 해당 feature에 두며 utils는 프레임워크 독립의 작은 실제 재사용 함수에 제한한다.

## 코드와 패키지

strict TS를 유지하고 any/ts-ignore로 실패를 숨기지 않는다. packages는 공개 export를 통해 사용한다. app 간 import, 상대 경로 cross-package import, client의 db import는 금지한다. package manifests에 정확한 dependency version을 쓰고 lockfile을 함께 갱신한다.

API 계약 변경은 schema, server validation/OpenAPI, client, 소비자, 테스트를 함께 검토한다. root project name 변경과 `@starter/*` namespace 변경은 다른 작업이다. generator는 후자를 변경하지 않는다.

## Agent 작업

기능 명세가 불명확하면 이미 확인 가능한 코드와 요구를 읽고 안전한 부분부터 진행한다. 실제로 필요한 질문만 한다. 변경 범위를 나누는 경우 같은 파일을 동시에 수정하지 않는다.

secret/environment를 출력·커밋·복사하지 않는다. generator/package는 env example만 보존한다. 운영 데이터 손실·권한 변경·배포/공개는 사용자의 요청 범위와 영향을 확인한다.

완료 시 변경과 증거, 실행하지 못한 검증을 간단히 보고한다. 커밋·push는 사용자 요구에 따라 세션 변경만 처리하며 무관한 dirty 파일과 비밀은 제외한다.
