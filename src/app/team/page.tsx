// src/app/team/page.tsx
'use client';

import Link from 'next/link';
import PawIcon from '@/components/icons/Paw';

type Member = {
  name: string;
  title: string;     
  desc: string[];
  git: string;
};

const members: Member[] = [
  {
    name: '이 재 은',
    title: '팀장',
    desc: [
      'FRONTEND | 전 영역 설계 및 구현',
      'BACKEND | 매장 검색 & 예약, 게시판 (NOTICE/COMMUNITY/FAQ/Q&A) '
      ,
    ],
    git: 'https://github.com/jaemeee109/',
  },
  {
    name: '오 승 환',
    title: '부팀장',
    desc: ['INFRA | 배포 전반 관리', 'BACKEND | 채팅, 장바구니'],
    git: 'https://github.com/OhSeunghwan-Dev',
  },
  {
    name: '박 희 진',
    title: '', 
    desc: ['BACKEND | 게시판 (NOTICE/COMMUNITY/FAQ/Q&A) & 댓글', '회원 관리 (ERP), 메인 홈 화면'],
    git: 'https://github.com/gomong0304',
  },
  {
    name: '양 지 민',
    title: '',
    desc: ['BACKEND | 회원, 인증, 결제, 매출 & 재고관리 (ERP)'],
    git: 'https://github.com/jjim318',
  },
  {
    name: '전 우 신',
    title: '',
    desc: ['BACKEND | 회원, 인증, 리뷰, 알림'],
    git: 'https://github.com/WooShinJeon',
  },
  {
    name: '김 수 아',
    title: '',
    desc: ['BACKEND | 주문', 'ETC | 프로젝트 문서화 및 회의록 작성, 이미지 자료 제작'],
    git: 'https://github.com/SUA1038',
  },
  {
    name: '이 채 윤',
    title: '',
    desc: ['VERSION CONTROL | 프로젝트 Git 관리', 'BACKEND | 파일 병합 및 충돌 해결, 상품, 이미지(사진)', 'DEPLOYMENT | ESXI 세팅, 도커 기반 프론트 배포'],
    git: 'https://github.com/ChaeYun430',
  },
];

function DescRow({ line }: { line: string }) {
  const parts = line.split('|');
  const hasLabel = parts.length >= 2; // ← '|'가 있을 때만 라벨/배지 생성
  const label = hasLabel ? parts[0].trim().toUpperCase() : '';
  const badgeKey = hasLabel ? label.replace(/\s+/g, '') : '';
  const text = hasLabel ? parts.slice(1).join('|').trim() : line;

  return (
    <div className="desc-row">
      {hasLabel && <span className={`badge badge-${badgeKey}`}>{label}</span>}
      <span className="line-text">{text}</span>
    </div>
  );
}



const LEADERS = new Set(['이 재 은', '오 승 환']);

export default function TeamPage() {

  console.log('[TeamPage] build: enforce-title-by-name-only');

  return (
    <main className="team-container">
      <header className="team-header">
        <h1 className="page-title">PROJECT <br/><PawIcon className="w-[1em] h-[1em]" />AnPetNa (Animal Pet &amp; Me)
         <PawIcon className="w-[1em] h-[1em]" /></h1>
      </header>

      <ul className="team-grid">
        {members.map((m) => {
          const isLeader = LEADERS.has((m.name || '').trim());
        
          const displayTitle =
            m.name === '이 재 은' ? '팀장' :
            m.name === '오 승 환' ? '부팀장' :
            null;

          return (
            <li key={m.name} className={`card ${isLeader ? 'is-leader' : 'is-member'}`}>
              <div className="card-header">
                <h2 className="card-name">{m.name}</h2>
                {displayTitle && <p className="card-title">{displayTitle}</p>}
              </div>

              <div className="card-body">
                {m.desc.map((d, i) => (
                  <DescRow key={i} line={d} />
                ))}
              </div>

              <div className="card-footer">
                <Link href={m.git} target="_blank" rel="noopener noreferrer" className="git-link">
                  Git 바로가기 &gt;&gt;
                </Link>
              </div>
            </li>
            
          );
        })}
      </ul>
      <p className="page-b"></p>

      {/* ===== CSS ===== */}
      <style jsx global>{`
        .team-container {
          max-width: 550px;
          margin: 0 auto;
          padding: 48px 16px;
        }
        .team-header {
          text-align: center;
          margin-bottom: 40px;
        }
        .page-title {
          font-size: 24px;
          font-weight: 600;
        }

        /* 그리드 */
        .team-grid {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column; /* 세로 나열 */
          gap: 24px;
        }
        @media (min-width: 640px) {
          .team-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .team-grid { grid-template-columns: repeat(3, 1fr); }
        }

        /* 카드 */
        .card {
          border: 1px solid #d8dadd;
          border-radius: 20px;
          padding: 24px;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,.08);
          transition: .2s;
        }
        .card:hover {
          border-color: #c5c7ca;
          box-shadow: 0 4px 8px rgba(0,0,0,.12);
        }

        .card-header { text-align: center; margin-bottom: 16px; }
        .card-name { font-size: 22px; font-weight: 700; margin: 0; }

        /* 기본값: 타이틀 완전 숨김 */
        .card-title { display: none !important; font-size: 16px; color: #6b7280; margin-top: 4px; }
        /* 리더 카드에서만 노출 */
        .card.is-leader .card-title { display: block !important; }

        .card-body { margin-top: 12px; }

        /* 설명 줄 */
        .desc-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }
        .line-text { font-size: 14px; color: #1f2937; }

        /* 뱃지 공통 */
        .badge {
          padding: 5px 10px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid transparent;
        
        }
        /* 뱃지 색상 (badge-<공백제거라벨>) */
        .badge-FRONTEND {
          background: #ffdee8ff; 
          color: #703f3fff; 
          border-color: #b9b9b9ff;
        }
        .badge-BACKEND {
          background: #b8d9ffff; 
          color: #535f74ff; 
          border-color: #b9b9b9ff;
        }
        .badge-INFRA {
          background: #ffd8b3ff; 
          color: #6e5241ff; 
          border-color: #b9b9b9ff;
        }
        .badge-VERSIONCONTROL {
          background: #f1d9fcff; 
          color: #7a307cff; 
          border-color: #b9b9b9ff;
        }
        .badge-ETC {
          background: #fcffcfff; 
          color: #5c360bff; 
          border-color: #b9b9b9ff;
        }

        /* 버튼 */
        .card-footer { text-align: center; margin-top: 16px; }
        .git-link {
          display: inline-block;
          border: 1px solid #d1d5db;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #111;
          text-decoration: none;
          background: #fff;
          transition: .2s;
        }
        .git-link:hover { background: #f9fafb; }


        .page-b{
        margin-bottom: 100px;
        }
      `}</style>
    </main>
  );
}
