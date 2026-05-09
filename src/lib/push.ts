import { supabase } from '@/integrations/supabase/client';

export type PushAudience = 'all' | 'free' | 'premium' | 'inactive' | 'custom';

export type PushNotificationType =
  | 'recipe_economy_day'
  | 'cooking_reminder'
  | 'protein_alert'
  | 'glp1_mode'
  | 'ingredient_suggestion'
  | 'free_limit_warning'
  | 'premium_promo'
  | 'custom';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  type?: PushNotificationType;
}

const SESSION_ID_KEY = 'cookai_push_session_id';
const PUSH_DENIED_KEY = 'cookai_push_denied_at';

function isClient(): boolean {
  return typeof window !== 'undefined';
}

function getOrCreateSessionId(): string {
  if (!isClient()) return 'server-session';

  const current = window.localStorage.getItem(SESSION_ID_KEY);
  if (current) return current;

  const generated = crypto.randomUUID();
  window.localStorage.setItem(SESSION_ID_KEY, generated);
  return generated;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(normalized);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function bufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function isPushSupported(): boolean {
  if (!isClient()) return false;

  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  return navigator.serviceWorker.register('/sw.js');
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied';

  const permission = await Notification.requestPermission();
  if (permission === 'denied' && isClient()) {
    window.localStorage.setItem(PUSH_DENIED_KEY, String(Date.now()));
  }
  return permission;
}

export function wasPushDeniedRecently(cooldownHours = 48): boolean {
  if (!isClient()) return false;

  const deniedAt = window.localStorage.getItem(PUSH_DENIED_KEY);
  if (!deniedAt) return false;
  const elapsed = Date.now() - Number(deniedAt);

  return elapsed < cooldownHours * 60 * 60 * 1000;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function saveSubscriptionToSupabase(subscription: PushSubscription): Promise<void> {
  const endpoint = subscription.endpoint;
  const p256dh = bufferToBase64(subscription.getKey('p256dh'));
  const auth = bufferToBase64(subscription.getKey('auth'));

  if (!endpoint || !p256dh || !auth) {
    throw new Error('Invalid push subscription keys');
  }

  const sessionId = getOrCreateSessionId();
  const { error } = await supabase.functions.invoke('push-subscriptions', {
    body: {
      action: 'register',
      session_id: sessionId,
      endpoint,
      p256dh,
      auth,
      userAgent: isClient() ? window.navigator.userAgent : null,
    },
  });

  if (error) throw error;
}

export async function subscribeUserToPush(): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error('Push is not supported');
  }

  const permission = await requestPushPermission();
  if (permission !== 'granted') {
    throw new Error('Push permission not granted');
  }

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || import.meta.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    throw new Error('Missing VAPID public key in env');
  }

  await registerServiceWorker();
  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  await saveSubscriptionToSupabase(subscription);
  return subscription;
}

export async function unsubscribeUserFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const subscription = await getCurrentSubscription();
  if (!subscription) return true;

  const endpoint = subscription.endpoint;
  const unsubscribed = await subscription.unsubscribe();

  const sessionId = getOrCreateSessionId();
  const { error } = await supabase.functions.invoke('push-subscriptions', {
    body: {
      action: 'unregister',
      session_id: sessionId,
      endpoint,
    },
  });

  if (error) throw error;
  return unsubscribed;
}
