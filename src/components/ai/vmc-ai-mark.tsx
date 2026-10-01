export function VmcAiMark({
  className = "",
  accent = "#57b9ec",
}: {
  className?: string;
  accent?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="3" width="42" height="42" rx="13" stroke="currentColor" strokeWidth="1.8" opacity="0.28" />
      <path d="M13.5 17.5H21l3 5 3-5h7.5v7.2L31 27l3.5 2.3v7.2H27l-3-5-3 5h-7.5v-7.2L17 27l-3.5-2.3v-7.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M18 20.5 21.5 31l2.5-5 2.5 5 3.5-10.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="35.5" cy="13" r="3" fill={accent} />
      <path d="M35.5 7.5v2.2M35.5 16.3v2.2M29.9 13h2.2M38.9 13h2.2" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10.5" cy="10.5" r="1.6" fill={accent} opacity="0.8" />
      <circle cx="37.5" cy="37.5" r="1.6" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
