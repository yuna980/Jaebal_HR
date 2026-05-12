import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface PushSubscriptionInput {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
}

async function getAuthenticatedSupabaseClient() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null };
  }

  return { supabase, user };
}

function isValidSubscription(subscription: PushSubscriptionInput) {
  return Boolean(
    subscription &&
      typeof subscription.endpoint === 'string' &&
      subscription.endpoint.length > 0 &&
      typeof subscription.keys?.p256dh === 'string' &&
      subscription.keys.p256dh.length > 0 &&
      typeof subscription.keys?.auth === 'string' &&
      subscription.keys.auth.length > 0
  );
}

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY ?? '';
  const { supabase, user } = await getAuthenticatedSupabaseClient();

  if (!user) {
    return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { data: preference } = await supabase
    .from('notification_preferences')
    .select('game_reminder_enabled, attendance_tip_enabled')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: subscriptions } = await supabase
    .from('notification_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('channel', 'web_push')
    .eq('is_active', true)
    .limit(1);

  return NextResponse.json({
    success: true,
    publicKey,
    isSubscribed: Boolean(subscriptions?.length),
    preferences: {
      gameReminderEnabled: preference?.game_reminder_enabled ?? true,
      attendanceTipEnabled: preference?.attendance_tip_enabled ?? true,
    },
  });
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabaseClient();

  if (!user) {
    return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { subscription?: PushSubscriptionInput } | null;
  const subscription = body?.subscription;

  if (!subscription || !isValidSubscription(subscription)) {
    return NextResponse.json({ success: false, message: '푸시 구독 정보가 올바르지 않습니다.' }, { status: 400 });
  }

  const { error: preferenceError } = await supabase.from('notification_preferences').upsert(
    {
      user_id: user.id,
      game_reminder_enabled: true,
      attendance_tip_enabled: true,
    },
    {
      onConflict: 'user_id',
      ignoreDuplicates: true,
    }
  );

  if (preferenceError) {
    return NextResponse.json({ success: false, message: preferenceError.message }, { status: 500 });
  }

  const { error } = await supabase.from('notification_subscriptions').upsert(
    {
      user_id: user.id,
      channel: 'web_push',
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      platform: 'web',
      user_agent: request.headers.get('user-agent') ?? '',
      is_active: true,
    },
    {
      onConflict: 'user_id,channel,endpoint',
    }
  );

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabaseClient();

  if (!user) {
    return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;

  if (!body?.endpoint) {
    return NextResponse.json({ success: false, message: '구독 endpoint가 필요합니다.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('notification_subscriptions')
    .update({ is_active: false })
    .eq('user_id', user.id)
    .eq('channel', 'web_push')
    .eq('endpoint', body.endpoint);

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
