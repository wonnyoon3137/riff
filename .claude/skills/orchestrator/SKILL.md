---
name: orchestrator
description: "Riff 작업 전체를 조율하는 오케스트레이션 스킬. 어떤 요청에 어떤 에이전트(planner/frontend-dev/backend-dev/qa-engineer)를 어떤 순서로 쓸지, docs-우선 원칙, D1~D10 게이트, 완료 기준(피드백 루프)을 정의한다. Riff에서 다단계 작업·기능 구현·변경을 시작할 때 반드시 이 스킬을 먼저 적용할 것."
---

# orchestrator — Riff 작업 조율

Riff는 하네스 기반으로 개발한다. 이 스킬은 "누가 언제 어떤 순서로 협업하는가"를 정의한다. 개별 "어떻게"는 `nextjs-patterns`/`kopis-integration` 스킬에 있다.

## 왜 이렇게 하는가
에이전트가 코드보다 문서를 먼저 읽고, 결정(D1~D10)을 게이트로 삼고, 완료를 그린 빌드로 정의하면, 출력 분산이 줄고 범위 이탈·결정 위반을 사전에 막을 수 있다. 강압적 규칙보다 이유를 이해하면 엣지 케이스에서도 옳게 판단한다.

## 작업 흐름 (기본: 생성-검증 + 파이프라인)

1. **planner**가 요청을 받는다 → 관련 `docs/` 읽기 → D1~D10 정합성 검토 → 작업 분해 → 비자명하면 `docs/exec-plans/active/`에 실행계획.
2. **frontend-dev / backend-dev**가 병렬로 구현한다. 둘은 BFF 응답 shape(`PerformanceListResponse`, `Performance`)을 먼저 합의한다.
3. **qa-engineer**가 각 모듈 완성 직후 점진적으로 검증한다(경계면 교차 비교 + D1~D10 감사).
4. 실패 시 planner로 환류 → 재계획. 통과 시 완료.

```
사용자 → planner(분해/문서정합) → {frontend-dev, backend-dev}(병렬 구현)
       → qa-engineer(검증 게이트) → 통과=완료 / 실패=planner 환류
```

## docs-우선 원칙
- 변경 전 관련 docs를 읽는다: `features.md`(D1~D10=SSOT), `screens.md`, `data-model.md`, `kopis-*.md`, `ARCHITECTURE.md`.
- 코드보다 docs가 진실원본. 결정이 바뀌면 `features.md`/docs를 **먼저** 갱신한 뒤 코드.
- 리포지터리 밖(채팅/머릿속) 지식에 의존하지 않는다. 필요한 컨텍스트는 docs로 끌어온다.

## D1~D10 게이트 (어기면 중단)
디폴트 30일/전국/전체(D1), 무한스크롤(D2), 31일 제한=API강제(D3), 지역 다중 병합(D4), 공연장 동기화(D5), 즉시반영 debounce 300ms(D6), 지도 제외(D7), 상태 보존(D8), 정렬 옵션(D9), 검색 제외(D10).

## 완료 기준 (피드백 루프)
- `pnpm typecheck && pnpm lint && pnpm test` 그린. 핵심 플로우는 e2e.
- qa-engineer 검증 통과(경계면 정합 + 결정 준수 + 미검증 코드 하드코딩 0).
- 변경이 docs와 일치(불일치 시 docs 갱신 PR 동반).

## 데이터 전달
- 조율: TaskCreate/TaskUpdate(의존 관계). 실시간: SendMessage. 산출물: 파일.
- 중간 산출물은 `_workspace/`(gitignore). 최종만 커밋. 파일명 `{phase}_{agent}_{artifact}.{ext}`.

## 에러 핸들링
- 1회 재시도 후 재실패 시 해당 결과 없이 진행하고 리포트에 누락 명시. 상충 데이터는 삭제하지 않고 출처 병기.

## 테스트 시나리오
- 정상: "다음 달 서울+경기 뮤지컬" 필터 → 목록 → 상세 → 뒤로가기 복원(D8) 전 구간 통과.
- 에러: KOPIS 5xx → S1-X 에러+재시도. 31일 초과 URL 진입 → 보정+토스트(D3).
