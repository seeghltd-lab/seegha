# Building a Twitter/X-Level PWA with React + Vite
## Complete Guide to Full PWA Functionality (2024-2026)

> **Transform your React Vite app into a production-grade Progressive Web App with the same capabilities as Twitter/X: offline-first architecture, push notifications, background sync, installability, and native-like features.**

---

## Table of Contents
1. [Understanding Twitter/X's PWA Success](#understanding-twitterxs-pwa-success)
2. [Project Setup](#project-setup)
3. [Core PWA Configuration](#core-pwa-configuration)
4. [Offline-First Architecture](#offline-first-architecture)
5. [Background Sync](#background-sync)
6. [Push Notifications](#push-notifications)
7. [Advanced PWA Features](#advanced-pwa-features)
8. [Performance Optimization](#performance-optimization)
9. [Testing & Deployment](#testing--deployment)
10. [Production Checklist](#production-checklist)

---

## Understanding Twitter/X's PWA Success

Twitter/X's PWA (Twitter Lite) achieved remarkable results:
- **10M+ push notifications** delivered daily
- **250,000 daily users** launch from homescreen (4x per day average)
- **70% reduction** in data consumption
- **600KB** over the wire vs 23.5MB native app
- **<5 seconds** first load on 3G networks
- **Near-instant** subsequent loads

**Key Features They Implemented:**
- ✅ Installability with custom prompts
- ✅ Offline caching (app shell + dynamic content)
- ✅ Background sync for queued actions
- ✅ Push notifications
- ✅ Adaptive image optimization
- ✅ 42 language support with Globalize
- ✅ Data saver mode
- ✅ Branded likes with custom animations
- ✅ Conversation controls

---

## Project Setup

### 1. Create React + Vite Project

```bash
# Create new Vite project with React + TypeScript
npm create vite@latest my-pwa-app -- --template react-ts
cd my-pwa-app
npm install
```

### 2. Install PWA Dependencies

```bash
# Core PWA plugin
npm install -D vite-plugin-pwa

# Workbox for advanced caching
npm install workbox-window workbox-core workbox-routing workbox-strategies workbox-precaching workbox-background-sync

# IndexedDB wrapper for easier async operations
npm install idb

# Optional: PWA asset generator
npm install -D @vite-pwa/assets-generator
```

### 3. Update TypeScript Configuration

Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vite/client", "vite-plugin-pwa/client"]
  }
}
```

Or create/update `src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
```

---

## Core PWA Configuration

### Complete `vite.config.ts` Setup

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      
      manifest: {
        name: 'Your App - Full PWA',
        short_name: 'YourApp',
        description: 'Twitter-like social application with full PWA capabilities',
        theme_color: '#1DA1F2',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable' // Important for Android adaptive icons
          }
        ],
        
        // App shortcuts (like Twitter's quick actions)
        shortcuts: [
          {
            name: 'New Post',
            short_name: 'Post',
            description: 'Create a new post',
            url: '/compose',
            icons: [{ src: '/icons/compose.png', sizes: '192x192' }]
          },
          {
            name: 'Notifications',
            short_name: 'Notifications',
            url: '/notifications',
            icons: [{ src: '/icons/notifications.png', sizes: '192x192' }]
          }
        ],
        
        // Share target (receive shares from other apps)
        share_target: {
          action: '/share',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [
              {
                name: 'media',
                accept: ['image/*', 'video/*']
              }
            ]
          }
        },
        
        // Screenshots for install prompt (optional)
        screenshots: [
          {
            src: 'screenshots/home.png',
            sizes: '540x720',
            type: 'image/png'
          }
        ]
      },

      workbox: {
        // Maximum cache size (important for mobile)
        maximumFileSizeToCacheInBytes: 3000000,
        
        // Files to precache (app shell)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        
        // Runtime caching strategies
        runtimeCaching: [
          // API calls - Network First
          {
            urlPattern: /^https:\/\/api\.yourapp\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          
          // User feeds - Stale While Revalidate (Twitter-like)
          {
            urlPattern: /^https:\/\/api\.yourapp\.com\/feed.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'feed-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              }
            }
          },
          
          // Images - Cache First
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 60 // 60 days
              }
            }
          },
          
          // Avatars/profile pics - Cache First with custom expiration
          {
            urlPattern: /^https:\/\/.*\/avatars\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'avatars-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          
          // Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ],
        
        // Offline fallback
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/]
      },

      devOptions: {
        enabled: true, // Enable PWA in dev mode
        type: 'module'
      }
    })
  ]
})
```

---

## Offline-First Architecture

### 1. IndexedDB Service Setup

Create `src/services/indexedDBService.ts`:

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Define your database schema
interface AppDBSchema extends DBSchema {
  'posts': {
    key: string;
    value: {
      id: string;
      content: string;
      author: string;
      timestamp: number;
      synced: boolean;
    };
    indexes: { 'by-timestamp': number; 'by-synced': number };
  };
  'sync-queue': {
    key: string;
    value: {
      id: string;
      url: string;
      method: string;
      headers: Record<string, string>;
      body: string | null;
      timestamp: number;
      retryCount: number;
      status: 'pending' | 'syncing' | 'failed' | 'completed';
    };
    indexes: { 'by-status': string };
  };
  'user-data': {
    key: string;
    value: {
      userId: string;
      profile: any;
      settings: any;
      lastSync: number;
    };
  };
}

class IndexedDBService {
  private db: IDBPDatabase<AppDBSchema> | null = null;
  private dbName = 'app-database';
  private version = 1;

  async initialize(): Promise<void> {
    this.db = await openDB<AppDBSchema>(this.dbName, this.version, {
      upgrade(db) {
        // Create posts store
        if (!db.objectStoreNames.contains('posts')) {
          const postsStore = db.createObjectStore('posts', { keyPath: 'id' });
          postsStore.createIndex('by-timestamp', 'timestamp');
          postsStore.createIndex('by-synced', 'synced');
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains('sync-queue')) {
          const syncStore = db.createObjectStore('sync-queue', { keyPath: 'id' });
          syncStore.createIndex('by-status', 'status');
        }

        // Create user data store
        if (!db.objectStoreNames.contains('user-data')) {
          db.createObjectStore('user-data', { keyPath: 'userId' });
        }
      },
    });
  }

  // Posts operations
  async addPost(post: AppDBSchema['posts']['value']): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.add('posts', post);
  }

  async getPosts(limit = 50): Promise<AppDBSchema['posts']['value'][]> {
    if (!this.db) await this.initialize();
    const tx = this.db!.transaction('posts', 'readonly');
    const index = tx.store.index('by-timestamp');
    return await index.getAll(undefined, limit);
  }

  async updatePost(id: string, updates: Partial<AppDBSchema['posts']['value']>): Promise<void> {
    if (!this.db) await this.initialize();
    const tx = this.db!.transaction('posts', 'readwrite');
    const post = await tx.store.get(id);
    if (post) {
      await tx.store.put({ ...post, ...updates });
    }
  }

  // Sync queue operations
  async addToSyncQueue(item: AppDBSchema['sync-queue']['value']): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.add('sync-queue', item);
  }

  async getPendingSync(): Promise<AppDBSchema['sync-queue']['value'][]> {
    if (!this.db) await this.initialize();
    const tx = this.db!.transaction('sync-queue', 'readonly');
    const index = tx.store.index('by-status');
    return await index.getAll('pending');
  }

  async updateSyncItem(id: string, status: AppDBSchema['sync-queue']['value']['status']): Promise<void> {
    if (!this.db) await this.initialize();
    const tx = this.db!.transaction('sync-queue', 'readwrite');
    const item = await tx.store.get(id);
    if (item) {
      await tx.store.put({ ...item, status });
    }
  }

  async removeSyncItem(id: string): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.delete('sync-queue', id);
  }

  // User data operations
  async saveUserData(data: AppDBSchema['user-data']['value']): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.put('user-data', data);
  }

  async getUserData(userId: string): Promise<AppDBSchema['user-data']['value'] | undefined> {
    if (!this.db) await this.initialize();
    return await this.db!.get('user-data', userId);
  }
}

export const indexedDBService = new IndexedDBService();
```

### 2. Service Worker Registration with Update Prompt

Create `src/registerServiceWorker.tsx`:

```typescript
import { registerSW } from 'virtual:pwa-register';

export function registerServiceWorker() {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Show custom UI for update
      if (window.confirm('New content available. Reload to update?')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.log('App ready to work offline');
      // Show notification to user
      showNotification('App is ready for offline use!');
    },
    onRegistered(registration) {
      console.log('Service Worker registered');
      
      // Check for updates every hour
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error);
    }
  });

  return updateSW;
}

function showNotification(message: string) {
  // Create custom toast/snackbar component
  const notification = document.createElement('div');
  notification.className = 'pwa-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}
```

Update `src/main.tsx`:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './registerServiceWorker'
import { indexedDBService } from './services/indexedDBService'

// Initialize IndexedDB
indexedDBService.initialize();

// Register Service Worker
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

---

## Background Sync

### 1. Custom Service Worker for Background Sync

If you need custom service worker (use `injectManifest` strategy):

Update `vite.config.ts`:

```typescript
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.ts',
  // ... other options
})
```

Create `src/sw.ts`:

```typescript
/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

// Precache all assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Background Sync for POST requests
const bgSyncPlugin = new BackgroundSyncPlugin('post-queue', {
  maxRetentionTime: 24 * 60, // Retry for max of 24 Hours (in minutes)
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log('Replay successful for request', entry.request.url);
      } catch (error) {
        console.error('Replay failed for request', entry.request.url, error);
        // Re-throw to retry
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  }
});

// Register background sync for API POST/PUT/DELETE requests
registerRoute(
  ({ url, request }) => 
    url.origin === self.location.origin &&
    ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method),
  new NetworkFirst({
    cacheName: 'api-mutations',
    plugins: [
      bgSyncPlugin,
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ]
  }),
  'POST'
);

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const options: NotificationOptions = {
    body: data.body || 'New notification',
    icon: '/pwa-192x192.png',
    badge: '/badge-72x72.png',
    tag: data.tag || 'general',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Your App', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window open
          for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          // Open new window
          if (self.clients.openWindow) {
            return self.clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Periodic background sync (for feed updates)
self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'update-feed') {
    event.waitUntil(updateFeed());
  }
});

async function updateFeed() {
  try {
    const response = await fetch('/api/feed');
    const data = await response.json();
    
    // Cache the feed data
    const cache = await caches.open('feed-cache');
    await cache.put('/api/feed', new Response(JSON.stringify(data)));
    
    // Optionally show badge or notification
    if ('setAppBadge' in navigator) {
      (navigator as any).setAppBadge(data.unreadCount || 0);
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}
```

### 2. React Hook for Background Sync

Create `src/hooks/useBackgroundSync.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { indexedDBService } from '../services/indexedDBService';

export function useBackgroundSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const queueAction = useCallback(async (
    url: string,
    method: string,
    body: any,
    headers: Record<string, string> = {}
  ) => {
    const syncItem = {
      id: crypto.randomUUID(),
      url,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(body),
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending' as const
    };

    await indexedDBService.addToSyncQueue(syncItem);

    // Try to register background sync if available
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-posts');
    } else {
      // Fallback: try immediate sync
      await attemptSync();
    }

    updatePendingCount();
  }, []);

  const attemptSync = useCallback(async () => {
    if (!navigator.onLine) return;

    setIsSyncing(true);
    const pending = await indexedDBService.getPendingSync();

    for (const item of pending) {
      try {
        await indexedDBService.updateSyncItem(item.id, 'syncing');
        
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body
        });

        if (response.ok) {
          await indexedDBService.updateSyncItem(item.id, 'completed');
          await indexedDBService.removeSyncItem(item.id);
        } else {
          await indexedDBService.updateSyncItem(item.id, 'failed');
        }
      } catch (error) {
        console.error('Sync error:', error);
        await indexedDBService.updateSyncItem(item.id, 'failed');
      }
    }

    setIsSyncing(false);
    updatePendingCount();
  }, []);

  const updatePendingCount = useCallback(async () => {
    const pending = await indexedDBService.getPendingSync();
    setPendingCount(pending.length);
  }, []);

  useEffect(() => {
    updatePendingCount();

    // Listen for online event
    const handleOnline = () => {
      attemptSync();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [attemptSync, updatePendingCount]);

  return {
    queueAction,
    attemptSync,
    isSyncing,
    pendingCount
  };
}
```

Usage in components:

```tsx
import { useBackgroundSync } from './hooks/useBackgroundSync';

function CreatePost() {
  const { queueAction, isSyncing, pendingCount } = useBackgroundSync();

  const handleSubmit = async (content: string) => {
    // Queue the post for background sync
    await queueAction(
      '/api/posts',
      'POST',
      { content, timestamp: Date.now() }
    );

    // Show success message
    alert('Post queued! Will sync when online.');
  };

  return (
    <div>
      {pendingCount > 0 && (
        <div>Pending syncs: {pendingCount}</div>
      )}
      {isSyncing && <div>Syncing...</div>}
      {/* Your post form */}
    </div>
  );
}
```

---

## Push Notifications

### 1. Request Permission and Subscribe

Create `src/services/pushNotifications.ts`:

```typescript
export class PushNotificationService {
  private vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY'; // Get from your backend

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async subscribe(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Subscribe
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        });
      }

      // Send subscription to your backend
      await this.sendSubscriptionToBackend(subscription);

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  async unsubscribe(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        // Notify backend
        await this.removeSubscriptionFromBackend(subscription);
      }
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  }

  private async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
  }

  private async removeSubscriptionFromBackend(subscription: PushSubscription): Promise<void> {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const pushService = new PushNotificationService();
```

### 2. Push Notification Component

```tsx
import { useState } from 'react';
import { pushService } from '../services/pushNotifications';

export function NotificationSettings() {
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = async () => {
    const permissionGranted = await pushService.requestPermission();
    
    if (permissionGranted) {
      const subscription = await pushService.subscribe();
      setIsSubscribed(!!subscription);
    }
  };

  const handleUnsubscribe = async () => {
    await pushService.unsubscribe();
    setIsSubscribed(false);
  };

  return (
    <div>
      <h2>Push Notifications</h2>
      {!isSubscribed ? (
        <button onClick={handleSubscribe}>
          Enable Notifications
        </button>
      ) : (
        <button onClick={handleUnsubscribe}>
          Disable Notifications
        </button>
      )}
    </div>
  );
}
```

---

## Advanced PWA Features

### 1. Install Prompt

Create `src/hooks/useInstallPrompt.ts`:

```typescript
import { useState, useEffect } from 'react';

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      return false;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
      return true;
    }
    
    return false;
  };

  return {
    installApp,
    canInstall: !!deferredPrompt && !isInstalled,
    isInstalled
  };
}
```

Install Button Component:

```tsx
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export function InstallButton() {
  const { installApp, canInstall } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <button 
      onClick={installApp}
      className="install-button"
    >
      📱 Install App
    </button>
  );
}
```

### 2. Web Share API

```tsx
export function ShareButton({ url, title, text }: {
  url: string;
  title: string;
  text: string;
}) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url
        });
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <button onClick={handleShare}>
      Share
    </button>
  );
}
```

### 3. Badging API

```typescript
// Set badge count
export function setBadgeCount(count: number) {
  if ('setAppBadge' in navigator) {
    if (count > 0) {
      (navigator as any).setAppBadge(count);
    } else {
      (navigator as any).clearAppBadge();
    }
  }
}

// Usage in component
useEffect(() => {
  // Update badge when unread count changes
  setBadgeCount(unreadNotifications);
}, [unreadNotifications]);
```

### 4. Offline Indicator

```tsx
import { useState, useEffect } from 'react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="offline-banner">
      ⚠️ You're offline. Some features may be limited.
    </div>
  );
}
```

### 5. Periodic Background Sync (Chrome only)

```typescript
// Request periodic sync (in service worker)
self.addEventListener('activate', async (event) => {
  event.waitUntil(
    (async () => {
      // Check if periodic sync is supported
      if ('periodicSync' in self.registration) {
        try {
          await self.registration.periodicSync.register('update-feed', {
            minInterval: 24 * 60 * 60 * 1000 // Once per day
          });
        } catch (error) {
          console.error('Periodic sync registration failed:', error);
        }
      }
    })()
  );
});
```

---

## Performance Optimization

### 1. Image Optimization

Create image optimization utility:

```typescript
export function optimizeImage(url: string, width: number, quality = 80): string {
  // Use CDN or image optimization service
  return `https://your-cdn.com/optimize?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
}

// Lazy load images
export function LazyImage({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
}
```

### 2. Code Splitting

```tsx
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const Feed = lazy(() => import('./components/Feed'));
const Profile = lazy(() => import('./components/Profile'));
const Settings = lazy(() => import('./components/Settings'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

### 3. Bundle Size Optimization

Update `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@/components/ui'], // Your UI components
          'workbox': ['workbox-window', 'workbox-core']
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
})
```

---

## Testing & Deployment

### 1. Test Checklist

```bash
# Build production version
npm run build

# Preview production build
npm run preview
```

**Chrome DevTools Testing:**
1. Open DevTools → Application tab
2. Check Manifest (ensure all fields are correct)
3. Check Service Workers (should be active)
4. Check Storage → Cache Storage (verify caches)
5. Check Storage → IndexedDB (verify database)
6. Toggle offline mode → verify app still works

**Lighthouse Audit:**
1. Open DevTools → Lighthouse tab
2. Select "Progressive Web App" category
3. Run audit
4. Aim for 90+ score

### 2. PWA Testing Checklist

- [ ] App installs successfully on desktop and mobile
- [ ] App works offline
- [ ] Service worker updates correctly
- [ ] Push notifications work
- [ ] Background sync queues and syncs actions
- [ ] Images cache properly
- [ ] API responses cache appropriately
- [ ] Update prompt shows when new version available
- [ ] Share functionality works
- [ ] Badge updates correctly
- [ ] Lighthouse PWA score > 90

### 3. Deployment

**Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Netlify:**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

**Build Configuration:**
- Build command: `npm run build`
- Publish directory: `dist`
- Add `_headers` file for proper caching:

```
# _headers in public folder
/*
  Cache-Control: public, max-age=0, must-revalidate

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/manifest.webmanifest
  Cache-Control: public, max-age=0, must-revalidate

/sw.js
  Cache-Control: public, max-age=0, must-revalidate
```

---

## Production Checklist

### Pre-Launch

- [ ] HTTPS enabled (required for PWA)
- [ ] All icons generated (64x64, 192x192, 512x512, maskable)
- [ ] Manifest properly configured
- [ ] Service worker tested in production build
- [ ] Background sync tested
- [ ] Push notifications tested
- [ ] Offline functionality verified
- [ ] Install prompt tested on mobile and desktop
- [ ] Share functionality tested
- [ ] Performance metrics optimized (Core Web Vitals)
- [ ] Lighthouse PWA score > 90
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)

### Post-Launch Monitoring

- [ ] Monitor service worker update rate
- [ ] Track install conversion rate
- [ ] Monitor push notification engagement
- [ ] Track offline usage metrics
- [ ] Monitor cache hit rates
- [ ] Track background sync success rate
- [ ] Monitor bundle size
- [ ] Track Core Web Vitals in production

---

## Additional Resources

### Documentation
- [vite-plugin-pwa Official Docs](https://vite-pwa-org.netlify.app/)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev PWA Course](https://web.dev/learn/pwa/)

### Tools
- [PWA Asset Generator](https://github.com/vite-pwa/assets-generator)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Chrome DevTools PWA Panel](https://developer.chrome.com/docs/devtools/progressive-web-apps/)

### Example PWAs
- [Twitter/X Web](https://twitter.com) (mobile.twitter.com)
- [Elk - Mastodon Client](https://elk.zone/)
- [Squoosh - Image Compressor](https://squoosh.app/)

---

## Troubleshooting

### Service Worker Not Updating

```typescript
// Force update on page load
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    reg.update(); // Force check for updates
  });
}
```

### IndexedDB Quota Issues

```typescript
// Check quota
if ('storage' in navigator && 'estimate' in navigator.storage) {
  const { usage, quota } = await navigator.storage.estimate();
  console.log(`Using ${usage} of ${quota} bytes.`);
}
```

### Background Sync Not Working

- Verify HTTPS
- Check browser support (Chrome/Edge on Android)
- Test in production build (doesn't work in dev)
- Check service worker registration

---

## Summary

You now have a complete Twitter/X-level PWA with:

✅ **Offline-First Architecture** - IndexedDB + Service Worker caching
✅ **Background Sync** - Queue actions when offline
✅ **Push Notifications** - Real-time engagement
✅ **Installability** - Custom install prompts
✅ **Web Share** - Native sharing capabilities
✅ **Badging** - Unread count on app icon
✅ **Performance** - Optimized caching strategies
✅ **Auto-Updates** - Seamless version updates

Your React Vite app is now a production-grade PWA that rivals native apps! 🚀
