// components/icons/Lock.tsx
type IconProps = {
  /** Tailwind 등으로 크기/정렬을 제어할 때 씁니다 */
  className?: string;
  /** 접근성용(필요 없으면 aria-hidden="true"로 갑니다) */
  title?: string;
};

export default function LockIcon({
  className = 'inline-block align-baseline w-[1em] h-[1em]',
  title,
}: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor" // 텍스트 색상 상속
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      {/* Bootstrap Icons: bi-lock 경로 */}
      <path
        fillRule="evenodd"
        d="M8 0a4 4 0 0 1 4 4v2.05a2.5 2.5 0 0 1 2 2.45v5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 13.5v-5a2.5 2.5 0 0 1 2-2.45V4a4 4 0 0 1 4-4M4.5 7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7zM8 1a3 3 0 0 0-3 3v2h6V4a3 3 0 0 0-3-3"
      />
    </svg>
  );
}
