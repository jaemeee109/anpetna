// components/icons/Paw.tsx

type IconProps = {
  /** Tailwind 등으로 크기/정렬을 제어할 때 씁니다 */
  className?: string;
  /** 접근성용(필요 없으면 aria-hidden="true"로 갑니다) */
  title?: string;
};
export default function PawIcon({
  className = 'inline-block align-baseline w-[1em] h-[1em]',
  title,
}: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"   // 텍스트 색을 그대로 상속
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="2.2" />
      <circle cx="12" cy="6" r="2.2" />
      <circle cx="17" cy="7" r="2.2" />
          {title ? <title>{title}</title> : null}
      <path d="M12 12c-3 0-5.5 2-5.5 4.5 0 1.4 1 2.5 2.5 2.5 1.1 0 2.1-.6 3-1 0.9.4 1.9 1 3 1 1.5 0 2.5-1.1 2.5-2.5 0-2.5-2.5-4.5-5.5-4.5z"/>
    </svg>
  );
}
