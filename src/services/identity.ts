const KEY = 'mdc.displayName';

export function getDisplayName(): string {
  return localStorage.getItem(KEY) || '';
}

export function setDisplayName(name: string): void {
  localStorage.setItem(KEY, name);
}

export function promptDisplayNameIfMissing(): string {
  let name = getDisplayName();
  if (name) return name;
  // Synchronous prompt is acceptable for v1.
  const entered = window.prompt('What name should appear on your comments?', 'Anonymous');
  name = (entered || 'Anonymous').trim() || 'Anonymous';
  setDisplayName(name);
  return name;
}
