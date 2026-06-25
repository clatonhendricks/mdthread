const KEY = 'mdc.recentFiles';
const MAX = 10;

export function getRecentFiles(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

export function pushRecentFile(path: string): string[] {
  const existing = getRecentFiles().filter((p) => p !== path);
  const next = [path, ...existing].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
