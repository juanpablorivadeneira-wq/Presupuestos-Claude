import HardHatIcon from './HardHatIcon';

interface BuildKontrolLogoProps {
  className?: string;
}

export default function BuildKontrolLogo({ className = '' }: BuildKontrolLogoProps) {
  return (
    <div className={`flex items-center select-none ${className}`}>
      <span
        style={{
          fontFamily: '"Arial Black", "Impact", sans-serif',
          letterSpacing: '0.06em',
          fontSize: '17px',
          color: 'white',
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        BUILDK
      </span>
      <HardHatIcon size={24} className="mx-0.5 -mt-0.5" />
      <span
        style={{
          fontFamily: '"Arial Black", "Impact", sans-serif',
          letterSpacing: '0.06em',
          fontSize: '17px',
          color: 'white',
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        NTROL
      </span>
    </div>
  );
}
