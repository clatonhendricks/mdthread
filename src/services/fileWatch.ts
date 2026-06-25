import { watch, type UnwatchFn } from '@tauri-apps/plugin-fs';

/**
 * Watch a single file for external changes. The callback fires when the file
 * is modified by something other than this app. Returns a stop fn.
 *
 * Note: filesystem watchers may fire multiple events for one save (write +
 * close, etc.), so the caller should debounce or guard against re-entry.
 */
export async function watchMarkdownFile(
  path: string,
  onChange: () => void
): Promise<UnwatchFn> {
  return await watch(path, () => onChange(), { recursive: false, delayMs: 250 });
}
