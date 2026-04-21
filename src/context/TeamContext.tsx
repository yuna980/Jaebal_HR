'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Team, KBO_TEAMS } from '@/data/teams';

interface TeamContextType {
  myTeam: Team | null;
  selectTeam: (teamId: string) => void;
  isGoingToday: boolean;
  setIsGoingToday: (value: boolean) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [isGoingToday, setIsGoingToday] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const savedTeamId = localStorage.getItem('myTeamId');
    if (savedTeamId) {
      const team = KBO_TEAMS.find((t) => t.id === savedTeamId);
      if (team) setMyTeam(team);
    }
    setIsInitialized(true);
  }, []);

  const selectTeam = (teamId: string) => {
    const team = KBO_TEAMS.find((t) => t.id === teamId);
    if (team) {
      setMyTeam(team);
      localStorage.setItem('myTeamId', teamId);
    }
  };

  if (!isInitialized) return null;

  return (
    <TeamContext.Provider value={{ myTeam, selectTeam, isGoingToday, setIsGoingToday }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
