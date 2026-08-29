import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export function getPushPermissionState(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Register Service Worker for Push Notifications
 */
export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    return registration;
  } catch (error) {
    console.warn('[Push Notification] Service worker registration failed/skipped:', error);
    return null;
  }
}

/**
 * Request Push Notification Permission from user and register device token/permission
 */
export async function requestPushPermission(userId?: string): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn('[Push Notification] Push notifications are not supported in this browser environment.');
    return false;
  }

  try {
    // Register SW first
    await registerPushServiceWorker();

    // Request Notification permission
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Trigger a test notification on mobile/desktop panel
      triggerDevicePushNotification('PlayVear Push Notifications', {
        body: 'Push notifications are now active! You will receive live updates for league reviews & approvals.',
        icon: '/favicon.ico',
        tag: 'vortex-welcome-notification'
      });

      // Update Firestore user document if user is logged in
      if (userId) {
        try {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            pushNotificationsEnabled: true,
            pushNotificationsUpdatedAt: new Date().toISOString()
          });
        } catch (err) {
          console.warn('[Push Notification] Could not update user Firestore record:', err);
        }
      }

      return true;
    } else {
      console.warn('[Push Notification] User denied or dismissed permission prompt.');
      return false;
    }
  } catch (error) {
    console.error('[Push Notification] Error requesting push permission:', error);
    return false;
  }
}

/**
 * Trigger a native system device push notification directly on the mobile/desktop panel
 */
export function triggerDevicePushNotification(title: string, options?: NotificationOptions): void {
  if (!isPushSupported()) return;
  if (Notification.permission !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options
        } as any);
      }).catch(() => {
        // Fallback to standard Notification constructor
        new Notification(title, {
          icon: '/favicon.ico',
          ...options
        });
      });
    } else {
      new Notification(title, {
        icon: '/favicon.ico',
        ...options
      });
    }
  } catch (error) {
    console.warn('[Push Notification] Error displaying native device notification:', error);
  }
}
