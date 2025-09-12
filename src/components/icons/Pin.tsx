// components/icons/Pin.tsx
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
      <path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5c0 .276-.224 1.5-.5 1.5s-.5-1.224-.5-1.5V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A6 6 0 0 1 5 6.708V2.277a3 3 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354m1.58 1.408-.002-.001zm-.002-.001.002.001A.5.5 0 0 1 6 2v5a.5.5 0 0 1-.276.447h-.002l-.012.007-.054.03a5 5 0 0 0-.827.58c-.318.278-.585.596-.725.936h7.792c-.14-.34-.407-.658-.725-.936a5 5 0 0 0-.881-.61l-.012-.006h-.002A.5.5 0 0 1 10 7V2a.5.5 0 0 1 .295-.458 1.8 1.8 0 0 0 .351-.271c.08-.08.155-.17.214-.271H5.14q.091.15.214.271a1.8 1.8 0 0 0 .37.282"/>
    </svg>
  );
}
//크기 조절: className에 Tailwind로 w-4 h-4, text-gray-400처럼 지정. 
// width/height 속성 대신 w-[1em] h-[1em]로 두면 폰트 크기와 같이 반응.
//색상 상속: fill="currentColor"라서 부모 텍스트 색을 따라감. 버튼/텍스트에 text-blue-600만 바꿔도 아이콘 색이 함께 변함.
//일관성: 프로젝트 공용 아이콘은 모두 같은 프로프 시그니처(className, title)로 맞추면 재사용하기 쉬움.