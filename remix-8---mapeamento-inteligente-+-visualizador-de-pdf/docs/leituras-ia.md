# Leituras de IA em segundo plano

## Fluxo

1. O usuário conectado escolhe PDF ou gabarito e, opcionalmente, ativa notificações por um clique explícito.
2. A prova atual é sincronizada antes de capturar o destino. O arquivo é enviado ao bucket privado `prova-originais`.
3. `POST /api/ai/jobs` grava uma leitura em `ai_reading_jobs` e retorna HTTP 202. O trabalhador processa o arquivo sem depender da conexão dessa requisição ou do modal.
4. O painel consulta metadados a cada 5 segundos durante leituras e a cada 30 segundos em repouso, sem repetir enunciados/resultados inteiros. O resultado completo é buscado somente ao abrir a conferência.
5. A prova de destino fica em modo de leitura até conferir ou dispensar. As outras provas continuam disponíveis. O cronômetro da prova é parado antes do envio.
6. A conferência permite editar OCR e exige confirmação. Antes de aplicar, verifica conta, destino e alterações posteriores, preserva um snapshot e salva o cartão no dispositivo e na conta. Só então reconhece a leitura como concluída. O original já enviado é reutilizado.

O identificador `aiReadingJobId` evita aplicar a mesma leitura duas vezes se a confirmação ao servidor falhar. Uma prova nova usa o ID reservado pela leitura; não depende de qual cartão está selecionado na conclusão.

## Persistência, segurança e custo

Aplicar a migração aditiva `supabase/ai-reading-jobs.sql` antes do deploy. Ela foi aplicada no projeto de produção em 03/10/2026. As provas e as políticas do bucket existente são preservadas.

- RLS vincula linhas ao `auth.uid()` e valida proprietário/caminho do original. Anônimos não têm acesso à tabela. O servidor valida a sessão e também filtra pelo proprietário.
- Não há chave de administrador nova: o servidor usa a sessão validada do usuário e a chave pública do Supabase. Tokens não são armazenados nos jobs.
- IDs idempotentes evitam duplicar geração após perda da resposta HTTP. Índices únicos limitam a uma leitura em processamento por conta e uma leitura pendente por prova.
- Um claim condicional no Postgres e uma concessão com prazo evitam dois trabalhadores para a mesma leitura. Há no máximo quatro trabalhadores por processo; o limite de geração existente é consumido somente pelo trabalhador que obteve o claim, inclusive para jobs inseridos diretamente via Data API.
- Mantém Gemini 3.1 Flash Lite, JSON estruturado, validação de arquivo e resultado, temperatura zero e tentativas limitadas apenas para falhas transitórias. Não troca de modelo nem resolve questões ao ler gabaritos.
- Cancelar invalida o resultado e tenta remover o original não importado. A atualização final verifica status e concessão para não ressuscitar um resultado cancelado.

## Limites operacionais

Uma leitura iniciada pode terminar com a aba fechada enquanto o processo do servidor estiver ativo. Resultados prontos permanecem no Supabase e reaparecem ao entrar novamente. Uma leitura ainda na fila pode ser retomada na próxima consulta autenticada.

Se o processo reiniciar durante uma chamada ao Gemini, a concessão expira e o job aparece como interrompido. Não há repetição automática de uma chamada possivelmente já cobrada. O usuário pode dispensar e enviar novamente. Um worker dedicado com credencial de serviço e fila externa seria necessário para garantir processamento contínuo independente da atividade/reinício do Render; não foi contratado nem configurado.

Notificações usam o aviso interno e, quando permitido, um service worker para compatibilidade com dispositivos móveis. A permissão só é solicitada por clique e em contexto seguro. Não há Web Push: com o site completamente fechado, o aviso externo depende de reabrir o site. Recusar notificações não bloqueia a IA. Referências: [MDN Notifications](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API), [Supabase Storage privado](https://supabase.com/docs/guides/storage/serving/downloads).

Validação: 166 testes passaram, incluindo HTTP 202 antes da conclusão, cancelamento tardio, isolamento entre contas, reenvio idempotente, recuperação de fila, navegação em outra prova e consultas atrasadas. Layout conferido em desktop e 390 × 844 com dados fictícios. A leitura real de PDF em produção continua reservada ao teste manual do usuário.
