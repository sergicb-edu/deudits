/**
 * M5 — Persistència en cascada (IndexedDB -> localStorage -> Memòria RAM) i Cua de sincronització
 * amb reintents exponencials i jitter aleatori (RF-20, Proposta 2 acordada).
 */

import type { MecanoApiClient, SaveSessionResult } from '@contracts/api';
import type { LevelProgressRecord, SessionSummary, StudentSettings } from '@contracts/domain';

export interface PersistentKeyValueStore {
  readonly backendType: 'localStorage' | 'memory';
  getItem<T>(key: string): T | null;
  setItem<T>(key: string, value: T): void;
  removeItem(key: string): void;
}

/**
 * Crea un magatzem clau-valor que intenta usar localStorage i, si l'iframe de Chromebook
 * el bloqueja per política de privacitat, cau de forma transparent a memòria RAM.
 */
export function createCascadeStore(namespace = 'mecano_v1'): PersistentKeyValueStore {
  const memoryFallback = new Map<string, string>();
  let canUseLocalStorage = false;

  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      const probeKey = `${namespace}__probe__`;
      globalThis.localStorage.setItem(probeKey, '1');
      globalThis.localStorage.removeItem(probeKey);
      canUseLocalStorage = true;
    }
  } catch {
    canUseLocalStorage = false;
  }

  const fullKey = (k: string) => `${namespace}:${k}`;

  return {
    backendType: canUseLocalStorage ? 'localStorage' : 'memory',
    getItem<T>(key: string): T | null {
      try {
        const raw = canUseLocalStorage
          ? globalThis.localStorage.getItem(fullKey(key))
          : (memoryFallback.get(fullKey(key)) ?? null);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        return null;
      }
    },
    setItem<T>(key: string, value: T): void {
      const serialized = JSON.stringify(value);
      try {
        if (canUseLocalStorage) {
          globalThis.localStorage.setItem(fullKey(key), serialized);
          return;
        }
      } catch {
        // Fallback a memòria si la quota o els permisos fallen
      }
      memoryFallback.set(fullKey(key), serialized);
    },
    removeItem(key: string): void {
      try {
        if (canUseLocalStorage) {
          globalThis.localStorage.removeItem(fullKey(key));
        }
      } catch {
        // Ignora
      }
      memoryFallback.delete(fullKey(key));
    },
  };
}

export interface QueuedSessionItem {
  session: SessionSummary;
  attempts: number;
  nextRetryTimestamp: number;
  lastError?: string;
}

const QUEUE_STORAGE_KEY = 'pending_sessions_queue';
const PROGRESS_CACHE_KEY = 'student_progress_cache';
const SETTINGS_CACHE_KEY = 'student_settings_cache';

/**
 * Cua d'enviament amb persistència en cascada i reintents amb espera aleatòria (RF-20, T1.5, T2.3).
 */
export class SessionSyncQueue {
  private readonly store: PersistentKeyValueStore;
  private readonly api: MecanoApiClient;
  private flushing = false;

  constructor(api: MecanoApiClient, store: PersistentKeyValueStore = createCascadeStore()) {
    this.api = api;
    this.store = store;
  }

  getPendingQueue(): QueuedSessionItem[] {
    return this.store.getItem<QueuedSessionItem[]>(QUEUE_STORAGE_KEY) ?? [];
  }

  getPendingCount(): number {
    return this.getPendingQueue().length;
  }

  /**
   * Desa localment el progrés i preferències perquè persisteixin en recarregar (T1.5).
   */
  saveLocalProgressSnapshot(levelsProgress: Record<string, LevelProgressRecord>): void {
    this.store.setItem(PROGRESS_CACHE_KEY, levelsProgress);
  }

  loadLocalProgressSnapshot(): Record<string, LevelProgressRecord> | null {
    return this.store.getItem<Record<string, LevelProgressRecord>>(PROGRESS_CACHE_KEY);
  }

  saveLocalSettings(settings: StudentSettings): void {
    this.store.setItem(SETTINGS_CACHE_KEY, settings);
  }

  loadLocalSettings(): StudentSettings | null {
    return this.store.getItem<StudentSettings>(SETTINGS_CACHE_KEY);
  }

  /**
   * Encola una sessió (sense duplicar session_id) i intenta enviar-la immediatament.
   */
  async enqueueAndFlush(session: SessionSummary): Promise<{
    sentNow: boolean;
    result?: SaveSessionResult;
    pendingCount: number;
  }> {
    const queue = this.getPendingQueue();
    const exists = queue.some((item) => item.session.session_id === session.session_id);
    if (!exists) {
      queue.push({
        session,
        attempts: 0,
        nextRetryTimestamp: 0,
      });
      this.store.setItem(QUEUE_STORAGE_KEY, queue);
    }

    const flushResult = await this.flush(true);
    const matchingResult = flushResult.resultsBySessionId.get(session.session_id);

    return {
      sentNow: Boolean(matchingResult),
      result: matchingResult,
      pendingCount: this.getPendingCount(),
    };
  }

  /**
   * Envia totes les sessions pendents que ja hagin complert el seu temps d'espera.
   */
  async flush(forceNow = false): Promise<{
    sentCount: number;
    remainingCount: number;
    resultsBySessionId: Map<string, SaveSessionResult>;
  }> {
    if (this.flushing) {
      return {
        sentCount: 0,
        remainingCount: this.getPendingCount(),
        resultsBySessionId: new Map(),
      };
    }

    this.flushing = true;
    const resultsBySessionId = new Map<string, SaveSessionResult>();
    let sentCount = 0;

    try {
      const queue = this.getPendingQueue();
      const remaining: QueuedSessionItem[] = [];
      const now = Date.now();

      for (const item of queue) {
        if (!forceNow && item.nextRetryTimestamp > now) {
          remaining.push(item);
          continue;
        }

        const res = await this.api.saveSession(item.session);
        if (res.ok && res.data) {
          sentCount++;
          resultsBySessionId.set(item.session.session_id, res.data);
        } else {
          const attempts = item.attempts + 1;
          // Backoff exponencial (2s, 4s, 8s, max 60s) + jitter aleatori (0..1000ms) (RF-20)
          const baseDelayMs = Math.min(60_000, 1000 * Math.pow(2, attempts));
          const jitterMs = Math.floor(Math.random() * 1000);
          remaining.push({
            session: item.session,
            attempts,
            nextRetryTimestamp: now + baseDelayMs + jitterMs,
            lastError: res.error?.message ?? 'Error temporal de xarxa',
          });
        }
      }

      this.store.setItem(QUEUE_STORAGE_KEY, remaining);
      return {
        sentCount,
        remainingCount: remaining.length,
        resultsBySessionId,
      };
    } finally {
      this.flushing = false;
    }
  }
}
