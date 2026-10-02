import { ArrowRight, BarChart3, BookOpen, BrainCircuit, Check, CheckCircle2, Clock3, FileCheck, LibraryBig, Plus, ShieldCheck, Download } from 'lucide-react';
import { AppTheme, SimuladoData } from '../types';
import { computeSimuladoStats } from '../utils/parser';

interface WelcomeEmptyStateProps {
  provas?: SimuladoData[];
  provasCount?: number;
  activeProva?: SimuladoData | null;
  theme?: AppTheme;
  onThemeChange?: (theme: AppTheme) => void;
  onContinueActiveProva?: () => void;
  onSelectProva?: (prova: SimuladoData) => void;
  onCreateFirstProva: () => void;
  onOpenPresetsModal: () => void;
  onOpenLibrary: () => void;
  onOpenInsights: () => void;
  onOpenAI: () => void;
  onOpenBackupModal: (tab?: 'export' | 'import') => void;
}

export function WelcomeEmptyState({ provas = [], activeProva, onContinueActiveProva, onSelectProva, onCreateFirstProva, onOpenPresetsModal, onOpenLibrary, onOpenInsights, onOpenBackupModal, onOpenAI }: WelcomeEmptyStateProps) {
  const corrected = provas.filter(prova => prova.isCorrected && !prova.isResultOutdated);
  const totals = corrected.reduce((result, prova) => {
    const stats = computeSimuladoStats(prova);
    return { hits: result.hits + stats.hits, evaluated: result.evaluated + stats.keyCount };
  }, { hits: 0, evaluated: 0 });
  return <div className="home-page">
    <section className="home-hero">
      <div className="hero-copy">
        <span className="eyebrow"><span className="eyebrow-dot" />ESTUDE COM DIREÇÃO</span>
        <h1>Cada simulado revela<br />seu <span>próximo passo.</span></h1>
        <p>Transforme provas de qualquer fonte em um plano de revisão. Registre suas respostas, corrija com o gabarito oficial e descubra onde concentrar seus estudos.</p>
        <div className="hero-actions">
          <button id="btn-welcome-create" type="button" className="primary-action" onClick={activeProva ? onContinueActiveProva : onCreateFirstProva}>{activeProva ? 'Continuar minha prova' : 'Criar meu primeiro simulado'}<ArrowRight className="w-4 h-4" /></button>
          <button type="button" className="secondary-action" onClick={onOpenLibrary}><LibraryBig className="w-4 h-4" />Explorar biblioteca</button>
        </div>
        <div className="hero-assurances"><span><Check className="w-3.5 h-3.5" />Comece sem cadastro</span><span><Check className="w-3.5 h-3.5" />Login Google opcional</span><span><Check className="w-3.5 h-3.5" />Backup dos seus dados</span></div>
      </div>
      <div className="hero-preview" aria-label="Exemplo ilustrativo de diagnóstico">
        <div className="preview-heading"><span className="preview-icon"><BarChart3 className="w-5 h-5" /></span><div><strong>Clareza para evoluir</strong><small>Exemplo de diagnóstico</small></div><span className="preview-badge">SIMULADO</span></div>
        <div className="preview-score"><span><strong>78<span>%</span></strong><small>de aproveitamento</small></span><span className="preview-trend"><CheckCircle2 className="w-4 h-4" />Bom progresso</span></div>
        <div className="preview-subjects">{[{ name: 'Português', score: 90 }, { name: 'Direito Constitucional', score: 80 }, { name: 'Raciocínio Lógico', score: 60 }].map(item => <div key={item.name}><div><span>{item.name}</span><strong>{item.score}%</strong></div><div className="preview-bar"><span style={{ width: `${item.score}%` }} /></div></div>)}</div>
        <div className="preview-next"><BrainCircuit className="w-5 h-5" /><div><strong>Sua próxima revisão</strong><small>Reforce Raciocínio Lógico e revise seus erros.</small></div></div>
      </div>
    </section>
    {provas.length > 0 && <section className="home-workspace" aria-labelledby="workspace-title">
      <div className="section-heading"><div><span className="eyebrow">SEU ESPAÇO DE ESTUDOS</span><h2 id="workspace-title">Continue de onde parou</h2></div><button type="button" className="text-action" onClick={onCreateFirstProva}><Plus className="w-4 h-4" />Novo simulado</button></div>
      <div className="workspace-metrics"><div><strong>{provas.length}</strong><span>provas na biblioteca</span></div><div><strong>{corrected.length}</strong><span>provas corrigidas</span></div><div><strong>{totals.evaluated ? `${Math.round(totals.hits / totals.evaluated * 100)}%` : '—'}</strong><span>aproveitamento geral</span></div><button type="button" className="text-action" onClick={onOpenInsights}>Ver diagnóstico<ArrowRight className="w-4 h-4" /></button></div>
      <div className="recent-exams">{[...provas].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 3).map(prova => {
        const stats = computeSimuladoStats(prova);
        return <button type="button" key={prova.id} className="recent-exam" onClick={() => onSelectProva?.(prova)}><span className="recent-exam-icon"><FileCheck className="w-5 h-5" /></span><span><strong>{prova.title}</strong><small>{prova.totalQuestions} questões · {prova.isResultOutdated ? 'Correção pendente' : prova.isCorrected ? `${stats.percentageFormatted}% de acertos` : `${stats.userFilledCount} respondidas`}</small></span><ArrowRight className="w-4 h-4" /></button>;
      })}</div>
    </section>}
    <section className="home-flow" aria-labelledby="flow-title">
      <div className="section-heading"><div><span className="eyebrow">DA PROVA À REVISÃO</span><h2 id="flow-title">Um fluxo simples. Um estudo mais preciso.</h2></div></div>
      <div className="flow-grid">{[
        { title: 'Monte seu simulado', description: 'Crie um cartão de respostas ou escolha uma estrutura de banca. Use a prova que você já tem.', icon: BookOpen },
        { title: 'Corrija com confiança', description: 'Importe o gabarito oficial, confira as alternativas e veja acertos, erros e nota líquida Cebraspe.', icon: FileCheck },
        { title: 'Saiba o que revisar', description: 'Mapeie as disciplinas e transforme seus erros em uma fila de revisão com progresso registrado.', icon: BrainCircuit },
      ].map(({ title, description, icon: Icon }, index) => <article key={title}><div className="flow-top"><span className="flow-icon"><Icon className="w-5 h-5" /></span><span className="flow-number">0{index + 1}</span></div><h3>{title}</h3><p>{description}</p></article>)}</div>
    </section>
    <section className="home-toolbox"><div><span className="eyebrow">FEITO PARA SUA ROTINA</span><h2>Menos organização.<br />Mais tempo para estudar.</h2><p>Do treino rápido ao simulado completo, mantenha suas provas, resultados e revisões no mesmo lugar.</p></div><div className="toolbox-grid">
      <button type="button" onClick={onOpenPresetsModal}><LibraryBig className="w-5 h-5" /><strong>Modelos por banca</strong><span>ENEM, FGV, Cebraspe e mais</span><ArrowRight className="w-4 h-4" /></button>
      <button type="button" onClick={onOpenInsights}><BarChart3 className="w-5 h-5" /><strong>Meu desempenho</strong><span>Resultados e revisão por disciplina</span><ArrowRight className="w-4 h-4" /></button>
      <button type="button" onClick={() => onOpenBackupModal('import')}><Download className="w-5 h-5" /><strong>Importar minhas provas</strong><span>Recupere um backup anterior</span><ArrowRight className="w-4 h-4" /></button>
      <button type="button" onClick={onOpenAI}><BrainCircuit className="w-5 h-5" /><strong>Leitura com IA</strong><span>Provas em PDF e gabaritos em imagem</span><ArrowRight className="w-4 h-4" /></button>
    </div></section>
    <footer className="home-footer"><span><ShieldCheck className="w-4 h-4" />Seus dados locais ficam neste navegador. Entre para sincronizar com sua conta.</span><button type="button" className="text-action" onClick={() => onOpenBackupModal('export')}>Gerenciar backups<ArrowRight className="w-3.5 h-3.5" /></button></footer>
  </div>;
}
