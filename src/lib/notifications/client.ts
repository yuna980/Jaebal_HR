'use client';

export interface NotificationPreferences {
  gameReminderEnabled: boolean;
  attendanceTipEnabled: boolean;
}

export interface NotificationStatus {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  preferences: NotificationPreferences;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  gameReminderEnabled: true,
  attendanceTipEnabled: true,
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function isWebPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function fetchNotificationStatus(): Promise<NotificationStatus> {
  if (!isWebPushSupported()) {
    return {
      supported: false,
      permission: 'unsupported',
      isSubscribed: false,
      preferences: DEFAULT_PREFERENCES,
    };
  }

  const response = await fetch('/api/notifications/subscription');
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message ?? '알림 상태 조회 실패');
  }

  return {
    supported: true,
    permission: Notification.permission,
    isSubscribed: Boolean(data.isSubscribed),
    preferences: data.preferences ?? DEFAULT_PREFERENCES,
  };
}

export async function subscribeWebPush() {
  if (!isWebPushSupported()) {
    throw new Error('이 브라우저는 푸시 알림을 지원하지 않습니다.');
  }

  const statusResponse = await fetch('/api/notifications/subscription');
  const statusData = await statusResponse.json();

  if (!statusData.success || !statusData.publicKey) {
    throw new Error(statusData.message ?? '푸시 공개키가 없습니다.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('알림 권한이 허용되지 않았습니다.');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(statusData.publicKey),
    }));

  const response = await fetch('/api/notifications/subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message ?? '알림 구독 저장 실패');
  }

  return true;
}

export async function unsubscribeWebPush() {
  if (!isWebPushSupported()) return;

  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  const subscription = await registration?.pushManager.getSubscription();

  if (!subscription) return;

  await fetch('/api/notifications/subscription', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });

  await subscription.unsubscribe();
}

export async function saveNotificationPreferences(preferences: NotificationPreferences) {
  const response = await fetch('/api/notifications/preferences', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preferences),
  });
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message ?? '알림 설정 저장 실패');
  }
}
