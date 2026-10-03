import { lazy, Suspense } from 'react';
import { Download, ExternalLink } from 'lucide-react';
const PdfViewer = lazy(() => import('./PdfViewer').then(module => ({ default: module.PdfViewer })));

export function DocumentPreview({ blob, url, name, mime, initialPage = 1 }: { blob: Blob; url: string; name: string; mime: string; initialPage?: number }) {
  return <div className="document-preview space-y-3">
    <div className="flex flex-wrap gap-2">
      <a className="secondary-action" href={url} download={name}><Download size={16}/>Baixar original</a>
      <a className="secondary-action" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Abrir em outra aba</a>
    </div>
    {mime === 'application/pdf' ? <Suspense fallback={<p role="status" className="p-4 text-sm">Preparando visualizador…</p>}><PdfViewer blob={blob} initialPage={initialPage}/></Suspense> : <img alt="Gabarito original salvo na conta" src={url} className="w-full max-h-[700px] object-contain rounded-xl"/>}
  </div>;
}
