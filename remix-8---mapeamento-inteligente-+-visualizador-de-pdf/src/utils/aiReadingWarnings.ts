// Older saved readings may contain narration about individual PDF parts.
// Keep unfamiliar warnings and anything asking for review; suppress only
// recognized processing notes that do not describe a problem with the result.
export function aiReviewWarnings(warnings: string[]): string[] {
  return [...new Set(warnings)].filter(warning => {
    const normalized = warning.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (/\b(confira|conferir|revise|revisar|verifique|verificar|atencao|ambigu\w*|incert\w*|duvida|conflit\w*|divergen\w*|ilegivel|ilegiveis|ausentes?|falt\w*|incomplet\w*|nao foi possivel|nao foram encontrad\w*)\b/.test(normalized)) return true;
    return ![
      /^a pagina \d+ (?:esta|e|encontra-se) em branco\b/,
      /^a classificacao das disciplinas .*(?:inferida|cabecalhos|conteudo)/,
      /^(?:as? |os? )?(?:questoes|questao|itens|item) [\d\s,a–-]+ (?:foram|foi) classificad[ao]s? .*(?:inferencia|cabecalho)/,
      /^(?:o|este) (?:documento|arquivo) (?:fornecido )?contem \d+ partes?\b/,
      /^(?:esta|este) e a parte \d+ de \d+\b/,
      /^a numeracao das questoes no documento original inicia em \d+ e termina em \d+ nesta parte\b/,
      /^(?:o|este) (?:documento|arquivo) (?:fornecido )?contem apenas as questoes (?:de )?\d+ (?:a|ate) \d+\b/,
    ].some(pattern => pattern.test(normalized));
  });
}
