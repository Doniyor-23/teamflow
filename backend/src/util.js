export const E = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });
export const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
