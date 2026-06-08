# Riff — 디자인 토큰 & 일러스트 (Design Tokens)

| 항목 | 내용 |
|---|---|
| 상태 | **확정 (v0.1 와이어프레임 기준)** |
| 작성일 | 2026-06-09 |
| 디자인 시스템 | Material 3 (Purple 테마) |
| 코드 | `src/styles/design-tokens.css` · 에셋 `public/illustrations/` |
| 관련 | [`screens.md`](./screens.md) §1.1 |

> 와이어프레임에서 확정한 **퍼플 기반 컬러 톤**과 일러스트 에셋을 정의한다. 구현 시 색상은 이 토큰(M3 color role)만 참조하고 hex 하드코딩을 금지한다.

## 1. 컬러 팔레트 (M3 role)

| 용도 | role / 토큰 | 라이트 값 | 비고 |
|---|---|---|---|
| 주요 액션 | `--md-primary` | `#534AB7` 딥퍼플 | 선택 칩, 정렬 on, 예매 버튼 |
| 주요 액션 위 글자 | `--md-on-primary` | `#FFFFFF` | |
| 약한 강조 면 | `--md-primary-container` | `#EEEDFE` 라벤더 | 칩 배경, 강조 영역 |
| 〃 위 글자 | `--md-on-primary-container` | `#26215C` | |
| hover/보조 퍼플 | `--md-primary-hover` | `#7F77DD` | 링크("필터 초기화"), hover |
| 페이지 배경 | `--md-surface` | `#FFFFFF` | 앱 캔버스 |
| 보조 면(틴트) | `--md-surface-container` | `#F6F5FE` | 베이지 대체 라벤더 틴트 |
| 한 단계 높은 면 | `--md-surface-container-high` | `#EEEDFE` | 바텀시트/메뉴 |
| 본문 글자 | `--md-on-surface` | `#1C1B22` | |
| 보조 글자 | `--md-on-surface-variant` | `#5F5E6B` | 메타·캡션 |
| 외곽선 | `--md-outline-variant` | `rgba(83,74,183,.20)` | 카드/칩 보더, 구분선 |

## 2. 공연 상태(prfstate) 뱃지 색

| 상태 | 토큰 | 값 | 글자 |
|---|---|---|---|
| 공연중 | `--md-state-ongoing` | `#0F6E56` 틸 | 흰색 |
| 공연예정 | `--md-state-upcoming` | `#534AB7` 퍼플 | 흰색 |
| 공연완료 | `--md-state-ended` | `#5F5E5A` 그레이 | 흰색 |

## 3. 액센트

| 용도 | 토큰 | 값 |
|---|---|---|
| 스포트라이트/포인트 | `--md-accent-amber` | `#EF9F27` |
| 음표/보조 | `--md-accent-teal` | `#1D9E75` |

> 3색 원칙: **퍼플(메인) + 앰버(빛) + 틸(음표)**. 일러스트와 UI가 같은 팔레트를 공유한다.

## 4. 일러스트 에셋 (`public/illustrations/`)

| 파일 | 용도 | 쓰이는 화면 |
|---|---|---|
| `brand-mark.svg` | 헤더 로고 마크(스포트라이트+음표) | 상단바 좌측, "Riff" 옆 |
| `poster-placeholder.svg` | 포스터 없을 때(LP+음표) | S1 카드, S2 포스터 |
| `empty-state.svg` | 결과 0건(빈 무대+마이크) | S1-E 빈 상태 |
| `error-state.svg` | 불러오기 실패(끊긴 플러그+스파크) | S1-X / S2-X 에러 |

모티프 통일: 무대 / 스포트라이트 / 마이크 / 음표. 플랫(면) 일러스트, 위 3색 팔레트.

사용 예(Next.js):
```tsx
import Image from "next/image";
<Image src="/illustrations/empty-state.svg" alt="조건에 맞는 공연이 없습니다" width={150} height={120} />
```

## 5. 적용 규칙

- `src/styles/design-tokens.css`를 `globals.css`에서 import 후 토큰 참조.
- 컴포넌트는 hex 직접 사용 금지 → `var(--md-*)`만 사용(ARCHITECTURE §6 린트 대상).
- 다크 모드는 v0.2 비목표이나 토큰이 `prefers-color-scheme: dark`를 이미 포함.

## 6. 미해결

- [ ] `globals.css` import 연결(Phase C 시작 시).
- [ ] 일러스트를 React 컴포넌트로 래핑할지(`src/components/illustrations/`) 정적 SVG로 둘지 — Phase C에서 결정.
