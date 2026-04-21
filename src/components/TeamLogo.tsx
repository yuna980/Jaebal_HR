import Image from 'next/image';
import type { Team } from '@/data/teams';

interface TeamLogoProps {
  team: Team | null | undefined;
  size?: number;
  rounded?: boolean;
}

const LOGO_SCALE_BY_TEAM: Record<string, number> = {
  lg: 0.9,
  kt: 0.92,
  ssg: 0.98,
  nc: 0.95,
  doosan: 0.94,
  kia: 0.9,
  lotte: 0.86,
  samsung: 0.9,
  hanwha: 0.9,
  kiwoom: 0.88,
};

export default function TeamLogo({ team, size = 32, rounded = false }: TeamLogoProps) {
  if (!team) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: rounded ? '50%' : 0,
          background: 'var(--border)',
        }}
      />
    );
  }

  const scale = LOGO_SCALE_BY_TEAM[team.id] ?? 0.9;
  const innerSize = Math.round(size * scale);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: rounded ? '50%' : 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Image
        src={team.logo}
        alt={team.fullName}
        width={innerSize}
        height={innerSize}
        style={{
          width: innerSize,
          height: innerSize,
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );
}
