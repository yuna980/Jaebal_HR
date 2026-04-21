'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTeam } from '@/context/TeamContext';
import TeamSelectionGrid from '@/components/TeamSelectionGrid';

export default function OnboardingPage() {
  const { myTeam } = useTeam();
  const router = useRouter();

  useEffect(() => {
    if (myTeam) {
      router.push('/dashboard');
    }
  }, [myTeam, router]);

  return <TeamSelectionGrid />;
}
