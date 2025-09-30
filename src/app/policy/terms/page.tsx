'use client';

import PawIcon from '@/components/icons/Paw';

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-[750px] px-4 py-10 text-center">
      <h1 className="text-2xl font-semibold mb-6 flex items-center justify-center gap-2">
        <span>이용약관</span>
        <PawIcon className="w-[1em] h-[1em]" />
      </h1>

      {/* 약관 본문 */}
      <section className="text-gray-700 space-y-6 leading-relaxed mx-auto ">
        <div>
          <p className="title-0">제1조 [목적]</p>
          <p className="read-1">
            본 약관은 Anpetna(안펫나)가 제공하는 반려동물 커머스 및 병원·호텔 예약, 커뮤니티 서비스 
            <br/>(이하 “서비스”) 이용과 관련하여 회사와 회원 간 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </div>

        <div>
          <p className="title-1">제2조 [정의]</p>
          <p>
            “회사”란 Anpetna를 말하며, “회원”은 본 약관에 동의하고 서비스를 이용하는 자를 말합니다. 
            <br/>“스토어”, “예약 서비스”, “커뮤니티”의 정의는 각각 상품 구매, 병원·호텔 예약, 게시물 작성 기능을 의미합니다.
          </p>
        </div>

        <div>
          <p className="title-1">제3조 [약관의 효력 및 변경]</p>
          <p>
            본 약관은 회원이 동의한 시점부터 효력을 가지며, 회사는 필요한 경우 개정할 수 있고 개정 시 사전 공지합니다.
          </p>
        </div>

        <div>
          <p className="title-1">제4조 [회원가입 및 계정 관리]</p>
          <p>
            회원은 정확한 정보를 기재해야 하며, 계정 보안 유지 의무를 집니다. 타인 명의 도용 시 서비스 제한이 가능합니다.
          </p>
        </div>

        <div>
          <p className="title-1">제5조 [서비스 이용]</p>
          <p>
            회사는 스토어, 예약, 커뮤니티 서비스를 제공하며, 기술적·운영상 불가피한 경우 일시 중단할 수 있습니다.
          </p>
        </div>

        <div>
          <p className="title-1">제6조 [상품 주문 및 예약]</p>
          <p>
            회원은 상품을 주문하거나 병원·호텔 예약을 신청할 수 있습니다. 예약은 진료/투숙 전일까지 취소 가능하며, 
            <br/>이후 취소·노쇼 시 추후 예약이 제한될 수 있습니다.
          </p>
        </div>

        <div>
          <p className="title-1">제7조 [결제, 취소 및 환불]</p>
          <p>
            모든 상품은 100% 정품만 취급하며, 가품 확인 시 결제 금액의 200%를 보상합니다. 
            <br/>단순 변심 반품은 7일 이내(미개봉·훼손 없음)에 가능하며, 왕복 배송비 6,000원이 부과됩니다. 
            <br/>제품 하자나 광고 상이 등 회사 귀책 사유일 경우 배송비는 회사가 부담합니다.
          </p>
        </div>

        <div>
          <p className="title-1">제8조 [회원의 의무]</p>
          <p>
            회원은 법령과 본 약관을 준수해야 하며, 타인 계정 도용, 불법 게시물 작성, <br/>
            서비스 운영 방해 등을 해서는 안 됩니다.
          </p>
        </div>

        <div>
          <p className="title-1">제9조 [회사의 의무]</p>
          <p>
            회사는 안정적 서비스 제공과 개인정보 보호 의무를 지며, 불편사항 발생 시 신속히 처리합니다.
          </p>
        </div>

        <div>
          <p className="title-1">제10조 [게시물 관리 및 저작권]</p>
          <p>
            회원이 작성한 게시물의 권리·책임은 작성자 본인에게 있으며, 
            <br/>불법·유해 게시물은 사전 통보 없이 삭제될 수 있습니다. 
            <br/>반복 위반 계정은 일시 정지 또는 영구 제한될 수 있습니다.
          </p>
        </div>

        <div>
          <p className="title-1">제11조 [개인정보 보호]</p>
          <p>
            회사는 개인정보를 서비스 제공 목적 범위 내에서만 이용하며, 법정 보존 기간 후 즉시 파기합니다. 
            <br/>결제 정보는 저장하지 않으며, 모든 데이터는 암호화(HTTPS/TLS)로 전송됩니다.
          </p>
        </div>

        <div>
          <p className="title-1">제12조 [책임의 제한]</p>
          <p>
            회사는 천재지변 등 불가항력 사유 시 책임을 지지 않습니다. 
            <br/>예약 안내 외 예기치 못한 사고 발생 시 회사는 제휴사와 공동 대응하며, 
            <br/>기본 영업배상책임보험(1억 원 한도) 내 보상 절차를 지원합니다. 
            <br/>최종 보상 범위와 한도는 보험 약관 및 제휴처 정책을 따릅니다.
          </p>
        </div>

        <div>
          <p className="title-1">제13조 [분쟁 해결 및 관할]</p>
          <p className="read-2">
            회사와 회원 간 분쟁은 성실히 협의하여 해결하며, 합의가 되지 않을 경우 
            <br/>회사 본사 소재지 관할 법원을 제1심 법원으로 합니다.
          </p>
        </div>
      </section>

      <style jsx>{`

      .title-0{
       font-size: 18px;
        margin-top: 60px;
         margin-bottom: -5px;
        font-weight: 600;
      }
        .title-1 {
          font-size: 18px;
          margin-top: 40px;
          margin-bottom: -5px;
          font-weight: 600;
        }

        .read-2{
        margin-bottom: 120px;}
      `}</style>
    </main>
  );
}
