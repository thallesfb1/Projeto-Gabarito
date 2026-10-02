import type { SourceDocument } from '../types';
import { MAX_AI_FILE_BYTES, validateAIFile } from './aiExtraction';
import { supabase } from './supabase';
import { sanitizeSourceDocuments } from './sourceDocumentMetadata';
export { sanitizeSourceDocuments } from './sourceDocumentMetadata';

export const ORIGINALS_BUCKET = 'prova-originais';

export async function uploadOriginalFile(file: File, proofId: string, kind: 'exam' | 'key'): Promise<SourceDocument> {
  validateAIFile(file, kind);
  if (!supabase) throw new Error('Entre na versão web para salvar o arquivo na sua conta.');
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !data.session) throw new Error('Entre novamente para salvar o arquivo original.');
  if (!/^[\w-]{1,160}$/.test(proofId)) throw new Error('Identificação da prova inválida.');
  const ownerId = data.session.user.id;
  if (!/^[a-f\d-]{36}$/i.test(ownerId)) throw new Error('Identificação da conta inválida.');
  const extension = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type];
  const path = `${ownerId}/${proofId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(ORIGINALS_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    if (/bucket.*not found/i.test(error.message)) throw new Error('O armazenamento de originais ainda não está configurado. O responsável pelo site precisa ativá-lo no Supabase. Sua leitura foi mantida nesta tela.');
    throw new Error('Não foi possível salvar o arquivo original na sua conta. Confira sua conexão e tente novamente. Sua leitura foi mantida nesta tela.');
  }
  return { path, ownerId, name: file.name.slice(0, 240), mime: file.type, size: file.size, kind, createdAt: new Date().toISOString() };
}

export async function downloadOriginalFile(document: SourceDocument): Promise<Blob> {
  const safe = sanitizeSourceDocuments([document])[0];
  if (!safe || !supabase) throw new Error('Arquivo original indisponível nesta versão.');
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !data.session || safe.ownerId !== data.session.user.id) throw new Error('Entre na conta que importou este arquivo para consultar o original.');
  const { data: blob, error } = await supabase.storage.from(ORIGINALS_BUCKET).download(safe.path);
  if (error || !blob) throw new Error('Não foi possível abrir o original. Confira sua conexão e o acesso ao arquivo.');
  if (blob.size > MAX_AI_FILE_BYTES) throw new Error('Arquivo original maior que o limite permitido.');
  return new Blob([blob], { type: safe.mime });
}
