// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ download: vi.fn(), createURL: vi.fn(), revokeURL: vi.fn() }));
vi.mock('../utils/sourceDocuments', () => ({ downloadOriginalFile: mocks.download }));
import { SourceDocuments } from './SourceDocuments';
const document = { path: 'account/prova/original.png', ownerId: 'account', name: 'Gabarito.png', mime: 'image/png', size: 8, kind: 'key' as const, createdAt: '' };
beforeEach(() => {
  vi.clearAllMocks(); mocks.download.mockResolvedValue(new Blob(['image'])); mocks.createURL.mockReturnValue('blob:original');
  vi.stubGlobal('URL', class extends URL { static createObjectURL = mocks.createURL; static revokeObjectURL = mocks.revokeURL; });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('consulta dos originais', () => {
  it('abre automaticamente um único original no painel, mas exige escolha quando há vários', async () => {
    const { unmount } = render(<SourceDocuments documents={[document]} expanded autoOpen/>);
    expect(await screen.findByAltText('Gabarito original salvo na conta')).toBeTruthy(); expect(mocks.download).toHaveBeenCalledTimes(1);
    unmount(); mocks.download.mockClear(); render(<SourceDocuments documents={[document, { ...document, path: 'account/prova/segundo.png' }]} expanded autoOpen/>);
    expect(mocks.download).not.toHaveBeenCalled();
  });
  it('baixa com autenticação, abre a imagem e libera a URL ao fechar', async () => {
    render(<SourceDocuments documents={[document]}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Ver original', hidden: true }));
    expect(await screen.findByAltText('Gabarito original salvo na conta')).toBeTruthy(); expect(mocks.download).toHaveBeenCalledWith(document);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar arquivo original', hidden: true })); await waitFor(() => expect(mocks.revokeURL).toHaveBeenCalledWith('blob:original'));
  });
  it('ignora uma resposta que termina depois da troca de prova ou conta', async () => {
    let finish!: (blob: Blob) => void; mocks.download.mockReturnValue(new Promise<Blob>(resolve => { finish = resolve; }));
    const { unmount } = render(<SourceDocuments documents={[document]}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Ver original', hidden: true })); unmount(); finish(new Blob(['image']));
    await waitFor(() => expect(mocks.download).toHaveBeenCalledTimes(1)); expect(mocks.createURL).not.toHaveBeenCalled();
  });
});
