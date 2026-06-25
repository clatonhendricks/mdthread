# MDThread

> A desktop markdown viewer and editor with **inline threaded commenting**. Your markdown stays a plain `.md` file. Comments live alongside it in a portable sidecar JSON.

Markdown has become the lingua franca for notes, LLM output, design docs, and lightweight knowledge bases — it's open, diff-friendly, and every tool reads it. But there's never been a good way to **comment** on a `.md` file the way you can on a Google Doc or a PR. MDThread fixes that without locking you into a proprietary format.

## Why a sidecar?

For every `notes.md` you open, MDThread reads/writes a `notes.md.comments.json` next to it. Two files travel together; the markdown stays pristine. Share both and your reviewer sees the conversation; share only the `.md` and you've shared a plain markdown file.

```jsonc
// notes.md.comments.json
{
  "version": 1,
  "comments": [
    {
      "id": "…",
      "anchor": { "quote": "selected text", "prefix": "…", "suffix": "…" },
      "author": "Clayton",
      "createdAt": "2026-06-25T…",
      "resolved": false,
      "thread": [ { "id": "…", "author": "…", "body": "reply", "createdAt": "…" } ]
    }
  ]
}
```

## Features (v1)

- Open any local `.md` / `.markdown` / `.mdx` / `.txt` file (file picker or drag-and-drop)
- GFM rendering: tables, task lists, fenced code with syntax highlighting
- **Edit the raw markdown** in a split-pane CodeMirror 6 editor with live preview
- Select text in the preview → add a comment
- Threaded replies, resolve / reopen, delete
- **Re-anchors comments after every save** using quote + prefix/suffix matching with fuzzy fallback (`diff-match-patch`)
- Orphaned comments (anchors that can't be relocated) surface in a dedicated section with **re-anchor** or **delete** actions
- External-change detection: prompts to reload when the file is modified outside the app
- Recent files menu
- Display-name identity (no accounts, no server)

## Tech stack

- **Tauri 2** (Rust shell) + **React 19** + **TypeScript** (Vite)
- **CodeMirror 6** for the markdown editor
- **react-markdown** + **remark-gfm** + **rehype-highlight** for preview
- Custom rehype plugin emits `data-md-start` / `data-md-end` so preview selections map back to the markdown source for accurate anchoring

## Running locally

Prerequisites:
- Node.js 20+
- Rust (stable) — install via [rustup](https://rustup.rs)
- On Windows: MSVC C++ Build Tools (ships with Visual Studio or "Build Tools for Visual Studio")
- On macOS: Xcode Command Line Tools
- On Linux: see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

```sh
git clone https://github.com/clatonhendricks/mdthread.git
cd mdthread
npm install
npm run tauri dev     # development window with HMR
npm run tauri build   # produces installers in src-tauri/target/release/bundle/
```

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + O` | Open file |
| `Ctrl/Cmd + S` | Save (writes `.md` + sidecar; re-anchors comments) |
| `Ctrl/Cmd + /` | Add comment from current selection |
| `Esc` | Close composer / cancel re-anchor |
| `Ctrl/Cmd + Enter` | Submit comment / reply (when composer is focused) |

## How anchoring works

1. When you create a comment, MDThread captures the **selected quote** plus ~32 characters of surrounding **prefix** and **suffix** from the raw markdown source (not the rendered HTML). These three strings together form the anchor.
2. On every save and reload, each anchor is re-located:
   - **Exact match.** Search for the quote in the current source; if a single occurrence exists, use it. If multiple occur, score each by overlap with the saved prefix/suffix.
   - **Fuzzy fallback.** Use `diff-match-patch` to find an approximate location when the text has been lightly edited.
   - **Orphan.** If both fail, mark the comment orphaned. The original quote is preserved so you can manually re-anchor or delete.
3. This is the W3C Web Annotation [TextQuoteSelector](https://www.w3.org/TR/annotation-model/#text-quote-selector) model — battle-tested by Hypothes.is and others.

## Roadmap

- [ ] WYSIWYG-style formatting toolbar (bold, italic, link)
- [ ] @mentions, reactions
- [ ] Export annotated markdown to PDF / HTML
- [ ] Optional cloud sync (Git repo, Supabase) for "public" commenting
- [ ] Real-time multi-user editing
- [ ] VS Code companion extension

## License

MIT
