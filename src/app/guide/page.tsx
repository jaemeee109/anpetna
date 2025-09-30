// src/app/guide/page.tsx
'use client';

import Link from 'next/link';
import PawIcon from '@/components/icons/Paw';

export default function GuidePage() {
  return (
    <main className="mx-auto max-w-[780px] px-4 py-10 text-center">
      {/* 제목 */}
      <h1 className="text-2xl font-semibold mb-6 flex items-center justify-center gap-2">
        <span>이용안내</span>
        <PawIcon className="w-[1em] h-[1em]" />
      </h1>

      <section className="text-gray-700 space-y-8 leading-relaxed mx-auto">
        {/* 1. 회원 */}
        <div>
          <h2 className="title-0 text-xl font-semibold mb-3">1) 회원 (Member)</h2>
          <div className="card space-y-2">
            <p className="font-medium">▶ 일반 사용자</p>
            <p>
              <Link href="/member/signup" className="underline">회원가입</Link> ·{' '}
              <Link href="/member/login" className="underline">로그인</Link> 후
              <span> 마이페이지에서 </span>
              <b>회원정보(INFO)</b>, <b>주문내역(ORDER)</b>, <b>예약내역(RESERVE)</b>을
              <br />확인할 수 있으며, 원하실 경우 <b>회원탈퇴(DEL)</b>도 가능합니다.
            </p>
            <p className="text-sm text-gray-600">
              세션 만료 시 알림은 한 번만 표시되며 다시 로그인하도록 안내됩니다.
            </p>

            <p className="font-medium mt-4">▶ 관리자</p>
            <p>
              회원 전체 조회(검색/페이징/필터), 권한 변경(관리자 부여·회수),
              <br />블랙리스트 관리(사유/기간/해제/이력)를 제공합니다.
            </p>
          </div>
        </div>

        {/* 2. 상품 & 주문 */}
        <div>
          <h2 className="text-xl font-semibold mb-3">2) 상품(Items) & 주문(Order)</h2>
          <div className="card space-y-2">
            <p className="font-medium">▶ 사용자</p>
            <p>
              <Link href="/items" className="underline">스토어</Link>에서 상품을 살펴보고{' '}
              <Link href="/cart" className="underline">장바구니</Link>에 담아 주문할 수 있습니다.
              <br />결제 후에는 <Link href="/order/history" className="underline">주문내역</Link>에서 결과를 확인할 수 있습니다.
            </p>
            <p className="text-sm text-gray-600">
              카테고리 예: FEED, SNACKS, CLOTHING, TOY, BEAUTY_PRODUCT, OTHERS 등
            </p>
            <p className="text-sm text-gray-600">
              반품 / 환불 : 단순 변심은 수령 후 7일 이내 ( 왕복 6,000원 / 도서산간지역 추가금 발생),
              <br />회사 귀책 (하자 / 표시 · 광고 상이)은 무상 처리
            </p>

            <p className="font-medium mt-4">▶ 관리자</p>
            <p>
              상품 등록 / 수정 / 삭제, 재고(ERP) 관리,
              <br />주문 상태
              <br />'PENDING : 주문완료' → 'CONFIRMED : 결제완료'
              <br />→ 'SHIPPING : 배송중' → 'DELIVERED : 배송완료' 관리가 가능합니다.
            </p>
          </div>
        </div>

        {/* 3. 예약 */}
        <div>
          <h2 className="text-xl font-semibold mb-3">3) 예약 (병원·호텔)</h2>
          <div className="card space-y-2">
            <p className="font-medium">▶ 사용자</p>
            <p>
              <Link href="/care" className="underline">예약 메인</Link>에서 지점을 선택해 예약을 진행합니다.
              <br />달력 날짜와 시간대를 고르고, 병원은 담당의를, 호텔은 체크인/체크아웃을 지정한 뒤
              <br />유의사항에 동의하면 됩니다.
              <br />
              <br />내 예약 내역은 <Link href="/care/history" className="underline">예약내역</Link>에서 확인합니다.
            </p>
            <p className="text-sm text-gray-600">
              예약 상태
              <br />PENDING : 예약신청 → CONFIRMED : 예약확정
              <br />→ (REJECTED : 관리자 취소 / CANCELED : 사용자 취소 / NOSHOW : 노쇼 )
            </p>

            <p className="font-medium mt-4">▶ 관리자</p>
            <p>
              병원/호텔 예약 목록 조회, 상태 변경(인라인/일괄), 캘린더 뷰 제공.
              <br />호텔 정원 (매장당 1일 15마리 제한), 과거·중복 시간 선택 제한 등 운영 규칙을 지원합니다.
            </p>
          </div>
        </div>

        {/* 4. 게시판/커뮤니티 */}
        <div>
          <h2 className="text-xl font-semibold mb-3">4) 게시판 · 커뮤니티</h2>
          <div className="card space-y-2">
            <p>
              <Link href="/board/NOTICE" className="underline">공지사항</Link>,{' '}
              <Link href="/board/FREE" className="underline">자유게시판</Link>,{' '}
              <Link href="/board/FAQ" className="underline">FAQ</Link>,{' '}
              <Link href="/board/QNA" className="underline">Q&amp;A</Link>를 통해 소통하고 도움을 받을 수 있습니다.
            </p>
            <p className="text-sm text-gray-600">
              게시글 등록/조회/수정/삭제, 댓글/대댓글 지원. 관리자 고정글/비밀글, FAQ 카테고리 운영.
            </p>
          </div>
        </div>

        {/* 5. 블랙리스트 */}
        <div>
          <h2 className="text-xl font-semibold mb-3">5) 블랙리스트 (관리자)</h2>
          <div className="card space-y-2">
            <p>
              사유와 기간( 3 · 5 · 7 일 / 무기한)으로 등록하고, 활성/이력 조회, 수정, 해지, 전체 비활성화 등을 지원합니다.
            </p>
          </div>
        </div>

        {/* 6. 배너 */}
        <div>
          <h2 className="text-xl font-semibold mb-3">6) 배너 (관리자)</h2>
          <div className="card space-y-2">
            <p>
              메인 홈 배너를 등록(이미지/링크/노출/정렬순서), 수정(이미지 교체), 삭제하며 전체 목록을 관리할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 7. 회사 소개/정책/안내 */}
        <div>
          <h2 className="text-xl font-semibold mb-3">7) 회사 소개 · 정책 · 안내</h2>
          <div className="card space-y-2">
            <p>
              <Link href="/company" className="underline">회사소개</Link> ·{' '}
              <Link href="/policy/terms" className="underline">이용약관</Link> ·{' '}
              <Link href="/policy/privacy" className="underline">개인정보처리방침</Link> ·{' '}
              <Link href="/guide" className="underline">이용안내</Link>를 통해 서비스 철학과 기준, 이용 방법을 확인할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 8. 공통 UI/UX */}
        <div>
          <h2 className="text-xl font-semibold mb-3">8) 공통 UI/UX</h2>
          <div className="card space-y-2">
            <p>
              헤더( 로고 / 네비 / 마이페이지), 푸터(회사 정보 / 정책 링크 /프로젝트 팀 소개)와{' '}
              <br />Tailwind 기반 반응형 레이아웃, PawIcon을 활용한 통일된 아이콘 시스템을 제공합니다.
            </p>
          </div>
        </div>

        {/* 9. 보안 & 데이터 처리 */}
        <div>
          <h2 className="text-xl font-semibold mb-3">9) 보안 & 데이터 처리</h2>
          <div className="card-1 space-y-2">
            <div className="space-y-1 text-sm text-gray-700">
              <p>· 토큰 관리: AccessToken + RefreshToken, 세션 만료 시 재로그인 안내 (알림 1회)</p>
              <p>· 파일 접근 보호: 내부 프록시를 통해 원본 경로 직접 노출 없이 접근</p>
              <p>· 개인정보: 법정 보관 기간 후 자동 파기, 결제 정보 미저장, 전송 구간 HTTPS/TLS 암호화</p>
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        .card {
          border: 1px solid #d8daddff;
          border-radius: 25px;
          padding: 20px;
          background: #fcfcfcff;
        }
        .card-1 {
          border: 1px solid #d8daddff;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 160px;
          background: #fcfcfcff;
        }
        .title-0 {
          margin-top: 80px;
        }
      `}</style>
    </main>
  );
}
