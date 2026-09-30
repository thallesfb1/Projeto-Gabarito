import { AnswerOption, ExamType } from '../types';
import { VALID_LETTERS_MC, VALID_LETTERS_TF } from './parser';

export type KeyFormatType = 'pairs' | 'table_blocks' | 'sequence' | 'json';

export interface KeyConflict {
  questionNumber: number; // 1-based question number
  conflictingLetters: AnswerOption[];
  description: string;
}

export interface KeyWarning {
  type: 'duplicate_same' | 'out_of_bounds' | 'table_mismatch' | 'multiple_notebooks' | 'info';
  message: string;
  questionNumber?: number;
}

export interface OfficialKeyParseResult {
  format: KeyFormatType;
  formatLabel: string;
  rawText: string;
  answers: (AnswerOption | null)[];
  detectedCount: number;
  recognizedQuestionNumbers: number[];
  missingQuestionNumbers: number[];
  outOfBoundsQuestions: { number: number; letter: AnswerOption }[];
  conflicts: KeyConflict[];
  warnings: KeyWarning[];
  hasBlockingConflicts: boolean;
}

/**
 * Normaliza um caractere de resposta para AnswerOption válido conforme o tipo de prova.
 * Para True/False (V/F), converte também 'C' (Certo) para 'V' e 'E' (Errado) para 'F'.
 */
function normalizeLetter(raw: string, examType: ExamType = 'multiple_choice'): AnswerOption | null {
  const up = raw.trim().toUpperCase();
  if (examType === 'true_false') {
    if (up === 'V' || up === 'C') return 'V';
    if (up === 'F' || up === 'E') return 'F';
    return null;
  }
  if (VALID_LETTERS_MC.includes(up as AnswerOption)) {
    return up as AnswerOption;
  }
  return null;
}

/**
 * Detecta se o texto copiado menciona múltiplos cadernos ou tipos de gabarito.
 */
function detectMultipleNotebooks(text: string): boolean {
  // Padrões comuns: "Tipo 1 ... Tipo 2", "Caderno A ... Caderno B", "Prova 01 ... Prova 02"
  const tipoMatches = text.match(/\b(?:tipo|modelo|caderno|gabarito)\s*[:#-]?\s*([0-9]+|[a-d]|amarela?|branca?|rosa|azul|verde)\b/gi);
  if (tipoMatches && tipoMatches.length >= 2) {
    const normalizedSet = new Set(
      tipoMatches.map(m => m.toLowerCase().replace(/[^a-z0-9]/g, ''))
    );
    if (normalizedSet.size >= 2) {
      return true;
    }
  }
  return false;
}

/**
 * Formato 3: Parser de tabelas em blocos (Linha de Números seguida de Linha de Alternativas)
 * Ex:
 * 1 2 3 4 5
 * A B C D E
 * ou com pipes: | 1 | 2 | 3 | \n | A | B | C |
 * ou com tabs de cópia de Excel / PDF.
 */
export function tryParseTableBlocks(
  text: string,
  totalQuestions: number,
  examType: ExamType = 'multiple_choice'
): {
  parsed: Map<number, AnswerOption[]>;
  warnings: KeyWarning[];
  matched: boolean;
} {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !/^[-+_|=~*]{3,}$/.test(l));

  const parsed = new Map<number, AnswerOption[]>();
  const warnings: KeyWarning[] = [];
  let matchedBlocksCount = 0;

  for (let i = 0; i < lines.length - 1; i++) {
    const lineNum = lines[i];
    const lineAns = lines[i + 1];

    // Ignora linhas puramente de borda ou pontuação sem letras nem números
    if (
      !/[0-9a-zA-Z]/.test(lineNum) ||
      !/[0-9a-zA-Z]/.test(lineAns) ||
      /^[\s|+=_\-–—~*#.]+$/.test(lineNum) ||
      /^[\s|+=_\-–—~*#.]+$/.test(lineAns)
    ) {
      continue;
    }

    // Extrai tokens numéricos da linha 1
    // Suporta delimitadores: pipes, tabs, espaços, ponto-e-vírgula
    const numTokens = lineNum
      .replace(/^[|/]+|[|/]+$/g, '')
      .split(/[|\t;,]+|\s{2,}/)
      .flatMap(chunk => chunk.trim().split(/\s+/))
      .map(t => t.replace(/[^0-9]/g, ''))
      .filter(t => t.length > 0 && !isNaN(Number(t)))
      .map(t => parseInt(t, 10));

    // Se temos pelo menos 2 números válidos na linha
    if (numTokens.length >= 2 && numTokens.every(n => n >= 1 && n <= 300)) {
      // Extrai tokens de alternativas da linha 2 preservando posições para evitar desalinhamento
      const rawAnsTokens = lineAns
        .replace(/^[|/]+|[|/]+$/g, '')
        .split(/[|\t;,]+|\s{2,}/)
        .flatMap(chunk => chunk.trim().split(/\s+/))
        .filter(t => t.length > 0);

      const ansTokens = rawAnsTokens.map(t => {
        const letter = normalizeLetter(t, examType);
        if (letter) return { type: 'valid' as const, letter };
        if (/^(\*|X|#|-|NULA|ANULADA|CANCELADA)$/i.test(t.trim())) {
          return { type: 'annulled' as const };
        }
        return { type: 'invalid' as const };
      });

      const validOrAnnulledCount = ansTokens.filter(t => t.type !== 'invalid').length;

      if (validOrAnnulledCount >= 2) {
        matchedBlocksCount++;

        // Checa divergência de quantidade entre a linha de números e a de respostas
        if (numTokens.length !== ansTokens.length) {
          warnings.push({
            type: 'table_mismatch',
            message: `Divergência no bloco de tabela: linha contém ${numTokens.length} número(s) mas ${ansTokens.length} resposta(s)/token(s) identificados.`,
          });
        }

        const count = Math.min(numTokens.length, ansTokens.length);
        for (let k = 0; k < count; k++) {
          const qNum = numTokens[k];
          const token = ansTokens[k];
          if (token.type === 'valid') {
            const existing = parsed.get(qNum) || [];
            existing.push(token.letter);
            parsed.set(qNum, existing);
          } else if (token.type === 'annulled') {
            warnings.push({
              type: 'info',
              message: `Questão ${qNum} está marcada como anulada/cancelada no gabarito oficial.`,
              questionNumber: qNum,
            });
          }
        }

        // Pula a linha de respostas já consumida
        i++;
      }
    }
  }

  return {
    parsed,
    warnings,
    matched: matchedBlocksCount > 0 && parsed.size >= 3,
  };
}

/**
 * Formato 2: Parser de pares de Questão e Resposta
 * Suporta:
 * 1-A, 2: B, 03 C, 4. D, 05=E / 1-V, 2-F, 3: C, 4. E
 * Associação não sequencial: associa estritamente ao número indicado.
 */
function tryParsePairs(
  text: string,
  examType: ExamType = 'multiple_choice'
): {
  parsed: Map<number, AnswerOption[]>;
  matched: boolean;
} {
  const parsed = new Map<number, AnswerOption[]>();

  // Suporta: 1V, 2F, 1-A, 2: B, 03 C, 4. D, 05=E / 1-V, 2-F, 3: C, 4. E, 1V, 2V, 3F, 4V
  // Associação não sequencial: associa estritamente ao número indicado.
  const pairRegex = examType === 'true_false'
    ? /(?:(?:quest[aã]o|item|q\.?)\s*)?(\b\d{1,3})\s*[-:.)=–—/]?\s*([VvFfCcEe])\b/gi
    : /(?:(?:quest[aã]o|item|q\.?)\s*)?(\b\d{1,3})\s*[-:.)=–—/]?\s*([A-Ea-e])\b/gi;

  const matches = [...text.matchAll(pairRegex)];

  if (matches.length >= 2) {
    for (const m of matches) {
      const qNum = parseInt(m[1], 10);
      const letter = normalizeLetter(m[2], examType);
      if (qNum >= 1 && qNum <= 300 && letter) {
        const existing = parsed.get(qNum) || [];
        existing.push(letter);
        parsed.set(qNum, existing);
      }
    }
    return {
      parsed,
      matched: parsed.size >= 2,
    };
  }

  return {
    parsed,
    matched: false,
  };
}

/**
 * Limpa palavras comuns de cabeçalhos institucionais em português para não confundir
 * palavras que contenham letras com alternativas contínuas.
 */
function cleanHeaderAndWords(text: string, examType: ExamType = 'multiple_choice'): string {
  let cleaned = text;

  // Se a linha começar com prefixos do tipo "Gabarito: ABCDE" ou "Respostas: ABCDE"
  cleaned = cleaned.replace(/^(?:gabarito(?:\s+oficial|\s+preliminar|\s+definitivo)?|respostas?)\s*[:=-]\s*/gim, '');

  // Remove linhas típicas de cabeçalhos institucionais
  const headerPatterns = [
    /\bconcurso\s+p[uú]blico\b/gi,
    /\bgabarito\s+(?:oficial|preliminar|definitivo)\b/gi,
    /\bprova\s+(?:objetiva|discursiva|escrita)\b/gi,
    /\bcargo\s*:\s*[^\n\r]+/gi,
    /\bdisciplina\s*:\s*[^\n\r]+/gi,
    /\bl[ií]ngua\s+portuguesa\b/gi,
    /\bconhecimentos\s+(?:gerais|b[aá]sicos|espec[ií]ficos)\b/gi,
    /\bbanca\s+examinadora\b/gi,
    /\bfolha\s+de\s+respostas\b/gi,
    /\bcaderno\s+de\s+quest[oõ]es\b/gi,
    /\btipo\s+[0-9a-d]\b/gi,
  ];

  for (const pat of headerPatterns) {
    cleaned = cleaned.replace(pat, ' ');
  }

  if (examType === 'true_false') {
    // Remove palavras com 3 ou mais letras que não sejam sequência de V, F, C, E
    cleaned = cleaned.replace(/\b[A-Za-zÀ-ÿ]{3,}\b/g, match => {
      const isOnlyTF = /^[VFCEvfce]+$/.test(match);
      return isOnlyTF ? match : ' ';
    });
  } else {
    // Remove palavras com 3 ou mais letras que não sejam sequência exclusiva de letras A-E
    cleaned = cleaned.replace(/\b[A-Za-zÀ-ÿ]{3,}\b/g, match => {
      const isOnlyAE = /^[A-Ea-e]+$/.test(match);
      return isOnlyAE ? match : ' ';
    });
  }

  return cleaned;
}

/**
 * Formato 1: Parser de sequência contínua de alternativas
 */
function parseContinuousSequence(
  text: string,
  totalQuestions: number,
  examType: ExamType = 'multiple_choice'
): {
  answers: (AnswerOption | null)[];
  detectedCount: number;
  outOfBounds: { number: number; letter: AnswerOption }[];
} {
  const cleaned = cleanHeaderAndWords(text, examType);
  const letters: AnswerOption[] = [];
  const letterRegex = examType === 'true_false' ? /[VvFfCcEe]/g : /[A-Ea-e]/g;
  let match: RegExpExecArray | null;

  while ((match = letterRegex.exec(cleaned)) !== null) {
    const l = normalizeLetter(match[0], examType);
    if (l) {
      letters.push(l);
    }
  }

  const answers: (AnswerOption | null)[] = new Array(totalQuestions).fill(null);
  const outOfBounds: { number: number; letter: AnswerOption }[] = [];

  for (let i = 0; i < letters.length; i++) {
    const qNum = i + 1;
    if (qNum <= totalQuestions) {
      answers[i] = letters[i];
    } else {
      outOfBounds.push({ number: qNum, letter: letters[i] });
    }
  }

  const detectedCount = answers.filter(Boolean).length;

  return {
    answers,
    detectedCount,
    outOfBounds,
  };
}

/**
 * Função principal do Parser Multiformato Inteligente para Gabarito Oficial.
 * Processa o texto fornecido e valida segundo a quantidade total de questões da prova e o tipo (Múltipla Escolha ou V/F).
 */
export function parseOfficialKey(
  rawText: string,
  totalQuestions: number,
  examType: ExamType = 'multiple_choice'
): OfficialKeyParseResult {
  const trimmed = rawText.trim();

  // Estado inicial vazio
  if (!trimmed) {
    return {
      format: 'sequence',
      formatLabel: 'Sequência Contínua',
      rawText: '',
      answers: new Array(totalQuestions).fill(null),
      detectedCount: 0,
      recognizedQuestionNumbers: [],
      missingQuestionNumbers: Array.from({ length: totalQuestions }, (_, i) => i + 1),
      outOfBoundsQuestions: [],
      conflicts: [],
      warnings: [],
      hasBlockingConflicts: false,
    };
  }

  const warnings: KeyWarning[] = [];

  // 1. Auditoria de múltiplos cadernos / tipos de prova no texto
  if (detectMultipleNotebooks(trimmed)) {
    warnings.push({
      type: 'multiple_notebooks',
      message:
        'Atenção: O texto parece conter mais de um tipo ou caderno de prova (ex: Tipo 1 / Tipo 2 / Caderno A). Verifique se copiou apenas o gabarito correspondente à sua prova.',
    });
  }

  // 2. Tenta Formato 3: Tabela em Blocos
  const tableResult = tryParseTableBlocks(trimmed, totalQuestions, examType);
  if (tableResult.matched) {
    warnings.push(...tableResult.warnings);
    return buildResultFromMap(
      'table_blocks',
      'Tabela em Blocos (Números + Respostas)',
      trimmed,
      tableResult.parsed,
      totalQuestions,
      warnings
    );
  }

  // 3. Tenta Formato 2: Pares de Questão e Resposta
  const pairsResult = tryParsePairs(trimmed, examType);
  if (pairsResult.matched) {
    return buildResultFromMap(
      'pairs',
      examType === 'true_false' ? 'Pares Questão-Resposta (ex: 01-V / 02-C)' : 'Pares Questão-Resposta (ex: 01-A)',
      trimmed,
      pairsResult.parsed,
      totalQuestions,
      warnings
    );
  }

  // 4. Formato 1: Sequência Contínua de Alternativas
  const seqResult = parseContinuousSequence(trimmed, totalQuestions, examType);

  if (seqResult.outOfBounds.length > 0) {
    warnings.push({
      type: 'out_of_bounds',
      message: `Foram encontradas ${seqResult.outOfBounds.length} resposta(s) acima do limite de ${totalQuestions} questões desta prova (questões ${seqResult.outOfBounds
        .slice(0, 5)
        .map(o => o.number)
        .join(', ')}${seqResult.outOfBounds.length > 5 ? '...' : ''}).`,
    });
  }

  const recognizedQuestionNumbers: number[] = [];
  const missingQuestionNumbers: number[] = [];

  for (let i = 0; i < totalQuestions; i++) {
    const qNum = i + 1;
    if (seqResult.answers[i] !== null) {
      recognizedQuestionNumbers.push(qNum);
    } else {
      missingQuestionNumbers.push(qNum);
    }
  }

  return {
    format: 'sequence',
    formatLabel: examType === 'true_false' ? 'Sequência de Itens (V/F ou C/E)' : 'Sequência Contínua de Alternativas',
    rawText,
    answers: seqResult.answers,
    detectedCount: seqResult.detectedCount,
    recognizedQuestionNumbers,
    missingQuestionNumbers,
    outOfBoundsQuestions: seqResult.outOfBounds,
    conflicts: [],
    warnings,
    hasBlockingConflicts: false,
  };
}

/**
 * Constrói o resultado de auditoria a partir de um Map de questão para respostas extraídas.
 * Aplica estritamente as regras de duplicidade idêntica vs alternativas conflitantes.
 */
function buildResultFromMap(
  format: KeyFormatType,
  formatLabel: string,
  rawText: string,
  questionMap: Map<number, AnswerOption[]>,
  totalQuestions: number,
  initialWarnings: KeyWarning[]
): OfficialKeyParseResult {
  const answers: (AnswerOption | null)[] = new Array(totalQuestions).fill(null);
  const recognizedQuestionNumbers: number[] = [];
  const missingQuestionNumbers: number[] = [];
  const outOfBoundsQuestions: { number: number; letter: AnswerOption }[] = [];
  const conflicts: KeyConflict[] = [];
  const warnings: KeyWarning[] = [...initialWarnings];

  // Itera sobre as questões cadastradas no Map
  for (const [qNum, letterList] of questionMap.entries()) {
    // Checa limites da prova atual
    if (qNum < 1 || qNum > totalQuestions) {
      if (qNum > totalQuestions) {
        letterList.forEach(l => outOfBoundsQuestions.push({ number: qNum, letter: l }));
      }
      continue;
    }

    const uniqueLetters = Array.from(new Set(letterList));

    if (uniqueLetters.length > 1) {
      // REGRA: Conflito divergente -> NUNCA adivinhar nem escolher.
      // Resposta deixada em branco/nula e conflito apontado como bloqueante.
      answers[qNum - 1] = null;
      conflicts.push({
        questionNumber: qNum,
        conflictingLetters: uniqueLetters,
        description: `Questão ${String(qNum).padStart(2, '0')} possui respostas divergentes no texto: [${uniqueLetters.join(', ')}].`,
      });
    } else if (uniqueLetters.length === 1) {
      // REGRA: Resposta única ou duplicadas idênticas
      const singleLetter = uniqueLetters[0];
      answers[qNum - 1] = singleLetter;
      recognizedQuestionNumbers.push(qNum);

      if (letterList.length > 1) {
        warnings.push({
          type: 'duplicate_same',
          message: `Questão ${String(qNum).padStart(2, '0')} aparece ${letterList.length}x com a mesma resposta (${singleLetter}).`,
          questionNumber: qNum,
        });
      }
    }
  }

  // Ordena números reconhecidos
  recognizedQuestionNumbers.sort((a, b) => a - b);

  // Determina questões ausentes estritamente no intervalo [1, totalQuestions]
  for (let q = 1; q <= totalQuestions; q++) {
    if (!recognizedQuestionNumbers.includes(q)) {
      missingQuestionNumbers.push(q);
    }
  }

  if (outOfBoundsQuestions.length > 0) {
    const uniqueOutOfBoundsNumbers = Array.from(
      new Set(outOfBoundsQuestions.map(o => o.number))
    ).sort((a, b) => a - b);

    warnings.push({
      type: 'out_of_bounds',
      message: `Foram encontradas ${uniqueOutOfBoundsNumbers.length} questão(ões) acima do total desta prova (${totalQuestions}): questões ${uniqueOutOfBoundsNumbers
        .slice(0, 6)
        .join(', ')}${uniqueOutOfBoundsNumbers.length > 6 ? '...' : ''}.`,
    });
  }

  // Conflitos bloqueantes se houver alternativas divergentes
  const hasBlockingConflicts = conflicts.length > 0;

  return {
    format,
    formatLabel,
    rawText,
    answers,
    detectedCount: recognizedQuestionNumbers.length,
    recognizedQuestionNumbers,
    missingQuestionNumbers,
    outOfBoundsQuestions,
    conflicts,
    warnings,
    hasBlockingConflicts,
  };
}

/**
 * Geradores de exemplos de teste para a interface do usuário
 */
export function generateSamplePairsText(total: number = 70, examType: ExamType = 'multiple_choice'): string {
  const isTF = examType === 'true_false';
  const sampleLetters: AnswerOption[] = isTF ? ['V', 'F'] : ['A', 'B', 'C', 'D', 'E'];
  const pairs: string[] = [];
  const limit = Math.min(total, 50);
  for (let i = 1; i <= limit; i++) {
    const letter = isTF
      ? (i % 3 === 0 ? 'F' : 'V')
      : sampleLetters[(i - 1 + (i % 3)) % 5];
    if (isTF) {
      pairs.push(`${i}${letter}`);
    } else {
      pairs.push(`${String(i).padStart(2, '0')}-${letter}`);
    }
  }
  // Quebra em linhas de 5 pares
  const lines: string[] = [];
  for (let i = 0; i < pairs.length; i += 5) {
    lines.push(pairs.slice(i, i + 5).join(isTF ? ', ' : '   '));
  }
  return lines.join('\n');
}

export function generateSampleTableText(total: number = 70, examType: ExamType = 'multiple_choice'): string {
  const isTF = examType === 'true_false';
  const sampleLetters: AnswerOption[] = isTF ? ['V', 'F'] : ['A', 'B', 'C', 'D', 'E'];
  const blockSize = 10;
  const count = Math.min(total, 40);
  const blocks: string[] = [];

  for (let start = 1; start <= count; start += blockSize) {
    const end = Math.min(start + blockSize - 1, count);
    const nums: string[] = [];
    const letters: string[] = [];

    for (let q = start; q <= end; q++) {
      nums.push(String(q).padStart(2, '0'));
      const letter = isTF
        ? (q % 2 === 0 ? 'V' : 'F')
        : sampleLetters[(q + 1) % 5];
      letters.push(letter);
    }

    blocks.push(nums.join('\t'));
    blocks.push(letters.join('\t'));
  }

  return blocks.join('\n');
}

export function generateSampleSequenceText(total: number = 70, examType: ExamType = 'multiple_choice'): string {
  const isTF = examType === 'true_false';
  const sampleLetters: AnswerOption[] = isTF ? ['V', 'F'] : ['A', 'B', 'C', 'D', 'E'];
  const count = Math.min(total, 70);
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const letter = isTF
      ? (i % 2 === 0 ? 'V' : 'F')
      : sampleLetters[(i + (i % 2)) % 5];
    result.push(letter);
  }
  return result.join('');
}
