import { AnswerOption, ExamType, ParseResult, SimuladoData, SimuladoStats } from '../types';

export const VALID_LETTERS_MC: AnswerOption[] = ['A', 'B', 'C', 'D', 'E'];
export const VALID_LETTERS_TF: AnswerOption[] = ['V', 'F'];
export const VALID_LETTERS: AnswerOption[] = ['A', 'B', 'C', 'D', 'E', 'V', 'F'];

export function getOptionsForExamType(examType?: ExamType): AnswerOption[] {
  return examType === 'true_false' ? VALID_LETTERS_TF : VALID_LETTERS_MC;
}

/**
 * Computes unified metrics for a test simulation.
 * Rule: Questions without an official key are NEVER counted as errors or blanks.
 * Percentage is strictly computed over the evaluated questions (those with an official key).
 * For True/False (Cebraspe / Cespe), also computes netScore = hits - misses.
 */
export function computeSimuladoStats(simulado: SimuladoData): SimuladoStats {
  const total = simulado.totalQuestions;
  let hits = 0;
  let misses = 0;
  let blanks = 0;
  let withoutKeyCount = 0;
  let noKeyAnswered = 0;
  let noKeyBlank = 0;
  let keyCount = 0;
  let userFilledCount = 0;

  for (let i = 0; i < total; i++) {
    const user = simulado.userAnswers[i];
    const key = simulado.keyAnswers[i];

    if (user !== null && user !== undefined) {
      userFilledCount++;
    }

    if (key !== null && key !== undefined) {
      keyCount++;
      if (user === null || user === undefined) {
        blanks++;
      } else if (user === key) {
        hits++;
      } else {
        misses++;
      }
    } else {
      withoutKeyCount++;
      if (user !== null && user !== undefined) {
        noKeyAnswered++;
      } else {
        noKeyBlank++;
      }
    }
  }

  const pctNum = keyCount > 0 ? (hits / keyCount) * 100 : 0;
  const flaggedCount = Array.isArray(simulado.flaggedQuestions)
    ? simulado.flaggedQuestions.length
    : 0;

  // Cálculo Cebraspe: Pontuação Líquida = Acertos - Erros
  const netScore = hits - misses;

  return {
    total,
    keyCount,
    withoutKeyCount,
    hits,
    misses,
    blanks,
    noKeyAnswered,
    noKeyBlank,
    userFilledCount,
    flaggedCount,
    percentage: pctNum,
    percentageFormatted: pctNum.toFixed(1),
    isPartialKey: keyCount < total,
    netScore,
  };
}

export type PerformanceTier = 'high' | 'medium' | 'low';

export interface PerformanceDisplayInfo {
  tier: PerformanceTier;
  label: string;
  statusLabel: string;
  statusLabelShort: string;
  badgeClass: string;
  badgeClassNotebook: string;
  badgeClassDark: string;
  barColorClass: string;
  textColor: string;
  borderColor: string;
  iconType: 'check' | 'alert' | 'cross';
}

/**
 * Calculates uniform visual tier, colors and labels across Sidebar, ScorePanel and Overview.
 * Differentiates between 'Corrected' (green) and 'Finished/Reviewed' (yellow/red).
 * High (>= 70%): Green ('Corrigida')
 * Medium (50% to 69.9%): Yellow/Amber ('Finalizada / Revisar')
 * Low (< 50% or Cebraspe netScore <= 0): Red ('Finalizada / Revisar')
 */
export function getPerformanceInfo(
  hits: number,
  totalEvaluated: number,
  examType: ExamType = 'multiple_choice',
  netScore?: number
): PerformanceDisplayInfo {
  const pct = totalEvaluated > 0 ? (hits / totalEvaluated) * 100 : 0;
  const isTF = examType === 'true_false';
  const effectiveNet = netScore !== undefined ? netScore : (hits - (totalEvaluated - hits));

  let tier: PerformanceTier = 'low';
  if (isTF) {
    if (hits === 0 || effectiveNet <= 0 || pct < 50) {
      tier = 'low';
    } else if (pct >= 70 && effectiveNet > 0) {
      tier = 'high';
    } else {
      tier = 'medium';
    }
  } else {
    if (pct >= 70) {
      tier = 'high';
    } else if (pct >= 50) {
      tier = 'medium';
    } else {
      tier = 'low';
    }
  }

  if (tier === 'high') {
    return {
      tier: 'high',
      label: pct === 100 ? 'Aproveitamento Total (100%)' : 'Alto Desempenho (Aprovado)',
      statusLabel: 'Corrigida',
      statusLabelShort: 'Corrigida',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      badgeClassNotebook: 'bg-[#edf5ee] text-[#1e4e30] border-[#c2ddc6]',
      badgeClassDark: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60',
      barColorClass: 'bg-emerald-600',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-300',
      iconType: 'check',
    };
  }

  if (tier === 'medium') {
    return {
      tier: 'medium',
      label: 'Desempenho Regular (Atenção aos Erros)',
      statusLabel: 'Concluída',
      statusLabelShort: 'Revisar',
      badgeClass: 'bg-amber-100 text-amber-950 border-amber-300',
      badgeClassNotebook: 'bg-[#fcf5e5] text-[#7d531a] border-[#e6d8b5]',
      badgeClassDark: 'bg-amber-950/60 text-amber-300 border-amber-700/60',
      barColorClass: 'bg-amber-500',
      textColor: 'text-amber-800',
      borderColor: 'border-amber-300',
      iconType: 'alert',
    };
  }

  return {
    tier: 'low',
    label: 'Abaixo da Média (Reforçar Conteúdo)',
    statusLabel: 'Concluída',
    statusLabelShort: 'Revisar',
    badgeClass: 'bg-red-100 text-red-900 border-red-300',
    badgeClassNotebook: 'bg-[#faf0ee] text-[#8a332c] border-[#eed1cb]',
    badgeClassDark: 'bg-rose-950/60 text-rose-300 border-rose-700/60',
    barColorClass: 'bg-red-600',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
    iconType: 'cross',
  };
}

/**
 * Formats answers as VOF numbered list: 1V, 2V, 3F, 4V, ...
 */
export function formatNumberedVOF(
  answers: (AnswerOption | null)[],
  separator: string = ', '
): string {
  return answers
    .map((ans, idx) => `${idx + 1}${ans || '-'}`)
    .join(separator);
}

/**
 * Generates sample numbered VOF text: 1V, 2V, 3F, 4V, ...
 */
export function generateSampleNumberedVOF(count: number): string {
  const items: string[] = [];
  const patterns = ['V', 'V', 'F', 'V', 'F', 'V', 'F', 'F', 'V', 'V'];
  for (let i = 1; i <= count; i++) {
    const letter = patterns[(i - 1) % patterns.length];
    items.push(`${i}${letter}`);
  }
  return items.join(', ');
}

/**
 * Intelligent parser that detects:
 * 1. JSON structure
 * 2. Numbered formats: "1-A", "1:B", "01. C", "Q1 D", "Questão 1: A", "1-V", "2:F", "1V", "2V", "3F", etc.
 * 3. Plain sequence of letters: "ABCDEABCD..." or "VVFVFF..." or "CCECEE..."
 */
export function parseAnswers(text: string, examType: ExamType = 'multiple_choice'): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { results: [], count: 0, mode: 'sequence', impliedTotal: 0 };
  }

  const isTF = examType === 'true_false';
  const allowedLetters = isTF ? VALID_LETTERS_TF : VALID_LETTERS_MC;

  const normalizeChar = (char: string): AnswerOption | null => {
    const up = char.toUpperCase();
    if (isTF) {
      if (up === 'V' || up === 'C') return 'V';
      if (up === 'F' || up === 'E') return 'F';
      return null;
    }
    return VALID_LETTERS_MC.includes(up as AnswerOption) ? (up as AnswerOption) : null;
  };

  // Try parsing as JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const results = parsed.map(item => {
          if (typeof item === 'string') {
            return normalizeChar(item);
          }
          return null;
        });
        const validCount = results.filter(Boolean).length;
        return {
          results,
          count: validCount,
          mode: 'json',
          impliedTotal: results.length,
        };
      } else if (parsed && typeof parsed === 'object') {
        const answers = parsed.userAnswers || parsed.keyAnswers || parsed.answers;
        if (Array.isArray(answers)) {
          const results = answers.map((item: unknown) => {
            if (typeof item === 'string') {
              return normalizeChar(item);
            }
            return null;
          });
          return {
            results,
            count: results.filter(Boolean).length,
            mode: 'json',
            impliedTotal: results.length,
          };
        }
      }
    } catch {
      // not valid json, fallback to text regexes
    }
  }

  // Look for numbered matches: e.g. "1V", "2F", "1 - A", "1:B", "01. C", "Questão 1: A", "1-V", "2:F", "Q3 C"
  // Separator is optional to support "1V, 2V, 3F, 4V" and "1A 2B 3C"
  const numberedPattern = isTF
    ? /(?:quest[aã]o\s*|item\s*|q\s*)?(\b\d{1,3})\s*[-:.)=–—/]?\s*([VvFfCcEe])\b/gi
    : /(?:quest[aã]o\s*|q\s*)?(\d{1,3})\s*[-:.)=–—/]?\s*([A-Ea-e])\b/gi;

  const matches = [...trimmed.matchAll(numberedPattern)];

  if (matches.length > 0) {
    const pairs: [number, AnswerOption][] = [];
    let maxIdx = 0;

    for (const m of matches) {
      const num = parseInt(m[1], 10);
      const letter = normalizeChar(m[2]);
      if (num >= 1 && letter) {
        const idx = num - 1;
        pairs.push([idx, letter]);
        if (idx + 1 > maxIdx) {
          maxIdx = idx + 1;
        }
      }
    }

    if (pairs.length > 0) {
      const results: (AnswerOption | null)[] = new Array(maxIdx).fill(null);
      for (const [idx, letter] of pairs) {
        results[idx] = letter;
      }
      return {
        results,
        count: pairs.length,
        mode: 'numbered',
        impliedTotal: maxIdx,
      };
    }
  }

  // Fallback: sequence of letters (ignoring spaces, punctuation, dashes)
  if (isTF) {
    // Convert C to V, E to F, keep V and F
    const cleanChars = trimmed
      .toUpperCase()
      .replace(/C/g, 'V')
      .replace(/E/g, 'F')
      .replace(/[^VF]/g, '');

    const results: (AnswerOption | null)[] = cleanChars.split('').map(char => {
      return (char === 'V' || char === 'F') ? (char as AnswerOption) : null;
    });

    return {
      results,
      count: results.filter(Boolean).length,
      mode: 'sequence',
      impliedTotal: results.length,
    };
  }

  const lettersOnly = trimmed.toUpperCase().replace(/[^A-E]/g, '');
  const results: (AnswerOption | null)[] = lettersOnly.split('').map(char => {
    return VALID_LETTERS_MC.includes(char as AnswerOption) ? (char as AnswerOption) : null;
  });

  return {
    results,
    count: results.filter(Boolean).length,
    mode: 'sequence',
    impliedTotal: results.length,
  };
}

/**
 * Format answers as a continuous sequential string (e.g. ABCDEABCDE)
 * with optional spacing every 5 or 10 questions for readability
 */
export function formatSequence(answers: (AnswerOption | null)[], chunkBy: number = 0): string {
  const chars = answers.map(a => a || '-');
  if (chunkBy <= 0) {
    return chars.join('');
  }
  const chunks: string[] = [];
  for (let i = 0; i < chars.length; i += chunkBy) {
    chunks.push(chars.slice(i, i + chunkBy).join(''));
  }
  return chunks.join(' ');
}

/**
 * Format answers as numbered list (e.g. 01: A, 02: B...)
 */
export function formatNumberedList(
  answers: (AnswerOption | null)[],
  onePerLine: boolean = true
): string {
  const lines: string[] = answers.map((ans, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    return `${num}: ${ans || '-'}`;
  });
  return onePerLine ? lines.join('\n') : lines.join(', ');
}

/**
 * Generates a complete exam simulation report ready to save in the user's folder
 */
export function generateFullReport(simulado: SimuladoData): string {
  const { title, date, totalQuestions, userAnswers, keyAnswers, timeSpentSeconds, notes, examType } = simulado;

  const stats = computeSimuladoStats(simulado);
  const safeTime = typeof timeSpentSeconds === 'number' && !isNaN(timeSpentSeconds) ? timeSpentSeconds : 0;
  const minutes = Math.floor(safeTime / 60);
  const seconds = safeTime % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isTF = examType === 'true_false';

  const header = [
    '================================================================',
    `GABARITO ONLINE - RELATÓRIO DO SIMULADO: ${title.toUpperCase()}`,
    '================================================================',
    `Data: ${date}`,
    `Tempo de Prova: ${timeFormatted}`,
    `Formato da Prova: ${isTF ? 'Verdadeiro ou Falso / Certo ou Errado (V ou F)' : 'Múltipla Escolha (A, B, C, D, E)'}`,
    `Total de Questões: ${totalQuestions}`,
    `Questões com Gabarito Oficial: ${stats.keyCount} de ${totalQuestions}`,
    stats.withoutKeyCount > 0
      ? `Questões sem Gabarito Oficial: ${stats.withoutKeyCount} (não avaliadas / pendentes)`
      : '',
    `Acertos: ${stats.hits} de ${stats.keyCount} avaliadas (${stats.percentageFormatted}%)`,
    `Erros: ${stats.misses}`,
    `Em branco (com gabarito oficial): ${stats.blanks}`,
    isTF
      ? `Pontuação Líquida (Padrão Cebraspe: Acertos - Erros): ${stats.netScore ?? (stats.hits - stats.misses)} pontos`
      : '',
    stats.flaggedCount > 0 ? `Marcadas para Revisão: ${stats.flaggedCount}` : '',
    notes ? `Observações: ${notes}` : '',
    '----------------------------------------------------------------',
    'SEQUÊNCIA DE MINHAS RESPOSTAS:',
    formatSequence(userAnswers, 10),
    '----------------------------------------------------------------',
    'SEQUÊNCIA DO GABARITO OFICIAL:',
    formatSequence(keyAnswers, 10),
    '----------------------------------------------------------------',
    'DETALHAMENTO QUESTÃO POR QUESTÃO:',
  ].filter(Boolean);

  const rows: string[] = [];
  for (let i = 0; i < totalQuestions; i++) {
    const qNum = String(i + 1).padStart(2, '0');
    const user = userAnswers[i] || 'EM BRANCO';
    const key = keyAnswers[i] || 'NÃO INFORMADO';
    const isFlagged = simulado.flaggedQuestions?.includes(i);
    const flagTag = isFlagged ? ' [DÚVIDA]' : '';
    let status = '---';

    if (keyAnswers[i] !== null && keyAnswers[i] !== undefined) {
      if (userAnswers[i] === keyAnswers[i]) {
        status = '✓ CERTA';
      } else if (!userAnswers[i]) {
        status = '○ EM BRANCO';
      } else {
        status = '✗ ERRADA';
      }
    } else {
      status = '--- SEM GABARITO (NÃO AVALIADA)';
    }

    rows.push(
      `Questão ${qNum}${flagTag}: [Sua: ${user.padEnd(2)}] | [Gabarito: ${key.padEnd(2)}] -> ${status}`
    );
  }

  return [...header, ...rows, '================================================================'].join(
    '\n'
  );
}

/**
 * Triggers a browser download of a text or JSON file
 */
export function downloadFile(filename: string, content: string, mimeType: string = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Resilient copy to clipboard with fallback for iframes and permission constraints
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback to execCommand if navigator.clipboard is blocked
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}

/**
 * Generates a realistic sample sequence of answers (A-E or V/F) with exact specified length
 */
export function generateSampleSequence(count: number, examType: ExamType = 'multiple_choice'): string {
  if (count <= 0) return '';
  if (examType === 'true_false') {
    const tfPatterns = ['VVFVF', 'FVFVV', 'VFVFF', 'FFVVV', 'VFVFV', 'VVFFV', 'FVVFF'];
    let res = '';
    let j = 0;
    while (res.length < count) {
      res += tfPatterns[j % tfPatterns.length];
      j++;
    }
    return res.slice(0, count);
  }

  const patterns = [
    'ABCDE',
    'BACDE',
    'CABDE',
    'DCBAE',
    'BCDEA',
    'CDEAB',
    'EDCBA',
    'AEBCD',
    'DABEC',
    'EADBC',
    'AECAB',
    'DBCCB',
    'EBDBA',
    'DEDCA',
  ];
  let result = '';
  let i = 0;
  while (result.length < count) {
    result += patterns[i % patterns.length];
    i++;
  }
  return result.slice(0, count);
}

/**
 * Generates a realistic test sequence of answers (~70% correct) based on the official key.
 * If no key is provided, falls back to generateSampleSequence.
 */
export function generateRealisticTestSequence(
  count: number,
  examType: ExamType = 'multiple_choice',
  keyAnswers?: (AnswerOption | null)[]
): string {
  if (count <= 0) return '';

  const hasKey = keyAnswers && keyAnswers.some(a => a !== null);
  if (!hasKey) {
    return generateSampleSequence(count, examType);
  }

  let res = '';
  const optionsMC = ['A', 'B', 'C', 'D', 'E'];
  const optionsTF = ['V', 'F'];

  for (let i = 0; i < count; i++) {
    const keyAns = keyAnswers![i];
    
    // If no key for this question, just guess randomly
    if (!keyAns) {
      if (examType === 'true_false') {
        res += optionsTF[Math.floor(Math.random() * optionsTF.length)];
      } else {
        res += optionsMC[Math.floor(Math.random() * optionsMC.length)];
      }
      continue;
    }

    // ~70% chance of being correct
    const isCorrect = Math.random() < 0.7;

    if (examType === 'true_false') {
      const correctChar = keyAns === 'V' ? 'V' : 'F';
      const wrongChar = correctChar === 'V' ? 'F' : 'V';
      res += isCorrect ? correctChar : wrongChar;
    } else {
      const correctChar = keyAns as string;
      if (isCorrect) {
        res += correctChar;
      } else {
        // Pick a random wrong answer
        const wrongOptions = optionsMC.filter(o => o !== correctChar);
        res += wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
      }
    }
  }

  return res;
}
