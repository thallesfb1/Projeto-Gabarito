import { useEffect, useRef, useState } from 'react';
import { Eye, FileText, Image, LoaderCircle, X, Cloud } from 'lucide-react';
import type { SourceDocument } from '../types';
import { downloadOriginalFile } from '../utils/sourceDocuments';

export function SourceDocuments({ documents }: { documents: SourceDocument[] }) {
  const [opened, setOpened] = useState<{ document: SourceDocument; url: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => () => { if (opened) URL.revokeObjectURL(opened.url); }, [opened]);
  const open = async (document: SourceDocument) => {
    const request = ++generation.current;
    setBusy(document.path); setError('');
    try {
      const blob = await downloadOriginalFile(document);
      if (generation.current === request) setOpened({ document, url: URL.createObjectURL(blob) });
    } catch (cause) { if (generation.current === request) setError(cause instanceof Error ? cause.message : 'Falha ao abrir o arquivo.'); }
    finally { if (generation.current === request) setBusy(null); }
  };
  return <details className="source-documents exam-reader rounded-2xl border p-4 mb-5">
    <summary className="flex items-center gap-2 cursor-pointer font-semibold text-sm"><Cloud className="w-4 h-4"/>Arquivos originais da prova <span className="opacity-60">({documents.length})</span></summary>
    <p className="text-xs opacity-70 mt-3">Salvos de forma privada na conta que fez a importação.</p>
    <div className="space-y-2 mt-3">{documents.map(document => <div key={document.path} className="source-document-row">
      {document.mime === 'application/pdf' ? <FileText className="w-5 h-5"/> : <Image className="w-5 h-5"/>}
      <div><strong>{document.name}</strong><small>{document.kind === 'exam' ? 'Prova' : 'Gabarito'} · {(document.size / 1024 / 1024).toFixed(2)} MB</small></div>
      <button className="secondary-action" disabled={Boolean(busy)} onClick={() => open(document)}>{busy === document.path ? <LoaderCircle className="w-4 h-4 animate-spin"/> : <Eye className="w-4 h-4"/>}Ver original</button>
    </div>)}</div>
    {error && <p role="alert" className="ai-error rounded-lg p-3 text-sm mt-3">{error}</p>}
    {opened && <div className="mt-4"><div className="flex justify-between items-center gap-3 mb-3"><strong className="text-sm break-all">{opened.document.name}</strong><button className="account-icon-button" aria-label="Fechar arquivo original" onClick={() => setOpened(null)}><X className="w-4 h-4"/></button></div>{opened.document.mime === 'application/pdf' ? <iframe title="Arquivo original salvo na conta" src={opened.url} sandbox="allow-same-origin" className="w-full h-[600px] rounded-xl border"/> : <img alt="Gabarito original salvo na conta" src={opened.url} className="w-full max-h-[700px] object-contain rounded-xl"/>}</div>}
  </details>;
}
