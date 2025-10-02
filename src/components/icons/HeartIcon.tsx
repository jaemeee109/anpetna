// components/icons/HeartIcon.tsx
type IconProps = {
  /** Tailwind 등으로 크기/정렬을 제어할 때 씁니다 */
  className?: string;
  /** 접근성용(필요 없으면 aria-hidden="true"로 갑니다) */
  title?: string;
};

export default function heartIcon({
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
       <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053.918 3.995.78 5.323 1.508 7H.43c-2.128-5.697 4.165-8.83 7.394-5.857q.09.083.176.171a3 3 0 0 1 .176-.17c3.23-2.974 9.522.159 7.394 5.856h-1.078c.728-1.677.59-3.005.108-3.947C13.486.878 10.4.28 8.717 2.01zM2.212 10h1.315C4.593 11.183 6.05 12.458 8 13.795c1.949-1.337 3.407-2.612 4.473-3.795h1.315c-1.265 1.566-3.14 3.25-5.788 5-2.648-1.75-4.523-3.434-5.788-5"/>
  <path d="M10.464 3.314a.5.5 0 0 0-.945.049L7.921 8.956 6.464 5.314a.5.5 0 0 0-.88-.091L3.732 8H.5a.5.5 0 0 0 0 1H4a.5.5 0 0 0 .416-.223l1.473-2.209 1.647 4.118a.5.5 0 0 0 .945-.049l1.598-5.593 1.457 3.642A.5.5 0 0 0 12 9h3.5a.5.5 0 0 0 0-1h-3.162z"/>
    </svg>
  );
}
//크기 조절: className에 Tailwind로 w-4 h-4, text-gray-400처럼 지정. 
// width/height 속성 대신 w-[1em] h-[1em]로 두면 폰트 크기와 같이 반응.
//색상 상속: fill="currentColor"라서 부모 텍스트 색을 따라감. 버튼/텍스트에 text-blue-600만 바꿔도 아이콘 색이 함께 변함.
//일관성: 프로젝트 공용 아이콘은 모두 같은 프로프 시그니처(className, title)로 맞추면 재사용하기 쉬움.

