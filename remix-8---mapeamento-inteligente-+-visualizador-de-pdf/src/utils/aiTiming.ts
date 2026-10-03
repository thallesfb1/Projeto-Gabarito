// Allow a slow document read and one timeout retry within a bounded operation.
export const AI_EXTRACTION_TIMEOUT_MS = 300_000;
export const AI_EXTRACTION_ATTEMPT_TIMEOUT_MS = 240_000;
export const AI_FLASHCARDS_TIMEOUT_MS = 120_000;
export const AI_RESPONSE_GRACE_MS = 15_000;
export const AI_READING_TIMEOUT_MESSAGE = 'A leitura excedeu o tempo de espera. Isso pode acontecer quando o serviço de IA demora a responder ou o PDF exige mais processamento. Seu arquivo continua selecionado e nenhuma prova foi alterada. Tente novamente; se o erro se repetir, divida o PDF em partes menores.';
