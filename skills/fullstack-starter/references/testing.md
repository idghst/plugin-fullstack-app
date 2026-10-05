# Testing Reference

검증은 변경 위험에 비례해 선택한다. 업무 규칙·인증·생성기 안전성은 실패 테스트를 먼저 확인하고 구현한다. 문서·설정만 바꾸면 diff/내용 확인으로 충분하다.

## 명령

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node tooling/scripts/check-boundaries.mjs
pnpm test:integration
pnpm test:e2e
```

`pnpm check`는 처음 다섯 검사를 모은다. integration은 별도 PostgreSQL DB를 먼저 시작하고 API를 실제 HTTP로 조작한다. e2e는 브라우저 가입/인증/CRUD 경로를 확인한다. 사용 가능한 실제 script는 manifest로 확인하며 이 스킬을 다른 저장소에 설치했다고 명령이 생긴 것은 아니다.

## 의미 있는 시나리오

- contracts: 잘못된 input/response, 빈 patch, unknown fields.
- core: 이름/길이 규칙, 타인/없는 Project, repository failure.
- api-client: schema mismatch, timeout/network, limited GET retry, refresh 동시 호출, logout/refresh 경합.
- auth/API: owner filtering, rotated refresh reuse, expired/revoked session, validation error.
- generator: path traversal, existing destination, recursive secret/cache exclusions, selectable app output.
- plugin: identity sync, frontmatter, actual archive, script/reference 포함.

## 실제 플랫폼

Web은 브라우저 화면을 직접 보고 조작한다. Expo는 simulator/emulator에서, desktop은 Tauri native 창에서 인증·CRUD·logout을 확인한다. export/typecheck/build만으로 native 테스트가 통과했다고 쓰지 않는다.

실행 실패나 SDK 부재는 수행 범위와 함께 사실대로 보고한다. CI가 headless 검사를 수행하더라도 native 인수 확인이 별도로 필요할 수 있다. test artifact에서 credential이 노출되지 않게 검토한다.
