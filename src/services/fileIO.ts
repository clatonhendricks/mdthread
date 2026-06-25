import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { emptySidecar, type SidecarDoc } from '../types';

export function sidecarPathFor(mdPath: string): string {
  return `${mdPath}.comments.json`;
}

export async function pickMarkdownFile(): Promise<string | null> {
  const picked = await openDialog({
    multiple: false,
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdx', 'txt'] }],
  });
  return typeof picked === 'string' ? picked : null;
}

export async function pickSaveAsPath(defaultName = 'untitled.md'): Promise<string | null> {
  const picked = await saveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
  });
  return typeof picked === 'string' ? picked : null;
}

export async function readMarkdown(path: string): Promise<string> {
  return await readTextFile(path);
}

export async function writeMarkdown(path: string, content: string): Promise<void> {
  await writeTextFile(path, content);
}

export async function loadSidecar(mdPath: string): Promise<SidecarDoc> {
  const sPath = sidecarPathFor(mdPath);
  if (!(await exists(sPath))) return emptySidecar();
  try {
    const raw = await readTextFile(sPath);
    const parsed = JSON.parse(raw) as SidecarDoc;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.comments)) {
      console.warn('Sidecar has unexpected shape, ignoring:', sPath);
      return emptySidecar();
    }
    return parsed;
  } catch (err) {
    console.error('Failed to parse sidecar:', err);
    return emptySidecar();
  }
}

export async function saveSidecar(mdPath: string, doc: SidecarDoc): Promise<void> {
  const sPath = sidecarPathFor(mdPath);
  await writeTextFile(sPath, JSON.stringify(doc, null, 2));
}

export function basename(path: string): string {
  const m = path.match(/[^\\/]+$/);
  return m ? m[0] : path;
}
