import { useState, useEffect } from 'react';
import axios from 'axios';

export interface LineupData {
  startingPitcher: {
    name: string;
    winLoss: string;
    era: string;
    whip?: string;
    war?: string;
    games?: string;
    startInnings?: string;
    qs?: string;
  } | null;
  opponentStartingPitcher: {
    name: string;
    winLoss: string;
    era: string;
    whip?: string;
    war?: string;
    games?: string;
    startInnings?: string;
    qs?: string;
  } | null;
  battingOrder: Array<{ order: number; name: string; position: string }>;
  opponentBattingOrder: Array<{ order: number; name: string; position: string }>;
  opponentTeamName: string | null;
  isLineupOut?: boolean;
}

export interface RosterData {
  callUps: Array<{ name: string; position: string; number: string }>;
  sendDowns: Array<{ name: string; position: string; number: string }>;
}

export interface WeatherData {
  temperature: number | null;
  precipitationProbability: number | null;
  forecastTime: string;
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

export function useGameWeather(stadium: string | undefined, time: string | undefined) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stadium) return;

    const fetchWeather = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('stadium', stadium);
        if (time) params.set('time', time);

        const res = await axios.get(`/api/weather?${params.toString()}`);
        if (res.data?.success) {
          setWeather({
            temperature: res.data.temperature,
            precipitationProbability: res.data.precipitationProbability,
            forecastTime: res.data.forecastTime,
          });
        } else {
          setWeather(null);
        }
      } catch (err) {
        console.error(err);
        setWeather(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [stadium, time]);

  return { weather, loading };
}
