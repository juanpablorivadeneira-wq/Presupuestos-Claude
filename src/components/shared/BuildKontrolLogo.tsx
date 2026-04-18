import { HardHat } from 'lucide-react';

interface BuildKontrolLogoProps {
  className?: string;
}

export default function BuildKontrolLogo({ className = '' }: BuildKontrolLogoProps) {
  return (
    <div className={`flex items-center select-none ${className}`}>
      <span
        style={{ fontFamily: 'Arial Black, Arial, sans-serif', letterSpacing: '0.04em' }}
        className="font-black text-[15px] text-[#5a5a5a] uppercase leading-none"
      >
        BUILDK
      </span>
      <HardHat
        size={18}
        className="text-[#d94f3d] mx-[1px] shrink-0"
        strokeWidth={2.5}
      />
      <span
        style={{ fontFamily: 'Arial Black, Arial, sans-serif', letterSpacing: '0.04em' }}
        className="font-black text-[15px] text-[#5a5a5a] uppercase leading-none"
      >
        NTROL
      </span>
    </div>
  );
}
