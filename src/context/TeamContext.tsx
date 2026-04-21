'use client';

import React, { createContext, useContext, useState, useSyncExternalStore } from 'react';
import { Team, KBO_TEAMS } from '@/data/teams';

interface TeamContextType {
  myTeam: Team | null;
  selectTeam: (teamId: string) => void;
  isGoingToday: boolean;
  setIsGoingToday: (value: boolean) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

const TEAM_STORAGE_KEY = 'myTeamId';
const TEAM_CHANGE_EVENT = 'my-team-change';

function subscribeToSelectedTeam(callback: () => void) {
  const handleChange = () => callback();
  window.addEventListener('storage', handleChange);
  window.addEventListener(TEAM_CHANGE_EVENT, handleChange);

  return () => {
    window.removeEventListener('storage', handleChange);
    window.removeEventListener(TEAM_CHANGE_EVENT, handleChange);
  };
}

function getSelectedTeamId() {
  return localStorage.getItem(TEAM_STORAGE_KEY);
}

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const selectedTeamId = useSyncExternalStore(
    subscribeToSelectedTeam,
    getSelectedTeamId,
    () => null
  );
  const [isGoingToday, setIsGoingToday] = useState(false);
  const myTeam = KBO_TEAMS.find((team) => team.id === selectedTeamId) ?? null;

  const selectTeam = (teamId: string) => {
    const team = KBO_TEAMS.find((t) => t.id === teamId);
    if (team) {
      localStorage.setItem(TEAM_STORAGE_KEY, teamId);
      window.dispatchEvent(new Event(TEAM_CHANGE_EVENT));
    }
  };

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
