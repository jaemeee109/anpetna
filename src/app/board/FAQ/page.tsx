// src/app/board/FAQ/page.tsx
import { Suspense } from 'react';
import FAQClient from './Client';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <FAQClient />
    </Suspense>
  );
}
