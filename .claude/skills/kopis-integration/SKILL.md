---
name: kopis-integration
description: "Riff의 KOPIS Open API 연동 실무 스킬. 4개 엔드포인트(pblprfr 목록/상세, prfplc 목록/상세) 파라미터·응답 필드, 서비스키 보안, XML→도메인 정규화, 31일 제약·지역 병합, 캐싱/에러, 자유 텍스트 원문 보존, 검증된 코드값 사용을 정의. Riff에서 KOPIS 호출·정규화·동기화 코드를 작성할 때 반드시 이 스킬을 적용할 것."
---

# kopis-integration — KOPIS 연동 실무

KOPIS 연동의 "어떻게"를 정의한다. 전체 명세는 `docs/api/kopis-integration.md`, 코드값은 `docs/api/kopis-codes.md`(✅ 공식 검증 완료) 참조.

## 왜 이렇게 하는가
KOPIS는 XML·자유 텍스트·단일 지역 코드 등 제약이 많다. 경계(BFF)에서 도메인 타입으로 정규화하면 이 제약이 UI로 새지 않는다. 서비스키를 서버에 가두면 키 노출·CORS·rate limit을 통제할 수 있다.

## 베이스 / 인증
- 베이스: `http://www.kopis.or.kr/openApi/restful` (HTTP). 모든 호출은 BFF 경유.
- 인증: 쿼리 `service={KOPIS_SERVICE_KEY}`. 서버 전용, 클라이언트 비노출.

## 엔드포인트 (검증된 명세)
- `GET /pblprfr` — 목록. 필수 service/stdate/eddate/cpage/rows(≤100). 선택 shcate/signgucode/signgucodesub/prfplccd/prfstate/openrun. 정렬 파라미터 없음.
- `GET /pblprfr/{mt20id}` — 상세. 예매처 `relates>relate>{relatenm?, relateurl}`, 제작 `entrpsnm/P/A/H/S`, 이미지 `styurls>styurl[]`, 시설 `mt10id`/`mt13id`.
- `GET /prfplc` — 공연시설 목록. 응답은 지역을 `sidonm`/`gugunnm`(라벨)로 반환(코드 아님). 주소·좌표 없음.
- `GET /prfplc/{mt10id}` — 시설 상세. `adres`/`la`/`lo`/`mt13cnt`/`mt13s[]`.

## 정규화 (경계 파싱)
- XML → `parse-xml` → raw → `normalize`(도메인 타입). 빈 문자열→undefined, `yyyy.MM.dd`→ISO.
- `prfstate` 라벨(공연예정/공연중/공연완료)→enum. `genrenm` 라벨→Genre enum(목록엔 shcate 코드 없음).
- **자유 텍스트 원문 보존(파싱 금지):** prfcast, prfcrew, sty, pcseguidance, prfage, dtguidance, prfruntime.
  - **v3 예외(원문 보존 불변):** (1) pcseguidance → 가격 밴드 파생값 생성(`price-band.ts`, 표시용 칩, 원문 대체 아님). (2) prfcast → Artist 추출 파이프라인이 **별도 테이블(`performance_artists`)에 추출 사본 적재**. 원문 `cast` 필드는 그대로 유지. 두 경우 모두 원문을 파싱해 UI에 대체 표시하는 것이 아니라, **파생값/사본을 별도 저장**하는 것.
- 예매처: `{name?: relatenm, url: relateurl}`. **name optional**(없는 항목 존재) → UI에서 도메인/대체 라벨.

## 코드값 (✅ kopis-codes.md, 하드코딩은 검증값만)
- 장르 shcate: 연극AAAA 무용BBBC 대중무용BBBE 클래식CCCA 국악CCCC 대중음악CCCD 복합EEEA 서커스/마술EEEB 뮤지컬GGGA.
- 시도 signgucode(앞2자리): 11서울 26부산 27대구 28인천 29광주 30대전 31울산 36세종 41경기 51강원 43충북 44충남 45전북 46전남 47경북 48경남 50제주.
- 구군 signgucodesub: 앞4자리(서울 1111종로~1174강동). 전체표는 공통코드 PDF에서 데이터화.
- prfstate: 01공연예정 02공연중 03공연완료. resultCode: 00정상 04 NODATA 05 31일초과 06 100건초과.

## 호출 전략
- **31일(D3):** API가 강제(resultCode 05). BFF는 eddate-stdate≤31일 보장, 초과 입력은 보정+플래그.
- **지역 다중(D4):** KOPIS는 단일 signgucode만 수용 → 시도별 호출. page>1 정확도를 위해 각 지역 `cpage=1..page` **누적 fetch** → 전역 병합·중복제거(mt20id)·정렬(prfpdfrom) → **전역 오프셋** 슬라이스(`slicePage(merged,page,rows)`). 지역별 page 고정 슬라이스는 누락 발생(#21 회귀). 동시 호출은 상한 **5**로 batch(`mapWithConcurrency`, 아래 실측 근거).
- **정렬(F4):** API 정렬 없음 → BFF에서 시작일 ASC/DESC.
- **공연장(D5):** prfplc 전량 동기화→자체 DB. 자동완성은 DB 조회(KOPIS 미호출). 시도/구군 코드는 라벨→코드 파생.

## 에러 / 캐싱
- 5xx/timeout(5s) 1회 재시도→502→UI 에러+재시도. 04→빈 배열→S1-E. 부분 실패는 성공분 병합+플래그.
- 캐시: 목록 `perf:{filterHash}:{page}` 5~10분, 상세 30~60분.
- **rate limit (실측 2026-06-12, #12):** 안전 동시성 상한 **5**(100% 성공, ≈11 req/s, p95 820ms). 10은 지연만 악화(p95≈2s, 처리량 이득 없음), 20에서 포화(성공률 63%, HTTP 400 다발). 모든 다중 호출(지역 병합·prfplc 전량 동기화)은 동시성 ≤5로 batch + 5xx/timeout 1회 재시도.
