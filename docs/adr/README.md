# Architecture Decision Records

상태는 모두 Accepted이며 결정일은 2026-10-06이다. 버전은 구현 시점의 package manifest/lockfile에 고정한다. 공식 문서 링크는 설계 근거이며 해당 major의 모든 조합이 검증됐다는 의미는 아니다.

| ADR                            | 결정                                     |
| ------------------------------ | ---------------------------------------- |
| [0001](0001-typescript.md)     | TypeScript 6.0 + strict                  |
| [0002](0002-pnpm-turborepo.md) | pnpm workspace + Turborepo               |
| [0003](0003-nextjs.md)         | Next.js App Router                       |
| [0004](0004-expo.md)           | Expo Router + React Native               |
| [0005](0005-tauri.md)          | Tauri 2 + React/Vite                     |
| [0006](0006-nestjs.md)         | NestJS 11 + Zod contracts                |
| [0007](0007-postgresql.md)     | PostgreSQL 17                            |
| [0008](0008-drizzle.md)        | Drizzle schema + versioned SQL migration |

새 결정은 기존 내용을 지우지 말고 이유·대안·영향을 기록한다. 결정이 교체되면 이전 ADR의 상태와 대체 문서 링크를 갱신한다.
