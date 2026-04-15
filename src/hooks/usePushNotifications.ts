import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const VAPID_PUBLIC_KEY = 'BFhFpj1YIfrATG_wnPe-k3LyFqUmgQmI2xFiCPn1qc_EIWUtw84_irWSu8druPWaEOP2i7gnBoOMwXDPA0rG8nU';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();

  const registerPush = useCallback(async () => {
    if (!user) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Don't register in iframes or preview hosts
    try {
      if (window.self !== window.top) return;
    } catch {
      return;
    }
    if (window.location.hostname.includes('id-preview--') || window.location.hostname.includes('lovableproject.com')) return;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Send subscription to backend
      await supabase.functions.invoke('register-push', {
        body: { subscription: subscription.toJSON() },
      });
    } catch (err) {
      console.error('Push registration failed:', err);
    }
  }, [user]);

  useEffect(() => {
    registerPush();
  }, [registerPush]);

  return { registerPush };
}
