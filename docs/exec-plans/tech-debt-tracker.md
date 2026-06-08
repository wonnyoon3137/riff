# Tech Debt Tracker

> 기술 부채는 고금리 대출. 쌓아서 한꺼번에 갚지 말고 조금씩 꾸준히 갚는다(OpenAI harness — gardening). 발견 즉시 여기에 기록하고, 정기적으로 리팩터링 PR로 해소한다.

| ID | 항목 | 영향 | 우선순위 | 출처/근거 | 상태 |
|---|---|---|---|---|---|
| TD-01 | KOPIS rate limit/가동률 미검증 | 안정성(Risk 3) | High | kopis-integration §10 | open |
| TD-02 | 지역 다중 병합 페이지네이션 정확도/부하 미검증 | 정확성/성능(D4) | High | kopis-integration §3.2 | open |
| TD-03 | 구군(signgucodesub) 전체 코드 데이터화 미완 | 기능(F2.2) | Medium | kopis-codes §4.2 | open |
| TD-04 | 시설 시도/구군 라벨→코드 역매핑 방식 미정 | 데이터(D5) | Medium | kopis-integration §6.3 | open |
| TD-05 | 공연장 동기화 주기 미정 | 운영(D5) | Low | data-model §5.3 | open |
| TD-06 | React Query 캐시 상한/gcTime 미튜닝 | 메모리(D2/D8) | Low | data-model §7.3 | open |
| TD-07 | 커스텀 린트(레이어 의존·hex·미검증코드) 미구현 | 강제성 | Medium | ARCHITECTURE §6 | open |

## 운영 규칙
- 새 부채 발견 시 즉시 행 추가(에이전트 포함). 해소 시 상태 `done` + PR 링크.
- High는 v0.1 출시 전, Medium은 v0.1~v0.2, Low는 v0.2 이후 목표.
