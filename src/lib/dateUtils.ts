/**
 * Global Date & Time Utilities
 * Enforces DD MMM YYYY & 24HR format (e.g., 04 APR 2026, 15:47)
 */

export const formatDate = (date: string | Date | number): string => {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(d).toUpperCase();
};

export const formatDateTime = (date: string | Date | number): string => {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";

    const datePart = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(d).toUpperCase();

    const timePart = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(d);

    return `${datePart}, ${timePart}`;
};
