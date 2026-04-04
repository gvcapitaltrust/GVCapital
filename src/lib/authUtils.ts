/**
 * Robust UUID generator with fallback for older browsers and non-secure contexts
 * where crypto.randomUUID() might be unavailable.
 */
export function generateUUID(): string {
    if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
        try {
            return window.crypto.randomUUID();
        } catch (e) {
            console.warn("[AUTH] crypto.randomUUID failed, using fallback.", e);
        }
    }

    // Fallback: Math-based UUID v4 generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Safe localStorage wrapper to prevent crashes in private/restricted browsers.
 * Includes a persistence check to help AuthProvider decide if it should enforce session limits.
 */
export const safeStorage = {
    isPersistent: (): boolean => {
        try {
            if (typeof window === "undefined" || !window.localStorage) return false;
            const testKey = "__gv_storage_test__";
            window.localStorage.setItem(testKey, "1");
            const result = window.localStorage.getItem(testKey) === "1";
            window.localStorage.removeItem(testKey);
            return result;
        } catch (e) {
            return false;
        }
    },
    getItem: (key: string): string | null => {
        try {
            if (typeof window !== "undefined") {
                // Try localStorage first
                if (window.localStorage) {
                    const val = window.localStorage.getItem(key);
                    if (val) return val;
                }
                // Fallback to sessionStorage for same-tab persistence if localStorage is blocked
                if (window.sessionStorage) {
                    return window.sessionStorage.getItem(key);
                }
            }
        } catch (e) {
            console.error("[AUTH] storage.getItem failed:", e);
        }
        return null;
    },
    setItem: (key: string, value: string): void => {
        try {
            if (typeof window !== "undefined") {
                if (window.localStorage) {
                    window.localStorage.setItem(key, value);
                }
                if (window.sessionStorage) {
                    window.sessionStorage.setItem(key, value);
                }
            }
        } catch (e) {
            console.error("[AUTH] storage.setItem failed:", e);
        }
    }
};
