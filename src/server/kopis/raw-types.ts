// KOPIS XML 응답을 파싱한 raw 타입. BFF 내부 전용 — UI에 절대 노출하지 않는다.

/** 공연목록 /pblprfr 목록 응답의 단일 항목 */
export interface KopisPblprfrListItem {
  mt20id?: string;
  prfnm?: string;
  prfpdfrom?: string; // yyyy.MM.dd
  prfpdto?: string;
  fcltynm?: string;
  poster?: string;
  area?: string;
  genrenm?: string;
  openrun?: string; // "Y" | "N"
  prfstate?: string; // "공연중" | "공연예정" | "공연완료"
}

/** 공연상세 /pblprfr/{mt20id} 응답 */
export interface KopisPblprfrDetail {
  mt20id?: string;
  mt10id?: string;
  mt13id?: string;
  prfnm?: string;
  prfpdfrom?: string;
  prfpdto?: string;
  fcltynm?: string;
  poster?: string;
  area?: string;
  genrenm?: string;
  openrun?: string;
  prfstate?: string;
  prfcast?: string;
  prfcrew?: string;
  prfruntime?: string;
  prfage?: string;
  entrpsnm?: string;
  entrpsnmP?: string;
  entrpsnmA?: string;
  entrpsnmH?: string;
  entrpsnmS?: string;
  pcseguidance?: string;
  sty?: string;
  dtguidance?: string;
  styurls?: { styurl?: string | string[] };
  relates?: { relate?: KopisRelate | KopisRelate[] };
}

export interface KopisRelate {
  relatenm?: string;
  relateurl?: string;
}

/** 공연시설목록 /prfplc 목록 응답의 단일 항목 */
export interface KopisPrfplcListItem {
  mt10id?: string;
  fcltynm?: string;
  mt13cnt?: string | number;
  fcltychartr?: string;
  sidonm?: string;
  gugunnm?: string;
  opende?: string;
}

/** 공연시설상세 /prfplc/{mt10id} 응답 */
export interface KopisPrfplcDetail extends KopisPrfplcListItem {
  adres?: string;
  la?: string | number;
  lo?: string | number;
  seatscale?: string | number;
  telno?: string;
  relateurl?: string;
}
