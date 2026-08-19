export default function WearsAnchorLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 110"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="50" cy="27" r="24" strokeWidth="3" />
      <circle cx="50" cy="12" r="7" />
      <line x1="50" y1="19" x2="50" y2="80" />
      <line x1="31" y1="43" x2="69" y2="43" />
      <line x1="38" y1="51" x2="62" y2="51" />
      <path d="M19 60 C19 84, 34 99, 50 99 C66 99, 81 84, 81 60" />
      <path d="M19 60 L13 51 M19 60 L27 55" />
      <path d="M81 60 L87 51 M81 60 L73 55" />
    </svg>
  );
}
