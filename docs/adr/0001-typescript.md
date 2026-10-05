# ADR 0001: TypeScript 6.0 + strict

- 상태: Accepted
- 결정일: 2026-10-06

## 맥락

웹·React Native·Node API가 같은 언어로 계약을 공유해야 한다. 타입만으로 HTTP 입력이 안전해지지는 않으므로 runtime validation도 필요하다.

## 결정

TypeScript 6.0.3을 모든 JS workspace에 고정하고 strict/noUncheckedIndexedAccess/exactOptionalPropertyTypes를 유지한다. Expo SDK의 install --check 권장 범위와 typescript-eslint의 지원 범위를 함께 맞춘다. Node 라이브러리의 module/moduleResolution은 Node16으로 명시하고 앱은 각 bundler 설정을 사용한다.

## 대안

순수 JavaScript는 계약·refactor 확인 비용이 크다. 5.9를 유지하면 현재 Expo 권장 버전과 어긋나므로 이번 starter에서는 6.0으로 통일했다. 프리뷰 compiler는 채택하지 않는다.

## 영향

정적 타입과 Zod 검증을 함께 유지한다. major 변경 시 deprecation 및 module resolution 영향을 검토하고 모든 앱의 typecheck/export를 다시 실행한다.

## 근거

[TypeScript 6.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)
