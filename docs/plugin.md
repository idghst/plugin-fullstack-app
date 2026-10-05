# Skill / Plugin

이 저장소의 플러그인은 **skills-only**다. 실제 MCP tool을 제공하지 않으므로 `mcp.json`, 가짜 server URL, app binding을 포함하지 않는다. 호스트에 원래 있는 파일·명령·브라우저 도구로 사용자의 프로젝트 작업을 안내한다.

## Manifest

| 파일                                | 용도                                                    |
| ----------------------------------- | ------------------------------------------------------- |
| `plugin.json`                       | Agent Plugins 1.0 portable manifest                     |
| `.codex-plugin/plugin.json`         | Codex compatibility overlay, skills path와 presentation |
| `.claude-plugin/plugin.json`        | Claude plugin metadata                                  |
| `.agents/plugins/marketplace.json`  | Codex marketplace catalog                               |
| `.claude-plugin/marketplace.json`   | Claude marketplace catalog                              |
| `skills/fullstack-starter/SKILL.md` | 작업 흐름과 reference navigation                        |

모든 manifest의 name은 `fullstack-starter`, version은 `0.1.0`이다. root portable에는 top-level skills/mcpServers/apps/interface를 넣지 않고 `skills/` fixed location과 `extensions.com.openai.interface`를 사용한다. Codex overlay의 경로는 plugin root 기준이다.

형식 기준은 [Agent Plugins schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json)다. compatibility host별 설치 흐름은 호스트 공식 문서와 설치된 CLI의 help를 확인한다.

두 catalog의 marketplace 이름은 `idghst-fullstack`이다. plugin entry는 저장소 루트 `./`의 `fullstack-starter`를 가리킨다. 경로는 catalog가 있는 숨김 디렉터리가 아니라 저장소 루트 기준이며 별도의 plugin 복사본을 만들지 않는다. 형식은 [OpenAI marketplace 문서](https://developers.openai.com/plugins/build/plugins)와 [Claude marketplace 문서](https://code.claude.com/docs/en/plugin-marketplaces)를 따른다.

## Marketplace 설치

GitHub 저장소를 명시적으로 등록한 다음 설치한다. clone만으로 marketplace 등록이나 plugin 활성화가 완료되었다고 판단하지 않는다.

### Codex CLI

```sh
codex plugin marketplace add idghst/plugin-fullstack-app
codex plugin add fullstack-starter@idghst-fullstack
codex plugin marketplace list --json
codex plugin list --marketplace idghst-fullstack --available --json
```

catalog를 최신 Git snapshot으로 갱신할 때는 다음 명령을 사용한다.

```sh
codex plugin marketplace upgrade idghst-fullstack
```

### Claude Code

```sh
claude plugin marketplace add idghst/plugin-fullstack-app
claude plugin install fullstack-starter@idghst-fullstack
claude plugin marketplace list --json
claude plugin list --json
```

Claude 세션 안에서는 다음 명령으로 등록·설치 패널을 열 수 있다.

```text
/plugin marketplace add idghst/plugin-fullstack-app
/plugin install fullstack-starter@idghst-fullstack
/plugin
```

marketplace와 설치된 plugin을 업데이트한 뒤 새 세션을 시작한다.

```sh
claude plugin marketplace update idghst-fullstack
claude plugin update fullstack-starter@idghst-fullstack
```

위 설치·업데이트 명령은 사용자가 실행하는 명령이다. 저장소 생성·테스트·패키징 과정에서는 사용자의 전역 plugin 설정을 변경하거나 자동으로 설치하지 않는다.

## Catalog 검증

```sh
node --test tooling/scripts/marketplace.test.mjs tooling/generators/create-project.test.mjs
claude plugin validate --strict .claude-plugin/marketplace.json
claude plugin validate --strict .
```

테스트는 catalog identity와 정책, 루트 source의 manifest/skill 존재, 생성기의 catalog 복사와 개인 `.agents` 파일 제외를 확인한다. Claude strict 검증은 catalog 필드를 검사한다. plugin manifest는 별도로 일반 검증하며, 실제 설치는 각 호스트의 설치 명령으로 수행한다.

2026-10-06 Codex CLI 0.160.0에서 GitHub source를 일시 등록한 뒤 `--available --json`으로 `fullstack-starter@idghst-fullstack` version `0.1.0`, install policy `AVAILABLE`을 확인했다. 테스트용 등록은 제거했다. 실제 plugin 설치나 전역 활성화는 수행하지 않았다.

Claude Code에서도 같은 GitHub source의 HTTPS clone, catalog validation, marketplace 등록과 목록 조회를 확인한 뒤 테스트용 등록을 제거했다.

`claude plugin validate .claude-plugin/plugin.json --strict`는 root `CLAUDE.md`가 plugin 프로젝트 컨텍스트로 자동 로드되지 않는다는 경고로 실패한다. catalog strict 검증은 통과하며 일반 plugin 검증의 구조 오류는 없다. 프로젝트의 `CLAUDE.md`는 템플릿을 clone한 작업 공간용이고, 설치된 plugin은 `skills/fullstack-starter/SKILL.md`에서 작업 대상 프로젝트의 `AGENTS.md`를 명시적으로 읽는다.

## 패키징

```sh
pnpm plugin:package
tar -tzf artifacts/fullstack-starter-0.1.0.tar.gz
```

패키저는 manifest identity와 version, 30자 이하 subtitle, 스킬 frontmatter를 검사하고, skill·references·template·read-only script·hidden compatibility manifest·전용 README·LICENSE만 압축한다. Node.js builtins로 gzip/tar를 생성한다. source app, DB dump, env, cache, dependencies, symlink를 포함하지 않는다. 이미 같은 archive가 있으면 오류로 중단하며 덮어쓰지 않는다.

아카이브는 standalone skill 배포용이고 앱을 실행하는 repo 복사본은 아니다. source template에는 모든 앱과 설정이 남는다.

## 사용

프로젝트에서 규칙은 `AGENTS.md`를 읽고 `CLAUDE.md`는 `@AGENTS.md` 참조를 사용한다. 플러그인 없이도 skill의 지침을 참조할 수 있다. Claude Code가 설치된 경우 저장소 루트를 local plugin directory로 로드할 수 있다.

```sh
claude --plugin-dir /absolute/path/to/fullstack-starter
```

위 marketplace 설치 외에도 Claude의 local plugin 로드로 소스를 확인할 수 있다. 설치 명령과 local load는 별개다.

GitHub 소스 공개와 OpenAI public plugin directory 등록은 별개다. directory 제출에는 별도 메타데이터·아이콘·검토 절차가 필요하며 이 저장소의 아카이브 생성은 등록 완료를 뜻하지 않는다.
