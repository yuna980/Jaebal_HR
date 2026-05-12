import { KBO_TEAMS } from '@/data/teams';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { sendWebPushNotification, WebPushSubscriptionPayload } from '@/lib/notifications/pushProvider';

type NotificationType = 'game_lineup_reminder' | 'attendance_tip';

interface GameScheduleRow {
  id: number;
  season_year: number;
  game_date: string;
  game_time: string;
  home_team_id: string;
  away_team_id: string;
  stadium: string;
  note: string;
}

interface NotificationCandidate {
  user_id: string;
  favorite_team_id: string | null;
  notification_subscriptions: Array<{
    id: number;
    channel: string;
    endpoint: string;
    keys: Record<string, string>;
    is_active: boolean;
  }>;
  notification_preferences:
    | {
        game_reminder_enabled: boolean;
        attendance_tip_enabled: boolean;
      }
    | Array<{
        game_reminder_enabled: boolean;
        attendance_tip_enabled: boolean;
      }>
    | null;
}

interface DeliveryRow {
  user_id: string;
  game_schedule_id: number;
  notification_type: NotificationType;
  channel: string;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const SEND_WINDOW_MINUTES = 5;

function getKstNow() {
  return new Date(Date.now() + KST_OFFSET_MS);
}

function toKstDateText(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseGameDateTime(gameDate: string, gameTime: string) {
  const [hourText = '', minuteText = ''] = gameTime.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  const gameDateTimeUtcMs = Date.parse(`${gameDate}T${hourText.padStart(2, '0')}:${minuteText.padStart(2, '0')}:00+09:00`);

  if (Number.isNaN(gameDateTimeUtcMs)) {
    return null;
  }

  return new Date(gameDateTimeUtcMs);
}

function isWithinSendWindow(game: GameScheduleRow, minutesBeforeGame: number, now = new Date()) {
  const gameDateTime = parseGameDateTime(game.game_date, game.game_time);
  if (!gameDateTime) return false;

  const targetTime = gameDateTime.getTime() - minutesBeforeGame * 60 * 1000;
  const diffMs = Math.abs(now.getTime() - targetTime);

  return diffMs <= SEND_WINDOW_MINUTES * 60 * 1000;
}

function isCancelled(game: GameScheduleRow) {
  return game.note.includes('취소');
}

function getTeamName(teamId: string) {
  return KBO_TEAMS.find((team) => team.id === teamId)?.name ?? teamId;
}

function getPreference(candidate: NotificationCandidate, type: NotificationType) {
  const rawPreference = Array.isArray(candidate.notification_preferences)
    ? candidate.notification_preferences[0]
    : candidate.notification_preferences;

  if (!rawPreference) return true;

  if (type === 'attendance_tip') {
    return rawPreference.attendance_tip_enabled;
  }

  return rawPreference.game_reminder_enabled;
}

function getGameTeamIds(game: GameScheduleRow) {
  return new Set([game.home_team_id, game.away_team_id]);
}

function getPayload(type: NotificationType, game: GameScheduleRow) {
  if (type === 'attendance_tip') {
    return {
      title: '오늘 직관 가시는 군요!',
      body: '구장 꿀팁을 확인해보세요',
      url: '/stadiums',
      tag: `attendance-tip-${game.id}`,
    };
  }

  return {
    title: '오늘 야구 해요',
    body: '오늘의 선발 라인업을 확인해보세요',
    url: '/dashboard',
    tag: `game-lineup-reminder-${game.id}`,
  };
}

async function getTargetGames(notificationType: NotificationType) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.');
  }

  const kstToday = toKstDateText(getKstNow());
  const { data, error } = await supabase
    .from('game_schedules')
    .select('id, season_year, game_date, game_time, home_team_id, away_team_id, stadium, note')
    .eq('game_date', kstToday)
    .order('game_time', { ascending: true });

  if (error) {
    throw new Error(`경기 일정 조회 실패: ${error.message}`);
  }

  const minutesBeforeGame = notificationType === 'attendance_tip' ? 120 : 30;

  return ((data ?? []) as GameScheduleRow[]).filter(
    (game) => game.game_time && !isCancelled(game) && isWithinSendWindow(game, minutesBeforeGame)
  );
}

async function getCandidatesForGame(game: GameScheduleRow, notificationType: NotificationType) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.');
  }

  const gameTeamIds = Array.from(getGameTeamIds(game));
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      user_id:id,
      favorite_team_id,
      notification_subscriptions (
        id,
        channel,
        endpoint,
        keys,
        is_active
      ),
      notification_preferences (
        game_reminder_enabled,
        attendance_tip_enabled
      )
    `
    )
    .in('favorite_team_id', gameTeamIds);

  if (error) {
    throw new Error(`알림 대상 조회 실패: ${error.message}`);
  }

  const baseCandidates = ((data ?? []) as unknown as NotificationCandidate[])
    .filter((candidate) => candidate.favorite_team_id && gameTeamIds.includes(candidate.favorite_team_id))
    .filter((candidate) => getPreference(candidate, notificationType))
    .filter((candidate) =>
      candidate.notification_subscriptions.some(
        (subscription) => subscription.channel === 'web_push' && subscription.is_active
      )
    );

  if (notificationType !== 'attendance_tip') {
    return baseCandidates;
  }

  const { data: attendanceRows, error: attendanceError } = await supabase
    .from('attendance_records')
    .select('user_id, team_id')
    .eq('game_date', game.game_date)
    .eq('is_attending', true)
    .in('team_id', gameTeamIds);

  if (attendanceError) {
    throw new Error(`직관 대상 조회 실패: ${attendanceError.message}`);
  }

  const attendingUserIds = new Set((attendanceRows ?? []).map((row) => row.user_id as string));

  return baseCandidates.filter((candidate) => attendingUserIds.has(candidate.user_id));
}

async function getSentDeliveries(gameIds: number[], notificationType: NotificationType) {
  const supabase = getSupabaseAdminClient();
  if (!supabase || gameIds.length === 0) return new Set<string>();

  const { data, error } = await supabase
    .from('notification_deliveries')
    .select('user_id, game_schedule_id, notification_type, channel')
    .in('game_schedule_id', gameIds)
    .eq('notification_type', notificationType)
    .eq('channel', 'web_push')
    .eq('status', 'sent');

  if (error) {
    throw new Error(`알림 발송 이력 조회 실패: ${error.message}`);
  }

  return new Set(
    ((data ?? []) as DeliveryRow[]).map(
      (delivery) => `${delivery.user_id}:${delivery.game_schedule_id}:${delivery.notification_type}:${delivery.channel}`
    )
  );
}

async function recordDelivery(params: {
  userId: string;
  gameId: number;
  notificationType: NotificationType;
  status: 'sent' | 'failed' | 'skipped';
  errorMessage?: string;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  await supabase.from('notification_deliveries').upsert(
    {
      user_id: params.userId,
      game_schedule_id: params.gameId,
      notification_type: params.notificationType,
      channel: 'web_push',
      status: params.status,
      sent_at: params.status === 'sent' ? new Date().toISOString() : null,
      error_message: params.errorMessage ?? null,
    },
    {
      onConflict: 'user_id,game_schedule_id,notification_type,channel',
    }
  );
}

async function deactivateSubscription(subscriptionId: number) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  await supabase
    .from('notification_subscriptions')
    .update({ is_active: false })
    .eq('id', subscriptionId);
}

export async function sendScheduledNotifications(notificationType: NotificationType) {
  const games = await getTargetGames(notificationType);
  const sentDeliveries = await getSentDeliveries(
    games.map((game) => game.id),
    notificationType
  );

  const summary = {
    notificationType,
    games: games.length,
    attempted: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  for (const game of games) {
    const candidates = await getCandidatesForGame(game, notificationType);
    const payload = getPayload(notificationType, game);

    for (const candidate of candidates) {
      const deliveryKey = `${candidate.user_id}:${game.id}:${notificationType}:web_push`;

      if (sentDeliveries.has(deliveryKey)) {
        summary.skipped += 1;
        continue;
      }

      const activeSubscriptions = candidate.notification_subscriptions.filter(
        (subscription) => subscription.channel === 'web_push' && subscription.is_active
      );

      if (activeSubscriptions.length === 0) {
        summary.skipped += 1;
        continue;
      }

      let didSend = false;
      let lastError = '';

      for (const subscription of activeSubscriptions) {
        summary.attempted += 1;
        const result = await sendWebPushNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys as WebPushSubscriptionPayload['keys'],
          },
          {
            ...payload,
            body:
              notificationType === 'game_lineup_reminder'
                ? `${getTeamName(candidate.favorite_team_id ?? '')} 경기 ${payload.body}`
                : payload.body,
          }
        );

        if (result.ok) {
          didSend = true;
          summary.sent += 1;
        } else {
          lastError = result.message;
          summary.failed += 1;

          if (result.shouldDeactivate) {
            await deactivateSubscription(subscription.id);
          }
        }
      }

      await recordDelivery({
        userId: candidate.user_id,
        gameId: game.id,
        notificationType,
        status: didSend ? 'sent' : 'failed',
        errorMessage: didSend ? undefined : lastError,
      });
    }
  }

  return summary;
}
