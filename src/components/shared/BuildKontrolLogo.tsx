import HardHatIcon from './HardHatIcon';

interface BuildKontrolLogoProps {
  className?: string;
}

export default function BuildKontrolLogo({ className = '' }: BuildKontrolLogoProps) {
  return (
    <div className={`flex items-center gap-0 select-none ${className}`}>
      <span
        style={{ fontFamily: 'Arial Black, Arial, sans-serif', letterSpacing: '0.03em' }}
        className="font-black text-[14px] text-[#5a5a5a] uppercase leading-none tracking-wider"
      >
        BUILDK
      </span>
      <HardHatIcon size={22} className="-mx-0.5 -mt-1" />
      <span
        style={{ fontFamily: 'Arial Black, Arial, sans-serif', letterSpacing: '0.03em' }}
        className="font-black text-[14px] text-[#5a5a5a] uppercase leading-none tracking-wider"
      >
        NTROL
      </span>
    </div>
  );
}
