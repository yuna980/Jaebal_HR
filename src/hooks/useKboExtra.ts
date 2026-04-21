import { useState, useEffect } from 'react';
import axios from 'axios';

export interface LineupData {
  startingPitcher: { name: string; winLoss: string; era: string } | null;
  battingOrder: Array<{ order: number; name: string; position: string }>;
  isLineupOut?: boolean;
}

export interface RosterData {
  callUps: Array<{ name: string; position: string; number: string }>;
  sendDowns: Array<{ name: string; position: string; number: string }>;
}

export function useKboLineup(teamId: string | undefined, date: string) {
  const [lineup, setLineup] = useState<LineupData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!teamId || !date) return;
    
    const fetchLineup = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/lineup?teamId=${teamId}&date=${date}`);
        setLineup(res.data);
      } catch (err) {
        console.error(err);
        setLineup(null);
      } finally {
        setLoading(false);
      }
    };
    fetchLineup();
  }, [teamId, date]);

  return { lineup, loading };
}

export function useKboRoster(teamId: string | undefined) {
  const [roster, setRoster] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!teamId) return;

    const fetchRoster = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/roster?teamId=${teamId}`);
        setRoster(res.data);
      } catch (err) {
        console.error(err);
        setRoster(null);
      } finally {
        setLoading(false);
      }
    };
    fetchRoster();
  }, [teamId]);

  return { roster, loading };
}
