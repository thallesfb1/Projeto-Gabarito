import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { BookOpen, Cloud, LogOut, Moon, RefreshCw, Sun, Upload, X } from 'lucide-react';
import type { AppTheme } from '../types';
import { ModalLayer } from './ModalLayer';
import { AccountAvatar } from './AccountAvatar';

export function ProfileModal({ user, theme, onThemeChange, onClose, onSignOut, onSync, onBackup, count, syncStatus }: {
  user: User; theme: AppTheme; onThemeChange: (theme: AppTheme) => void; onClose: () => void;
  onSignOut: () => Promise<void>; onSync: () => Promise<void>; onBackup: () => void; count: number; syncStatus: string;
}) {
  const [busy, setBusy] = useState<'sync' | 'logout' | null>(null);
  const [error, setError] = useState('');
  const name = [user.user_metadata.full_name, user.user_metadata.name, user.email].find(value => typeof value === 'string' && value.trim()) || 'Minha conta';
  const action = async (kind: 'sync' | 'logout') => {
    setBusy(kind); setError('');
    try { await (kind === 'logout' ? onSignOut() : onSync()); if (kind === 'logout') onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a ação. Tente novamente.'); }
    finally { setBusy(null); }
  };
  return <ModalLayer label="Meu perfil" onClose={() => { if (!busy) onClose(); }} className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div className="profile-modal w-full max-w-lg overflow-hidden">
      <header className="flex items-center justify-between p-5"><div><h2 className="font-bold text-lg">Meu perfil</h2><p className="text-xs opacity-75 mt-1">Sua conta e suas preferências</p></div><button aria-label="Fechar perfil" disabled={Boolean(busy)} onClick={onClose}><X className="w-5 h-5"/></button></header>
      <div className="p-5 sm:p-6 space-y-6">
        <div className="profile-identity"><AccountAvatar name={name} photo={user.user_metadata.avatar_url || user.user_metadata.picture} large/><div><h3>{name}</h3><p>{user.email}</p><span>Conectado com Google</span></div></div>
        <div className="profile-cloud"><Cloud className="w-5 h-5"/><div><strong>{count} {count === 1 ? 'prova na sua conta' : 'provas na sua conta'}</strong><p>{syncStatus === 'error' ? 'Sincronização pendente. Seus dados locais estão preservados.' : syncStatus === 'loading' ? 'Sincronização em andamento…' : 'Provas, leituras e arquivos originais no seu espaço de estudos.'}</p></div></div>
        <section><h3 className="text-sm font-semibold mb-3">Aparência</h3><div className="profile-themes">{([{value:'clean', label:'Clean', icon:Sun},{value:'notebook', label:'Caderno', icon:BookOpen},{value:'dark', label:'Escuro', icon:Moon}] as const).map(({value,label,icon:Icon}) => <button key={value} className={`secondary-action ${theme===value?'ai-selected':''}`} aria-pressed={theme===value} disabled={Boolean(busy)} onClick={()=>onThemeChange(value)}><Icon className="w-4 h-4"/>{label}</button>)}</div><p className="text-xs opacity-65 mt-2">O tema escolhido vale para todas as telas e janelas neste dispositivo.</p></section>
        <section className="space-y-2"><h3 className="text-sm font-semibold mb-3">Dados da conta</h3><button className="profile-setting" disabled={Boolean(busy) || syncStatus==='loading'} onClick={()=>action('sync')}><RefreshCw className={`w-4 h-4 ${busy==='sync'?'animate-spin':''}`}/><span><strong>Sincronizar provas</strong><small>Buscar e salvar as alterações da conta</small></span></button><button className="profile-setting" disabled={Boolean(busy)} onClick={()=>{onClose();onBackup();}}><Upload className="w-4 h-4"/><span><strong>Exportar backup</strong><small>Guardar uma cópia das provas e das referências aos originais</small></span></button></section>
        {error && <p className="ai-error rounded-lg p-3 text-sm" role="alert">{error}</p>}
        <button className="profile-logout secondary-action w-full" disabled={Boolean(busy)} onClick={()=>action('logout')}><LogOut className="w-4 h-4"/>{busy==='logout'?'Saindo…':'Sair da conta'}</button>
      </div>
    </div>
  </ModalLayer>;
}
