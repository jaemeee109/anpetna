// components/icons/Heading.tsx
type IconProps = {
  /** Tailwind 등으로 크기/정렬을 제어할 때 씁니다 */
  className?: string;
  /** 접근성용(필요 없으면 aria-hidden="true"로 갑니다) */
  title?: string;
};

export default function PinIcon({
  className = 'inline-block align-baseline w-[1em] h-[1em]',
  title,
}: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"        // 텍스트 색상 상속
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      {/* Bootstrap Icons: bi-pin 경로 */}
      <path d="M13 2.5a1.5 1.5 0 0 1 3 0v11a1.5 1.5 0 0 1-3 0v-.214c-2.162-1.241-4.49-1.843-6.912-2.083l.405 2.712A1 1 0 0 1 5.51 15.1h-.548a1 1 0 0 1-.916-.599l-1.85-3.49-.202-.003A2.014 2.014 0 0 1 0 9V7a2.02 2.02 0 0 1 1.992-2.013 75 75 0 0 0 2.483-.075c3.043-.154 6.148-.849 8.525-2.199zm1 0v11a.5.5 0 0 0 1 0v-11a.5.5 0 0 0-1 0m-1 1.35c-2.344 1.205-5.209 1.842-8 2.033v4.233q.27.015.537.036c2.568.189 5.093.744 7.463 1.993zm-9 6.215v-4.13a95 95 0 0 1-1.992.052A1.02 1.02 0 0 0 1 7v2c0 .55.448 1.002 1.006 1.009A61 61 0 0 1 4 10.065m-.657.975 1.609 3.037.01.024h.548l-.002-.014-.443-2.966a68 68 0 0 0-1.722-.082z"/>
    </svg>
  );
}
//크기 조절: className에 Tailwind로 w-4 h-4, text-gray-400처럼 지정. 
// width/height 속성 대신 w-[1em] h-[1em]로 두면 폰트 크기와 같이 반응.
//색상 상속: fill="currentColor"라서 부모 텍스트 색을 따라감. 버튼/텍스트에 text-blue-600만 바꿔도 아이콘 색이 함께 변함.
//일관성: 프로젝트 공용 아이콘은 모두 같은 프로프 시그니처(className, title)로 맞추면 재사용하기 쉬움.

