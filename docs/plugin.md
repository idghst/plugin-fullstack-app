# Skill / Plugin

이 저장소의 플러그인은 **skills-only**다. 실제 MCP tool을 제공하지 않으므로 `mcp.json`, 가짜 server URL, app binding을 포함하지 않는다. 호스트에 원래 있는 파일·명령·브라우저 도구로 사용자의 프로젝트 작업을 안내한다.

## Manifest

| 파일                                | 용도                                                    |
| ----------------------------------- | ------------------------------------------------------- |
| `plugin.json`                       | Agent Plugins 1.0 portable manifest                     |
| `.codex-plugin/plugin.json`         | Codex compatibility overlay, skills path와 presentation |
| `.claude-plugin/plugin.json`        | Claude plugin metadata                                  |
| `skills/fullstack-starter/SKILL.md` | 작업 흐름과 reference navigation                        |

모든 manifest의 name은 `fullstack-starter`, version은 `0.1.0`이다. root portable에는 top-level skills/mcpServers/apps/interface를 넣지 않고 `skills/` fixed location과 `extensions.com.openai.interface`를 사용한다. Codex overlay의 경로는 plugin root 기준이다.

형식 기준은 [Agent Plugins schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json)다. compatibility host별 설치 흐름은 호스트 공식 문서와 설치된 CLI의 help를 확인한다.

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

Codex의 설치는 해당 버전의 local plugin/marketplace 흐름을 따른다. CLI 지원을 확인하지 않고 설치 성공을 주장하지 않는다. 이 저장소는 사용자의 전역 plugin 설정을 변경하지 않는다.

GitHub 소스 공개와 OpenAI public plugin directory 등록은 별개다. directory 제출에는 별도 메타데이터·아이콘·검토 절차가 필요하며 이 저장소의 아카이브 생성은 등록 완료를 뜻하지 않는다.
