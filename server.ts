import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no servidor. Verifique as variáveis de ambiente.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Resilient Gemini caller that handles transient 503 high-demand spikes
 * by applying exponential backoff retry and falling back to alternative flash models.
 */
async function callGeminiWithRetry(
  ai: GoogleGenAI,
  params: any,
  models: string[] = ['gemini-3.1-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash']
): Promise<{ response: any; usedModel: string }> {
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        return { response, usedModel: model };
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err?.status || err || '');

        // If a model has zero quota or hit quota exhaustion, skip immediately to next fallback model
        if (
          errMsg.includes('limit: 0') ||
          errMsg.includes('pro') ||
          errMsg.toLowerCase().includes('quota') ||
          errMsg.toLowerCase().includes('resource_exhausted')
        ) {
          console.warn(`[Gemini API] Modelo ${model} sem cota ou limite atingido. Pulando para fallback...`);
          break;
        }

        const isTransient =
          errMsg.includes('503') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('429') ||
          errMsg.includes('overloaded');

        if (isTransient) {
          console.warn(`[Gemini API] Modelo ${model} temporariamente ocupado (tentativa ${attempt + 1}). Aguardando...`);
          await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
        } else {
          // If non-transient, try next model or throw
          break;
        }
      }
    }
  }

  throw lastError;
}

/**
 * Robust JSON parser for Gemini responses that strips markdown code blocks
 * and repairs trailing truncations so large exams (70+ questions) never fail.
 */
function parseAndRepairExamJson(rawText: string): any {
  let cleaned = (rawText || '').trim();
  // Strip markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // 1. Direct parse attempt
  try {
    return JSON.parse(cleaned);
  } catch {
    // Proceed to repair
  }

  const startIdx = cleaned.indexOf('{');
  if (startIdx !== -1) {
    let candidate = cleaned.slice(startIdx);
    // Find last closed question item
    const lastBrace = candidate.lastIndexOf('}');
    if (lastBrace !== -1) {
      let slice = candidate.slice(0, lastBrace + 1);
      const openBrackets = (slice.match(/\[/g) || []).length;
      const closeBrackets = (slice.match(/\]/g) || []).length;
      const openBraces = (slice.match(/{/g) || []).length;
      const closeBraces = (slice.match(/}/g) || []).length;

      for (let i = 0; i < openBrackets - closeBrackets; i++) slice += ']';
      for (let i = 0; i < openBraces - closeBraces; i++) slice += '}';

      try {
        return JSON.parse(slice);
      } catch {
        // Fallback to item-by-item extraction
      }
    }
  }

  // Regex fallback: extract any valid question objects
  const questions: any[] = [];
  const qBlockRegex = /\{[^{}]*"number"\s*:\s*(\d+)[^{}]*"statement"\s*:\s*"((?:[^"\\]|\\.)*)"[^{}]*\}/g;
  let qMatch;
  while ((qMatch = qBlockRegex.exec(cleaned)) !== null) {
    try {
      const parsed = JSON.parse(qMatch[0]);
      if (parsed && typeof parsed.number === 'number' && parsed.statement) {
        questions.push(parsed);
      }
    } catch {
      // ignore bad match
    }
  }

  if (questions.length > 0) {
    return { questions };
  }

  throw new Error('A IA não retornou um formato JSON reconhecível.');
}

async function startServer() {
  const app = express();

  // Allow up to 50MB payload for large PDF documents
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Route: Extract questions, statements, options and key from PDF via Gemini
  app.post('/api/pdf/extract-exam', async (req: Request, res: Response) => {
    try {
      const { pdfBase64, options } = req.body;

      if (!pdfBase64 || typeof pdfBase64 !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Nenhum arquivo PDF fornecido ou formato de dados inválido.',
        });
      }

      // Clean base64 string if it contains data URI header
      const cleanedBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').trim();
      if (!cleanedBase64) {
        return res.status(400).json({
          success: false,
          error: 'Conteúdo em base64 do PDF está vazio.',
        });
      }

      const ai = getGeminiClient();

      const generateExplanations = options?.generateExplanations === true;
      const extractKey = options?.extractKey !== false;
      const preferredModel = options?.model || 'gemini-3.1-flash';

      let candidateModels: string[] = [];
      if (preferredModel === 'gemini-3.1-pro-preview') {
        candidateModels = ['gemini-3.1-pro-preview', 'gemini-3.8-flash', 'gemini-flash-latest'];
      } else if (preferredModel === 'gemini-flash-latest') {
        candidateModels = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
      } else {
        candidateModels = ['gemini-3.1-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
      }

      const systemInstruction = `Você é um indexador e digitalizador ultra-preciso e econômico de provas de concursos públicos e vestibulares do Brasil (FGV, Cebraspe, FCC, Vunesp, ENEM, etc.).
Sua tarefa é única: digitalizar e indexar fielmente o texto original de cada questão em ordem sequencial (da questão 1 até a última questão, ex: 1 a 70), sem pular ou omitir nenhuma.

DIRETRIZES DE INDEXAÇÃO LIMPA E BAIXO CONSUMO DE TOKENS:
1. NÃO interprete nem resolva a prova como um candidato. NÃO gaste tokens tentando responder às questões.
2. "officialAnswer": NÃO adivinhe nem deduza respostas. Só preencha se constar explicitamente uma folha/tabela de respostas da banca impressa no próprio PDF; caso contrário, retorne null.
3. "explanation": ${
        generateExplanations
          ? 'Breve comentário de 1 frase justificando a alternativa oficial.'
          : 'Retorne sempre null. Os comentários pedagógicos aprofundados são gerados sob demanda quando o gabarito oficial estiver anexado.'
      }
4. Extraia rigorosamente TODAS as questões da prova em ordem sequencial (1, 2, 3, 4...). Jamais encerre antes da última questão.
5. Se uma questão tiver textos de apoio extensos, contextualização ou tabelas/figuras descritas, preserve o texto integral no "statement".
6. "options": extraia todas as alternativas da questão (A, B, C, D, E para múltipla escolha; ou Certo/Errado para Cebraspe). Cada alternativa contém "letter" e "text".
7. "subject": matéria ou disciplina identificada no cabeçalho da seção (ex: "Língua Portuguesa", "Direito Constitucional").
8. "topic": assunto específico abordado pela questão, extraído ou deduzido com base no enunciado (ex: "Crase", "Atos Administrativos", "Análise Combinatória"). Muito importante para a posterior geração de flashcards de revisão.
9. "officialKeyList": se e somente se o PDF contiver folha de gabarito oficial impressa pela banca, extraia a lista com as letras ordenadas. Caso contrário, deixe array vazio.`;

      const prompt = `Analise este caderno de prova em PDF da primeira à última página.
Extraia e indexe estritamente todas as questões numeradas sequencialmente (da 1 até a última questão da prova, ex: 1 a 70).
Apenas indexe os enunciados e alternativas com precisão textual, sem tentar resolver a prova como candidato.`;

      let responseText = '';
      let usedModelName = preferredModel;
      try {
        const { response, usedModel } = await callGeminiWithRetry(
          ai,
          {
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: cleanedBase64,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              maxOutputTokens: 65536,
              temperature: 0.1,
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  examTitle: {
                    type: Type.STRING,
                    description: 'Título ou órgão do concurso/prova identificado no PDF (ex: DATAPREV, INSS, FGV)',
                  },
                  examType: {
                    type: Type.STRING,
                    description: "'multiple_choice' se for múltipla escolha (A-E) ou 'true_false' se for itens Certo/Errado (Cebraspe)",
                  },
                  totalQuestions: {
                    type: Type.INTEGER,
                    description: 'Número total de questões extraídas',
                  },
                  officialKeyList: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Lista ordenada com as letras do gabarito oficial se houver folha de gabarito no PDF',
                  },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        number: { type: Type.INTEGER, description: 'Número da questão (1, 2, 3...)' },
                        statement: { type: Type.STRING, description: 'Enunciado completo da questão' },
                        options: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              letter: { type: Type.STRING, description: 'Letra da alternativa (A, B, C, D, E, V, F)' },
                              text: { type: Type.STRING, description: 'Texto da alternativa' },
                            },
                            required: ['letter', 'text'],
                          },
                          description: 'Lista de alternativas da questão',
                        },
                        officialAnswer: {
                          type: Type.STRING,
                          description: 'Letra do gabarito oficial se identificado (A, B, C, D, E, V, F), ou null',
                        },
                        explanation: {
                          type: Type.STRING,
                          description: 'Comentário explicativo conciso de 1 a 2 frases',
                        },
                        subject: {
                          type: Type.STRING,
                          description: 'Disciplina ou matéria (ex: Português, RLM, Legislação)',
                        },
                        topic: {
                          type: Type.STRING,
                          description: 'Assunto específico abordado na questão (ex: Crase, Atos Administrativos)',
                        },
                        page: {
                          type: Type.INTEGER,
                          description: 'Página aproximada no PDF',
                        },
                      },
                      required: ['number', 'statement'],
                    },
                  },
                },
                required: ['questions'],
              },
            },
          },
          candidateModels
        );
        responseText = response.text?.trim() || '{}';
        usedModelName = usedModel;
      } catch (schemaErr: any) {
        console.warn('Tentativa com schema estrito falhou, aplicando fallback em modo JSON livre:', schemaErr?.message);
        const { response: fallbackResponse, usedModel: fallbackModel } = await callGeminiWithRetry(
          ai,
          {
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: cleanedBase64,
                  },
                },
                {
                  text: `${prompt}\nIMPORTANTE: Retorne estritamente um objeto JSON com formato: {"examTitle": "...", "examType": "multiple_choice", "questions": [{"number": 1, "statement": "...", "options": [{"letter": "A", "text": "..."}], "officialAnswer": "A", "explanation": "...", "subject": "Português", "topic": "Crase"}]}`,
                },
              ],
            },
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              maxOutputTokens: 65536,
              temperature: 0.1,
            },
          },
          candidateModels
        );
        responseText = fallbackResponse.text?.trim() || '{}';
        usedModelName = fallbackModel;
      }
      let parsedData: any;
      try {
        parsedData = parseAndRepairExamJson(responseText);
      } catch (parseError) {
        console.error('Falha ao processar JSON retornado pelo Gemini:', parseError, responseText);
        return res.status(500).json({
          success: false,
          error: 'A IA gerou uma resposta, mas não foi possível converter em JSON válido. Tente novamente.',
        });
      }

      const questions = Array.isArray(parsedData.questions) ? parsedData.questions : [];
      if (questions.length === 0) {
        return res.status(422).json({
          success: false,
          error: 'Nenhuma questão foi identificada no documento PDF. Verifique se o arquivo contém uma prova com questões legíveis.',
        });
      }

      // Format questions and normalize options
      const normalizedQuestions = questions.map((q: any, idx: number) => {
        const num = typeof q.number === 'number' ? q.number : idx + 1;
        const options = Array.isArray(q.options)
          ? q.options.map((opt: any) => ({
              letter: String(opt.letter || '').toUpperCase().trim(),
              text: String(opt.text || '').trim(),
            }))
          : [];

        let officialAnswer = null;
        if (q.officialAnswer && typeof q.officialAnswer === 'string') {
          const ansUpper = q.officialAnswer.toUpperCase().trim();
          if (['A', 'B', 'C', 'D', 'E', 'V', 'F'].includes(ansUpper)) {
            officialAnswer = ansUpper;
          }
        }

        return {
          number: num,
          statement: String(q.statement || '').trim(),
          options,
          officialAnswer,
          explanation: q.explanation ? String(q.explanation).trim() : null,
          subject: q.subject ? String(q.subject).trim() : null,
          topic: q.topic ? String(q.topic).trim() : null,
          page: typeof q.page === 'number' ? q.page : null,
        };
      });

      // Sort questions by number
      normalizedQuestions.sort((a: { number: number }, b: { number: number }) => a.number - b.number);

      return res.json({
        success: true,
        examTitle: parsedData.examTitle || null,
        examType: parsedData.examType === 'true_false' ? 'true_false' : 'multiple_choice',
        totalQuestions: normalizedQuestions.length,
        officialKeyList: Array.isArray(parsedData.officialKeyList) ? parsedData.officialKeyList : null,
        questions: normalizedQuestions,
      });
    } catch (error: any) {
      console.error('Erro na extração de prova por PDF:', error);
      const errMsg = String(error?.message || error || '');
      const isOverloaded =
        errMsg.includes('503') ||
        errMsg.includes('high demand') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('Resource has been exhausted') ||
        errMsg.includes('429');

      return res.status(isOverloaded ? 503 : 500).json({
        success: false,
        error: isOverloaded
          ? 'O modelo de IA está com alta demanda temporária. Aguarde cerca de 10 a 20 segundos e tente novamente.'
          : error?.message || 'Ocorreu um erro interno durante a leitura da prova com IA.',
      });
    }
  });

  // API Route: Generate or expand AI explanation for a single question on demand
  app.post('/api/gemini/explain-question', async (req: Request, res: Response) => {
    try {
      const { questionNumber, statement, options, officialAnswer, userAnswer, examType } = req.body;

      if (!statement) {
        return res.status(400).json({
          success: false,
          error: 'Enunciado da questão não fornecido.',
        });
      }

      const ai = getGeminiClient();

      const optionsText = Array.isArray(options)
        ? options.map((opt: any) => `${opt.letter}) ${opt.text}`).join('\n')
        : 'Sem alternativas listadas';

      const prompt = `Você é um professor renomado e didático de concursos públicos e vestibulares.
Explique a questão a seguir com clareza, objetividade e foco pedagógico.

Questão nº: ${questionNumber || 'N/A'}
Tipo de Prova: ${examType === 'true_false' ? 'Certo ou Errado (Cebraspe)' : 'Múltipla Escolha'}
${officialAnswer ? `Gabarito Oficial da Banca: ${officialAnswer}` : 'Gabarito Oficial: Não informado (analise a melhor resposta)'}
${userAnswer ? `Resposta marcada pelo estudante: ${userAnswer}` : ''}

Enunciado:
${statement}

Alternativas:
${optionsText}

Estruture sua resposta de forma didática com:
1. **Resposta Correta e Resumo**: Identifique a resposta correta e a ideia central.
2. **Fundamentação e Justificativa**: Explique de maneira simples e aprofundada por que o item correto está certo.
3. **Análise das Alternativas Incorretas**: Mostre resumidamente onde está o erro das demais opções.
4. **Dica de Ouro**: Um macete, pegadinha clássica da banca ou conceito-chave para fixar na memória.

Mantenha o tom encorajador, profissional e direto ao ponto.`;

      const { response } = await callGeminiWithRetry(ai, {
        contents: prompt,
      });

      const explanation = response.text?.trim() || 'Não foi possível gerar a explicação no momento.';

      return res.json({
        success: true,
        explanation,
      });
    } catch (error: any) {
      console.error('Erro ao gerar explicação de questão:', error);
      const errMsg = String(error?.message || error || '');
      const isOverloaded =
        errMsg.includes('503') ||
        errMsg.includes('high demand') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('429');

      return res.status(isOverloaded ? 503 : 500).json({
        success: false,
        error: isOverloaded
          ? 'O modelo de IA está com alta demanda temporária. Aguarde alguns instantes e tente novamente.'
          : error?.message || 'Erro ao gerar explicação com IA.',
      });
    }
  });
  // API Route: Generate review flashcards based on errors
  app.post('/api/gemini/generate-flashcards', async (req: Request, res: Response) => {
    try {
      const { errors } = req.body;
      if (!errors || !Array.isArray(errors) || errors.length === 0) {
        return res.status(400).json({ success: false, error: 'Nenhum erro fornecido para gerar flashcards.' });
      }

      const ai = getGeminiClient();
      const prompt = `Atue como um tutor de alta performance.
O aluno fez um simulado e errou questões nos seguintes tópicos:
${JSON.stringify(errors.map((e: any) => ({ materia: e.subject, assunto: e.topic, questao: e.statement })), null, 2)}

Crie Flashcards de Estudo Ativo (Frente e Verso) focados ESTRITAMENTE nesses pontos fracos, para que o aluno memorize a regra ou conceito que ele errou.

DIRETRIZES:
1. Crie exatamente entre 3 e 5 flashcards no total.
2. Frente (front): Pergunta direta sobre o conceito.
3. Verso (back): Resposta clara com dica de memorização.
4. Tópico (topic): O assunto curto.

IMPORTANTE: Retorne ESTRITAMENTE um objeto JSON válido neste formato: {"flashcards": [{"id": "uuid", "front": "...", "back": "...", "topic": "..."}]}`;

      const { response } = await callGeminiWithRetry(ai, {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              flashcards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    front: { type: Type.STRING },
                    back: { type: Type.STRING },
                    topic: { type: Type.STRING }
                  },
                  required: ['id', 'front', 'back', 'topic']
                }
              }
            },
            required: ['flashcards']
          }
        },
      }, ['gemini-3.1-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash']);

      const responseText = response.text || '';
      const cleaned = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleaned);

      return res.json({ success: true, flashcards: parsed.flashcards || [] });
    } catch (error: any) {
      console.error('Erro /generate-flashcards:', error);
      return res.status(500).json({ success: false, error: 'Erro ao gerar flashcards.' });
    }
  });

  // Health check route
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Explicit 404 handler for API routes to prevent falling through to Vite HTML
  app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `Rota de API não encontrada: ${req.method} ${req.originalUrl}`,
    });
  });

  // Global Express error handler for API
  app.use((err: any, req: Request, res: Response, next: any) => {
    console.error('[Express Global Error]:', err);
    if (res.headersSent) return next(err);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
      success: false,
      error: err.type === 'entity.too.large'
        ? 'O arquivo PDF excede o limite máximo permitido.'
        : err?.message || 'Erro interno no servidor.',
    });
  });

  // Vite development or production static file serving
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Servidor Gabarito Online rodando em http://0.0.0.0:${PORT}`);
  });
  // Extend timeout for large multimodal PDF processing
  server.setTimeout(180000);
}

startServer().catch(err => {
  console.error('Erro fatal ao iniciar servidor:', err);
  process.exit(1);
});
