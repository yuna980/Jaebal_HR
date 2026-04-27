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
  precipitation: number | null;
  airQualityPm10: number | null;
  airQualityLabel: string | null;
  observedTime: string;
}

const lineupCache = new Map<string, LineupData | null>();
const lineupRequestCache = new Map<string, Promise<LineupData | null>>();

function getLineupRequestKey(teamId: string | undefined, date: string) {
  return teamId && date ? `${teamId}-${date}` : 'none';
}

async function fetchLineupData(teamId: string, date: string) {
  const requestKey = getLineupRequestKey(teamId, date);

  if (lineupCache.has(requestKey)) {
    return lineupCache.get(requestKey) ?? null;
  }

  const existingRequest = lineupRequestCache.get(requestKey);
  if (existingRequest) {
    return existingRequest;
  }

  const request = axios
    .get(`/api/lineup?teamId=${teamId}&date=${date}`)
    .then((res) => {
      lineupCache.set(requestKey, res.data);
      return res.data;
    })
    .catch((err) => {
      console.error(err);
      lineupCache.set(requestKey, null);
      return null;
    })
    .finally(() => {
      lineupRequestCache.delete(requestKey);
    });

  lineupRequestCache.set(requestKey, request);
  return request;
}

export function prefetchLineup(teamId: string | undefined, date: string) {
  if (!teamId || !date) return Promise.resolve(null);
  return fetchLineupData(teamId, date);
}

export function useKboLineup(teamId: string | undefined, date: string) {
  const requestKey = getLineupRequestKey(teamId, date);
  const initialLineup = lineupCache.has(requestKey) ? (lineupCache.get(requestKey) ?? null) : null;
  const [lineup, setLineup] = useState<LineupData | null>(initialLineup);
  const [loadedKey, setLoadedKey] = useState(
    !teamId || !date || lineupCache.has(requestKey) ? requestKey : ''
  );

  useEffect(() => {
    if (!teamId || !date || lineupCache.has(requestKey)) {
      return;
    }
    let cancelled = false;

    fetchLineupData(teamId, date).then((data) => {
      if (cancelled) return;
      setLineup(data);
      setLoadedKey(requestKey);
    });

    return () => {
      cancelled = true;
    };
  }, [teamId, date, requestKey]);

  if (!teamId || !date) {
    return { lineup: null, loading: false, loaded: true };
  }

  const hasCache = lineupCache.has(requestKey);
  const effectiveLineup = hasCache ? (lineupCache.get(requestKey) ?? null) : loadedKey === requestKey ? lineup : null;
  const loaded = hasCache || loadedKey === requestKey;

  return { lineup: effectiveLineup, loading: !loaded, loaded };
}

export function useKboRoster(teamId: string | undefined) {
  const [roster, setRoster] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(Boolean(teamId));
  const [loadedKey, setLoadedKey] = useState('');
  const requestKey = teamId ?? 'none';

  useEffect(() => {
    if (!teamId) {
      setRoster(null);
      setLoading(false);
      setLoadedKey('none');
      return;
    }

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
        setLoadedKey(teamId);
      }
    };
    fetchRoster();
  }, [teamId]);

  return { roster, loading, loaded: loadedKey === requestKey && !loading };
}

export function useGameWeather(stadium: string | undefined, time: string | undefined) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(Boolean(stadium));
  const [loadedKey, setLoadedKey] = useState('');
  const requestKey = stadium ? `${stadium}-${time ?? ''}` : 'none';

  useEffect(() => {
    if (!stadium) {
      setWeather(null);
      setLoading(false);
      setLoadedKey('none');
      return;
    }

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
            precipitation: res.data.precipitation,
            airQualityPm10: res.data.airQualityPm10,
            airQualityLabel: res.data.airQualityLabel,
            observedTime: res.data.observedTime,
          });
        } else {
          setWeather(null);
        }
      } catch (err) {
        console.error(err);
        setWeather(null);
      } finally {
        setLoading(false);
        setLoadedKey(`${stadium}-${time ?? ''}`);
      }
    };

    fetchWeather();
  }, [stadium, time]);

  return { weather, loading, loaded: loadedKey === requestKey && !loading };
}
