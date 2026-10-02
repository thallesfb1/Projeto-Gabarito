import { useEffect, useState } from 'react';
export function AccountAvatar({ name, photo, large = false }: { name: string; photo?: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo]);
  let safePhoto: string | undefined;
  try { const url = new URL(photo || ''); if (url.protocol === 'https:' && (url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com'))) safePhoto = url.href; } catch { /* Initials work offline or without a Google photo. */ }
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'EU';
  return <span className={`account-avatar ${large ? 'account-avatar-large' : ''}`}>{safePhoto && !failed ? <img src={safePhoto} alt={`Foto de ${name}`} referrerPolicy="no-referrer" onError={() => setFailed(true)}/> : <span aria-label={`Perfil de ${name}`}>{initials}</span>}</span>;
}
