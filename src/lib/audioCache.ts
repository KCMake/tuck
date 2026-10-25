import type { Story } from '../../shared/types';

/** Tonight's approved story and its audio, one MP3 clip per paragraph. */
export interface PreparedStory {
  story: Story;
  voiceId: string;
  clips: Blob[];
  /** Epoch milliseconds. */
  preparedAt: number;
}

const DB_NAME = 'tuck-audio';
const STORE = 'prepared';
const KEY = 'tonight';

// IndexedDB keeps the audio across reloads so kid mode works offline. If the
// browser blocks it, this copy keeps things working for the current visit.
let memory: PreparedStory | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function savePrepared(prepared: PreparedStory): Promise<void> {
  memory = prepared;
  try {
    await run('readwrite', (store) => store.put(prepared, KEY));
  } catch (err) {
    console.warn('[audioCache] kept in memory only', err);
  }
}

export async function loadPrepared(): Promise<PreparedStory | null> {
  if (memory) return memory;
  try {
    memory = ((await run('readonly', (store) => store.get(KEY))) as PreparedStory | undefined) ?? null;
  } catch (err) {
    console.warn('[audioCache] could not read', err);
  }
  return memory;
}

export async function clearPrepared(): Promise<void> {
  memory = null;
  try {
    await run('readwrite', (store) => store.delete(KEY));
  } catch (err) {
    console.warn('[audioCache] could not clear', err);
  }
}
