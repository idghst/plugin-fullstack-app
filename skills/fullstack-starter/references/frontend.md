# Frontend Reference

Web은 Next.js App Router와 React다. 기본 페이지는 서버 경계를 유지하고 로그인·Project CRUD 상호작용은 client component로 둔다. shared React 화면은 `packages/project-ui`, shadcn 기반 button/input 등 DOM primitive는 `packages/ui`다.

## 데이터와 상태

API 호출은 `@starter/api-client`에서 가져온 client를 사용하고 token store를 주입한다. API response는 Zod contracts로 runtime 검증한다. URL·body·오류 처리를 컴포넌트마다 반복하지 않는다.

상태에는 loading, empty list, field validation, network failure, unauthorized, successful mutation을 포함한다. 생성/수정/삭제 중 중복 제출을 막고 성공 후 실제 서버 데이터를 반영한다. 삭제 대상은 사용자가 식별할 수 있게 표시한다.

웹/desktop의 memory store는 로그인·refresh·로그아웃 흐름을 공유하나 새로고침 후 토큰을 복원하지 않는다. localStorage에 bearer token을 저장하는 변경은 추가하지 않는다. 지속 로그인은 BFF/httpOnly cookie와 CSRF 등 별도 설계가 필요한 기능이다.

## 경계

`API_BASE_URL`은 server config이고 `NEXT_PUBLIC_API_BASE_URL`은 browser에 노출되는 URL이다. DB URL과 JWT secret을 public 변수로 전달하지 않는다. server import가 client bundle에 들어가지 않게 use client 경계를 확인한다.

UI에 `@starter/db`, NestJS, Node crypto를 import하지 않는다. auth 권한은 서버가 결정한다. client route guard만으로 데이터를 보호했다고 판단하지 않는다.

## 검증

`pnpm --filter @starter/web build`, `pnpm test:e2e`와 브라우저에서 실제 가입/로그인/Project 생성·수정·삭제·로그아웃을 확인한다. 접근성 label, keyboard focus, error message와 mobile viewport도 변경한 화면에서 확인한다. static typecheck를 UI 통과로 보고하지 않는다.
