// app/layout.tsx
import type { ReactNode } from 'react';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Providers from './providers';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'AnPetNa', description: 'Animal Pet & Me' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* Google Fonts CDN (영문: Chiron/Prompt, 한글: Noto Sans KR) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Chiron+Hei+HK:ital,wght@0,200..900;1,200..900&family=Prompt:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Noto+Sans+KR:wght@100..900&display=swap"
          rel="stylesheet"
        />
           {/* 네이버 지도 인증을 위해 Referer의 origin이 항상 전송되게 강제 */}
        <meta name="referrer" content="origin" />
      </head>
      <body>
        <Header />
        <Providers>
          <main className="apn-main">{children}</main>
        </Providers>
        <Footer />
        {/* ▼ 모달 포털 루트*/}
        <div id="__bulk_modal_root" />
      </body>
    </html>
  );
}