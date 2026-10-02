import { describe, expect, it } from 'vitest';
import { parseAnswers, formatSequence, formatNumberedList, computeSimuladoStats } from './parser';
import { createNewSimulado } from './provasManager';
import { parseOfficialKey } from './officialKeyParser';

describe('importação de respostas', () => {
  it('preserva posições vazias ao exportar e reimportar sequências e listas', () => {
    const answers = ['A', null, 'C', null] as const;
    expect(parseAnswers(formatSequence([...answers])).results).toEqual(answers);
    expect(parseAnswers(formatNumberedList([...answers])).results).toEqual(answers);
  });
  it('converte C/E em V/F sem deslocar brancos', () => {
    expect(parseAnswers('C-EF', 'true_false').results).toEqual(['V', null, 'F', 'F']);
    expect(parseAnswers('1C, 3E', 'true_false').results).toEqual(['V', null, 'F']);
  });
  it('seleciona o gabarito oficial do JSON em vez das respostas do estudante', () => {
    const payload = JSON.stringify({ userAnswers: ['A'], keyAnswers: ['B'] });
    expect(parseAnswers(payload, 'multiple_choice', 'key').results).toEqual(['B']);
  });
  it('rejeita JSON inválido, texto livre e números excessivos', () => {
    for (const input of ['{ "answers":', 'Este texto não é uma sequência', '999999999A', '["V"]']) expect(parseAnswers(input).error).toBeTruthy();
  });
  it('rejeita divergências e conta duplicatas idênticas apenas uma vez', () => {
    expect(parseAnswers('1A, 1B').error).toBeTruthy();
    expect(parseAnswers('1A, 1A, 2C').count).toBe(2);
  });
  it('aceita um único par e mantém vazios no gabarito oficial', () => {
    expect(parseOfficialKey('3-C', 4).answers).toEqual([null, null, 'C', null]);
    expect(parseOfficialKey('A-C-', 4).answers).toEqual(['A', null, 'C', null]);
  });
  it('detecta conflitos no gabarito oficial', () => {
    const result = parseOfficialKey('1-A 1-B 2-C', 3);
    expect(result.hasBlockingConflicts).toBe(true);
    expect(result.answers).toEqual([null, 'C', null]);
  });
  it('não conta questões sem gabarito como erro e calcula nota líquida', () => {
    const prova = { ...createNewSimulado('Teste', 4, 0, 'true_false'), userAnswers: ['V', 'V', null, 'F'] as const, keyAnswers: ['V', 'F', 'V', null] as const };
    expect(computeSimuladoStats({ ...prova, userAnswers: [...prova.userAnswers], keyAnswers: [...prova.keyAnswers] })).toMatchObject({ hits: 1, misses: 1, blanks: 1, withoutKeyCount: 1, netScore: 0 });
  });
});
