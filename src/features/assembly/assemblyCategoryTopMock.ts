import type { PledgeExecutionProgress } from "@/features/assembly/pledgeExecutionProgress";
import { ASSEMBLY_PLEDGE_CATEGORY_LABELS } from "@/features/assembly/pledgeCategories";

/**
 * 카테고리별 '이행 우수' TOP 5 목업.
 * 공약 문구·ID·라우팅 근거는 woogook-backend/tmp/role1_routing_llm_sample_30.json 샘플을 참고했고,
 * 진행도·판단 근거(에이전트 가상)는 UI용으로 붙였습니다. API 연동 시 교체.
 */
export type CategoryTopPledgeMock = {
  promise_id: string;
  promise_text: string;
  progress: PledgeExecutionProgress;
  /** LLM·에이전트 판단 근거 1~3줄 */
  rationale_lines: string[];
};

export type AssemblyPledgeCategoryLabel = (typeof ASSEMBLY_PLEDGE_CATEGORY_LABELS)[number];

export const ASSEMBLY_CATEGORY_TOP5_MOCK: Record<AssemblyPledgeCategoryLabel, CategoryTopPledgeMock[]> =
  {
    "경제·산업·재정": [
      {
        promise_id: "QQ429063-0005",
        promise_text: "종합부동산세/상속 증여세/재산세율 조정",
        progress: "완료",
        rationale_lines: [
          "role1 라우팅 샘플에서 정책 카테고리 '경제·산업·재정', 이행경로 '재정형'으로 분류됨.",
          "국회 예산안·세법 개정안 검색 시 동일 정책 키워드가 포함된 심의 기록이 다수 확인됨.",
          "지자체 보도자료에서 세율 조정 관련 집행 안내가 연속 보도됨.",
        ],
      },
      {
        promise_id: "QQ429063-0007",
        promise_text: "미래산업 스타트업 벨트 육성",
        progress: "완료",
        rationale_lines: [
          "샘플 JSON에서 [LLM 라우팅]으로 재정·인허가·운영 지원 경로가 복합 지정됨.",
          "중소벤처 관련 사업 공고·R&D 매칭 뉴스에서 해당 구역 스타트업 지원이 반복 언급됨.",
          "입법예고·정책브리핑 키워드 매칭 점수가 높게 산출됨(에이전트 규칙 기준).",
        ],
      },
      {
        promise_id: "QQ429063-0006",
        promise_text: "MICE산업과 한류 의료관광 연계 발전",
        progress: "진행중",
        rationale_lines: [
          "라우팅 근거에 재정 지원·인프라 계획 수립 필요성이 명시됨.",
          "관광·의료분야 보도에서 연계 사업 착수 보도는 있으나 예산 집행률 공개는 부분적임.",
          "다음 회기 예산안 대조 시 항목 유지 여부를 재검증할 예정(에이전트 파이프라인).",
        ],
      },
      {
        promise_id: "MOCK-ECO-01",
        promise_text: "지역 상권 회복을 위한 긴급경영자금 이자 지원",
        progress: "진행중",
        rationale_lines: [
          "동일 카테고리(경제·재정) 키워드로 클러스터링된 가상 공약 — 샘플 JSON 구조를 따름.",
          "지자체 금융지원 공고문 OCR·NER 결과 상품명이 공약 문구와 정합.",
          "집행 건수는 증가 추세이나 전 구역 커버리지 데이터는 아직 수집 중.",
        ],
      },
      {
        promise_id: "MOCK-ECO-02",
        promise_text: "강남구 MICE 연계 지역 브랜드 마케팅 예산 편성",
        progress: "미착수",
        rationale_lines: [
          "QQ429063-0006과 연관 키워드로 묶였으나 별도 예산 편성 공문은 미등록.",
          "국회·구청 보도 검색에서 직접적 집행 근거는 발견되지 않음.",
          "에이전트는 '예산 편성 전 단계'로 분류.",
        ],
      },
    ],
    "노동·일자리·기업활력": [
      {
        promise_id: "QQ429063-0008",
        promise_text: "청년, 여성, 신중년 취업창업 종합 서비스지원",
        progress: "완료",
        rationale_lines: [
          "샘플에서 '노동·일자리·기업활력', 이행경로 '운영·지원형'으로 라우팅됨.",
          "고용센터·구청 일자리 사업 공고에서 동일 서비스명 프로그램이 다회 개설됨.",
          "참여자 수 통계가 분기별로 공개되어 이행 정도가 높게 평가됨.",
        ],
      },
      {
        promise_id: "MOCK-LAB-01",
        promise_text: "청년 인턴십·정규직 전환 연계 고용바우처",
        progress: "진행중",
        rationale_lines: [
          "0008번 공약과 동일 클러스터 키워드(청년·취업)로 목업 확장.",
          "고용부·지자체 협력 사업명이 언론에 등장하나 전환율 데이터는 부분 공개.",
        ],
      },
      {
        promise_id: "MOCK-LAB-02",
        promise_text: "여성 경력단절 예방 맞춤형 직업훈련 장려금",
        progress: "진행중",
        rationale_lines: [
          "교육 훈련 공고 키워드와 공약 문장 임베딩 유사도 0.82(목업 점수).",
          "신청 접수는 진행 중이나 수료·취업 연계 통계는 다음 분기 집계 예정.",
        ],
      },
      {
        promise_id: "MOCK-LAB-03",
        promise_text: "신중년 재취업 상담 허브 및 직무 설계 지원",
        progress: "완료",
        rationale_lines: [
          "구청 보도자료에 상담 실적·연계 기업 수가 수치로 명시됨.",
          "국회 본회의·상임위 회의록에서 유사 명칭 예산 설명이 확인됨.",
        ],
      },
      {
        promise_id: "MOCK-LAB-04",
        promise_text: "지역 기업 채용박람회 분기별 정례화",
        progress: "미착수",
        rationale_lines: [
          "정례화 관련 행정 명령·예산 항목은 아직 검색되지 않음.",
          "일회성 행사 보도만 존재하여 '정례화' 조건은 미충족으로 판단.",
        ],
      },
    ],
    "복지·보건·돌봄·인구": [
      {
        promise_id: "QQ429063-0013",
        promise_text: "보육과 교육, 촘촘한 아이돌봄 연계 프로그램",
        progress: "완료",
        rationale_lines: [
          "샘플 JSON 정책 카테고리 '복지·보건·돌봄·인구', 경로 '운영·지원형'.",
          "보육·돌봄 연계 사업 실적이 구 정책백서에 수치로 기재됨.",
          "관련 예산 심의 회의록에서 증액 합의 언급이 있음.",
        ],
      },
      {
        promise_id: "QQ429063-0014",
        promise_text: "맞벌이가정 맞춤 보육서비스 마련",
        progress: "완료",
        rationale_lines: [
          "라우팅 근거에 키워드 일치 2건으로 명시.",
          "보육시설 운영 시간 확대 보도가 다수 매체에서 동일 정책명으로 인용됨.",
        ],
      },
      {
        promise_id: "QQ429063-0015",
        promise_text: "1인가구, 취약계층 맞춤형 복지지원",
        progress: "진행중",
        rationale_lines: [
          "계획·인허가형 + 운영·지원형 복합 경로로 분류됨(샘플).",
          "지원 신청 건수는 증가했으나 전 취약계층 커버리지 지표는 수집 지연.",
        ],
      },
      {
        promise_id: "QQ429063-0016",
        promise_text: "어르신 복합문화쉼터 확충",
        progress: "진행중",
        rationale_lines: [
          "건설·정비형 경로 — 착공·준공 보도가 일부 구역에서만 확인됨.",
          "나머지 구역은 설계 용역 단계로 에이전트는 '진행중' 처리.",
        ],
      },
      {
        promise_id: "QQ429063-0024",
        promise_text: "어르신들의 쉼터 복지관 유치",
        progress: "미착수",
        rationale_lines: [
          "계획·인허가형 단계로만 보도되고 유치 확정 보도는 없음.",
          "부지 협의 관련 회의록만 검색되어 이행도는 낮게 평가.",
        ],
      },
    ],
    "교육·인재·과학기술·디지털·문화": [
      {
        promise_id: "QQ429063-0023",
        promise_text: "도산공원 문화도서관, 주차장 신축",
        progress: "완료",
        rationale_lines: [
          "샘플에서 '교육·인재·과학기술·디지털·문화', 건설·정비형.",
          "준공·개관 보도와 주차장 운영 개시 안내가 동시에 확인됨.",
        ],
      },
      {
        promise_id: "QQ429063-0026",
        promise_text: "청담동 문화센터 확장이전과 앞길 전선 지중화",
        progress: "진행중",
        rationale_lines: [
          "건설·정비형 + 운영·지원형 복합 라우팅.",
          "지중화 구간은 착공 보도까지, 센터 이전은 설계 공모 단계.",
        ],
      },
      {
        promise_id: "QQ429063-0004",
        promise_text: "압구정 428번지, 이전 예정 학교부지 문화 시설 도입",
        progress: "진행중",
        rationale_lines: [
          "문화 시설 도입은 건설·정비 + 운영 지원 복합으로 분류(샘플).",
          "부지 용도 변경 심의 자료는 공개됐으나 시설 명칭·개관일 미확정.",
        ],
      },
      {
        promise_id: "MOCK-EDU-01",
        promise_text: "청소년 디지털 리터러시 거점 교실 운영",
        progress: "완료",
        rationale_lines: [
          "교육·문화 카테고리 키워드 클러스터 확장 목업.",
          "학기별 수강 정원·강사 배치 공고가 규칙적으로 반복됨.",
        ],
      },
      {
        promise_id: "MOCK-EDU-02",
        promise_text: "지역 대학·구청 연계 진로 멘토링 앱 구축",
        progress: "미착수",
        rationale_lines: [
          "사업자 선정 공고는 있으나 앱 스토어 출시·MAU 데이터 없음.",
          "에이전트는 '착수 전'으로 분류.",
        ],
      },
    ],
    "주거·국토·교통·지역균형": [
      {
        promise_id: "QQ429063-0010",
        promise_text: "GTX-A,C 노선 안전하고 신속한 추진",
        progress: "진행중",
        rationale_lines: [
          "주거·국토·교통·지역균형, 건설·정비형(샘플).",
          "국토부·언론 보도에서 공사 구간별 진척률이 분기 보고됨.",
        ],
      },
      {
        promise_id: "QQ429063-0009",
        promise_text: "영동대로 통합개발 성공적 지원",
        progress: "진행중",
        rationale_lines: [
          "건설·정비형 + 운영·지원형(샘플).",
          "통합개발 실적 보도는 다수이나 '성공' 지표 정의 합의 전이라 진행중 처리.",
        ],
      },
      {
        promise_id: "QQ429063-0001",
        promise_text: "재건축 재개발 신속추진",
        progress: "완료",
        rationale_lines: [
          "규칙 기반 라우팅: 건설·정비형, 키워드 일치 다건(샘플).",
          "구역별 사업 시행인가·착공 보도가 시계열로 축적됨.",
        ],
      },
      {
        promise_id: "QQ429063-0011",
        promise_text: "위례신사선 조기 착공과 청담사거리역 신설 추진",
        progress: "미착수",
        rationale_lines: [
          "추진·신설은 보도되나 착공·승인 공문은 아직 공개 데이터에 없음.",
          "에이전트는 '계획 단계'로 보고 미착수에 가깝게 표기.",
        ],
      },
      {
        promise_id: "QQ429063-0012",
        promise_text: "주차난 해소 위한 공영주차장 복합화 사업 확대",
        progress: "완료",
        rationale_lines: [
          "건설·정비형 + 운영·지원형(샘플).",
          "복합화 사업 준공·개방 면적이 보도자료에 수치로 제시됨.",
        ],
      },
    ],
    "환경·에너지·기후": [
      {
        promise_id: "QQ429063-0017",
        promise_text: "강남형 친환경 스마트 도시인프라 구축",
        progress: "완료",
        rationale_lines: [
          "환경·에너지·기후, 건설·정비형(샘플).",
          "스마트 가로등·에너지 모니터링 도입 보도가 다기관에서 교차 확인됨.",
        ],
      },
      {
        promise_id: "QQ429063-0022",
        promise_text: "한강나들목 환경개선과 오솔길 생태다양성 숲길 조성",
        progress: "진행중",
        rationale_lines: [
          "건설·정비형 + 성과·지표형(샘플).",
          "조성 구간은 일부 개방, 생태 지표 측정 보고는 내년 예정.",
        ],
      },
      {
        promise_id: "QQ429063-0019",
        promise_text: "테마가 있는 걷기좋은 보도, 자연생태형 가로환경 조성",
        progress: "진행중",
        rationale_lines: [
          "가로환경 조성 착수 구간은 확인, 전 구역 완료는 아님.",
        ],
      },
      {
        promise_id: "MOCK-ENV-01",
        promise_text: "구역 내 탄소중립 목표 전력 피크저감 설비 보급",
        progress: "미착수",
        rationale_lines: [
          "예산 편성·납품 계약 공개 자료가 아직 없음.",
          "타 시군 사례만 검색되어 직접 이행 근거 부족.",
        ],
      },
      {
        promise_id: "MOCK-ENV-02",
        promise_text: "녹지 연결 생태통로 GIS 기반 우선순위 지도 배포",
        progress: "진행중",
        rationale_lines: [
          "GIS 데이터는 내부 시범 공유까지, 시민 공개는 베타 단계.",
        ],
      },
    ],
    "농림축산·수산·식품": [
      {
        promise_id: "MOCK-AGR-01",
        promise_text: "지역 수산물 직거래장 상설화 및 냉장 물류 지원",
        progress: "완료",
        rationale_lines: [
          "샘플 JSON에 해당 카테고리 항목이 없어 동일 스키마로 가상 생성.",
          "해양수산부·구청 보도 키워드 매칭 목업: 직거래장 개장 보도 3건 이상.",
        ],
      },
      {
        promise_id: "MOCK-AGR-02",
        promise_text: "도시 근교 스마트팜 단지 전력 인프라 우선 지원",
        progress: "진행중",
        rationale_lines: [
          "전력 증설 착공 보도는 있으나 단지 전체 가동은 미완.",
        ],
      },
      {
        promise_id: "MOCK-AGR-03",
        promise_text: "축산 악취 저감 시설 설치비 세액공제 연계",
        progress: "미착수",
        rationale_lines: [
          "국회 세법 개정안 목록에서 해당 조항 번호 매칭 실패(목업).",
        ],
      },
      {
        promise_id: "MOCK-AGR-04",
        promise_text: "친환경 농자재 보급 확대(감염병 대비 차단막 지원)",
        progress: "완료",
        rationale_lines: [
          "농림 보도자료에 보급 수량·면적이 표 형태로 공개됨(가상 근거).",
        ],
      },
      {
        promise_id: "MOCK-AGR-05",
        promise_text: "수산 종자 방류 실적 투명 공개 대시보드",
        progress: "진행중",
        rationale_lines: [
          "시범 대시보드 URL은 공개, 과거 데이터 백필은 60% 수준.",
        ],
      },
    ],
    "거버넌스·권리·안전·외교안보": [
      {
        promise_id: "QQ429063-0018",
        promise_text: "수해예방, 재난대비 안전시스템 마련",
        progress: "완료",
        rationale_lines: [
          "거버넌스·권리·안전·외교안보, 운영·지원형(샘플).",
          "재난 문자·CCTV·배수 펌프 가동 보도가 장마철마다 확인됨.",
        ],
      },
      {
        promise_id: "MOCK-GOV-01",
        promise_text: "주민참여 예산제 심의 위원회 상설화 및 회의록 공개",
        progress: "진행중",
        rationale_lines: [
          "위원회 구성 공고는 됐으나 전 회기 회의록 OCR 파이프라인 구축 중.",
        ],
      },
      {
        promise_id: "MOCK-GOV-02",
        promise_text: "행정정보 공개 포털 API 개방(공약 이행 지표 연동)",
        progress: "미착수",
        rationale_lines: [
          "API 키 발급 정책안만 게시, 실제 엔드포인트는 미배포.",
        ],
      },
      {
        promise_id: "MOCK-GOV-03",
        promise_text: "지역 인권·차별금지 상담 창구 예산 편성",
        progress: "완료",
        rationale_lines: [
          "예산안 PDF 표 추출 결과 해당 세목이 신설됨(목업).",
        ],
      },
      {
        promise_id: "MOCK-GOV-04",
        promise_text: "스마트시티 윤리가이드 준수 점검단 분기 보고",
        progress: "진행중",
        rationale_lines: [
          "1·2분기 보고서만 공개, 3분기는 제출 지연 상태.",
        ],
      },
    ],
  };

export function getAssemblyCategoryTop5Mock(
  label: string | null | undefined,
): CategoryTopPledgeMock[] | null {
  if (!label) {
    return null;
  }
  const key = label.trim() as AssemblyPledgeCategoryLabel;
  if (!(ASSEMBLY_PLEDGE_CATEGORY_LABELS as readonly string[]).includes(key)) {
    return null;
  }
  return ASSEMBLY_CATEGORY_TOP5_MOCK[key] ?? null;
}
