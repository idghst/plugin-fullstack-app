# Architecture

## 디렉터리와 의존성

```text
fullstack-starter/
|-- apps/
|   |-- web/              Next.js App Router
|   |-- mobile/           Expo Router + React Native
|   |-- desktop/          React + Vite + Tauri Rust shell
|   '-- api/              NestJS composition root + adapters
|-- packages/
|   |-- core/             Domain rules + Application + Repository port
|   |-- contracts/        Zod input/output schemas + API types
|   |-- api-client/       Typed fetch + refresh retry
|   |-- auth/             Token store boundary + memory adapter
|   |-- db/               Drizzle schema, connection, migration, seed
|   |-- ui/               shadcn-based HTML primitives
|   |-- project-ui/       Shared React Project CRUD screens (web/desktop)
|   |-- config/           Shared public runtime config validation
|   |-- utils/            Small framework-independent helpers
|   |-- tsconfig/         Strict TS configurations
|   '-- eslint-config/    Shared lint rules
|-- tooling/              Generator + env setup + package validation
|-- skills/               fullstack-starter + conditional references
|-- docs/adr/             Technology decisions
'-- AGENTS.md             Single canonical agent rules
```

```text
       Next.js web       Expo mobile       Tauri desktop
            |                 |                  |
            +-----------------+------------------+
                              v
                   @starter/api-client
                     |             |
                     v             v
             @starter/contracts  @starter/auth
                     |              (token store)
                     | HTTPS / JSON
                     v
                  NestJS Controller       Presentation
                     |
                     v
             Application use case         core / framework-free
                     |
                     v
               Repository port            Domain model / rules
                     ^
                     | implements
             Drizzle repository           Infrastructure (apps/api)
                     |
                     v
                 PostgreSQL                packages/db schema

@starter/ui ------> web + desktop HTML only
@starter/project-ui -> shared React Project CRUD + UI primitives
React Native UI --> mobile only

Source dependency: adapters --> Application/Domain
Runtime data flow: Controller --> use case --> injected repository
```

Domain은 framework를 모른다. 업무 조건, Project model, Repository interface를 core에 둔다. Application은 use case를 조율하고 HTTP나 SQL의 형태를 다루지 않는다. Presentation은 입력 검증과 transport 변환, Infrastructure는 DB·crypto·network adapter를 담당한다.

## 경계 규칙

- apps는 다른 app의 구현을 import하지 않는다. 공통 로직이 실제로 필요하면 packages로 추출한다.
- core는 NestJS/React/Drizzle 또는 환경변수/네트워크를 참조하지 않는다. date/id 같은 외부 값도 필요한 경계에서 전달한다.
- contracts는 API schema의 원본이다. HTTP wire의 date는 명시적인 문자열 형식을 사용하고 DB Date와 구분한다.
- api-client는 platform-independent fetch에 의존한다. SecureStore, Tauri IPC, DOM storage를 직접 import하지 않는다.
- db는 서버만 사용한다. 웹 bundle, Expo, Tauri renderer에 connection string과 DB 라이브러리를 넣지 않는다.
- ui는 DOM 컴포넌트만 공유한다. 모바일의 상호작용과 접근성은 React Native에서 별도로 구현한다.
- 인증 권한은 server에서 enforce한다. 클라이언트에서 owner id를 숨기는 것만으로 보호됐다고 판단하지 않는다.

## Project vertical slice

사용자가 로그인하면 API는 서명된 짧은 access JWT와 회전 가능한 opaque refresh token을 발급한다. DB에는 refresh 원문 대신 hash와 session 수명을 저장한다. 클라이언트는 token store를 주입받은 API Client로 Project를 호출한다. access 만료 시 한 번 refresh하고 원래 요청을 한 번 재시도한다.

Controller에서 검증한 Project 입력이 use case로 들어간다. 서버가 인증한 user id를 repository 조회 조건에 포함하며 다른 사용자 소유의 id는 존재 여부를 노출하지 않는 404로 처리한다. DB는 user/project/session 관계와 제약을 저장한다.

## 확장

Redis는 캐시·분산 rate limit 같은 실제 요구가 있을 때, object storage는 파일 upload 요구가 있을 때 추가한다. 결제/알림/검색/AI/라이선스도 외부 서비스와 업무 규칙이 확인된 뒤 port를 설계한다. 필요한 경우 feature의 Application port를 추가하고 adapter를 API composition root에서 주입한다. 공통의 추상 BaseRepository나 빈 module을 미리 만들지 않는다.
