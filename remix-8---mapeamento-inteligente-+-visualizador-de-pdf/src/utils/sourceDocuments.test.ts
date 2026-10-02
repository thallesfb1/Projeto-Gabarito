import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: vi.fn(), upload: vi.fn(), download: vi.fn(), bucket: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { auth: { getSession: mocks.session }, storage: { from: mocks.bucket } } }));
import { downloadOriginalFile, sanitizeSourceDocuments, uploadOriginalFile } from './sourceDocuments';
import { sanitizeSimulado, validateAndParseBackup } from './provasManager';
const ownerId = '11111111-1111-4111-8111-111111111111';
const original = { path: `${ownerId}/prova-1/22222222-2222-4222-8222-222222222222.png`, ownerId, name: 'Gabarito.png', mime: 'image/png', size: 8, kind: 'key' as const, createdAt: '2026-10-02T00:00:00Z' };
beforeEach(() => {
  vi.clearAllMocks(); mocks.session.mockResolvedValue({ data: { session: { user: { id: ownerId } } }, error: null });
  mocks.bucket.mockReturnValue({ upload: mocks.upload, download: mocks.download });
  mocks.upload.mockResolvedValue({ error: null }); mocks.download.mockResolvedValue({ data: new Blob(['image']), error: null });
});
describe('originais privados', () => {
  it('salva na pasta da conta, sem sobrescrever, e retorna só metadados', async () => {
    const file = new File(['%PDF-1.7'], 'Prova.pdf', { type: 'application/pdf' });
    const result = await uploadOriginalFile(file, 'prova-1', 'exam');
    expect(mocks.bucket).toHaveBeenCalledWith('prova-originais');
    expect(mocks.upload).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^${ownerId}/prova-1/[a-f\\d-]{36}\\.pdf$`)), file, { contentType: 'application/pdf', upsert: false });
    expect(sanitizeSourceDocuments([result])).toEqual([result]); expect(Object.keys(result)).not.toContain('data');
  });
  it('recusa upload sem sessão e caminhos de prova inválidos', async () => {
    const file = new File(['image'], 'Gabarito.png', { type: 'image/png' });
    await expect(uploadOriginalFile(file, '../outra-conta', 'key')).rejects.toThrow('Identificação');
    mocks.session.mockResolvedValue({ data: { session: null }, error: null });
    await expect(uploadOriginalFile(file, 'prova-1', 'key')).rejects.toThrow('Entre novamente'); expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('não declara sucesso quando o bucket está ausente ou o upload falha', async () => {
    const file = new File(['image'], 'Gabarito.png', { type: 'image/png' });
    mocks.upload.mockResolvedValueOnce({ error: { message: 'Bucket not found' } });
    await expect(uploadOriginalFile(file, 'prova-1', 'key')).rejects.toThrow('ainda não está configurado');
    mocks.upload.mockResolvedValueOnce({ error: { message: 'private credential in upstream error' } });
    await expect(uploadOriginalFile(file, 'prova-1', 'key')).rejects.toThrow('Sua leitura foi mantida');
  });
  it('elimina caminhos externos, donos divergentes, tamanhos inválidos e duplicatas de backups', () => {
    expect(sanitizeSourceDocuments([original, original, { ...original, path: 'https://example.com/file.png' }, { ...original, ownerId: 'another' }, { ...original, size: 20000000 }, { ...original, path: `${ownerId}/../image.png` }])).toEqual([original]);
  });
  it('preserva as referências ao importar uma prova válida', () => {
    const store = validateAndParseBackup(JSON.stringify({ activeId: 'prova-1', provas: [{ id: 'prova-1', title: 'Prova', totalQuestions: 2, userAnswers: ['A', null], sourceDocuments: [original] }] }));
    expect(store.data?.provas[0].sourceDocuments).toEqual([original]);
    expect(sanitizeSimulado({ sourceDocuments: 'not-an-array' }).sourceDocuments).toEqual([]);
    expect(sanitizeSimulado({ totalQuestions: 2 })).not.toHaveProperty('sourceDocuments');
  });
  it('exige a mesma conta para abrir o original e usa download autenticado', async () => {
    expect((await downloadOriginalFile(original)).type).toBe('image/png'); expect(mocks.download).toHaveBeenCalledWith(original.path);
    mocks.download.mockClear(); mocks.session.mockResolvedValue({ data: { session: { user: { id: '33333333-3333-4333-8333-333333333333' } } }, error: null });
    await expect(downloadOriginalFile(original)).rejects.toThrow('conta que importou'); expect(mocks.download).not.toHaveBeenCalled();
  });
});
