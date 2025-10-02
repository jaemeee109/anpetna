// components/icons/Bell.tsx
type IconProps = {
  /** Tailwind 등으로 크기/정렬을 제어할 때 씁니다 */
  className?: string;
  /** 접근성용(필요 없으면 aria-hidden="true"로 갑니다) */
  title?: string;
};

export default function Bell({
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
      <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6"/>
</svg>
        
  );
}
//크기 조절: className에 Tailwind로 w-4 h-4, text-gray-400처럼 지정. 
// width/height 속성 대신 w-[1em] h-[1em]로 두면 폰트 크기와 같이 반응.
//색상 상속: fill="currentColor"라서 부모 텍스트 색을 따라감. 버튼/텍스트에 text-blue-600만 바꿔도 아이콘 색이 함께 변함.
//일관성: 프로젝트 공용 아이콘은 모두 같은 프로프 시그니처(className, title)로 맞추면 재사용하기 쉬움.

