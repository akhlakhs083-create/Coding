/**
 * Safe Browser Local Storage Wrapper for HindiScript V1.5
 * Handles persistence, JSON serialization, quota management, and safe fallbacks.
 */

const STORAGE_PREFIX = 'hindi_studio_storage:';

class SafeStorageManager {
  private memoryFallback = new Map<string, any>();

  private isLocalStorageAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const testKey = '__hindi_storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save a key-value pair to persistent storage
   */
  public saveData(key: string, value: any): { success: boolean; key: string; value: any; error?: string } {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      return { success: false, key: '', value, error: 'कुंजी खाली नहीं हो सकती।' };
    }

    // Always keep memory fallback in sync
    this.memoryFallback.set(trimmedKey, value);

    if (this.isLocalStorageAvailable()) {
      try {
        const serialized = JSON.stringify(value);
        window.localStorage.setItem(STORAGE_PREFIX + trimmedKey, serialized);
        return { success: true, key: trimmedKey, value };
      } catch (err: any) {
        return { success: true, key: trimmedKey, value, error: `स्थानीय संग्रहण चेतावनी: ${err.message}` };
      }
    }

    return { success: true, key: trimmedKey, value };
  }

  /**
   * Check if a key exists in storage
   */
  public hasData(key: string): boolean {
    const trimmedKey = key.trim();
    if (!trimmedKey) return false;

    if (this.isLocalStorageAvailable()) {
      try {
        if (window.localStorage.getItem(STORAGE_PREFIX + trimmedKey) !== null) {
          return true;
        }
      } catch {
        // fallback
      }
    }

    return this.memoryFallback.has(trimmedKey);
  }

  /**
   * Load a value by key from persistent storage
   */
  public loadData(key: string): { found: boolean; key: string; value?: any; error?: string } {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      return { found: false, key: '', error: 'कुंजी खाली नहीं हो सकती।' };
    }

    if (this.isLocalStorageAvailable()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_PREFIX + trimmedKey);
        if (raw !== null) {
          try {
            const parsed = JSON.parse(raw);
            this.memoryFallback.set(trimmedKey, parsed);
            return { found: true, key: trimmedKey, value: parsed };
          } catch {
            this.memoryFallback.set(trimmedKey, raw);
            return { found: true, key: trimmedKey, value: raw };
          }
        }
      } catch {
        // fallback
      }
    }

    if (this.memoryFallback.has(trimmedKey)) {
      return { found: true, key: trimmedKey, value: this.memoryFallback.get(trimmedKey) };
    }

    return { found: false, key: trimmedKey };
  }

  /**
   * Delete a key from persistent storage
   */
  public deleteData(key: string): { found: boolean; key: string; error?: string } {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      return { found: false, key: '', error: 'कुंजी खाली नहीं हो सकती।' };
    }

    let found = false;

    if (this.isLocalStorageAvailable()) {
      try {
        if (window.localStorage.getItem(STORAGE_PREFIX + trimmedKey) !== null) {
          window.localStorage.removeItem(STORAGE_PREFIX + trimmedKey);
          found = true;
        }
      } catch {
        // fallback
      }
    }

    if (this.memoryFallback.has(trimmedKey)) {
      this.memoryFallback.delete(trimmedKey);
      found = true;
    }

    return { found, key: trimmedKey };
  }

  /**
   * Clear all HindiStudio saved keys
   */
  public clearAllStudioData(): void {
    this.memoryFallback.clear();
    if (this.isLocalStorageAvailable()) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        for (const k of keysToRemove) {
          window.localStorage.removeItem(k);
        }
      } catch {
        // ignore
      }
    }
  }

  /**
   * List all stored keys (without the prefix)
   */
  public listAllKeys(): string[] {
    const keys = new Set<string>();
    for (const k of this.memoryFallback.keys()) {
      keys.add(k);
    }
    if (this.isLocalStorageAvailable()) {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) {
            keys.add(k.slice(STORAGE_PREFIX.length));
          }
        }
      } catch {
        // ignore
      }
    }
    return Array.from(keys);
  }
}

export const safeStorage = new SafeStorageManager();
