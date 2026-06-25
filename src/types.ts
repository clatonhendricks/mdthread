export type ViewMode = 'edit' | 'split' | 'preview';

export interface TextAnchor {
  quote: string;
  prefix: string;
  suffix: string;
}

export interface CommentReply {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  anchor: TextAnchor;
  author: string;
  body: string;
  createdAt: string;
  resolved: boolean;
  orphaned?: boolean;
  thread: CommentReply[];
}

export interface SidecarDoc {
  version: 1;
  documentHash?: string;
  comments: Comment[];
}

export function emptySidecar(): SidecarDoc {
  return { version: 1, comments: [] };
}
