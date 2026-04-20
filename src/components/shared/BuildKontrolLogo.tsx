import logoUrl from '../../assets/buildkontrol-logo.png';

interface BuildKontrolLogoProps {
  className?: string;
}

export default function BuildKontrolLogo({ className = '' }: BuildKontrolLogoProps) {
  return (
    <img
      src={logoUrl}
      alt="BuildKontrol"
      className={`h-8 w-auto select-none ${className}`}
      draggable={false}
    />
  );
}
