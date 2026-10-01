import { SimuladoData, SimuladoQuestionItem } from '../types';
import { generateSimuladoId } from './provasManager';

export function createDemoSimulado(): SimuladoData {
  const date = new Date().toISOString().split('T')[0];
  
  const questions: SimuladoQuestionItem[] = [
    {
      number: 1,
      statement: 'Sobre a responsabilidade civil do Estado, no direito administrativo brasileiro, adotou-se como regra a teoria do(a):',
      options: [
        { letter: 'A', text: 'Risco Integral.' },
        { letter: 'B', text: 'Culpa Administrativa.' },
        { letter: 'C', text: 'Risco Administrativo.' },
        { letter: 'D', text: 'Irresponsabilidade do Estado.' },
        { letter: 'E', text: 'Culpa Civil.' }
      ],
      officialAnswer: 'C',
      subject: 'Direito Administrativo',
      topic: 'Responsabilidade Civil do Estado',
      explanation: 'A Constituição Federal de 1988 (art. 37, § 6º) adotou, como regra geral, a teoria do risco administrativo para a responsabilidade civil do Estado.'
    },
    {
      number: 2,
      statement: 'Assinale a alternativa que apresenta um caso de crase obrigatória.',
      options: [
        { letter: 'A', text: 'Chegamos a noite e fomos dormir.' },
        { letter: 'B', text: 'Vou a Brasília amanhã.' },
        { letter: 'C', text: 'O aluno fez referência a provas antigas.' },
        { letter: 'D', text: 'Foi entregue a ele.' },
        { letter: 'E', text: 'Referiu-se às meninas educadamente.' }
      ],
      officialAnswer: 'E',
      subject: 'Português',
      topic: 'Crase',
      explanation: 'Ocorre crase na união da preposição "a" (exigida por referir-se) com o artigo definido feminino plural "as" (que antecede meninas).'
    },
    {
      number: 3,
      statement: 'Na organização político-administrativa da República Federativa do Brasil, constituem entes federativos dotados de autonomia política, administrativa e financeira:',
      options: [
        { letter: 'A', text: 'União, Estados, Municípios e Territórios Federais.' },
        { letter: 'B', text: 'União, Estados, Distrito Federal e Municípios.' },
        { letter: 'C', text: 'União e Estados apenas.' },
        { letter: 'D', text: 'União, Estados e Regiões Metropolitanas.' },
        { letter: 'E', text: 'Estados, Municípios e Agências Reguladoras.' }
      ],
      officialAnswer: 'B',
      subject: 'Direito Constitucional',
      topic: 'Organização do Estado',
      explanation: 'Conforme o art. 18 da CF/88: "A organização político-administrativa da República Federativa do Brasil compreende a União, os Estados, o Distrito Federal e os Municípios, todos autônomos".'
    },
    {
      number: 4,
      statement: 'Considerando as regras de acentuação gráfica da língua portuguesa, assinale a palavra que obedece à mesma regra de acentuação de "próprio":',
      options: [
        { letter: 'A', text: 'Café' },
        { letter: 'B', text: 'Máquina' },
        { letter: 'C', text: 'Econômico' },
        { letter: 'D', text: 'Água' },
        { letter: 'E', text: 'Cipó' }
      ],
      officialAnswer: 'D',
      subject: 'Português',
      topic: 'Acentuação Gráfica',
      explanation: 'Ambas as palavras ("próprio" e "água") são paroxítonas terminadas em ditongo crescente, regra que exige a acentuação gráfica.'
    },
    {
      number: 5,
      statement: 'De acordo com os princípios orçamentários, o princípio que determina que todas as receitas e despesas de todos os poderes devem constar em uma única peça orçamentária é o princípio da:',
      options: [
        { letter: 'A', text: 'Universalidade.' },
        { letter: 'B', text: 'Exclusividade.' },
        { letter: 'C', text: 'Unidade.' },
        { letter: 'D', text: 'Anualidade.' },
        { letter: 'E', text: 'Clareza.' }
      ],
      officialAnswer: 'C',
      subject: 'AFO',
      topic: 'Princípios Orçamentários',
      explanation: 'O princípio da Unidade (ou Totalidade) determina que o orçamento deve ser uno, abrangendo todas as receitas e despesas em um único documento, para evitar múltiplos orçamentos paralelos.'
    }
  ];

  const totalQuestions = 5;
  // User answers (got 1, 3 and 5 correct, but 2 and 4 wrong)
  const userAnswers = ['C', 'A', 'B', 'C', 'C'];
  const keyAnswers = ['C', 'E', 'B', 'D', 'C'];

  return {
    id: generateSimuladoId(),
    title: '📝 Demonstração Pronta (5 Questões)',
    date,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalQuestions,
    userAnswers: userAnswers as any,
    keyAnswers: keyAnswers as any,
    flaggedQuestions: [],
    isCorrected: true, // Já corrigido para ver os flashcards direto!
    isLocked: true,
    timeSpentSeconds: 15 * 60, // 15 mins
    examType: 'multiple_choice',
    questions,
    // Flashcards already generated for the wrong questions (2 and 4)
    flashcards: [
      {
        id: 'flashcard-demo-1',
        topic: 'Crase (Português)',
        front: 'Por que não ocorre crase em "Chegamos a noite" no contexto "Chegamos a noite e fomos dormir"? E onde o erro foi cometido?',
        back: 'Nesse contexto, "a noite" não atua como locução adverbial de tempo (à noite), mas sim como sujeito ou objeto direto na frase original pensada erroneamente. Na verdade, "Chegamos à noite" levaria crase se fosse tempo. O erro foi escolher uma alternativa que não tem crase obrigatória sem analisar a transitividade.',
        sourceQuestionNumber: 2,
        reviewStatus: 'pending'
      },
      {
        id: 'flashcard-demo-2',
        topic: 'Acentuação Gráfica (Português)',
        front: 'Qual a regra de acentuação da palavra "água" e "próprio"?',
        back: 'Ambas são paroxítonas terminadas em ditongo (crescente). A alternativa escolhida "Econômico" estava incorreta porque se trata de uma palavra proparoxítona.',
        sourceQuestionNumber: 4,
        reviewStatus: 'pending'
      }
    ]
  };
}
