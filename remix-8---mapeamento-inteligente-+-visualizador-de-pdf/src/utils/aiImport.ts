import type { SimuladoData } from '../types';
import { createNewSimulado } from './provasManager';
import { AIExtraction, ExtractionMode, answersFromExtraction, subjectRangesFromQuestions, validateAIExtraction } from './aiExtraction';

export function applyAIReading(result: AIExtraction, mode: ExtractionMode, existing: SimuladoData | null, index=0): SimuladoData {
  const validated=validateAIExtraction(result,mode);
  if(existing && validated.examType !== (existing.examType || 'multiple_choice')) throw new Error('O tipo do arquivo é diferente do cartão selecionado.');
  if(existing && mode==='exam' && validated.totalQuestions!==existing.totalQuestions) throw new Error('O PDF tem um total de questões diferente deste cartão. Importe pela página inicial para criar um novo simulado.');
  const proof=existing || createNewSimulado(validated.title,validated.totalQuestions,index,validated.examType);
  if(mode==='key') return {...proof,keyAnswers:answersFromExtraction(validated,proof.totalQuestions),exampleData:{...proof.exampleData,key:false},reviewedQuestionIndexes:[],isCorrected:false,isLocked:false,isResultOutdated:false};
  return {...proof,extractedQuestions:validated.questions,subjectRanges:subjectRangesFromQuestions(validated.questions),notes:[existing?.notes,...validated.warnings].filter(Boolean).join('\n')};
}
