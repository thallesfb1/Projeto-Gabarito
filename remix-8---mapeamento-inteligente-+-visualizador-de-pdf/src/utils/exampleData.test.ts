import { describe, expect, it } from 'vitest';
import { generateExamplePair, applyAnswerImport } from './exampleData';
import { generateSampleSequence, generateSampleNumberedVOF, parseAnswers } from './parser';
import { generateSamplePairsText, generateSampleTableText, generateSampleSequenceText, parseOfficialKey } from './officialKeyParser';
import { createNewSimulado } from './provasManager';

describe('exemplos vinculados', () => {
  for (const type of ['multiple_choice', 'true_false'] as const) {
    for (const count of [7, 70, 120, 200]) {
      it(`${type}: todos os formatos têm ${count} itens e aproximadamente 70% de acertos nas duas ordens`, () => {
        const pair = generateExamplePair(count, type);
        const text = type === 'true_false' ? generateSampleNumberedVOF(count) : generateSampleSequence(count, type);
        const user = parseAnswers(text, type).results;
        expect(user).toEqual(pair.userAnswers);
        for (const generator of [generateSamplePairsText, generateSampleTableText, generateSampleSequenceText]) {
          const parsed = parseOfficialKey(generator(count, type), count, type);
          expect(parsed.detectedCount).toBe(count);
          expect(parsed.answers).toEqual(pair.keyAnswers);
          for (const first of ['user', 'key'] as const) {
            let proof = createNewSimulado('Teste', count, 0, type);
            proof = applyAnswerImport(proof, first, first === 'user' ? user : parsed.answers, count, true);
            proof = applyAnswerImport(proof, first === 'user' ? 'key' : 'user', first === 'user' ? parsed.answers : user, count, true);
            expect(proof.userAnswers.filter((answer, i) => answer === proof.keyAnswers[i])).toHaveLength(Math.round(count * .7));
          }
        }
      });
    }
  }
  it('preserva dados pessoais e desliga a vinculação após uma edição real', () => {
    const pair = generateExamplePair(120);
    let proof = applyAnswerImport(createNewSimulado('Real', 120), 'user', pair.userAnswers, 120, true);
    proof = applyAnswerImport(proof, 'key', pair.keyAnswers, 120, true);
    const real = Array(120).fill('E');
    proof = applyAnswerImport(proof, 'user', real);
    proof = applyAnswerImport(proof, 'key', pair.keyAnswers, 120, true);
    expect(proof.userAnswers).toEqual(real);
    expect(proof.exampleData?.user).toBe(false);
    proof = applyAnswerImport(proof, 'key', Array(120).fill('A'));
    proof = applyAnswerImport(proof, 'user', pair.userAnswers, 120, true);
    expect(proof.keyAnswers).toEqual(Array(120).fill('A'));
  });
});
