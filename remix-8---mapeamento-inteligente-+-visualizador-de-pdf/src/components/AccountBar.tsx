import { AccountAvatar } from './AccountAvatar';
import { ProfileModal } from './ProfileModal';
import { useEffect, useState } from 'react';
import { BookOpenCheck, Cloud, CloudOff, Download, ChevronDown, RefreshCw, Upload, Menu, Sun, Moon, BookOpen, Sparkles } from 'lucide-react';
import { AppTheme } from '../types';
import { useWorkspace } from '../hooks/useWorkspace';
import { GoogleIcon } from './GoogleIcon';

export function AccountBar({ workspace, onBackup, theme, onThemeChange, onMenu, onHome, onAI }: { workspace: ReturnType<typeof useWorkspace>; onBackup: () => void; theme: AppTheme; onThemeChange: (theme: AppTheme) => void; onMenu: () => void; onHome: () => void; onAI: () => void }) {
  const [busy, setBusy] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [imported, setImported] = useState(false);
  const [actionError, setActionError] = useState('');
  const { session, configured, cloudStatus, saveStatus, error } = workspace;
  useEffect(() => { setImported(false); setActionError(''); setProfileOpen(false); }, [workspace.scope]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setActionError('');
    try { await action(); } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Não foi possível concluir a ação. Seus dados foram mantidos. Tente novamente.'); }
    finally { setBusy(false); }
  };
  const name = [session?.user.user_metadata.full_name, session?.user.user_metadata.name, session?.user.email].find(value => typeof value === 'string' && value.trim()) || 'Minha conta';
  return <><header className="account-shell no-print">
    <div className="account-bar">
      <div className="flex items-center gap-3"><button className="account-icon-button md:hidden" type="button" onClick={onMenu} aria-label="Abrir navegação"><Menu className="w-5 h-5" /></button><button type="button" className="brand-lockup" onClick={onHome} aria-label="Gabarito Pro — início"><span className="brand-mark"><BookOpenCheck className="w-5 h-5" /></span><span><strong>Gabarito <span>Pro</span></strong><small>Seu próximo passo começa aqui</small></span></button></div>
      <div className="account-actions">
        <button type="button" className="account-ai-button secondary-action" onClick={onAI}><Sparkles className="w-4 h-4"/><span>Importar com IA</span></button>
        <div className="theme-switcher" aria-label="Tema visual">{([{ value: 'clean', label: 'Clean', icon: Sun }, { value: 'notebook', label: 'Caderno', icon: BookOpen }, { value: 'dark', label: 'Escuro', icon: Moon }] as const).map(({ value, label, icon: Icon }) => <button key={value} type="button" aria-label={`Tema ${label}`} aria-pressed={theme === value} title={`Tema ${label}`} onClick={() => onThemeChange(value)}><Icon className="w-4 h-4" /><span>{label}</span></button>)}</div>
        <span className="sync-state" role="status">{session ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}{session ? cloudStatus === 'loading' ? 'Sincronizando…' : cloudStatus === 'error' ? 'Sincronização pendente' : 'Conta sincronizada' : saveStatus === 'saving' ? 'Salvando…' : saveStatus === 'error' ? 'Falha ao salvar' : 'Salvo neste dispositivo'}</span>
        {session ? <>
          <button type="button" className="account-profile-button" onClick={()=>setProfileOpen(true)} aria-label="Abrir meu perfil"><AccountAvatar name={name} photo={session.user.user_metadata.avatar_url || session.user.user_metadata.picture}/><span className="account-name" title={session.user.email}>{name}</span><ChevronDown className="w-3.5 h-3.5"/></button>
          <button type="button" className="account-icon-button" onClick={() => run(workspace.retry)} disabled={busy || cloudStatus === 'loading'} aria-label="Sincronizar provas da conta" title="Sincronizar provas da conta"><RefreshCw className="w-4 h-4" /></button>

        </> : configured ? <button type="button" className="google-button" disabled={busy} onClick={() => run(workspace.signIn)}><GoogleIcon />{busy ? 'Conectando…' : 'Entrar com Google'}</button> : <span className="account-local-label">Modo local</span>}
      </div>
    </div>
    {session && <div className="account-tools"><span>Suas provas acompanham sua conta.</span><button type="button" disabled={busy || imported} onClick={() => run(async () => { await workspace.importGuest(); setImported(true); })}><Download className="w-3.5 h-3.5" />{imported ? 'Importação solicitada' : 'Importar provas deste dispositivo'}</button><button type="button" onClick={onBackup}><Upload className="w-3.5 h-3.5" />Exportar arquivo</button></div>}
    {(error || actionError || saveStatus === 'error') && <div className="account-alert" role="alert"><span>{error || actionError || 'Não foi possível salvar suas alterações. Exporte um backup antes de fechar o site.'}</span><button type="button" onClick={onBackup}>Exportar backup</button>{session && <button type="button" disabled={busy || cloudStatus === 'loading'} onClick={() => run(workspace.retry)}>Tentar novamente</button>}</div>}
  </header>{profileOpen && session && <ProfileModal user={session.user} theme={theme} onThemeChange={onThemeChange} onClose={()=>setProfileOpen(false)} onSignOut={workspace.signOut} onSync={workspace.retry} onBackup={onBackup} count={workspace.store.provas.length} syncStatus={cloudStatus}/>}</>;
}
