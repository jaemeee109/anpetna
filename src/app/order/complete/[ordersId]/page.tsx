// src/app/order/complete/[ordersId]/page.tsx
import Link from 'next/link';
import PawIcon from '@/components/icons/Paw';

export default async function OrderCompletePage({
  params,
}: {
  params: Promise<{ ordersId: string }>;
}) {
  const { ordersId } = await params;
  const id = Array.isArray(ordersId) ? ordersId[0] : ordersId;

  return (
    <main className="mx-auto max-w-[600px] px-4 py-10 text-center">
      <h1 className="text-[36px] font-semibold mb-6 mt-[60px]">
        <PawIcon />&nbsp;주문이 완료되었습니다&nbsp;<PawIcon />
      </h1>

      <p className="mb-[40px]">
        <span className="font-semibold text-[16px] text-gray-700">주문번호&nbsp;:&nbsp;</span>
        <span className="text-[16px] text-emerald-600 font-bold tracking-wide">{id}</span>
      </p>

      <div className="flex items-center justify-center gap-[15px] mt-[30px] mb-[50px]">
        <Link href="/order/history" className="btn-3d btn-white !px-5 !py-2.5 !text-[16px]">
          구매내역
        </Link>
        <Link href="/" className="btn-3d btn-white !px-6 !py-3 !text-[16px]">
          홈화면가기
        </Link>
      </div>
    </main>
  );
}
