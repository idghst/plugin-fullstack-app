# Architecture Reference

## 방향

```text
web / mobile / desktop
        |
        v
    api-client ---> contracts (Zod)
        |
        | HTTPS
        v
NestJS Presentation --> core Application --> core Repository port
                                               ^
                                               | implements
                                     Drizzle Infrastructure
                                               |
                                               v
                                          PostgreSQL
```

Source import 방향은 adapter → core다. runtime 호출은 use case가 주입된 Repository를 호출한다. core는 NestJS, React, Drizzle, HTTP, env, IO를 모른다.

apps는 다른 app을 import하지 않는다. shared contract는 packages/contracts, typed fetch는 packages/api-client, token store interface는 packages/auth에 둔다. DB를 client에 import하지 않는다. HTML primitive는 packages/ui, React Project 화면은 packages/project-ui에서 web/desktop이 공유하고 Expo는 React Native UI를 사용한다.

## feature 변경

1. 입력·출력·오류 계약과 권한 조건을 결정한다.
2. core의 업무 규칙과 port에서 실패 테스트를 먼저 확인한다.
3. Nest Controller에서 validation/transport를, Infrastructure에서 Drizzle mapping을 구현한다.
4. API Client에서 runtime 응답 검증과 소비자 타입을 연결한다.
5. 각 화면의 성공/loading/empty/error/unauthorized 흐름을 확인한다.

Source package의 공개 export만 사용한다. DTO와 DB schema를 동일한 타입으로 취급하지 않는다. 연결 지점은 Nest composition root이며 core에 decorator를 넣지 않는다.

## 새로운 integration

Redis·file storage·payment·notification·search·AI·license는 요구가 확인된 후 추가한다. application port → 실제 adapter → env validation → 장애 테스트를 같은 변경에 포함한다. 비어 있는 모듈과 BaseRepository 같은 추측성 공통화를 하지 않는다.
