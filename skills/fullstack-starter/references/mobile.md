# Mobile Reference

Expo SDK 57 / Expo Router / React Native를 사용한다. SDK가 권장하는 React, React Native, Router, native packages를 함께 고정하며 `expo install --check`로 버전 일치를 확인한다.

## 공유와 저장

contracts/api-client/auth interface를 재사용하되 DOM component를 import하지 않는다. React Native UI와 navigation은 mobile app에서 구현한다. token store는 native에서 expo-secure-store를 사용하고 web preview에서는 memory store로 대체한다.

access/refresh/user를 한 JSON record로 저장해 refresh 회전 중 일부 credential만 바뀌는 상태를 피한다. get에서 저장값을 shared tokensSchema로 검증하고 손상된 값은 삭제한다. logout은 서버 세션 폐기와 local credential 정리를 처리한다.

## API 주소

`apps/mobile/.env`의 `EXPO_PUBLIC_API_BASE_URL`은 public URL이다. localhost가 가리키는 기기는 실행 환경에 따라 다르다. iOS simulator는 localhost, Android emulator는 개발 PC에 접근할 때 일반적으로 10.0.2.2, 실기기는 개발 PC LAN IP를 사용한다. URL 변경 후 Metro를 다시 시작한다.

JWT secret·DB URL·서비스 비밀키를 EXPO_PUBLIC 변수에 넣지 않는다. API unavailable 상태와 session restore 실패도 화면으로 처리한다.

production 빌드는 HTTPS API URL을 요구한다. 운영 배포 기본은 Expo SDK 로컬 빌드와 스토어 업데이트이며 EAS cloud build/OTA는 선택이다. `prebuild:release` 후 Xcode archive/sign/upload 또는 Android release signing과 Gradle bundleRelease를 수행한다. `ios:release`/`android:release` 실행이 스토어 배포 완료를 뜻하지 않는다. EAS의 무료 quota·사용 용도·매출 조건은 [deployment](deployment.md)를 확인한다.

## 실행

```sh
pnpm dev:mobile
pnpm --filter @starter/mobile ios
pnpm --filter @starter/mobile android
pnpm --filter @starter/mobile build
```

native 실행에는 SDK와 development client/지원 Expo Go 환경이 필요하다. export는 bundling 검사이며 native navigation/SecureStore 성공의 증거는 아니다. simulator 또는 emulator에서 가입/로그인·CRUD·logout·앱 재시작에 따른 session 상태를 실제 조작한다.
