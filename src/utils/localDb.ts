import { SavedProfile, SwitchConfigState } from '../types/cisco';

const DB_NAME = 'CiscoConfigGeneratorDB';
const DB_VERSION = 1;
const STORE_WORKSPACE = 'workspace';
const STORE_PROFILES = 'profiles';
const WORKSPACE_KEY = 'current_switch_config';

const LEGACY_STORAGE_KEYS = [
  'ciscosaz_current_config_v6',
  'ciscosaz_current_config_v5',
  'ciscosaz_current_config_v4',
  'ciscosaz_current_config_v3',
  'ciscosaz_current_config_v2',
  'ciscosaz_current_config_v1',
];
const LEGACY_PROFILES_KEY = 'ciscosaz_saved_profiles_v1';
const FALLBACK_WORKSPACE_KEY = 'ccg_localdb_workspace_v1';
const FALLBACK_PROFILES_KEY = 'ccg_localdb_profiles_v1';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_WORKSPACE)) {
        db.createObjectStore(STORE_WORKSPACE);
      }
      if (!db.objectStoreNames.contains(STORE_PROFILES)) {
        const profileStore = db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
        profileStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = action(store);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

export async function loadCurrentWorkspace(): Promise<SwitchConfigState | null> {
  try {
    const record = await withStore<SwitchConfigState | undefined>(
      STORE_WORKSPACE,
      'readonly',
      (store) => store.get(WORKSPACE_KEY)
    );
    if (record) return record;

    // Migrate from legacy localStorage if present
    for (const key of LEGACY_STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as SwitchConfigState;
        await saveCurrentWorkspace(parsed);
        return parsed;
      }
    }
    return null;
  } catch {
    try {
      const fallback = localStorage.getItem(FALLBACK_WORKSPACE_KEY);
      if (fallback) return JSON.parse(fallback) as SwitchConfigState;
      for (const key of LEGACY_STORAGE_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw) as SwitchConfigState;
      }
    } catch {
      // ignore
    }
    return null;
  }
}

export async function saveCurrentWorkspace(config: SwitchConfigState): Promise<void> {
  try {
    await withStore(STORE_WORKSPACE, 'readwrite', (store) => store.put(config, WORKSPACE_KEY));
  } catch {
    try {
      localStorage.setItem(FALLBACK_WORKSPACE_KEY, JSON.stringify(config));
    } catch {
      // ignore quota error
    }
  }
}

export async function loadAllProfiles(): Promise<SavedProfile[]> {
  try {
    const db = await openDatabase();
    const profiles = await new Promise<SavedProfile[]>((resolve, reject) => {
      const tx = db.transaction(STORE_PROFILES, 'readonly');
      const store = tx.objectStore(STORE_PROFILES);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as SavedProfile[]) ?? []);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });

    if (profiles.length > 0) {
      return profiles.sort((a, b) => (a.id < b.id ? 1 : -1));
    }

    // Migrate legacy profiles from localStorage
    const legacyRaw = localStorage.getItem(LEGACY_PROFILES_KEY);
    if (legacyRaw) {
      const legacyProfiles = JSON.parse(legacyRaw) as SavedProfile[];
      if (Array.isArray(legacyProfiles) && legacyProfiles.length > 0) {
        for (const prof of legacyProfiles) {
          await saveProfileToDb(prof);
        }
        return legacyProfiles;
      }
    }

    return [];
  } catch {
    try {
      const raw =
        localStorage.getItem(FALLBACK_PROFILES_KEY) ?? localStorage.getItem(LEGACY_PROFILES_KEY);
      if (raw) return JSON.parse(raw) as SavedProfile[];
    } catch {
      // ignore
    }
    return [];
  }
}

export async function saveProfileToDb(profile: SavedProfile): Promise<void> {
  try {
    await withStore(STORE_PROFILES, 'readwrite', (store) => store.put(profile));
  } catch {
    try {
      const existing = await loadAllProfiles();
      const filtered = existing.filter((p) => p.id !== profile.id);
      localStorage.setItem(FALLBACK_PROFILES_KEY, JSON.stringify([profile, ...filtered]));
    } catch {
      // ignore
    }
  }
}

export async function deleteProfileFromDb(id: string): Promise<void> {
  try {
    await withStore(STORE_PROFILES, 'readwrite', (store) => store.delete(id));
  } catch {
    try {
      const existing = await loadAllProfiles();
      localStorage.setItem(
        FALLBACK_PROFILES_KEY,
        JSON.stringify(existing.filter((p) => p.id !== id))
      );
    } catch {
      // ignore
    }
  }
}

export async function importProfilesToDb(profiles: SavedProfile[]): Promise<void> {
  for (const prof of profiles) {
    if (prof && prof.id && prof.name && prof.config) {
      await saveProfileToDb(prof);
    }
  }
}
