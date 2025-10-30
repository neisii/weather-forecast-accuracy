/**
 * Storage utility for browser and Node.js compatibility
 *
 * In browser: uses localStorage
 * In Node.js: uses in-memory Map
 */

// In-memory storage for Node.js environment
const memoryStorage = new Map<string, string>();

/**
 * Check if localStorage is available (browser environment)
 */
function isLocalStorageAvailable(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

/**
 * Get item from storage (localStorage or memory)
 */
export function getStorageItem(key: string): string | null {
  if (isLocalStorageAvailable()) {
    return localStorage.getItem(key);
  }
  return memoryStorage.get(key) || null;
}

/**
 * Set item to storage (localStorage or memory)
 */
export function setStorageItem(key: string, value: string): void {
  if (isLocalStorageAvailable()) {
    localStorage.setItem(key, value);
  } else {
    memoryStorage.set(key, value);
  }
}

/**
 * Remove item from storage (localStorage or memory)
 */
export function removeStorageItem(key: string): void {
  if (isLocalStorageAvailable()) {
    localStorage.removeItem(key);
  } else {
    memoryStorage.delete(key);
  }
}

/**
 * Clear all storage (localStorage or memory)
 */
export function clearStorage(): void {
  if (isLocalStorageAvailable()) {
    localStorage.clear();
  } else {
    memoryStorage.clear();
  }
}
