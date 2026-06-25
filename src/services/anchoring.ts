import DiffMatchPatch from 'diff-match-patch';
import type { TextAnchor } from '../types';

const CONTEXT_LEN = 32;
const FUZZY_THRESHOLD = 0.5;

const dmp = new DiffMatchPatch();
dmp.Match_Threshold = FUZZY_THRESHOLD;
dmp.Match_Distance = 10000;

/**
 * Build an anchor capturing the quoted text plus surrounding context.
 * @param source full markdown source
 * @param start  character offset of the quote in source
 * @param end    character offset (exclusive) of the quote in source
 */
export function createAnchor(source: string, start: number, end: number): TextAnchor {
  const quote = source.slice(start, end);
  const prefix = source.slice(Math.max(0, start - CONTEXT_LEN), start);
  const suffix = source.slice(end, Math.min(source.length, end + CONTEXT_LEN));
  return { quote, prefix, suffix };
}

export interface LocateResult {
  start: number;
  end: number;
  fuzzy: boolean;
}

/**
 * Try to locate an anchor in the (possibly edited) source.
 * Strategy:
 *   1. Exact occurrences of quote; disambiguate by surrounding prefix/suffix.
 *   2. Fuzzy match of (prefix + quote + suffix) via diff-match-patch.
 *   3. null => orphan.
 */
export function locateAnchor(source: string, anchor: TextAnchor): LocateResult | null {
  const { quote, prefix, suffix } = anchor;
  if (!quote) return null;

  // 1) Exact occurrences
  const occurrences: number[] = [];
  let idx = source.indexOf(quote);
  while (idx !== -1) {
    occurrences.push(idx);
    idx = source.indexOf(quote, idx + 1);
  }

  if (occurrences.length === 1) {
    return { start: occurrences[0], end: occurrences[0] + quote.length, fuzzy: false };
  }
  if (occurrences.length > 1) {
    // Score each by prefix/suffix overlap
    let best = -1;
    let bestScore = -1;
    for (const o of occurrences) {
      const beforeStart = Math.max(0, o - prefix.length);
      const localPrefix = source.slice(beforeStart, o);
      const afterEnd = Math.min(source.length, o + quote.length + suffix.length);
      const localSuffix = source.slice(o + quote.length, afterEnd);
      const score = longestCommonSuffix(prefix, localPrefix) + longestCommonPrefix(suffix, localSuffix);
      if (score > bestScore) {
        bestScore = score;
        best = o;
      }
    }
    return { start: best, end: best + quote.length, fuzzy: false };
  }

  // 2) Fuzzy fallback
  // Anchor a search around the rough expected location using prefix
  const expectedLoc = prefix ? source.indexOf(prefix.slice(-Math.min(prefix.length, 16))) : 0;
  const searchTarget = quote;
  const loc = dmp.match_main(source, searchTarget, expectedLoc >= 0 ? expectedLoc : 0);
  if (loc !== -1) {
    return { start: loc, end: loc + quote.length, fuzzy: true };
  }
  return null;
}

function longestCommonSuffix(a: string, b: string): number {
  let i = 0;
  const max = Math.min(a.length, b.length);
  while (i < max && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i;
}

function longestCommonPrefix(a: string, b: string): number {
  let i = 0;
  const max = Math.min(a.length, b.length);
  while (i < max && a[i] === b[i]) i++;
  return i;
}
