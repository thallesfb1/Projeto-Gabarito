import { describe, expect, it } from 'vitest';
import { aiReviewWarnings } from './aiReadingWarnings';
import { applyAIReading } from './aiImport';

const processingNotes = [
  'A página 2 está em branco no documento original.',
  'A classificação das disciplinas foi inferida a partir dos cabeçalhos presentes nas páginas 3, 4 e 5.',
  'O documento contém 4 partes. Esta é a parte 2 de 4.',
  'As questões 9 a 12 foram classificadas como Língua Portuguesa por inferência de conteúdo.',
  'As questões 13 a 20 foram classificadas como Língua Inglesa por cabeçalho.',
  'A numeração das questões no documento original inicia em 33 e termina em 70 nesta parte do arquivo.',
  "As questões 33 a 35 foram classificadas como 'Direito Ambiental e Sustentabilidade' por inferência de conteúdo.",
  "As questões 36 a 40 foram classificadas como 'Legislação Acerca de Segurança da Informação e Proteção de Dados' conforme cabeçalho.",
  'A classificação das disciplinas foi inferida com base no conteúdo das questões, pois não havia cabeçalhos explícitos separando as matérias.',
  'O documento fornecido contém apenas as questões de 56 a 70.',
];

describe('avisos úteis na conferência de IA', () => {
  it('suprime os relatos das partes, mas preserva dúvidas, conflitos e avisos desconhecidos', () => {
    const attention = [
      'Confira a questão 9: houve diferenças nas alternativas entre as páginas sobrepostas.',
      'As questões 1 a 6 não foram encontradas no documento fornecido.',
      'Questão 4: figura não transcrita; consulte o PDF original.',
      'O gabarito está incompleto. Respostas ausentes ou ilegíveis permanecerão em branco.',
      'As questões 9 a 12 foram classificadas por inferência de conteúdo. Confira a disciplina, pois há dúvida.',
      'A página 2 está em branco; confira se faltam questões no arquivo.',
      'Há duas versões do caderno no arquivo.',
    ];
    expect(aiReviewWarnings([...processingNotes, ...attention, attention[0]])).toEqual(attention);
  });

  it('salva o mapa das questões sem incorporar classificações conflitantes descritas nos relatos', () => {
    const result = { title: 'Prova', examType: 'multiple_choice' as const, totalQuestions: 2,
      questions: [1, 2].map(number => ({ number, statement: 'Enunciado', subject: 'Atualidades', options: [] })),
      answers: [], warnings: [...processingNotes, 'Questão 2: consulte a figura no PDF.'] };
    const proof = applyAIReading(result, 'exam', null);
    expect(proof.subjectRanges).toMatchObject([{ name: 'Atualidades', start: 1, end: 2 }]);
    expect(proof.notes).toBe('Questão 2: consulte a figura no PDF.');
  });
});
