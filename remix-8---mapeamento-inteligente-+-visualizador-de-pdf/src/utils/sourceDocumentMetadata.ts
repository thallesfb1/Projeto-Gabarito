import type { SourceDocument } from '../types';
import { AI_MIME_TYPES, MAX_AI_FILE_BYTES } from './aiExtraction';

const pathPattern = /^[a-f\d-]{36}\/[\w-]{1,160}\/[a-f\d-]{36}\.(pdf|png|jpg|webp)$/i;
export function sanitizeSourceDocuments(value: unknown): SourceDocument[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.slice(0, 100).flatMap(item => {
    if (!item || typeof item.path !== 'string' || !pathPattern.test(item.path) || seen.has(item.path)
      || item.ownerId !== item.path.split('/')[0] || !AI_MIME_TYPES.includes(item.mime)
      || !Number.isInteger(item.size) || item.size < 1 || item.size > MAX_AI_FILE_BYTES
      || typeof item.name !== 'string' || !['exam', 'key'].includes(item.kind)) return [];
    seen.add(item.path);
    return [{ path: item.path, ownerId: item.ownerId, name: item.name.slice(0, 240), mime: item.mime,
      size: item.size, kind: item.kind, createdAt: typeof item.createdAt === 'string' ? item.createdAt : '' }];
  });
}

