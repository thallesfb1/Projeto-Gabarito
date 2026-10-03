import { CheckCircle2, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

export function AICompletionNotice({ filename, count, onClose }: { filename: string; count: number; onClose: () => void }) {
  const reduced = useReducedMotion();
  return <motion.aside className="ai-completion-notice" role="status" aria-live="polite" initial={{ opacity: 0, y: reduced ? 0 : -20, scale: reduced ? 1 : 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
    <span className="ai-completion-icon"><CheckCircle2 size={24}/></span>
    <div><strong>Leitura concluída!</strong><p>{filename}</p><small>{count} questões prontas. Confira a leitura antes de importar.</small></div>
    <button className="account-icon-button" aria-label="Fechar aviso de leitura concluída" onClick={onClose}><X size={18}/></button>
  </motion.aside>;
}

export function notifyCompletedReading() {
  if (document.visibilityState !== 'hidden' || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try { new Notification('Leitura concluída!', { body: 'A IA terminou de ler seu arquivo. Volte à prova para conferir e importar.', tag: 'ai-reading-complete' }); }
  catch { /* The in-app notice also works on devices without desktop notifications. */ }
}
