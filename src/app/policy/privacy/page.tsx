'use client';

import PawIcon from '@/components/icons/Paw';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[750px] px-4 py-10 text-center">
      <h1 className="text-2xl font-semibold mb-6 flex items-center justify-center gap-2">
        <span>개인정보처리방침</span>
        <PawIcon className="w-[1em] h-[1em]" />
      </h1>

      {/* 개인정보처리방침 본문 */}
      <section className="text-gray-700 space-y-6 leading-relaxed mx-auto">
        <div>
          <p className="title-0">제1조 [총칙]</p>
          <p>
            Anpetna(안펫나)는 이용자의 개인정보를 중요시하며,
            「개인정보 보호법」 등 관련 법령을 준수합니다. 
            <br/>본 방침은 개인정보의 수집·이용·보관·제공·파기에 관한 기준을 안내합니다.
          </p>
        </div>

        <div>
          <p className="title-1">제2조 [수집하는 개인정보 항목]</p>
          <p>
            회원가입 시: 이름, 연락처, 이메일, 비밀번호<br />
            예약 시: 반려동물 정보(이름, 품종, 나이, 건강 상태 등), 예약 일시, 결제 정보<br />
            주문 시: 배송지 주소, 결제 수단<br />
            자동 수집: 접속 IP, 쿠키, 기기 정보
          </p>
        </div>

        <div>
          <p className="title-1">제3조 [개인정보 수집 및 이용 목적]</p>
          <p>
            - 회원 관리 및 본인 확인<br />
            - 상품 주문 및 예약 이행, 결제·환불 처리<br />
            - 고객 응대 및 공지 전달<br />
            - 서비스 개선 및 보안 강화
          </p>
        </div>

        <div>
          <p className="title-1">제4조 [개인정보의 보관 및 이용 기간]</p>
          <p>
            법령 또는 동의받은 기간 동안 보관합니다.<br />
            - 계약·결제·환불 기록: 5년<br />
            - 예약·서비스 이력: 3년<br />
            - 회원 탈퇴 시 즉시 파기(법령에 따른 예외 제외)
          </p>
        </div>

        <div>
          <p className="title-1">제5조 [개인정보 제3자 제공]</p>
          <p>
            회사는 원칙적으로 동의 없이 제3자에게 개인정보를 제공하지 않습니다.<br />
            단, 예약 진행을 위해 제휴 병원·호텔에 최소한의 정보(예약자명, 연락처, 반려동물 정보 등)를 제공할 수 있으며, 
            <br/>법령에 따른 요청 시 제공할 수 있습니다.
          </p>
        </div>

        <div>
          <p className="title-1">제6조 [개인정보 처리 위탁]</p>
          <p>
            - 결제 처리: ToxxPay <br />
            - 데이터 보관/전송: 클라우드 서버 사업자
          </p>
        </div>

        <div>
          <p className="title-1">제7조 [개인정보의 파기]</p>
          <p>
            보관 기간 종료 시 지체 없이 파기합니다.<br />
            - 전자적 파일: 복구 불가능한 방식으로 삭제<br />
            - 문서: 분쇄 또는 소각
          </p>
        </div>

        <div>
          <p className="title-1">제8조 [이용자의 권리]</p>
          <p>
            이용자는 언제든 개인정보 열람·정정·삭제·처리정지 및
            동의 철회를 요청할 수 있습니다.
          </p>
        </div>

        <div>
          <p className="title-1">제9조 [쿠키의 운영]</p>
          <p>
            로그인 유지 및 맞춤형 서비스 제공을 위해 쿠키를 사용합니다.<br />
            이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다.
          </p>
        </div>

        <div>
          <p className="title-1">제10조 [개인정보 보호를 위한 대책]</p>
          <p>
            - 데이터 암호화(HTTPS/TLS)<br />
            - 접근 권한 최소화<br />
            - 정기적 보안 점검 및 모니터링
          </p>
        </div>

        <div>
          <p className="title-1">제11조 [개인정보 보호책임자]</p>
          <p>
            개인정보 보호책임자: 홍길동<br />
            이메일: privacy@anpetna.com
          </p>
        </div>

        <div>
          <p className="title-1">제12조 [고지의 의무]</p>
          <p className="read-1">
            개인정보처리방침이 변경될 경우, 회사는 홈페이지 공지 또는
            개별 고지를 통해 안내합니다.
          </p>
        </div>
      </section>

      <style jsx>{`
       .title-0 {
          font-size: 18px;
          margin-top: 60px;
          margin-bottom: -5px;
          font-weight: 600;
        }


        .title-1 {
          font-size: 18px;
          margin-top: 30px;
          margin-bottom: -5px;
          font-weight: 600;
        }

        .read-1{
        margin-bottom: 120px;
        }
      `}</style>
    </main>
  );
}
