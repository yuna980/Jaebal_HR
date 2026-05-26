import { useState, useEffect } from 'react';
import axios from 'axios';
import { createTimedMemoryCache } from '@/lib/requestCache';

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
const EXTRA_CACHE_TTL_MS = 5 * 60 * 1000;
const rosterCache = createTimedMemoryCache<RosterData | null>(EXTRA_CACHE_TTL_MS);
const rosterRequestCache = new Map<string, Promise<RosterData | null>>();
const weatherCache = createTimedMemoryCache<WeatherData | null>(EXTRA_CACHE_TTL_MS);
const weatherRequestCache = new Map<string, Promise<WeatherData | null>>();

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
  const requestKey = teamId ?? 'none';
  const initialRoster = teamId ? rosterCache.get(requestKey) : null;
  const [roster, setRoster] = useState<RosterData | null>(initialRoster);
  const [loading, setLoading] = useState(Boolean(teamId && !rosterCache.has(requestKey)));
  const [loadedKey, setLoadedKey] = useState(teamId && rosterCache.has(requestKey) ? requestKey : '');

  useEffect(() => {
    if (!teamId) {
      setRoster(null);
      setLoading(false);
      setLoadedKey('none');
      return;
    }

    const cachedRoster = rosterCache.get(requestKey);
    if (rosterCache.has(requestKey)) {
      setRoster(cachedRoster);
      setLoading(false);
      setLoadedKey(requestKey);
      return;
    }

    let cancelled = false;

    const fetchRoster = async () => {
      setLoading(true);
      try {
        const existingRequest = rosterRequestCache.get(requestKey);
        const request =
          existingRequest ??
          axios.get(`/api/roster?teamId=${teamId}`).then((res) => {
            rosterCache.set(requestKey, res.data);
            return res.data as RosterData;
          });

        if (!existingRequest) {
          rosterRequestCache.set(
            requestKey,
            request.finally(() => rosterRequestCache.delete(requestKey))
          );
        }

        const nextRoster = await request;
        if (cancelled) return;
        setRoster(nextRoster);
      } catch (err) {
        console.error(err);
        rosterCache.set(requestKey, null);
        if (cancelled) return;
        setRoster(null);
      } finally {
        if (cancelled) return;
        setLoading(false);
        setLoadedKey(requestKey);
      }
    };
    fetchRoster();
    return () => {
      cancelled = true;
    };
  }, [requestKey, teamId]);

  return { roster, loading, loaded: loadedKey === requestKey && !loading };
}

export function useGameWeather(stadium: string | undefined, time: string | undefined) {
  const requestKey = stadium ? `${stadium}-${time ?? ''}` : 'none';
  const initialWeather = stadium ? weatherCache.get(requestKey) : null;
  const [weather, setWeather] = useState<WeatherData | null>(initialWeather);
  const [loading, setLoading] = useState(Boolean(stadium && !weatherCache.has(requestKey)));
  const [loadedKey, setLoadedKey] = useState(stadium && weatherCache.has(requestKey) ? requestKey : '');

  useEffect(() => {
    if (!stadium) {
      setWeather(null);
      setLoading(false);
      setLoadedKey('none');
      return;
    }

    const cachedWeather = weatherCache.get(requestKey);
    if (weatherCache.has(requestKey)) {
      setWeather(cachedWeather);
      setLoading(false);
      setLoadedKey(requestKey);
      return;
    }

    let cancelled = false;

    const fetchWeather = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('stadium', stadium);
        if (time) params.set('time', time);

        const existingRequest = weatherRequestCache.get(requestKey);
        const request =
          existingRequest ??
          axios.get(`/api/weather?${params.toString()}`).then((res) => {
            const nextWeather = res.data?.success
              ? {
                  temperature: res.data.temperature,
                  precipitation: res.data.precipitation,
                  airQualityPm10: res.data.airQualityPm10,
                  airQualityLabel: res.data.airQualityLabel,
                  observedTime: res.data.observedTime,
                }
              : null;
            weatherCache.set(requestKey, nextWeather);
            return nextWeather;
          });

        if (!existingRequest) {
          weatherRequestCache.set(
            requestKey,
            request.finally(() => weatherRequestCache.delete(requestKey))
          );
        }

        const nextWeather = await request;
        if (cancelled) return;
        setWeather(nextWeather);
      } catch (err) {
        console.error(err);
        weatherCache.set(requestKey, null);
        if (cancelled) return;
        setWeather(null);
      } finally {
        if (cancelled) return;
        setLoading(false);
        setLoadedKey(requestKey);
      }
    };

    fetchWeather();
    return () => {
      cancelled = true;
    };
  }, [requestKey, stadium, time]);

  return { weather, loading, loaded: loadedKey === requestKey && !loading };
}
