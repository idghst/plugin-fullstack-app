# Fullstack Starter 구현 계획

목표: 로컬 우선의 실행 가능한 표준 모노레포와 같은 소스에서 배포 가능한 AI Skill/Plugin을 제공한다.

## 설계

클라이언트는 `@starter/api-client` → `@starter/contracts`를 사용한다. NestJS는 Zod DTO를 통해 같은 스키마로 입력 검증과 OpenAPI를 생성한다. `@starter/core`는 프레임워크를 모르는 Project 모델·업무 규칙·Repository port를 제공한다. 실제 SQL과 인증 저장소는 Infrastructure에 둔다. 웹/데스크톱의 작은 HTML UI primitive만 공유하고 React Native UI는 독립한다.

NestJS 11을 선택한다. nestjs-zod 5가 선언하는 peer 범위에 NestJS 12가 없기 때문이다. Expo 57의 공식 React/React Native 호환표를 기준으로 모바일 버전을 고정한다. TypeScript는 Expo가 요구하는 6.0.3 안정 버전으로 통일하며 typescript-eslint의 지원 범위도 함께 확인한다. npm의 latest는 설치 명령이나 manifest에 남기지 않는다.

## 작업과 검증

- [x] workspace, strict TS, Turbo, ESLint, Prettier 및 공유 계약/순수 Domain/API Client
- [x] Docker PostgreSQL dev/test, Drizzle migration/seed, NestJS CRUD와 JWT/회전 Refresh Session
- [x] Next.js App Router 서버 페이지와 클라이언트 인증/CRUD, Expo Router, Tauri 최소 capability
- [x] Vitest core/client, PostgreSQL API 통합 테스트, Playwright 브라우저 CRUD와 인증
- [x] `pnpm check`, `pnpm test:e2e`, 모바일 export/typecheck, iOS simulator Expo Go 조작
- [x] 안전한 생성기, 선택 앱, Skill references, portable/Claude manifests, Agent 규칙
- [x] README, Architecture, ADR, CI, Dockerfile, 라이선스
- [x] 비밀값/불필요한 파일 확인, 한글 커밋, Public GitHub Template 게시

TDD는 공유 업무 로직, 인증 경계, 생성기의 덮어쓰기/경로 보호, API Client refresh/retry와 CRUD 통합에 적용한다. 각 작업자는 서로 다른 디렉터리에 쓰고 부모가 전체 설치·타입·테스트·빌드 결과를 검토한다. DB에는 development와 test를 분리하며 통합 테스트는 test DB만 사용한다. native 도구가 없으면 설치 가능한 로컬 도구로 검증하되 성공 여부를 사실대로 기록한다.

## 0.2.0 무료 우선 방향 (2026-10-07 승인)

오늘의 DB 연결·외부 배포·운영 비용 논의를 반영한다. 기존 Supabase/PostgreSQL을 초기화 기본값으로 두고 로컬 Docker는 선택한다. 접속 변경과 데이터 이전을 구분하고 자동 migration을 제거한다. 웹은 Cloudflare용 static export이지만 사용자가 실행 중 공통 API에서 DB 데이터를 받아 동적으로 사용한다. API는 기존 서버에서 Docker 없이 Node/systemd/HTTPS 프록시로 운영할 수 있게 설정과 권한·요청 제한 경계를 준비한다.

Expo SDK 로컬 Xcode/Gradle production build와 스토어 업데이트, Tauri native 설치 파일/GitHub Releases 흐름을 기본으로 설명한다. Vercel Hobby 비상업 제한과 EAS 무료 용도·quota·매출 조건은 문서에 남긴다. 추가 월 비용 0원은 기존 서버/도메인/장비 여유 조건이며 live 서버 provisioning이나 운영 DB 변경은 포함하지 않는다. 생성기/환경 보존·보안 회귀 테스트와 전체 check, API 통합, 실제 웹·앱 UI 검증 결과를 별도로 확인한다.
