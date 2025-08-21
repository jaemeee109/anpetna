import Image from 'next/image';
export default function Footer() {
  return (
    <footer className="apn-footer">
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
            <p>회사소개 | 이용약관 | 개인정보처리방침 | 이용안내</p>
          </div>
        </section>
 
<aside className="apn3-right">
  <div className="apn3-panel apn3-panel--grid">
    {/* 상단 제목은 2컬럼 전체 폭 */}
    <p className="apn3-heading">
    
    </p>

    {/* ⬅ 왼쪽: 그림 (하단 정렬) */}
    <figure className="apn3-illust">
      <img src="/anpetna-logo2.png" alt="AnPetNa" />
    </figure>

    {/* ➡ 오른쪽: 팀 정보 */}
    <div className="apn3-team">
      <ul>
        <b>Project Team : AnPetNa (Animal Pet & Me)</b>
        <li>Team Lead : 이 재 은</li>
        <li>Deputy Lead : 오 승 환</li>
        <li>User & Account : 양 지 민, 전 우 신</li>
        <li>Item & Cart Service : 김 수 아, 이 채 윤</li>
        <li>Order Service : 오 승 환</li>
        <li>Board (Customer Service) : 이 재 은, 박 희 진</li>
        <li>Code Integration : 오 승 환, 박 희 진</li>
        <li>Repository Maintainer : 이 채 윤</li>
        <li>Frontend : 이 재 은</li>
         <p className="apn3-note">All members are Backend Developers</p>
      </ul>
     
    </div>
  </div>
</aside>


      </div>
    </footer>
  );
}
