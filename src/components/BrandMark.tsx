export function BrandMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="16"
        cy="16"
        r="12.5"
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeWidth="1.25"
        strokeDasharray="18 5"
      />
      <circle
        cx="16"
        cy="16"
        r="8.25"
        stroke="#00F0C8"
        strokeWidth="1.5"
        strokeDasharray="36 14"
      />
      <path
        d="M16 2.5V7.5M16 24.5V29.5M2.5 16H7.5M24.5 16H29.5"
        stroke="#7DF9E2"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M10.5 21.5L21.5 10.5"
        stroke="#00F0C8"
        strokeOpacity="0.7"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="2.75" fill="#00F0C8" />
    </svg>
  );
}
