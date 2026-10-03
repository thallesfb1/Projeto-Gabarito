import { describe, expect, it } from 'vitest';
import { createNewSimulado, sanitizeSimulado } from './provasManager';
import { compatibleFlashcardDeck, flashcardSources, flashcardSourceKey, sanitizeFlashcardDeck, selectFlashcardSources, validateFlashcardPriority, validateFlashcardRequest, validateFlashcards } from './flashcards';

const proof = { ...createNewSimulado('Teste', 4), isCorrected: true, userAnswers: ['A', 'A', null, 'B'] as const, keyAnswers: ['B', 'A', 'C', null] as const, subjectRanges: [{ id: 'math', name: 'Matemática', start: 1, end: 4, color: 'blue' as const }] };
const mutableProof = () => ({ ...proof, userAnswers: [...proof.userAnswers], keyAnswers: [...proof.keyAnswers] });
const card = { subject: 'Matemática', topic: 'Frações', front: 'Como somar frações?', back: 'Use um denominador comum e some os numeradores.', questionNumbers: [1] };
describe('revisão por erros da prova', () => {
  it('prioriza erros e complementa com acertos, excluindo questões em branco e itens sem gabarito', () => {
    const sources = flashcardSources(mutableProof()); expect(sources.map(q => q.number)).toEqual([1, 2]); expect(sources.map(q => q.result)).toEqual(['wrong', 'correct']); expect(sources[0].subject).toBe('Matemática');
    expect(flashcardSources({ ...mutableProof(), isCorrected: false })).toEqual([]);
    expect(flashcardSources({ ...mutableProof(), isResultOutdated: true })).toEqual([]);
  });
  it('prioriza disciplina mapeada e preserva o enunciado e a alternativa correta', () => {
    const source = flashcardSources({ ...mutableProof(), extractedQuestions: [{ number: 1, subject: 'Extração', statement: 'Um enunciado', options: [{ label: 'B', text: 'Alternativa oficial' }] }] })[0];
    expect(source.subject).toBe('Matemática'); expect(source.statement).toBe('Um enunciado'); expect(source.correctAnswer).toBe('B'); expect(source.options[0].text).toBe('Alternativa oficial');
    expect(flashcardSources({ ...mutableProof(), subjectRanges: [] })).toEqual([]);
  });
  it('invalida o conjunto quando respostas, gabarito ou disciplinas mudam, mas mantém progresso de revisão', () => {
    const base = mutableProof(); const key = flashcardSourceKey(base);
    expect(flashcardSourceKey({ ...base, reviewedQuestionIndexes: [0], updatedAt: '2026-10-02' })).toBe(key);
    expect(flashcardSourceKey({ ...base, userAnswers: ['C', 'A', null, 'B'] })).not.toBe(key);
    expect(flashcardSourceKey({ ...base, keyAnswers: ['C', 'A', 'C', null] })).not.toBe(key);
    expect(flashcardSourceKey({ ...base, subjectRanges: [] })).not.toBe(key);
  });
  it('preserva uma rodada da versão anterior sem reutilizá-la após alterar a prova',()=>{
    const saved={...mutableProof(),id:'legacy-proof',examType:'multiple_choice' as const,flashcardDeck:{sourceKey:'v1-177-80a24dc2',createdAt:'2026-10-02T10:00:00Z',cards:validateFlashcards([card],[1]),masteredCardIds:['card-1']}};
    expect(compatibleFlashcardDeck(saved)).toMatchObject({sourceKey:flashcardSourceKey(saved),masteredCardIds:['card-1']});
    expect(compatibleFlashcardDeck({...saved,userAnswers:['C','A',null,'B']})).toBeUndefined();
  });
  it('distribui uma rodada limitada entre disciplinas', () => {
    const source = flashcardSources(mutableProof())[0];
    const sources = [...Array.from({ length: 35 }, (_, i) => ({ ...source, number: i + 1 })), { ...source, number: 40, subject: 'Português' }];
    const selected = selectFlashcardSources(sources); expect(selected).toHaveLength(30); expect(selected[1].number).toBe(40); expect(sources).toHaveLength(36);
  });
  it('rejeita referências inventadas, classificação adulterada, falta de contexto e cartões duplicados', () => {
    expect(() => validateFlashcards([{ ...card, questionNumbers: [2] }], [1])).toThrow('não corresponde');
    expect(() => validateFlashcards([card, card], [1])).toThrow('repetidos');
    expect(() => validateFlashcardRequest([{ ...flashcardSources(mutableProof())[0], userAnswer: 'B' }])).toThrow('classificação');
    expect(() => validateFlashcardRequest([{ ...flashcardSources(mutableProof())[0], subject: '' }])).toThrow('Falta');
  });
  it('usa somente erros quando existem pelo menos cinco com contexto e reforça acertos sem erros', () => {
    const base = { ...createNewSimulado('Rodada', 8), isCorrected: true, subjectRanges: [{ id:'m', name:'Matemática', start:1, end:8, color:'blue' as const }] };
    const many = flashcardSources({ ...base, userAnswers: ['A','A','A','A','A','B','B','B'], keyAnswers: Array(8).fill('B') });
    expect(many.map(source=>source.number)).toEqual([1,2,3,4,5]);
    const correct = flashcardSources({ ...base, userAnswers: Array(8).fill('B'), keyAnswers: Array(8).fill('B') });
    expect(correct).toHaveLength(8); expect(validateFlashcardRequest(correct).every(source=>source.result==='correct')).toBe(true);
    expect(()=>validateFlashcardRequest([...many,correct[5]])).toThrow('cinco');
  });
  it('preserva todos os poucos erros antes de selecionar acertos e exige pelo menos 70% dos cartões sobre erros', () => {
    const sources=flashcardSources(mutableProof());
    const manyCorrect=Array.from({length:20},(_,index)=>({...sources[1],number:index+2}));
    const selected=selectFlashcardSources([...manyCorrect,sources[0]]);
    expect(selected).toHaveLength(10); expect(selected[0].number).toBe(1);
    const cards=Array.from({length:10},(_,index)=>({...card,id:`card-${index}`,front:`Pergunta ${index}`,questionNumbers:[index<7?1:2]}));
    expect(()=>validateFlashcardPriority(cards,sources)).not.toThrow();
    expect(()=>validateFlashcardPriority(cards.map((item,index)=>index===6?{...item,questionNumbers:[2]}:item),sources)).toThrow('priorizou');
    expect(()=>validateFlashcardPriority(cards,[sources[1]])).not.toThrow();
  });
  it('valida cartões e preserva o conjunto e seu progresso no backup', () => {
    const deck = { sourceKey: flashcardSourceKey(mutableProof()), createdAt: '2026-10-02T10:00:00Z', cards: validateFlashcards([card], [1]), masteredCardIds: ['card-1', 'unknown'] };
    expect(sanitizeSimulado({ ...mutableProof(), flashcardDeck: deck }).flashcardDeck?.masteredCardIds).toEqual(['card-1']);
    expect(sanitizeFlashcardDeck({ ...deck, cards: [{ ...card, back: '' }] })).toBeUndefined();
  });
  it('exige contexto e explicação nas novas rodadas e preserva campos didáticos no backup', () => {
    expect(() => validateFlashcards([card], [1], true)).toThrow('contexto');
    const richer = { ...card, context: 'Considere 1/2 + 1/3.', explanation: 'As partes precisam ter o mesmo tamanho para somar.', example: '3/6 + 2/6 = 5/6.', pitfall: '' };
    const deck = { sourceKey: flashcardSourceKey(mutableProof()), createdAt: '2026-10-02T10:00:00Z', cards: validateFlashcards([richer], [1], true), masteredCardIds: [] };
    expect(sanitizeSimulado({ ...mutableProof(), flashcardDeck: deck }).flashcardDeck?.cards[0]).toMatchObject({ context: richer.context, explanation: richer.explanation, example: richer.example });
    expect(() => validateFlashcards([{ ...richer, explanation: '' }], [1], true)).toThrow('explicação');
    expect(() => validateFlashcards([{ ...richer, context: 'x'.repeat(601) }], [1])).toThrow('contexto');
    expect(sanitizeFlashcardDeck({ ...deck, cards: [card] })?.cards[0].front).toBe(card.front);
  });
});
