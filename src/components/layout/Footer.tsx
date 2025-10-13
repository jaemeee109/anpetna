'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="apn-footer apn-footer--enforce">
      <div className="container apn3-row">
        {/* ⬅ 왼쪽 : 박스 없음 + 워터마크 + 회사정보 + 저작권 */}
        <section className="apn3-left">
          <div className="apn3-company">
            <p>회사명 : 안펫나</p>
            <p>사업자번호 : 000 - 00 - 00000 </p>
            <p>대표자 : 안펫나</p>
            <p>사업장주소 : 대한민국</p>
            <p>이메일 : anpetna@anpetna.com</p>
          </div>

             <div className="apn3-copy">
            <p><br></br></p>
            <p>Copyrightⓒ AnPetNa All rights reserved.</p>
            <p>Design by AnPetNa · Hosting by __</p>
            <p><br></br></p>
            
          </div>

          <div className="apn3-copy">
            <span className="apn-sep">
           <Link
            href="/company"
            className="apn-link"
            prefetch={false}
            style={{ color: '#fff', textDecoration: 'none' }} 
          >
            회사소개&nbsp;|&nbsp;
          </Link>
          <Link
            href="/policy/terms"
            className="apn-link"
            prefetch={false}
            style={{ color: '#fff', textDecoration: 'none' }}
          >
            이용약관&nbsp;|&nbsp;
          </Link>
          <Link
            href="/policy/privacy"
            className="apn-link"
            prefetch={false}
            style={{ color: '#fff', textDecoration: 'none' }}
          >
            개인정보처리방침&nbsp;|&nbsp;
          </Link>
          <Link
            href="/guide"
            className="apn-link"
            prefetch={false}
            style={{ color: '#fff', textDecoration: 'none' }}
          >
            이용안내
          </Link>
            </span>
          </div>
        </section>

        <aside className="apn3-right">
          <div className="apn3-panel apn3-panel--grid">
            {/* 상단 제목은 2컬럼 전체 폭 */}
            <p className="apn3-heading"></p>

            {/* ⬅ 왼쪽: 그림 (하단 정렬) */}
            <figure className="apn3-illust">
              <Image src="/anpetna-logo2.png" alt="AnPetNa" width={240} height={80} priority />
            </figure>

            {/* ➡ 오른쪽: 팀 정보 */}
            <div className="apn3-team">
              <ul>
                <b>Project Team : AnPetNa (Animal Pet & Me)</b>
                <li>[Team Lead] 이 재 은 -  Frontend · Board · Venue </li>
                <li>[Deputy Lead] 오 승 환 -  Release · Chat · Cart </li>
                <li> 박 희 진 - Board · MemberMgmt · Comment </li>
                <li> 양 지 민 - Pay · Auth · Sales&Inv Mgmt </li>
                <li> 전 우 신 - Auth · Review · Notification </li>
                <li> 김 수 아 - Order · Docs (Image) </li>
                <li> 이 채 윤 - Git version control · Item </li>

                <p className="apn3-note">All members are Backend Developers</p>
                <p className="apn3-note">
                   <Link
                    href="/team"
                    className="apn-link"
                    prefetch={false}
                    style={{ color: '#fff', textDecoration: 'none' }}
                  >
                    누가무엇을했나요? 바로가기 &raquo;&raquo;
                  </Link>
                </p>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {/* ✅ 전역(Global) 강제 오버라이드: 어떤 전역 !important 규칙도 이기도록 설계 */}
      <style jsx global>{`
        /* 구분자 간격 */
        .apn-footer--enforce .apn-sep { margin: 0 6px; }

        /* 링크 색/밑줄을 모든 상태에서 강제 */
        .apn-footer--enforce .apn-link,
        .apn-footer--enforce .apn-link:link,
        .apn-footer--enforce .apn-link:visited,
        .apn-footer--enforce .apn-link:hover,
        .apn-footer--enforce .apn-link:active,
        .apn-footer--enforce .apn-link:focus {
          color: #fff !important;
          text-decoration: none !important;
          -webkit-text-decoration: none !important;
        }
        /* 접근성: 포커스 링만 유지(밑줄 아님) */
        .apn-footer--enforce .apn-link:focus { outline: 2px solid rgba(255,255,255,.4); outline-offset: 2px; }
      `}</style>
    </footer>
  );
}
