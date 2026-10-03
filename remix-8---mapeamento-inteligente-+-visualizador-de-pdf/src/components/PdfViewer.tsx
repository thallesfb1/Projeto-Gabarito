import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, LoaderCircle, Minus, Plus } from 'lucide-react';
import { getDocument, PDFWorker, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&inline';

export function PdfViewer({ blob, initialPage = 1 }: { blob: Blob; initialPage?: number }) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(initialPage);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element); setWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let alive = true;
    let task: ReturnType<typeof getDocument> | undefined;
    let worker: Worker | undefined;
    let pdfWorker: PDFWorker | undefined;
    setDocument(null); setBusy(true); setError('');
    void blob.arrayBuffer().then(bytes => {
      if (!alive) return;
      worker = new PdfWorker(); pdfWorker = PDFWorker.create({ port: worker });
      task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, worker: pdfWorker });
      task.onPassword = () => { if (alive) { setBusy(false); setError('Este PDF exige uma senha. Baixe o original para abri-lo no seu leitor de PDF.'); } void task?.destroy(); };
      return task.promise.then(pdf => { if (alive) setDocument(pdf); });
    }).catch(() => { if (alive) { setError(previous => previous || 'Não foi possível exibir este PDF. Você ainda pode baixar o original.'); setBusy(false); } });
    return () => { alive = false; void (task?.destroy() || Promise.resolve()).catch(() => {}).finally(() => { pdfWorker?.destroy(); worker?.terminate(); }); };
  }, [blob]);
  useEffect(() => { setPage(Math.max(1, Math.min(initialPage, document?.numPages || initialPage))); }, [initialPage, document]);
  useEffect(() => {
    if (!document || !width || !canvas.current) return;
    let alive = true;
    let task: RenderTask | undefined;
    setBusy(true); setError('');
    void document.getPage(Math.min(page, document.numPages)).then(pdfPage => {
      if (!alive || !canvas.current) return;
      const element = canvas.current;
      const base = pdfPage.getViewport({ scale: 1 });
      const viewport = pdfPage.getViewport({ scale: Math.max(0.1, (width - 24) / base.width) * zoom });
      const ratio = Math.min(window.devicePixelRatio || 1, 2, 4096 / Math.max(viewport.width, viewport.height));
      element.width = Math.floor(viewport.width * ratio); element.height = Math.floor(viewport.height * ratio);
      element.style.width = `${viewport.width}px`; element.style.height = `${viewport.height}px`;
      task = pdfPage.render({ canvas: element, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
      return task.promise;
    }).then(() => { if (alive) setBusy(false); }).catch(cause => {
      if (alive && cause?.name !== 'RenderingCancelledException') { setError('Falha ao exibir esta página. Tente outra página ou baixe o original.'); setBusy(false); }
    });
    return () => { alive = false; task?.cancel(); };
  }, [document, page, width, zoom]);
  return <div className="pdf-viewer">
    <div className="pdf-toolbar">
      <div><button className="account-icon-button" aria-label="Página anterior do PDF" disabled={!document || page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={17}/></button>
        <label>Página <input aria-label="Página do PDF" type="number" min={1} max={document?.numPages || 1} value={page} disabled={!document} onChange={e => setPage(Math.max(1, Math.min(document?.numPages || 1, Number(e.target.value) || 1)))}/></label><span>de {document?.numPages || '…'}</span>
        <button className="account-icon-button" aria-label="Próxima página do PDF" disabled={!document || page >= document.numPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={17}/></button></div>
      <div><button className="account-icon-button" aria-label="Diminuir PDF" disabled={zoom <= 0.75} onClick={() => setZoom(z => Math.max(0.75, z - 0.25))}><Minus size={17}/></button><span>{Math.round(zoom * 100)}%</span><button className="account-icon-button" aria-label="Ampliar PDF" disabled={zoom >= 2} onClick={() => setZoom(z => Math.min(2, z + 0.25))}><Plus size={17}/></button></div>
    </div>
    <div ref={container} className="pdf-canvas-area" aria-busy={busy}>
      {busy && <p className="pdf-loading" role="status"><LoaderCircle size={18} className="animate-spin"/>Exibindo página…</p>}
      {error && <p className="ai-error p-3 rounded-lg" role="alert">{error}</p>}
      <canvas ref={canvas} aria-label={`Página ${page} do PDF original`} role="img" hidden={Boolean(error)}/>
    </div>
  </div>;
}
