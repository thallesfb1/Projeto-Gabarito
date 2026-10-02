import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Layers,
} from 'lucide-react';
import { AppTheme, SessionRecord } from '../types';
import { ChartSessionPoint } from '../utils/sessionManager';

interface PerformanceOverviewProps {
  sessions: ChartSessionPoint[];
  theme?: AppTheme;
  currentHits?: number;
  currentMisses?: number;
  currentTotal?: number;
}

// Sample demonstration points for users with only 1 session who want to preview a 5-session curve
const DEMO_5_SESSIONS: ChartSessionPoint[] = [
  { id: 'demo_1', name: 'Sessão 1', shortName: 'S1', title: 'Simulado Treino 01', date: '21/09', hitRatio: 62.0, missRatio: 34.0, ratio: 1.82, hits: 31, misses: 17, blanks: 2, total: 50 },
  { id: 'demo_2', name: 'Sessão 2', shortName: 'S2', title: 'Simulado FCC/Vunesp', date: '22/09', hitRatio: 68.3, missRatio: 28.3, ratio: 2.41, hits: 41, misses: 17, blanks: 2, total: 60 },
  { id: 'demo_3', name: 'Sessão 3', shortName: 'S3', title: 'Simulado FGV Geral', date: '24/09', hitRatio: 74.3, missRatio: 22.9, ratio: 3.24, hits: 52, misses: 16, blanks: 2, total: 70 },
  { id: 'demo_4', name: 'Sessão 4', shortName: 'S4', title: 'Cebraspe Itens V/F', date: '25/09', hitRatio: 79.2, missRatio: 18.3, ratio: 4.33, hits: 95, misses: 22, blanks: 3, total: 120 },
  { id: 'demo_5', name: 'Sessão 5', shortName: 'S5', title: 'Simulado Reta Final', date: 'Hoje', hitRatio: 84.5, missRatio: 14.1, ratio: 5.99, hits: 60, misses: 10, blanks: 1, total: 71, isCurrent: true },
];

export const PerformanceOverview: React.FC<PerformanceOverviewProps> = ({
  sessions,
  theme = 'clean',
  currentHits = 0,
  currentMisses = 0,
  currentTotal = 0,
}) => {
  const isNotebook = theme === 'notebook';
  const [metricMode, setMetricMode] = useState<'rates' | 'ratio'>('rates');
  const [useDemoSample, setUseDemoSample] = useState(false);

  // Active dataset for the chart (max 5 sessions)
  const displaySessions = useMemo(() => {
    if (useDemoSample) return DEMO_5_SESSIONS;
    if (sessions.length > 0) return sessions.slice(-5);
    return [];
  }, [sessions, useDemoSample]);

  // Aggregate stats across the displayed sessions
  const stats = useMemo(() => {
    if (displaySessions.length === 0) {
      return { avgHit: 0, avgMiss: 0, avgRatio: 0, trendDiff: 0 };
    }
    const sumHit = displaySessions.reduce((acc, s) => acc + s.hitRatio, 0);
    const sumMiss = displaySessions.reduce((acc, s) => acc + s.missRatio, 0);
    const sumRatio = displaySessions.reduce((acc, s) => acc + s.ratio, 0);
    const avgHit = Number((sumHit / displaySessions.length).toFixed(1));
    const avgMiss = Number((sumMiss / displaySessions.length).toFixed(1));
    const avgRatio = Number((sumRatio / displaySessions.length).toFixed(2));

    // Calculate trend: compare last session against previous sessions average
    let trendDiff = 0;
    if (displaySessions.length >= 2) {
      const lastSession = displaySessions[displaySessions.length - 1];
      const previousSlice = displaySessions.slice(0, -1);
      const prevAvgHit = previousSlice.reduce((acc, s) => acc + s.hitRatio, 0) / previousSlice.length;
      trendDiff = Number((lastSession.hitRatio - prevAvgHit).toFixed(1));
    }

    return { avgHit, avgMiss, avgRatio, trendDiff };
  }, [displaySessions]);

  // Harmonized palette according to theme rules
  const hitColor = isNotebook ? '#2f7446' : '#059669'; // Sage green vs Emerald green
  const missColor = isNotebook ? '#b8473e' : '#dc2626'; // Terracotta vintage red vs Ruby red
  const ratioColor = isNotebook ? '#214358' : '#2563eb'; // Slate blue vs Indigo
  const gridColor = isNotebook ? '#e7dfcf' : '#e2e8f0';
  const axisTextColor = isNotebook ? '#7d7465' : '#64748b';

  // Custom rich tooltip matching clean and notebook themes
  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload as ChartSessionPoint;

    return (
      <div
        className={`p-3 rounded-xl shadow-lg border text-xs min-w-[200px] select-none ${
          isNotebook
            ? 'bg-[#fcfaf4] border-[#ded7c6] text-[#1c2b45]'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b pb-1.5 mb-2 border-current/10">
          <div className="flex items-center gap-1.5 font-bold">
            <Activity className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{label}</span>
          </div>
          {data.isCurrent && (
            <span
              className={`text-[9px] font-mono-code font-bold px-1.5 py-0.5 rounded ${
                isNotebook ? 'bg-[#ede6d5] text-[#1c2b45]' : 'theme-solid text-white'
              }`}
            >
              Atual
            </span>
          )}
        </div>

        <p className="text-[11px] font-medium text-slate-600 truncate max-w-[220px] mb-2" title={data.title}>
          {data.title}
        </p>

        <div className="space-y-1.5 font-mono-code">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: hitColor }} />
              <span>Taxa de Acertos:</span>
            </span>
            <span className="font-bold">{data.hitRatio}%</span>
          </div>

          <div className="flex items-center justify-between text-red-700">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: missColor }} />
              <span>Taxa de Erros:</span>
            </span>
            <span className="font-bold">{data.missRatio}%</span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-current/10 text-slate-700">
            <span>Razão Acerto/Erro:</span>
            <span className="font-bold">{data.ratio}x</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
            <span>Absoluto:</span>
            <span>
              {data.hits} acertos / {data.misses} erros ({data.total}q)
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`rounded-xl p-3.5 sm:p-4 border transition-colors space-y-3.5 ${
        isNotebook ? 'bg-[#f8f5ec] border-[#dfd7c5]' : 'bg-slate-50/70 border-slate-200/90'
      }`}
    >
      {/* Header with Title, Mode Switcher & Session Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${
              isNotebook ? 'bg-[#ede6d5] text-[#1c2b45]' : 'bg-white text-slate-800 border border-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`text-xs sm:text-sm font-bold tracking-tight ${
                isNotebook ? 'text-[#1c2b45]' : 'text-slate-900'
              }`}>
                Visão Geral de Desempenho (Últimas 5 Sessões)
              </h4>
              <span
                className={`text-[10px] font-mono-code px-2 py-0.5 rounded font-semibold border ${
                  isNotebook
                    ? 'bg-[#fffefb] border-[#ded7c6] text-[#7d7465]'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {displaySessions.length} {displaySessions.length === 1 ? 'sessão' : 'sessões'}
              </span>
            </div>
            <p className={`text-[11px] ${isNotebook ? 'text-[#7d7465]' : 'text-slate-500'}`}>
              Evolução da proporção de acertos e erros ao longo dos seus simulados corrigidos
            </p>
          </div>
        </div>

        {/* View Mode Toggle Button */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <div
            className={`inline-flex items-center p-0.5 rounded-lg border text-xs ${
              isNotebook ? 'bg-[#ede6d5] border-[#dfd7c5]' : 'bg-white border-slate-200 shadow-2xs'
            }`}
          >
            <button
              type="button"
              onClick={() => setMetricMode('rates')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                metricMode === 'rates'
                  ? isNotebook
                    ? 'bg-[#fffefb] text-[#1c2b45] font-bold shadow-2xs'
                    : 'theme-solid text-white font-semibold shadow-2xs'
                  : isNotebook
                  ? 'text-[#7d7465] hover:text-[#1c2b45]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              % Acertos vs % Erros
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('ratio')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                metricMode === 'ratio'
                  ? isNotebook
                    ? 'bg-[#fffefb] text-[#1c2b45] font-bold shadow-2xs'
                    : 'theme-solid text-white font-semibold shadow-2xs'
                  : isNotebook
                  ? 'text-[#7d7465] hover:text-[#1c2b45]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Razão (Acertos ÷ Erros)
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate KPI Strip across the 5 sessions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div
          className={`p-2.5 rounded-lg border flex flex-col justify-between ${
            isNotebook ? 'bg-[#fffefb] border-[#ded7c6]' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[10px] uppercase font-mono-code text-slate-500">Média de Acertos</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold font-mono-code tabular-nums" style={{ color: hitColor }}>
              {stats.avgHit}%
            </span>
          </div>
        </div>

        <div
          className={`p-2.5 rounded-lg border flex flex-col justify-between ${
            isNotebook ? 'bg-[#fffefb] border-[#ded7c6]' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[10px] uppercase font-mono-code text-slate-500">Média de Erros</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold font-mono-code tabular-nums" style={{ color: missColor }}>
              {stats.avgMiss}%
            </span>
          </div>
        </div>

        <div
          className={`p-2.5 rounded-lg border flex flex-col justify-between ${
            isNotebook ? 'bg-[#fffefb] border-[#ded7c6]' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[10px] uppercase font-mono-code text-slate-500">Razão Média</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold font-mono-code tabular-nums text-slate-900">
              {stats.avgRatio}x
            </span>
            <span className="text-[10px] font-mono-code text-slate-500">acertos/erro</span>
          </div>
        </div>

        <div
          className={`p-2.5 rounded-lg border flex flex-col justify-between ${
            isNotebook ? 'bg-[#fffefb] border-[#ded7c6]' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[10px] uppercase font-mono-code text-slate-500">Tendência Recente</span>
          <div className="flex items-center gap-1 mt-0.5">
            {stats.trendDiff > 0 ? (
              <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold font-mono-code text-sm">
                <ArrowUpRight className="w-4 h-4" />
                <span>+{stats.trendDiff}%</span>
              </span>
            ) : stats.trendDiff < 0 ? (
              <span className="inline-flex items-center gap-0.5 text-red-700 font-bold font-mono-code text-sm">
                <ArrowDownRight className="w-4 h-4" />
                <span>{stats.trendDiff}%</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-slate-600 font-bold font-mono-code text-sm">
                <Minus className="w-4 h-4" />
                <span>Estável</span>
              </span>
            )}
            <span className="text-[10px] font-mono-code text-slate-500 ml-auto">vs histórico</span>
          </div>
        </div>
      </div>

      {/* Main Recharts Line Chart */}
      <div
        className={`w-full h-56 sm:h-60 pt-2 pb-1 pr-2 rounded-lg border ${
          isNotebook ? 'bg-[#fffefb] border-[#ded7c6]' : 'bg-white border-slate-200'
        }`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displaySessions} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="name"
              stroke={axisTextColor}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              stroke={axisTextColor}
              fontSize={11}
              domain={metricMode === 'rates' ? [0, 100] : ['auto', 'auto']}
              unit={metricMode === 'rates' ? '%' : 'x'}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              width={42}
            />
            <Tooltip content={renderCustomTooltip} />
            <Legend
              verticalAlign="top"
              height={32}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
            />

            {metricMode === 'rates' ? (
              <>
                <Line
                  type="monotone"
                  dataKey="hitRatio"
                  name="% Acertos"
                  stroke={hitColor}
                  strokeWidth={2.5}
                  dot={{ r: 4.5, strokeWidth: 2, fill: isNotebook ? '#fffefb' : '#ffffff' }}
                  activeDot={{ r: 7, strokeWidth: 0, fill: hitColor }}
                />
                <Line
                  type="monotone"
                  dataKey="missRatio"
                  name="% Erros"
                  stroke={missColor}
                  strokeWidth={2.5}
                  dot={{ r: 4.5, strokeWidth: 2, fill: isNotebook ? '#fffefb' : '#ffffff' }}
                  activeDot={{ r: 7, strokeWidth: 0, fill: missColor }}
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey="ratio"
                name="Razão (Acertos ÷ Erros)"
                stroke={ratioColor}
                strokeWidth={2.5}
                dot={{ r: 5, strokeWidth: 2, fill: isNotebook ? '#fffefb' : '#ffffff' }}
                activeDot={{ r: 7, strokeWidth: 0, fill: ratioColor }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer hint / single-session notice & optional demo toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono-code pt-0.5">
        <div className="flex items-center gap-1.5 text-slate-500">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            {displaySessions.length < 5
              ? `${displaySessions.length} de 5 sessões registradas — a cada novo simulado corrigido, sua linha de evolução ganha novos pontos.`
              : 'Mostrando suas 5 sessões mais recentes em ordem cronológica de realização.'}
          </span>
        </div>

        {/* Toggle to inspect 5 sessions demo if fewer than 3 real sessions */}
        {sessions.length < 3 && (
          <button
            type="button"
            onClick={() => setUseDemoSample(prev => !prev)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border transition cursor-pointer self-start sm:self-auto shrink-0 ${
              useDemoSample
                ? isNotebook
                  ? 'theme-solid text-white border-[#1c2b45]'
                  : 'theme-solid text-white border-slate-900'
                : isNotebook
                ? 'bg-[#ede6d5] hover:bg-[#e4ddcb] text-[#1c2b45] border-[#dfd7c5]'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="Alternar entre seus dados reais e uma prévia com 5 sessões completas"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>{useDemoSample ? 'Voltar aos Dados Reais' : 'Simular Prévia de 5 Sessões'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
