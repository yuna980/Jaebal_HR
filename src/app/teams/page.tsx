'use client';

import TeamSelectionGrid from '@/components/TeamSelectionGrid';

export default function TeamsPage() {
  return (
    <TeamSelectionGrid
      title="응원팀 바꾸기"
      description="다른 팀도 바로 골라볼 수 있어요!"
      redirectTo="/dashboard"
    />
  );
}
