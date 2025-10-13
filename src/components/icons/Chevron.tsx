// src/components/icons/Chevron.tsx
type IconProps = {
  className?: string;   
  title?: string;       
};

export default function ChevronIcon({
  className = '',
  title,
}: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"              
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      {/* React/TSX에서는 fill-rule -> fillRule 로 써야 경고가 없습니다. */}
      <path fillRule="evenodd" d="M7.646 2.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 3.707 2.354 9.354a.5.5 0 1 1-.708-.708z"/>
      <path fillRule="evenodd" d="M7.646 6.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 7.707l-5.646 5.647a.5.5 0 0 1-.708-.708z"/>
    </svg>
  );
}
