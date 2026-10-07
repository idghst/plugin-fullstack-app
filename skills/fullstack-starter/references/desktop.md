# Desktop Reference

Tauri 2 Rust shell 안에 React/Vite renderer를 사용한다. web과 desktop은 packages/project-ui의 React Project 화면과 packages/ui의 primitive를 공유한다. 모바일과 renderer는 직접 UI import하지 않는다.

## 경계와 권한

업무 API는 HTTPS/shared api-client로 호출한다. renderer에 DB URL, SQL client, password hash 함수를 넣지 않는다. 기본 token store는 memory이며 재실행 시 지속 로그인이 필요하면 OS credential adapter를 별도 구현·검증한다.

Tauri capability는 필요한 권한만 명시한다. 파일 시스템, shell, URL opener, updater를 추가할 때 user action과 scope를 제한하고 Rust command 입력을 검증한다. remote 콘텐츠에 native 권한을 부여하지 않는다.

`VITE_API_BASE_URL`은 public API URL이다. CORS의 origin과 Tauri CSP connect-src를 함께 검토한다. source app의 현재 Tauri 설정을 확인하며 넓은 wildcard로 무조건 해결하지 않는다.

production frontend/native build는 HTTPS API URL을 요구한다. `build:native`가 지정한 API origin만 연결하도록 generated CSP config를 생성한다. `.tauri-build`는 복사/커밋하지 않는다. release 설치 파일은 GitHub Releases에 배포할 수 있으며 macOS 서명/notarization, Windows 서명 비용과 경고를 [deployment](deployment.md)에서 검토한다. unsigned build나 Vite 성공을 정식 설치 검증으로 설명하지 않는다.

## 실행과 확인

```sh
pnpm dev:desktop
pnpm --filter @starter/desktop build
pnpm --filter @starter/desktop build:native
```

Tauri에는 Rust, OS webview/build dependencies가 필요하다. Vite의 화면 테스트는 frontend 검증이고 native 창의 권한·웹뷰·packaging 검증과 구분한다. native 창에서 인증·Project CRUD·logout·창 resize를 실제 조작한다. 서명/배포는 요청이 있을 때 별도 수행한다.
