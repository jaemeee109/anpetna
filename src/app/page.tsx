import Image from "next/image";

export default function Home() {
  return (
    <div className="p-6 flex justify-center ">
      <Image
        src="/main.jpg"
        alt="메인 이미지"
        width={1440}
        height={0}   // 높이를 0으로 두고 style에서 auto 지정
        style={{ height: "auto" }} // 세로 자동 비율 유지
        className="object-contain mb-[40px]"
      />
    </div>
  );
}
