interface HardHatIconProps {
  size?: number;
  className?: string;
}

export default function HardHatIcon({ size = 32, className = '' }: HardHatIconProps) {
  const h = size;
  const w = size * 1.55;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 155 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Brim */}
      <path
        d="M 18 72 C 10 75 8 84 20 86 L 128 86 C 140 86 142 80 135 77 L 118 73"
        fill="#F08B7A"
        stroke="#F08B7A"
        strokeWidth="1"
      />
      {/* Dome */}
      <path
        d="M 28 74 C 24 74 20 72 18 68
           C 14 58 18 38 34 26
           C 50 14 82 12 102 24
           C 120 34 124 54 118 68
           L 118 73
           C 90 80 50 80 28 74 Z"
        fill="#F08B7A"
      />
      {/* Inner band line 1 */}
      <path
        d="M 30 72 C 65 82 100 78 116 72"
        stroke="#E07060"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Inner band line 2 */}
      <path
        d="M 32 66 C 66 75 100 72 114 66"
        stroke="#E07060"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Brim underline */}
      <path
        d="M 20 82 C 65 90 115 88 134 82"
        stroke="#E07060"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
