/**
 * Maps a browser Selection inside the PreviewPane back to character offsets in
 * the raw markdown source.
 *
 * Strategy:
 *   - Find the nearest ancestor element that carries data-md-start/data-md-end.
 *     That block bounds where the selection came from in the markdown source.
 *   - Get the selection's plain text (what the user actually highlighted).
 *   - Search that exact substring within the source slice for the block.
 *     Rendered text often differs from raw markdown (formatting chars stripped,
 *     line breaks collapsed), so we try progressively looser matches.
 *   - Return absolute start/end offsets in the full markdown source, or null.
 */

export interface SelectionRange {
  start: number;
  end: number;
  rawText: string; // the source markdown substring
}

export function resolveSelectionToSource(
  selection: Selection,
  source: string
): SelectionRange | null {
  if (!selection || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!range) return null;
  const selectedText = selection.toString().trim();
  if (!selectedText) return null;

  const block = findAnchoredAncestor(range.commonAncestorContainer);
  let blockStart = 0;
  let blockEnd = source.length;
  if (block) {
    const s = block.getAttribute('data-md-start');
    const e = block.getAttribute('data-md-end');
    if (s && e) {
      blockStart = parseInt(s, 10);
      blockEnd = parseInt(e, 10);
    }
  }
  const slice = source.slice(blockStart, blockEnd);

  // 1) Exact match within block
  let rel = slice.indexOf(selectedText);
  // 2) Whitespace-normalized match (collapse runs of whitespace)
  if (rel === -1) {
    rel = indexOfFuzzyWhitespace(slice, selectedText);
  }
  // 3) Wider: search whole document
  if (rel === -1) {
    rel = source.indexOf(selectedText) - blockStart;
    if (rel < 0) rel = -1;
  }
  if (rel === -1) return null;

  // The matched substring length may differ from selectedText.length when we
  // did whitespace-fuzzy matching, so recover the actual span.
  const matched = matchSpan(slice, rel, selectedText);
  const start = blockStart + matched.start;
  const end = blockStart + matched.end;
  return { start, end, rawText: source.slice(start, end) };
}

function findAnchoredAncestor(node: Node): HTMLElement | null {
  let cur: Node | null = node;
  while (cur) {
    if (cur instanceof HTMLElement && cur.hasAttribute('data-md-start')) {
      return cur;
    }
    cur = cur.parentNode;
  }
  return null;
}

function indexOfFuzzyWhitespace(haystack: string, needle: string): number {
  const normalize = (s: string) => s.replace(/\s+/g, ' ');
  const nHay = normalize(haystack);
  const nNeedle = normalize(needle);
  const idxN = nHay.indexOf(nNeedle);
  if (idxN === -1) return -1;
  // Map normalized index back to original-string index.
  let original = 0;
  let normalized = 0;
  while (normalized < idxN && original < haystack.length) {
    if (/\s/.test(haystack[original])) {
      // consume run of whitespace in original; advance normalized by 1
      while (original < haystack.length && /\s/.test(haystack[original])) original++;
      normalized++;
    } else {
      original++;
      normalized++;
    }
  }
  return original;
}

function matchSpan(slice: string, relStart: number, selectedText: string): { start: number; end: number } {
  // Try exact length first
  const exactEnd = relStart + selectedText.length;
  if (slice.slice(relStart, exactEnd).replace(/\s+/g, ' ') === selectedText.replace(/\s+/g, ' ')) {
    return { start: relStart, end: exactEnd };
  }
  // Walk forward, comparing normalized strings to find the matching end.
  const targetNorm = selectedText.replace(/\s+/g, ' ').trim();
  for (let len = selectedText.length; len <= selectedText.length + 8 && relStart + len <= slice.length; len++) {
    const candidate = slice.slice(relStart, relStart + len).replace(/\s+/g, ' ').trim();
    if (candidate === targetNorm) return { start: relStart, end: relStart + len };
  }
  return { start: relStart, end: exactEnd };
}
