# Tech Debt Tracker

> 기술 부채는 고금리 대출. 쌓아서 한꺼번에 갚지 말고 조금씩 꾸준히 갚는다(OpenAI harness — gardening). 발견 즉시 여기에 기록하고, 정기적으로 리팩터링 PR로 해소한다.

| ID | 항목 | 영향 | 우선순위 | 출처/근거 | 상태 |
|---|---|---|---|---|---|
| TD-01 | KOPIS rate limit/가동률 미검증 | 안정성(Risk 3) | High | kopis-integration §10 | **done** — v0.2에서 실측 완료, 동시성 5 확정. PR #35 참조. |
| TD-02 | 지역 다중 병합 페이지네이션 정확도/부하 미검증 | 정확성/성능(D4) | High | kopis-integration §3.2 | open — v3/v4에서 시도+구군까지 확장 사용 중. 구군 병합 정상 동작 확인되어 부분 해소. 대규모 부하 테스트는 미수행. |
| TD-03 | 구군(signgucodesub) 전체 코드 데이터화 미완 | 기능(F2.2) | Medium | kopis-codes §4.2 | **done** — v3 P1-2에서 228개 구군 완료, v4 Q-3에서 실호출 검증(#50). #14 닫음. |
| TD-04 | 시설 시도/구군 라벨→코드 역매핑 방식 미정 | 데이터(D5) | Medium | kopis-integration §6.3 | open — 구군 필터 정상 작동 중이며 역매핑 이슈 없음(부분 해소). 시설 데이터와의 매핑은 추가 검증 시 재평가. |
| TD-05 | 공연장 동기화 주기 미정 | 운영(D5) | Low | data-model §5.3 | open |
| TD-06 | React Query 캐시 상한/gcTime 미튜닝 | 메모리(D2/D8) | Low | data-model §7.3 | **done** — #34에서 staleTime/gcTime 튜닝 완료, maxPages 거부 로직 추가. |
| TD-07 | 커스텀 린트(레이어 의존·hex·미검증코드) 미구현 | 강제성 | Medium | ARCHITECTURE §6 | open |

## 운영 규칙
- 새 부채 발견 시 즉시 행 추가(에이전트 포함). 해소 시 상태 `done` + PR 링크.
- High는 v0.1 출시 전, Medium은 v0.1~v0.2, Low는 v0.2 이후 목표.
