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
 * Safe localStorage wrapper to prevent crashes in private/restricted browsers
 */
export const safeStorage = {
    getItem: (key: string): string | null => {
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                return window.localStorage.getItem(key);
            }
        } catch (e) {
            console.error("[AUTH] localStorage.getItem failed:", e);
        }
        return null;
    },
    setItem: (key: string, value: string): void => {
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                window.localStorage.setItem(key, value);
            }
        } catch (e) {
            console.error("[AUTH] localStorage.setItem failed:", e);
        }
    }
};
