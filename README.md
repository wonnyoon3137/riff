# Riff

> 인터넷 곳곳에 흩어져 있는 공연 정보를 한곳에서 탐색하는 서비스 (v0.1 MVP, KOPIS 기반).

## 무엇인가

가수 SNS·기획사·예매 사이트에 흩어진 공연 정보를 모아, "다음 달 서울에서 열리는 뮤지컬" 같은 탐색을 한 화면에서 가능하게 한다. v0.1은 KOPIS 공연 데이터를 카드 그리드로 보여주고, 월/지역/장르/공연장 필터와 공연 상세(예매처 링크)를 제공한다.

## 개발 방식 (Agent-first / Harness)

이 레포는 **하네스(harness) 기반**으로 개발한다. 사람은 환경·문서·피드백 루프를 설계하고, 에이전트(Claude Code)가 구현을 수행한다.

- 진입점: [`AGENTS.md`](./AGENTS.md) — 100줄 이내 목차. 상세는 `docs/`.
- 기록 시스템: [`docs/`](./docs) — 제품/아키텍처/API/실행계획. 버전 관리되는 단일 진실원본.
- 에이전트·스킬: [`.claude/`](./.claude) — agents(planner/frontend/backend/qa) + skills(orchestrator/nextjs-patterns/kopis-integration).
- 설계 근거: [`docs/architecture/harness.md`](./docs/architecture/harness.md).

원칙 출처: OpenAI harness engineering(AGENTS.md 목차 + docs/ 기록 시스템 + 피드백 루프), revfactory/harness(.claude/agents·skills 구조).

## 기술 스택

Next.js(App Router, TypeScript) · React Query · Material 3 · KOPIS Open API · 자체 DB(공연장 마스터).

## 시작하기 (스캐폴딩 후)

```bash
pnpm install
cp .env.example .env.local   # KOPIS_SERVICE_KEY 입력 (서버 전용)
pnpm dev                     # http://localhost:3000
```

> 현재 상태: **문서·하네스 셋업 완료, Next.js 앱 코드 미생성.** 다음 단계는 `docs/exec-plans/active/0001-project-bootstrap.md` 참조.

## 명령어

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm typecheck` | 타입 체크(tsc --noEmit) |
| `pnpm lint` | ESLint + Prettier |
| `pnpm test` | 단위 테스트 |
| `pnpm test:e2e` | E2E(핵심 플로우) |
| `pnpm sync:venues` | KOPIS 공연장 마스터 동기화(D5) |

## 환경 변수

```
KOPIS_BASE_URL=http://www.kopis.or.kr/openApi/restful
KOPIS_SERVICE_KEY=          # 서버 전용. NEXT_PUBLIC_ 금지.
```

KOPIS 서비스키는 [KOPIS 오픈API 인증키 발급](https://www.kopis.or.kr/por/cs/openapi/openApiList.do?menuId=MNU_00074)에서 발급.

## 라이선스

Private (미정).
