# 무료 우선 배포와 운영

기본 흐름은 **Cloudflare Pages 정적 웹 → HTTPS NestJS API → 기존 Supabase/PostgreSQL**이다. Expo 모바일과 Tauri 데스크톱도 같은 API를 호출한다. DB 비밀번호와 privileged Supabase 키는 앱에 넣지 않는다. Supabase Auth로 바꾸는 작업은 포함하지 않으며 기존 자체 인증을 유지한다.

정적 배포는 미리 빌드한 화면 파일을 제공한다는 뜻이다. 브라우저가 실행 중 API로 로그인·조회·수정하므로 사용자는 DB 기반 동적 서비스를 이용한다. 웹은 static export이며 SSR, 서버 비밀값이 필요한 페이지, Next.js Server Actions를 추가하면 배포 방식을 다시 선택한다.

## 선택과 비용

2026-10-07 공식 문서 기준이다. 요금·약관은 출시 시 다시 확인한다. 앱스토어 개발자 등록비는 아래 비교에서 제외한다.

| 영역     | 기본 선택                                           | 무료 조건과 한계                                                                                                                                                                                                                                                                                                                                                          |
| -------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 웹       | Cloudflare Pages, `apps/web/out`                    | 정적 파일 요청은 무료이며 Free는 월 500 builds다. [가격](https://developers.cloudflare.com/pages/functions/pricing/), [한도](https://developers.cloudflare.com/pages/platform/limits/). 상업 프로젝트 후보로 판단한 근거는 [사업자 안내](https://www.cloudflare.com/small-business/)와 [약관](https://www.cloudflare.com/service-specific-terms-developer-platform/)이다. |
| API      | 기존 서버의 Node.js + systemd                       | 추가 호스팅 구독 없이 실행한다. 기존 서버의 CPU/RAM/네트워크 여유와 운영 권한이 필요하다. 새 Docker 컨테이너는 필수가 아니다.                                                                                                                                                                                                                                             |
| DB       | 기존 Supabase/PostgreSQL                            | 기존 운영 비용은 유지한다. 서비스용 DB/계정과 테스트 DB를 분리하고 외부 앱은 API만 사용한다.                                                                                                                                                                                                                                                                              |
| HTTPS    | 기존 reverse proxy 또는 Cloudflare named Tunnel     | Tunnel은 모든 플랜에서 제공되며 Docker 없이 daemon으로 실행할 수 있다. 기존 도메인·서버 비용은 남는다. [Tunnel](https://developers.cloudflare.com/tunnel/), [무료 제공 안내](https://blog.cloudflare.com/tunnel-for-everyone/).                                                                                                                                           |
| 모바일   | Expo SDK + 로컬 Xcode/Gradle 빌드 + 스토어 업데이트 | EAS cloud build/OTA 구독을 필수로 하지 않는다. 소유한 빌드 컴퓨터와 SDK가 필요하다. [로컬 production 빌드](https://docs.expo.dev/guides/local-app-production/).                                                                                                                                                                                                           |
| 데스크톱 | Tauri 설치 파일 + GitHub Releases                   | 공개 저장소의 standard Actions runner는 무료다. 로컬 빌드도 가능하다. [Actions](https://docs.github.com/en/actions/concepts/billing-and-usage), [Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases). 비공개 제품 소스를 무료 CI 때문에 공개하지 않는다.                                                                       |

**추가 월 구독료 0원은 기존 서버·도메인·빌드 장비에 여유가 있다는 조건에서 가능하다.** 서버 임대료·전기·도메인 갱신·백업 저장소·유지보수 비용까지 없어지지는 않는다. 이 저장소 변경은 실제 서버 자원을 확인하거나 외부 서비스를 생성하지 않는다.

| 대안                        | 판단                                                                                                                                                                                                                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel Hobby                | 무료지만 개인 비상업 용도로 제한된다. 상업 서비스의 무료 기본안으로 사용하지 않는다. [Hobby](https://vercel.com/docs/plans/hobby).                                                                                                                                                                                                  |
| Vercel Pro                  | 웹과 NestJS를 배포할 수 있다. 월 $20 platform fee부터이며 사용량 추가 비용이 가능하다. 고정 outbound IP는 별도 유료 기능이며 필요할 때만 검토한다. [NestJS](https://vercel.com/docs/frameworks/backend/nestjs), [Pro](https://vercel.com/docs/plans/pro-plan), [고정 IP](https://vercel.com/kb/guide/can-i-get-a-fixed-ip-address). |
| Netlify Free                | SSR 웹 대안이다. 월 300 credits를 배포·요청·컴퓨팅 등이 공유하고 소진하면 팀의 프로젝트가 중단된다. [가격](https://www.netlify.com/pricing/), [credits](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/).                                                             |
| Cloudflare Workers Free API | 하루 100,000 requests, 요청당 CPU 10 ms, isolate 메모리 128 MB다. 현재 scrypt 인증과 NestJS를 그대로 옮기는 무료 대안으로 선택하지 않는다. 비밀번호 hash 강도를 비용 때문에 낮추지 않는다. [한도](https://developers.cloudflare.com/workers/platform/limits/).                                                                      |
| Render Free API             | 15분 idle 후 sleep하며 재시작에 약 1분이 걸린다. 현재 client timeout은 10초다. 공식 문서도 production 용도로 권장하지 않으므로 demo 후보로 둔다. [Free](https://render.com/docs/free).                                                                                                                                              |
| Koyeb Free API              | 무료 인스턴스가 있으나 sleep, 리전, 가입·카드·플랜 조건이 있다. 초기 비용 0원을 보장하는 기본안으로 삼지 않는다. [instances](https://www.koyeb.com/docs/reference/instances), [billing FAQ](https://www.koyeb.com/docs/faqs/pricing).                                                                                               |

Expo EAS Free는 월 Android/iOS 각 15 builds와 EAS Update 1,000 MAU 등 한도가 있다. Update MAU는 설치 앱 전체 사용자 수를 제한하는 뜻이 아니다. 무료 사용 용도 조건도 있으며 **월 매출 $1,500 초과 상업 프로젝트는 유료 플랜이 요구된다**. 할당량만 보고 영구 무료로 약속하지 않는다. [가격](https://expo.dev/pricing), [사용 정책](https://expo.dev/acceptable-use). 기본 흐름은 EAS 서비스에 의존하지 않는 SDK 로컬 빌드와 스토어 업데이트다.

Tauri macOS 정식 배포는 서명/notarization을 준비한다. Windows 코드 서명 인증서에는 별도 비용이 발생할 수 있으며 서명 없이 배포하면 경고·신뢰 문제가 남는다. [macOS](https://v2.tauri.app/distribute/sign/macos/), [Windows](https://v2.tauri.app/distribute/sign/windows/). 설치 파일 생성은 서명·사용자 설치 검증 완료를 뜻하지 않는다.

## 설정과 운영 순서

1. 생성기는 외부 DB를 기본 선택한다. `pnpm env:setup` 뒤 private `.env`에 접속 정보를 넣고 서비스별 별도 DB를 우선 준비한다. 임의 schema 격리는 자동 구현되지 않으므로 모델·FK·migration을 함께 설계한다. [DB](database.md).
2. migration을 별도 검토·백업·배포 작업으로 실행한다. `pnpm dev`나 API 시작에 자동 migration을 연결하지 않는다. API runtime 계정과 DDL migration 계정을 분리한다.
3. API는 non-root Node 프로세스로 실행하고 부팅 시작·자동 재시작·health check를 준비한다. runtime 예시는 `tooling/deploy/`에서 확인한다. HTTPS는 프록시가 처리하고 DB는 private 경로로 유지한다. Tunnel은 장기 hostname을 쓰고 임시 Quick Tunnel을 production 주소로 쓰지 않는다.
4. 웹·모바일·데스크톱의 public API URL에 같은 운영 HTTPS 주소를 설정하고 정확한 CORS origin을 허용한다. URL 변경 뒤 클라이언트를 다시 빌드한다. 데스크톱 `build:native`는 지정 API origin에 맞춘 CSP를 생성하며 local dev 설정은 별도로 유지한다.
5. production 환경 검증과 요청 제한을 활성화한다. proxy trust는 실제 프록시 경로에 맞추고 내부 포트는 외부 접근을 막는다. 메모리 요청 제한은 한 API 프로세스 기준이며 다중 replica는 공유 제한 저장소/edge 정책을 설계한다.
6. DB app 테이블의 Supabase Data API 권한을 검토한다. 제공 SQL 예시는 대상 role/테이블을 확인한 뒤 수동 적용한다. 백업 복원, API 재시작, 권한 거절·CRUD와 각 플랫폼 실제 UI를 검증하고 배포한다.

API private production 환경은 `.env.production.example`을 기준으로 만든다. `DATABASE_URL`은 runtime 계정, `DATABASE_MIGRATION_URL`은 별도 DDL 계정으로 설정한다. 외부 DB는 `DATABASE_SSL_MODE=verify-full`과 필요한 CA 파일로 인증서를 검증한다. Supabase 접속 URL의 `?sslmode=...`은 제거하고 TLS를 환경변수로 설정한다. URL query는 `application_name`만 허용하며 연결 host·timeout 등 옵션도 URL로 덮어쓰지 않는다. `HOST=127.0.0.1`로 내부 API를 제한하고 신뢰할 수 있는 loopback 프록시가 전달 header를 교체하는 경우에만 `TRUST_PROXY=loopback`을 선택한다. CORS에는 실제 웹 HTTPS origin과 필요한 Tauri origin만 넣는다.

`tooling/deploy/fullstack-api.service`는 Linux non-root `fullstack` 계정과 `/srv/fullstack` 설치, root-owned 0600 `/etc/fullstack/api.env`를 전제로 한 예시다. 설치 경로·Node 경로·계정이 실제 서버와 맞는지 검토하고 build 결과가 준비된 뒤 service를 등록한다. `tooling/deploy/cloudflared.example.yml`은 hostname/tunnel identity와 서버에만 보관할 credentials 경로를 설정하는 예시다. `tooling/deploy/database-runtime-role.example.sql`은 세 app 테이블만 다루며 자동 실행되지 않는다. RLS는 DB role의 접근을 제한하고 사용자별 소유권은 계속 NestJS API가 검사한다. 기존 role membership, table 정책과 service_role 접근도 별도로 점검한다.

모바일은 `pnpm --filter @starter/mobile prebuild:release` 후 iOS에서 Xcode archive/sign/upload, Android에서 별도 release signing을 구성해 Gradle `bundleRelease`로 스토어 AAB를 만든다. `ios:release`/`android:release`는 native release 실행 명령이며 스토어 서명·업로드 완료를 보장하지 않는다. 생성 native 파일은 커밋/복사 대상에서 제외하므로 서명 설정은 안전하게 별도 보관한다.

free 서비스에 무중단/SLA를 가정하지 않는다. 기존 서버 장애가 DB와 API에 함께 영향을 줄 수 있으므로 자원 모니터링, 외부 health 알림, 별도 위치의 백업·복원 절차가 필요하다. 플러그인은 소스·지침을 제공하며 계정 생성, DNS 변경, 운영 DB 권한 변경, production migration을 자동 실행하지 않는다.
