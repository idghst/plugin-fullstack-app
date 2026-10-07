# Runtime / Deployment Reference

기본 구성은 Cloudflare Pages의 Next static export → 기존 서버의 HTTPS NestJS API → private Supabase/PostgreSQL이다. Expo/Tauri도 공통 API를 사용한다. Docker는 local DB 또는 명시적으로 필요한 배포에서만 선택한다. 정적 웹은 API 기반 동적 CRUD를 지원한다. 원본 저장소의 `docs/deployment.md`와 `tooling/deploy/`에서 구체 설정을 확인한다. 플러그인 archive는 skills-only이므로 runtime 파일이 없다면 원본 [GitHub template](https://github.com/idghst/plugin-fullstack-app)을 확인하고 사용자의 실제 프로젝트 구조에 맞춘다.

- 외부 DB는 기본이며 비밀 URL은 private server env에서만 설정한다. service/test DB와 runtime/migration 계정을 분리한다. public table/FK를 임의 schema로 옮겼다고 가정하지 않는다. 운영 migration/권한 변경은 대상 영향 검토 후 요청 범위에서 실행한다.
- API는 non-root Node 프로세스, 부팅 시작/자동 재시작, HTTPS 프록시, 정확한 proxy trust/CORS와 health를 준비한다. 한 프로세스 memory rate limit을 다중 replica의 공통 제한으로 설명하지 않는다. DB를 앱에 직접 공개하지 않는다.
- production 앱은 같은 HTTPS API URL을 빌드 시 설정한다. static web은 out 디렉터리를 배포한다. Tauri native build는 지정한 API origin CSP를 확인한다. 모바일은 Expo SDK의 local Xcode/Gradle production build와 스토어 업데이트가 기본이며 EAS는 선택이다.
- 기존 서버/도메인/장비 여유가 있어야 추가 월 구독료 0원이 가능하다. 기존 서버 비용·백업·서명 인증서까지 무료라고 주장하지 않는다. 서버 장애·복원·용량 한도·실제 앱 CRUD를 검증하고 수행하지 않은 운영 배포는 보고한다.

2026-10-07 확인한 조건: [Cloudflare Pages](https://developers.cloudflare.com/pages/functions/pricing/) 정적 파일 요청은 무료이고 [월 500 builds](https://developers.cloudflare.com/pages/platform/limits/)다. [Vercel Hobby](https://vercel.com/docs/plans/hobby)는 개인 비상업 한정이며 [Pro](https://vercel.com/docs/plans/pro-plan)는 월 $20 platform fee부터다. [Expo EAS Free](https://expo.dev/pricing)는 Android/iOS 각 월 15 cloud builds와 Update 1,000 MAU 등 한도가 있으며 [사용 정책](https://expo.dev/acceptable-use)은 무료 용도와 월 매출 $1,500 초과 상업 프로젝트의 유료 요구를 둔다. EAS Update MAU를 전체 앱 이용자 제한으로 혼동하지 않는다. 요금·약관은 배포 시 공식 문서를 다시 확인한다.

[로컬 Expo production](https://docs.expo.dev/guides/local-app-production/), [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases), [Tauri macOS 서명](https://v2.tauri.app/distribute/sign/macos/), [Windows 서명](https://v2.tauri.app/distribute/sign/windows/)을 따르며 build 성공을 실제 설치·서명·UI 검증 완료로 보고하지 않는다.
