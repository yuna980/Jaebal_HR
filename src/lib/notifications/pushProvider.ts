import webpush, { WebPushError } from 'web-push';

export interface WebPushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

let configured = false;

function configureWebPush() {
  if (configured) return;

  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT ?? 'mailto:admin@yagu-eobsin-motsara.local';

  if (!publicKey || !privateKey) {
    throw new Error('Web Push VAPID 환경변수가 없습니다.');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export async function sendWebPushNotification(
  subscription: WebPushSubscriptionPayload,
  payload: NotificationPayload
) {
  configureWebPush();

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true as const };
  } catch (error) {
    const statusCode = error instanceof WebPushError ? error.statusCode : null;
    const message = error instanceof Error ? error.message : '푸시 발송 실패';

    return {
      ok: false as const,
      statusCode,
      message,
      shouldDeactivate: statusCode === 404 || statusCode === 410,
    };
  }
}
