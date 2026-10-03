// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import { ProfileModal } from './ProfileModal';
import { AccountAvatar } from './AccountAvatar';
afterEach(cleanup);
const user = { id: 'user', app_metadata: {}, aud: 'authenticated', created_at: '2026-10-02', email: 'estudante@example.com', user_metadata: { full_name: 'Maria Silva', avatar_url: 'https://lh3.googleusercontent.com/avatar' } } as User;
function props() { return { user, theme: 'notebook' as const, onThemeChange: vi.fn(), onClose: vi.fn(), onSignOut: vi.fn().mockResolvedValue(undefined), onSync: vi.fn().mockResolvedValue(undefined), onBackup: vi.fn(), count: 3, syncStatus: 'synced' }; }
describe('perfil da conta', () => {
  it('importa provas locais pelo perfil e mantém uma falha visível sem indicar sucesso',async()=>{
    const onImportGuest=vi.fn().mockRejectedValueOnce(new Error('Não há provas locais')).mockResolvedValueOnce(undefined);
    render(<ProfileModal {...props()} onImportGuest={onImportGuest}/>);
    fireEvent.click(screen.getByRole('button',{name:/Importar provas deste dispositivo/}));expect((await screen.findByRole('alert')).textContent).toBe('Não há provas locais');
    fireEvent.click(screen.getByRole('button',{name:/Importar provas deste dispositivo/}));await screen.findByRole('button',{name:/Provas locais importadas/});expect(onImportGuest).toHaveBeenCalledTimes(2);
  });
  it('mostra a foto Google, seleciona o tema e aciona sincronização e backup', async () => {
    const callbacks = props(); render(<ProfileModal {...callbacks}/>);
    expect(screen.getByAltText('Foto de Maria Silva').getAttribute('src')).toBe(user.user_metadata.avatar_url);
    expect(screen.getByRole('button', { name: 'Caderno' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Escuro' })); expect(callbacks.onThemeChange).toHaveBeenCalledWith('dark');
    fireEvent.click(screen.getByRole('button', { name: /Sincronizar provas/ })); await waitFor(() => expect(callbacks.onSync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: /Exportar backup/ }).hasAttribute('disabled')).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: /Exportar backup/ })); expect(callbacks.onBackup).toHaveBeenCalledTimes(1); expect(callbacks.onClose).toHaveBeenCalledTimes(1);
  });
  it('faz logout e mantém o perfil aberto quando a saída falha', async () => {
    const callbacks = props(); callbacks.onSignOut.mockRejectedValueOnce(new Error('Falha na saída')); render(<ProfileModal {...callbacks}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Sair da conta' })); expect((await screen.findByRole('alert')).textContent).toBe('Falha na saída'); expect(callbacks.onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sair da conta' })); await waitFor(() => expect(callbacks.onClose).toHaveBeenCalledTimes(1)); expect(callbacks.onSignOut).toHaveBeenCalledTimes(2);
  });
  it('usa iniciais quando a foto falha ou aponta para um domínio estranho', () => {
    const { rerender } = render(<AccountAvatar name="Maria Silva" photo={user.user_metadata.avatar_url}/>);
    fireEvent.error(screen.getByAltText('Foto de Maria Silva')); expect(screen.getByLabelText('Perfil de Maria Silva').textContent).toBe('MS');
    rerender(<AccountAvatar name="Maria Silva" photo="https://example.com/avatar"/>); expect(screen.queryByRole('img')).toBeNull();
  });
});
