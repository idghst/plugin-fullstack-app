# ADR 0005: Tauri 2 + React/Vite

- 상태: Accepted
- 결정일: 2026-10-06

## 맥락

데스크톱은 native 창과 OS integration이 필요하나 기본 샘플의 업무 처리는 같은 HTTP API를 사용한다.

## 결정

Tauri 2.12.1과 React/Vite renderer를 선택한다. native shell은 최소 capability로 시작하고 API 통신은 shared api-client를 통해 한다. 현재 토큰은 memory store에 둔다.

## 대안

Electron도 가능하지만 이번 starter는 Tauri의 system webview와 명시적인 permission/capability 경계를 기본으로 선택했다. 서버 전용 DB/crypto dependency를 renderer에 넣지 않는다.

## 영향

Rust와 OS-specific build dependencies가 필요하다. Vite build 성공은 native shell의 실행 성공이 아니다. 파일·shell·credential 기능을 추가할 때 command scope와 capability를 함께 검토한다.

## 근거

[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), [Tauri capabilities](https://v2.tauri.app/security/capabilities/)
