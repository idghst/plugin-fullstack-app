# ADR 0003: Next.js App Router

- 상태: Accepted
- 결정일: 2026-10-06

## 맥락

웹에는 서버 렌더링 경계, routing, error/loading 상태가 필요하며 상호작용 기능은 client에서 동작한다.

## 결정

Next.js 16.3.8 App Router와 React 19.2.3을 선택한다. 서버 페이지와 상호작용 client component를 분리하고 웹/데스크톱의 Project React UI는 packages/project-ui에서 공유한다. DB 접근과 인증 업무 API는 별도 NestJS가 담당한다.

## 대안

Vite SPA도 가능하지만 웹의 서버 렌더링과 route conventions를 기본으로 제공하려고 Next를 선택했다. Next route handler에 업무 API를 중복 구현하지 않는다.

## 영향

use client 경계와 public/server env를 분리한다. 브라우저 인증은 memory token store를 사용하므로 새로고침 시 재로그인이 필요하다. 장기 세션 UX는 별도 BFF/httpOnly cookie 설계와 CSRF 검증이 필요한 변경이다.

## 근거

[Next.js App Router](https://nextjs.org/docs/app), [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
