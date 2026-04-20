interface HardHatIconProps {
  size?: number;
  className?: string;
}

export default function HardHatIcon({ size = 32, className = '' }: HardHatIconProps) {
  const h = size;
  const w = size * 1.5;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 150 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Brim */}
      <path
        d="M 12 70 C 5 73 4 84 18 86 L 130 86 C 142 86 143 78 134 75 L 116 71"
        fill="#CC1111"
      />
      {/* Dome */}
      <path
        d="M 26 72
           C 22 72 17 70 14 65
           C 8 54 13 32 32 20
           C 51 8 88 8 108 22
           C 126 34 128 56 120 70
           L 116 72
           C 88 80 52 80 26 72 Z"
        fill="#CC1111"
      />
      {/* Highlight on dome top */}
      <path
        d="M 48 18 C 68 10 100 14 112 30"
        stroke="#E84040"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      {/* Inner band line 1 */}
      <path
        d="M 28 70 C 68 82 104 76 114 70"
        stroke="#991010"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Inner band line 2 */}
      <path
        d="M 30 63 C 68 74 102 68 112 63"
        stroke="#991010"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Brim underline */}
      <path
        d="M 18 82 C 68 90 118 87 133 81"
        stroke="#991010"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
