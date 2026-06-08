# Riff — 화면설계서 (Screens) · 상세판

| 항목 | 내용 |
|---|---|
| 서비스명 | Riff (리프) |
| 버전 | v0.1 (MVP) |
| 작성일 | 2026-06-08 |
| 상태 | Draft (상세판) |
| 기반 문서 | `overview.md` (기획서), `features.md` (기능정의서 / Approved) |
| 디자인 시스템 | Material 3 Design Kit (Figma 연결 라이브러리) |
| 기준 해상도 | Desktop 1440 / Mobile 375 |

> 본 문서는 **개발자·디자이너가 이 문서만으로 화면을 그대로 구현할 수 있도록** 작성한 화면 명세서다. 각 화면의 모든 영역과 컴포넌트를 분해해 목적·표시 데이터·동작/인터랙션·상태별 변화·라벨 예시·치수/간격/정렬 스펙을 기술하고, 기능정의서 F1~F4 및 의사결정 D1~D10과 매핑한다.
>
> 표기 규칙: 모든 치수는 px(=Figma dp). 색상은 M3 색상 role 이름으로 표기(하드코딩 hex 금지). 타이포는 M3 타입 스케일 토큰명으로 표기. "→"는 화면 전환/결과, "∴"는 근거(기능/결정 ID).

### 전제 — 디자인 시스템 = Material 3 (M3)

본 서비스의 **디자인 시스템은 Material Design 3 (Material 3 / M3)** 로 한다. 모든 화면·컴포넌트·토큰은 M3 규격을 따른다.

- **기준 키트:** Figma 파일에 연결된 **Material 3 Design Kit**(community 라이브러리, libraryKey `lk-5a31d104…b61462`). Figma 와이어프레임은 이 키트의 컴포넌트 인스턴스로 구성한다.
- **토큰 체계(전부 M3 기준):**
  - *Color* — M3 **color role** 사용(`surface`, `surface-container-*`, `on-surface`, `primary`, `secondary-container`, `outline-variant`, `error` 등). 하드코딩 hex 금지. 상세는 §1.1.
  - *Typography* — M3 **type scale**(`headline/title/body/label` 각 large·medium·small). 상세는 §1.2.
  - *Shape* — M3 shape scale(카드 medium=12, 칩·버튼 full/pill). 상세는 §1.3.
  - *Elevation* — M3 elevation level(카드 level1, hover level2, 메뉴/바텀시트 level3). 상세는 §1.3.
  - *Spacing* — M3 4px 그리드(4/8/12/16/20/24/32/48).
- **컴포넌트:** App bar, Filter/Input chip, Stacked card, Button, Connected button group 등 **모두 M3 컴포넌트**를 사용하며, 구체적 키·권장 variant는 **§7 M3 컴포넌트 매핑** 참조.
- **다크 모드:** v0.1 비목표이나, M3 color role 기반이라 추후 토글만으로 확장 가능.

---

## 목차

- 0. 화면 목록 & 전이도
- 1. 공통 규칙 (디자인 토큰 / 그리드 / 컴포넌트 기본 스펙 / 공통 인터랙션)
- 2. S1 — 메인(공연 목록) 상세
- 3. 필터 컴포넌트 상세 (월/지역/장르/공연장)
- 4. S2 — 공연 상세 상세
- 5. 상태 복원 (목록 ↔ 상세)
- 6. 접근성 / NFR
- 7. M3 컴포넌트 매핑 (key + 권장 variant)
- 8. Figma 프레임 구성안 (좌표/크기)
- 9. KOPIS 필드 ↔ UI 매핑 (부록)
- 10. 미해결 / 다음 단계

---

## 0. 화면 목록 & 전이도

| ID | 화면 | 경로 | 연결 기능 | 상태 변형 |
|---|---|---|---|---|
| S1 | 메인 — 공연 목록 | `/` | F1, F2, F4 | S1-DEFAULT / S1-L(로딩) / S1-E(빈) / S1-X(에러) / S1-MORE(추가로딩) |
| S2 | 공연 상세 | `/performances/[mt20id]` | F3 | S2-DEFAULT / S2-L(로딩) / S2-X(에러) |

### 0.1 화면 전이도

```
                ┌───────────────────────────────────────────────┐
                │                  S1 메인(목록)                  │
                │  최초 진입 → S1-L(스켈레톤) → S1-DEFAULT        │
                │  결과 0건 → S1-E(빈 상태)                       │
                │  API 실패 → S1-X(에러)                          │
                │  스크롤 하단 → S1-MORE(하단 스피너) → 추가 카드 │
                └───────┬───────────────────────────▲───────────┘
                        │ 카드 클릭                   │ 뒤로가기
                        │ (mt20id 전달)               │ (상태 복원: 필터+스크롤+페이지수 / D8)
                        ▼                             │
                ┌───────────────────────────────────┴───────────┐
                │                 S2 공연 상세                    │
                │  진입 → S2-L(스켈레톤) → S2-DEFAULT             │
                │  API 실패 → S2-X(에러)                          │
                └───────┬───────────────────────────────────────┘
                        │ 예매처 버튼 클릭
                        ▼
                外部 예매 사이트 (새 탭, noopener noreferrer)
```

### 0.2 v0.1 범위 경계 (∴ 기획서 §5, D10)

화면에 **존재하지 않는** 것: 로그인/회원, 마이페이지, 공연명 검색바, 아티스트/가격대 필터, 지도, 후기/플레이리스트. 상세 페이지에 "관심/저장" 같은 로그인 의존 액션 없음.

---

## 1. 공통 규칙

### 1.1 디자인 토큰 — 색상 role (Material 3)

라이트 모드 기준. 다크 모드는 v0.1 비목표이나 M3 role을 쓰므로 추후 토글만으로 확장 가능.

| 용도 | M3 role | 적용 위치 |
|---|---|---|
| 페이지 배경 | `surface` | 전체 캔버스 |
| 카드/필터바 면 | `surface-container-low` | 카드 배경, 필터바 배경 |
| 한 단계 높은 면 | `surface-container-high` | 바텀시트, 메뉴, 드롭다운 |
| 본문 텍스트 | `on-surface` | 공연명, 제목 |
| 보조 텍스트 | `on-surface-variant` | 공연장·기간·메타 |
| 강조/주요 액션 | `primary` / `on-primary` | 선택 칩 채움, filled 버튼 |
| 약한 강조 배경 | `secondary-container` / `on-secondary-container` | 상태 뱃지(공연예정 등) |
| 외곽선 | `outline-variant` | 카드/칩 보더, 구분선 |
| 에러 | `error` / `on-error` / `error-container` | 에러 상태, 토스트 |

### 1.2 디자인 토큰 — 타이포 스케일

| 토큰 | size/line | weight | 사용처 |
|---|---|---|---|
| `headline-small` | 24 / 32 | Regular | S2 공연명(h1) |
| `title-large` | 22 / 28 | Regular | S1 로고/상단 타이틀 |
| `title-medium` | 16 / 24 | Medium | 카드 공연명, 섹션 제목(h2) |
| `body-large` | 16 / 24 | Regular | 상세 본문(줄거리 등) |
| `body-medium` | 14 / 20 | Regular | 카드 기간/공연장, 일반 본문 |
| `body-small` | 12 / 16 | Regular | 메타(지역·장르 캡션) |
| `label-large` | 14 / 20 | Medium | 버튼 라벨, 칩 라벨 |
| `label-small` | 11 / 16 | Medium | 뱃지 텍스트 |

### 1.3 간격 / 형태 시스템 (4px 그리드)

- 기본 간격 단위: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48
- 카드 라운드: 12 (M3 medium), 칩/버튼 라운드: full(pill) 또는 M3 기본
- elevation: 카드 level1(rest) → level2(hover, 데스크톱만), 바텀시트/메뉴 level3
- 포커스 링: `primary` 2px outline, offset 2

### 1.4 컴포넌트 기본 스펙 (전 화면 공통)

| 컴포넌트 | M3 | 기본 variant/size | 높이 | 비고 |
|---|---|---|---|---|
| 상단바 | App bar | Type=Small, Scrolled=False | 64 | 스크롤 시 Scrolled=True(fill 분리) |
| 필터 칩 | Filter chip | Style=Outlined, Selected=False/True, Leading icon(selected 시 check) | 32 | 다중 선택 |
| 입력 칩 | Input chip | Trailing=Close(X) | 32 | 선택된 공연장 표시 |
| 버튼(주요) | Button(filled) | Size=Small, Shape=Round, Leading icon=opt | 40 | 예매처/주요 액션 |
| 버튼(보조) | Button(outlined/text) | Size=Small | 40 | 초기화/재시도/취소 |
| 정렬 토글 | Connected button group | Selection=Single, Size=Small | 40 | 2개 세그먼트 |
| 공연 카드 | Stacked card | Style=Elevated, Media=Top | 가변 | 그리드 |
| 검색 입력 | Search/Text field | Type=Outlined, Leading=search icon | 56 | 공연장 자동완성 |

### 1.5 공통 인터랙션 패턴

- **토스트(Snackbar):** 화면 하단 중앙(모바일) / 좌하단(데스크톱), 노출 3초, `inverse-surface` 배경. 예: 월 31일 초과 시.
- **바텀시트(모바일 필터):** 하단에서 슬라이드 업, 최대 높이 90vh, 상단 드래그 핸들 + "필터" 타이틀 + 우상단 닫기(X). 하단 고정 액션바: [초기화](text) · [적용](filled).
- **메뉴/드롭다운(지역 드릴다운, 공연장 자동완성):** anchor 하단에 표시, `surface-container-high`, 최대 높이 320 후 내부 스크롤.
- **로딩 피드백:** 최초=스켈레톤, 추가=하단 스피너(circular, 24px), 버튼 액션 중=버튼 내 spinner + 비활성.
- **포커스/호버(데스크톱):** 카드 hover 시 elevation level2 + 커서 pointer. 칩 hover 시 state-layer 8%.

---

## 2. S1 — 메인 (공연 목록)

> **연결 기능:** F1(목록 탐색), F2(필터), F4(정렬)
> **첫 진입 디폴트(D1):** 오늘부터 30일 이내 · 전국 · 전체 장르 · 정렬=시작일 가까운 순

### 2.1 프레임 스펙

| 항목 | Desktop 1440 | Mobile 375 |
|---|---|---|
| 프레임 폭 | 1440 | 375 |
| 콘텐츠 최대폭 | 1200 (중앙 정렬) | 375 (full bleed) |
| 좌우 패딩 | 32 (1200 영역 내부) | 16 |
| 카드 그리드 열 | 4~6 (auto-fit, 카드 min 200) | 2 |
| 그리드 gap | 24 | 12 |
| 필터 배치 | 상단 필터바 inline | 칩 1줄 가로 스크롤 + "필터" 버튼(바텀시트) |
| 정렬 위치 | 결과요약 줄 우측 | "필터" 버튼 옆 또는 결과줄 우측 |

### 2.2 영역 A — 상단바 (App bar)

- **목적:** 서비스 식별 + (선택) 전역 액션. v0.1은 내비게이션 최소.
- **구성:**
  - 좌: 로고 "**Riff**" (`title-large`, `on-surface`) — 클릭 시 필터 초기화 후 최상단(`/`)로.
  - 우: v0.1에서는 비움(또는 추후 다크모드 토글 자리). 검색 아이콘 없음(∴ D10 검색 제외).
- **스펙:** 높이 64, 배경 `surface`, 좌우 패딩 데스크톱 32 / 모바일 16. 하단 보더 없음(rest), **스크롤 시** `App bar / Scrolled=True`로 전환되어 `surface-container` fill + 하단 그림자로 본문과 분리.
- **동작:** 페이지 스크롤 Y>0 → Scrolled 상태. 상단바는 sticky(상단 고정).
- **상태별:** 로딩/빈/에러에서도 상단바는 항상 동일하게 표시.

### 2.3 영역 B — 필터바 (Filter Bar) · F2

필터바는 4개 필터 + 초기화로 구성. **데스크톱은 한 줄 inline**, **모바일은 칩 요약 줄 + 바텀시트 편집**.

#### B-0. 레이아웃
- 데스크톱: 상단바 바로 아래 sticky 보조 영역(스크롤 시 상단바 다음에 따라붙음). 높이 56, 배경 `surface`, 하단 `outline-variant` 1px. 내부 아이템 가로 배열, gap 8, 세로 중앙 정렬.
- 모바일: 높이 48의 가로 스크롤 칩 줄. 맨 앞에 **[필터] 버튼**(아이콘 tune + "필터", outlined, 적용된 필터 수 뱃지). 탭 시 바텀시트.

#### B-1. 월별 필터 · F2.1
- **목적:** 공연 기간 범위 지정. KOPIS `stdate`/`eddate` 매핑.
- **UI:** Filter chip 4개 — `이번 달` · `다음 달` · `그 다음 달` · `직접 선택`. 단일 선택(라디오성). 기본 선택은 "오늘부터 30일"에 해당하는 상태(라벨 "30일 이내" 또는 "이번 달" — 구현 시 디폴트 칩 1개를 선택 표시).
- **"직접 선택":** 탭 시 날짜범위 피커(M3 Date range picker) 모달. 시작/종료일 선택.
- **제약(D3, F2.1):** 선택 범위가 31일을 초과하면 종료일을 시작일+31일로 보정하고 토스트 "최대 31일까지 선택 가능합니다" 노출.
- **라벨 예시:** 칩 "직접 선택" → 선택 후 "06.10–07.05"처럼 범위 표기.
- **상태:** 선택 칩은 `Selected=True`(채움 `secondary-container`, leading check). 미선택은 outlined.

#### B-2. 지역 필터 · F2.2 (다중 + 드릴다운)
- **목적:** 시도/구군 다중 선택. `signgucode`(시도), `signgucodesub`(구군).
- **UI:** "지역" 진입 칩(trailing ▾). 탭 → 메뉴(1단계 시도 목록). 시도 항목 우측 ›로 2단계(구군) 드릴다운. 체크박스형 다중 선택.
- **선택 표시:** 선택된 지역은 필터바에 Input chip으로 나열(예: `서울 ✕` `경기 ✕`). 2개 초과 시 "서울 외 2" 축약 칩 + 탭 시 전체 보기.
- **"전국"(D4):** 메뉴 최상단 "전국" 선택 시 다른 모든 지역 해제. 반대로 개별 지역 선택 시 "전국" 자동 해제.
- **병합 처리:** 다중 선택은 클라이언트/BFF에서 지역별 병렬 호출 후 결과 병합(상세는 데이터 모델 단계). 화면설계 관점에서는 "선택=칩, 결과=병합된 단일 그리드".
- **라벨 예시:** 메뉴 헤더 "지역 선택", 1단계 "서울특별시 / 경기도 / …", 2단계 "강남구 / 마포구 / …".

#### B-3. 장르 필터 · F2.3 (다중)
- **목적:** 장르 다중 선택. KOPIS `shcate` 코드 ↔ 한글.
- **UI:** Filter chip 다중 — `연극` `뮤지컬` `클래식` `무용` `대중음악` 등. 복수 선택 가능, 선택 칩 leading check.
- **코드 매핑:** 칩 라벨(한글) ↔ `shcate` 코드는 `kopis-codes.md`에서 관리(예: 연극=AAAA, 뮤지컬=BBBB, 대중음악=CCCA).
- **빈 선택 = 전체 장르**(디폴트).

#### B-4. 공연장 필터 · F2.4 (자동완성)
- **목적:** 특정 공연장 지정. `prfplccd`.
- **UI:** "공연장" 칩 탭 → 검색 입력(Search/Text field, leading search 아이콘, placeholder "공연장 이름 검색"). 입력 시 자동완성 목록(자체 동기화 DB, KOPIS `prfplc` 기반). 항목 선택 → Input chip으로 표시(`롤링홀 ✕`).
- **빈 입력:** 최근/인기 공연장 제안(선택, v0.1 단순화 시 생략 가능).
- **단일/다중:** v0.1은 단일 선택 우선(필요 시 다중 확장). 선택 시 `prfplccd` 전달.

#### B-5. 필터 초기화 · F2.5
- **UI:** text button "필터 초기화"(데스크톱 필터바 우측 끝 / 모바일 바텀시트 하단 좌측).
- **동작:** 모든 필터를 디폴트(30일·전국·전체 장르)로, 정렬은 유지 또는 디폴트로. URL 쿼리스트링도 초기화.
- **노출 조건:** 디폴트와 다른 필터가 1개 이상일 때만 활성(아니면 비활성/숨김).

#### B-6. 필터 공통 동작
| 동작 | 명세 | ∴ |
|---|---|---|
| 변경 즉시 반영 | debounce 300ms 후 재조회 | D6, F2.5 |
| URL 동기화 | 모든 필터 상태를 쿼리스트링에 반영(공유/북마크) | F1.2, F2.5 |
| 재조회 중 | 그리드 상단에 얇은 progress bar 또는 스켈레톤 교체 | F1.3 |

### 2.4 영역 C — 결과 요약 + 정렬 · F4

- **위치:** 필터바 아래, 카드 그리드 위. 높이 40, 좌우 패딩 콘텐츠 기준.
- **좌측:** 결과 건수 "총 **128**건" (`body-medium`, `on-surface-variant`). 로딩 중에는 "불러오는 중…" 또는 스켈레톤 텍스트.
- **우측:** 정렬 토글 — **Connected button group**, 단일 선택, 2 세그먼트: `시작일 가까운 순`(기본/선택) · `시작일 먼 순` (D9). Size=Small.
- **동작:** 정렬 변경 → 클라이언트 측 재정렬(F4, API 정렬 미지원). 즉시 반영, 스크롤 위치 유지.
- **모바일:** 결과 건수는 생략 가능, 정렬은 "필터" 버튼 옆 작은 토글 또는 드롭다운으로.

### 2.5 영역 D — 공연 카드 그리드 · F1.1

#### D-0. 그리드
- 데스크톱: `display:grid`, `grid-template-columns: repeat(auto-fill, minmax(200, 1fr))`, gap 24, 콘텐츠 최대폭 1200 → 보통 5열. 1440에서 5열, 1280에서 4~5열.
- 모바일: 2열, gap 12.

#### D-1. 카드 해부 (Stacked card, Media=Top)
위에서 아래로:

1. **포스터 이미지** (`poster`)
   - 비율 3:4 고정(object-fit: cover), 상단 라운드 12.
   - 이미지 없음 → 플레이스홀더(회색 면 + 공연명 이니셜 또는 음표 아이콘).
2. **상태 뱃지** (`prfstate`) — 포스터 좌상단 오버레이 칩 또는 본문 영역 상단.
   - `공연중`(secondary-container) / `공연예정`(primary-container) / `공연완료`(surface-variant, 흐리게). `label-small`.
3. **본문 영역** (패딩 12, gap 4)
   - 공연명(`prfnm`) — `title-medium`, `on-surface`, **최대 2줄** 후 말줄임(…).
   - 공연 기간(`prfpdfrom`~`prfpdto`) — `body-medium`, `on-surface-variant`. 예 "2026.06.10 – 07.05".
   - 공연장(`fcltynm`) · 지역(`area`) — `body-small`, `on-surface-variant`. 예 "롤링홀 · 서울".
   - 장르(`genrenm`) — `body-small` 캡션 또는 small 칩(선택).
- **클릭 영역:** 카드 전체. hover(데스크톱) 시 elevation level2 + 살짝 확대 없음(접근성). 커서 pointer.
- **간격:** 카드 내부 요소 세로 gap 4, 포스터-본문 사이 0(본문 패딩으로 처리).

#### D-2. 카드 인터랙션
- 클릭/Enter → `/performances/[mt20id]`로 이동(F3.1). 이동 직전 현재 목록 상태(필터·스크롤·페이지 수) 저장(D8).
- 포커스 가능(tabindex), 포커스 링 표시.

### 2.6 영역 E — 무한 스크롤 로더 · F1.2

- **트리거:** 그리드 하단 sentinel 요소가 viewport에 근접(Intersection Observer, rootMargin 예 400px) → 다음 페이지(30개) 자동 로드.
- **표시:** 로드 중 그리드 하단에 **하단 스피너**(circular 24, 중앙). 끝까지 로드 시 "마지막 공연입니다" 캡션(선택) 또는 sentinel 제거.
- **페이지 크기:** 30(최대 100 가능, v0.1=30). **페이지 번호는 URL 미포함**(F1.2). deep link로 특정 페이지 복원 미지원.

### 2.7 인터랙션 플로우 (S1)

**플로우 1 — 최초 진입**
1. `/` 진입 → 디폴트 필터(30일·전국·전체) 적용.
2. **S1-L**: 스켈레톤 카드 그리드 표시(아래 2.9).
3. KOPIS 응답 도착 → 카드 렌더(**S1-DEFAULT**). 결과 0건이면 **S1-E**, 실패면 **S1-X**.

**플로우 2 — 필터 적용(시나리오 1: 다음 달 서울+경기 뮤지컬)**
1. 월별 "다음 달" 탭 → 칩 Selected, 300ms 후 재조회 → 그리드 갱신, URL `?from=…&to=…`.
2. 지역 칩 → 메뉴 → "서울" 체크 → "경기" 체크 → 닫기 → 필터바에 `서울 ✕` `경기 ✕`, 재조회(병렬 호출 병합).
3. 장르 "뮤지컬" 칩 탭 → Selected, 재조회.
4. 각 단계 재조회 중 그리드 상단 progress 또는 스켈레톤 교체. 결과 0건이면 S1-E.

**플로우 3 — 무한 스크롤**
1. 스크롤 하단 근접 → 하단 스피너(S1-MORE) → 다음 30개 append → 스피너 제거.

**플로우 4 — 상세 진입/복귀**
1. 카드 클릭 → 상태 저장(필터+스크롤Y+로드 페이지수) → S2 이동.
2. S2에서 뒤로가기 → S1 복원: 동일 필터, 동일 스크롤 위치, 동일하게 로드돼 있던 카드 수(D8).

### 2.8 반응형 차이 요약 (S1)

| 영역 | Desktop 1440 | Mobile 375 |
|---|---|---|
| 상단바 | 로고 좌, 우측 비움, 높이 64 | 동일, 패딩 16 |
| 필터 | inline 필터바(칩 펼침) | 칩 요약 줄 + [필터]→바텀시트 |
| 정렬 | 결과줄 우측 Connected group | 토글 축소 또는 드롭다운 |
| 그리드 | 4~6열, gap 24 | 2열, gap 12 |
| 카드 본문 | title-medium 2줄 | 동일(폰트 동일, 폭만 축소) |

### 2.9 상태 변형 상세

#### S1-L · 최초 로딩 (스켈레톤) · F1.3
- 상단바·필터바는 실제 렌더(인터랙션 비활성 가능). 그리드 자리에 **스켈레톤 카드** N개(데스크톱 10~15, 모바일 6~8).
- 스켈레톤 카드: 포스터 자리 3:4 회색 블록(`surface-container-high`) + 텍스트 2줄 회색 바. shimmer 애니메이션(1.2s loop).
- 결과 건수 자리 = 스켈레톤 텍스트.

#### S1-MORE · 추가 로딩
- 기존 카드 유지 + 하단 스피너만. 화면 점프 없음.

#### S1-E · 빈 상태 · F1.3
- 그리드 영역 중앙 정렬: 일러스트/아이콘(예 빈 상자/음표) + 제목 "조건에 맞는 공연이 없습니다"(`title-medium`) + 보조문 "필터를 바꾸거나 초기화해 보세요"(`body-medium`, on-surface-variant) + **[필터 초기화]**(tonal button).
- 상단바·필터바는 유지(필터 다시 조정 가능).

#### S1-X · 에러 · F1.3
- 그리드 영역 중앙: 에러 아이콘(`error`) + "공연 정보를 불러오지 못했습니다"(`title-medium`) + 보조문 "잠시 후 다시 시도해 주세요"(`body-medium`) + **[재시도]**(filled button).
- 재시도 → 동일 필터로 재요청 → S1-L → 결과.

---

## 3. 필터 컴포넌트 상세 스펙

| 필터 | 컴포넌트 | 선택 방식 | 선택 표시 | KOPIS 파라미터 | 주요 상태/예외 |
|---|---|---|---|---|---|
| 월별 | Filter chip ×4 + Date range picker | 단일 | 선택 칩 채움 / 범위 텍스트 | `stdate`,`eddate` | 31일 초과 → 토스트+보정 (D3) |
| 지역 | 진입 칩 + Menu(2단 드릴다운) + Input chip | 다중 | Input chip 나열, 3+ 시 축약 | `signgucode`,`signgucodesub` | "전국" ↔ 개별 상호 해제 (D4) |
| 장르 | Filter chip(다중) | 다중 | 선택 칩 leading check | `shcate` | 빈 선택=전체 |
| 공연장 | 진입 칩 + Search + 자동완성 Menu + Input chip | 단일(기본) | Input chip | `prfplccd` | 자동완성은 자체 DB(prfplc) |

### 3.1 칩 상태 매트릭스 (Filter chip)
| 상태 | Selected | Style | 배경 | 텍스트 | leading |
|---|---|---|---|---|---|
| 미선택 | False | Outlined | 투명 | `on-surface-variant` | 없음 |
| 미선택 hover | False | Outlined | state-layer 8% | `on-surface` | 없음 |
| 선택 | True | (채움) | `secondary-container` | `on-secondary-container` | ✓ check |
| 비활성 | - | Outlined | - | 38% opacity | - |

### 3.2 날짜범위 피커
- M3 Date range picker(모달/도킹). 시작·종료 선택. "취소"(text) / "확인"(filled).
- 확인 시 31일 룰 검증 → 위반 시 토스트 후 보정값으로 적용.

---

## 4. S2 — 공연 상세

> **연결 기능:** F3 · 진입 `/performances/[mt20id]`, KOPIS `pblprfr/{mt20id}` 호출

### 4.1 프레임 스펙 / 레이아웃
| 항목 | Desktop 1440 | Mobile 375 |
|---|---|---|
| 콘텐츠 최대폭 | 1080 (중앙) | 375 |
| 좌우 패딩 | 32 | 16 |
| 구성 | 2단: 좌 포스터(고정 320~360) + 우 정보. 갤러리는 하단 풀폭 | 1단 세로 스택 |
| 포스터 | sticky(우측 정보 스크롤 시 좌측 고정, 선택) | 상단 풀폭 |

### 4.2 영역 분해 (위→아래 / 좌→우)

#### A. 상단바 (App bar)
- 좌: **뒤로가기** Icon button(arrow_back). 클릭 → S1로 복귀 + 상태 복원(D8, F3.3).
- 중앙/좌: 공연명(스크롤 시 노출되는 축약 타이틀, 선택). 기본은 비우거나 "공연 상세".
- 스펙: 높이 64, sticky, 스크롤 시 Scrolled fill.

#### B. 포스터 (`poster`)
- 데스크톱: 좌측 컬럼, 폭 320~360, 비율 3:4, 라운드 12, elevation level1.
- 모바일: 상단 풀폭(좌우 패딩 16), 비율 3:4 또는 중앙 정렬 max-height.
- 이미지 없음 → 플레이스홀더.

#### C. 기본 정보 블록 (우측 상단 / 모바일 포스터 아래)
- 공연명(`prfnm`) — `headline-small`, `on-surface`, **h1**.
- 메타 라인: 장르(`genrenm`) · 관람연령(`prfage`) — `body-medium`, on-surface-variant. 예 "뮤지컬 · 만 7세 이상".
- 공연 기간(`prfpdfrom`~`prfpdto`) — `body-large`. 예 "2026.06.10 – 07.05".
- 상태 뱃지(`prfstate`) — 공연중/공연예정/공연완료.
- 공연 시간(`dtguidance`) — `body-medium`. 자유 텍스트 그대로. 예 "화~금 20:00, 토 15:00/19:00".

#### D. 예매처 링크 블록 · F3.2
- **목적:** KOPIS `relates` 배열의 예매처를 외부 링크 버튼으로 노출.
- **UI:** 섹션 제목 "예매하기"(`title-medium`, h2) + 버튼 목록.
  - 예매처별 **Button(filled, Size=Small, trailing open_in_new 아이콘)**. 라벨 = `relate.nmr" + "에서 예매"` 형식. 예 "인터파크티켓에서 예매", "티켓링크에서 예매".
  - 버튼 배열: 데스크톱 가로 wrap(gap 8), 모바일 세로 풀폭(gap 8).
- **링크 동작:** `href=relate.relateurl`, `target="_blank"`, `rel="noopener noreferrer"` → 새 탭.
- **예외:** `relates` 비었으면 "예매 정보 없음"(`body-medium`, on-surface-variant) 텍스트만.
- **링크 안전:** 외부 URL은 KOPIS 제공 값 사용. 사용자에게 외부 이동임을 아이콘(open_in_new)으로 시각화.

#### E. 공연장 정보 블록
- 섹션 제목 "공연장"(h2). 공연장명(`fcltynm`) — `body-large`. 주소(`adres`) — `body-medium`, on-surface-variant.
- 지도 없음(D7). 주소는 텍스트만(추후 복사 버튼 등 확장 여지).

#### F. 출연진 블록
- 제목 "출연"(h2). `prfcast` 텍스트 그대로 노출(`body-large`). (Risk 2: 자유 텍스트 → 파싱 없이 노출.)

#### G. 줄거리 블록
- 제목 "줄거리"(h2). `sty` 텍스트(`body-large`, 줄바꿈 보존). 길면 "더보기" 접힘(선택, 6줄 초과 시).

#### H. 티켓 가격 블록
- 제목 "가격"(h2). `pcseguidance` 텍스트 그대로(`body-large`). 예 "VIP 99,000 / R 88,000 …". (Risk 2.)

#### I. 제작 정보 블록
- 제목 "제작"(h2). 기획/제작/주최/주관(`entrpsnmH`/`entrpsnmP`/`entrpsnmA`/`entrpsnmS` 등) — `body-medium`, 레이블·값 쌍.

#### J. 소개 이미지 갤러리 (`styurls`)
- 제목 "공연 소개"(h2). 이미지 세로 나열(모바일·데스크톱 모두 풀폭 권장) 또는 캐러셀. 각 이미지 라운드 12, lazy-load.

### 4.3 인터랙션 플로우 (S2)
1. 진입 → **S2-L**(스켈레톤: 포스터 블록 + 텍스트 라인 회색) → 응답 → **S2-DEFAULT**. 실패 → **S2-X**.
2. 예매처 버튼 클릭 → 새 탭 외부 이동(현재 탭 유지).
3. 뒤로가기(상단바 ← 또는 브라우저) → S1 복원(D8).

### 4.4 상태 변형
- **S2-L:** 포스터 자리 회색 블록 + 제목/메타/본문 스켈레톤 라인. 예매 버튼 자리 회색 pill.
- **S2-X:** 중앙 에러 아이콘 + "공연 정보를 불러오지 못했습니다" + [재시도] + [목록으로](text).

### 4.5 반응형 차이 (S2)
| 영역 | Desktop 1440 | Mobile 375 |
|---|---|---|
| 포스터 | 좌측 고정 320~360, sticky | 상단 풀폭 |
| 정보 | 우측 컬럼 스크롤 | 포스터 아래 세로 스택 |
| 예매 버튼 | 가로 wrap | 세로 풀폭 |
| 갤러리 | 하단 풀폭 | 하단 풀폭 |

---

## 5. 상태 복원 (목록 ↔ 상세) · F1.2 ↔ F3.3 · D8

보존 대상:
1. **적용 필터** — 이미 URL 쿼리스트링에 존재 → 복원 자동.
2. **스크롤 위치(Y)** — S1 이탈 시 저장, 복귀 시 동일 위치로.
3. **로드된 페이지 수** — 무한 스크롤로 3페이지(90개)까지 로드돼 있었다면 복귀 시 동일하게 90개 렌더 후 해당 스크롤로.

구현 후보(확정은 데이터 모델 단계): `sessionStorage`에 `{query, scrollY, loadedPages}` 저장 / 또는 데이터 캐시(React Query 등)로 페이지 캐시 유지. 본 문서는 UX 요구만 확정한다.

---

## 6. 접근성 / NFR

- **키보드:** 모든 칩·카드·버튼·메뉴 항목 Tab 이동, Enter/Space 실행, Esc로 메뉴/바텀시트/모달 닫기. 포커스 트랩(모달/바텀시트 내부).
- **포커스 가시성:** `primary` 2px 포커스 링.
- **스크린리더:** 포스터 `alt`=공연명. 상태 뱃지 텍스트 읽힘. 외부 링크 버튼에 "새 탭에서 열림" aria.
- **헤딩 구조:** S2 공연명=h1, 각 섹션 제목=h2. S1은 페이지 타이틀 h1(시각 숨김 가능) + 카드 공연명 적정 레벨.
- **성능(NFR):** 첫 페이지 3초 이내. 스켈레톤으로 체감 단축. 포스터 lazy-load + 적정 사이즈.
- **SEO:** S2 메타 태그 동적 생성(공연명/포스터/기간) — v0.1 우선순위 낮음.
- **터치 타깃:** 최소 44×44(모바일 칩/버튼/카드 탭 영역).

---

## 7. M3 컴포넌트 매핑 (Figma 작성용)

> Figma 와이어프레임은 아래 Material 3 컴포넌트를 인스턴스로 사용. componentKey는 `importComponentSetByKeyAsync` 등에 활용. variant는 권장 기본값.

| 화면 영역 | M3 컴포넌트 | componentKey | 권장 variant |
|---|---|---|---|
| 상단바(S1/S2) | App bar | `23a20484e255cb14cf467ccc984ac918e457cefb` | Type=Small, Scrolled=False |
| 월/장르/지역 진입 칩 | Filter chip | `a3c83c534d78babd0613f4f14c72ac25ebae90cf` | Style=Outlined, Selected=False/True |
| 선택 지역/공연장 칩 | Input chip | `43bb4e7ba35f782f6ec354697a45f805a81cbabb` | Trailing=Close |
| 공연 카드 | Stacked card | `a79bb6c8ccfee2be2b9d5cefcb81fc2d88c62fff` | Style=Elevated, Media=Top |
| (대안)리스트형 카드 | Horizontal card | `78d3f1e228edbedd6296fda77df704a36224f12b` | Style=Elevated |
| 예매처/주요 버튼 | Button(filled) | `ab924dce8b851fd820bd0d56da24a9c489311ae6` | Size=Small, Shape=Round, Color=Filled |
| 정렬 토글 | Connected button group | `ab725aa6145ef6985ede897ea5a0baf007f98c4b` | Selection=Single, Size=Small |
| 초기화/재시도(보조) | Button - outline / text | outline `dd2040219668454df5aa170434636aa823624c1a` / text `c94bd76a8dbf75d7885f3015ad8474d898fca25b` | Size=Small |
| 빈상태 액션 | Button - tonal | `bc43537f1f7aec7e0c159679f9a721e7aab9f100` | Size=Small |

> 검색/텍스트 필드(공연장 자동완성), 색상·타이포 **변수 키**는 Figma MCP 호출 한도 회복 후 `search_design_system`(includeVariables=true)으로 조회해 추가한다.

---

## 8. Figma 프레임 구성안 (좌표/크기)

파일 `/design/wUnLKzLc0Qq9br4vDd5XGj` Page 1. 좌→우 흐름, 프레임 간 가로 간격 120, 상태 변형은 본 프레임 아래(세로 간격 120)에 배치.

| 프레임명 | 크기(W×H) | 배치(x,y) | 내용 |
|---|---|---|---|
| `S1 · 메인 (Desktop)` | 1440 × 1600 | (0, 0) | 상단바+필터바+결과/정렬+5열 카드 그리드(약 15장) |
| `S1 · 메인 (Mobile)` | 375 × 1400 | (1560, 0) | 칩 요약줄+[필터]+2열 그리드 |
| `S1-L 로딩` | 375 × 900 | (1560, 1520) | 스켈레톤 그리드 |
| `S1-E 빈상태` | 375 × 700 | (2055, 1520) | 빈 일러스트+초기화 |
| `S1-X 에러` | 375 × 700 | (2550, 1520) | 에러+재시도 |
| `S2 · 상세 (Desktop)` | 1440 × 1800 | (2055, 0) | 2단(포스터+정보)+예매+갤러리 |
| `S2 · 상세 (Mobile)` | 375 × 2000 | (3615, 0) | 1단 세로 스택 |
| `S2-L / S2-X` | 375 × 900 | (3615, 2120) | 상세 로딩/에러 |

각 프레임: auto-layout(세로), 배경 `surface`, §7 컴포넌트 인스턴스 + M3 색상/타이포 토큰, 미드파이 충실도(실 색·타이포 반영, 더미 데이터: 공연명/포스터 placeholder/기간 등).

---

## 9. KOPIS 필드 ↔ UI 매핑 (부록)

| UI 요소 | 화면 | KOPIS 필드 | 비고 |
|---|---|---|---|
| 카드 포스터 / 상세 포스터 | S1, S2 | `poster` | 없으면 placeholder |
| 공연명 | S1, S2 | `prfnm` | 카드 2줄 말줄임 |
| 공연 기간 | S1, S2 | `prfpdfrom`,`prfpdto` | "YYYY.MM.DD – MM.DD" |
| 공연장명 | S1, S2 | `fcltynm` | |
| 지역 | S1 | `area` | 카드 메타 |
| 장르 | S1, S2 | `genrenm` / `shcate`(필터) | 필터는 코드 매핑 |
| 공연 상태 뱃지 | S1, S2 | `prfstate` | 공연중/예정/완료 |
| 관람 연령 | S2 | `prfage` | |
| 주소 | S2 | `adres` | 지도 없음(D7) |
| 출연진 | S2 | `prfcast` | 텍스트 그대로 |
| 줄거리 | S2 | `sty` | 텍스트 그대로 |
| 티켓 가격 | S2 | `pcseguidance` | 텍스트 그대로 |
| 공연 시간 | S2 | `dtguidance` | 텍스트 그대로 |
| 소개 이미지 | S2 | `styurls` | 갤러리 |
| 제작/기획/주최/주관 | S2 | `entrpsnmH/P/A/S` 등 | 레이블-값 |
| 예매처 링크 | S2 | `relates[]`(nmr"/relateurl) | 새 탭 |
| 월 필터 | S1 | `stdate`,`eddate` | 31일 제한(D3) |
| 지역 필터 | S1 | `signgucode`,`signgucodesub` | 다중→병합 |
| 공연장 필터 | S1 | `prfplccd` (+ `prfplc` 동기화) | 자동완성 |

> 필드명은 KOPIS 공연목록/상세 응답 기준 추정치 포함. 실제 키/유무는 `kopis-integration.md` 연동 단계에서 확정.

---

## 10. 미해결 / 다음 단계

- [ ] **Figma 반영**(한도 회복 후): §8 프레임을 Material 3로 작성(미드파이).
- [ ] 색상/타이포/간격 **변수 키** 조회 후 §7 보강.
- [ ] 상태 복원 구현 방식 확정 → `data-model.md` (sessionStorage vs 캐시).
- [ ] 지역 다중 선택 **병합 패턴** 확정 → `data-model.md` / `kopis-integration.md`.
- [ ] 장르 코드 ↔ 한글 매핑 → `kopis-codes.md`.
- [ ] KOPIS 실제 응답 필드 검증(특히 `relates`, `prfage`, 제작 정보 키) → `kopis-integration.md`.
- [ ] (선택) 다크 모드 토글 — M3 role 기반이라 확장 용이.
