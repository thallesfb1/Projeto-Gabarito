# Leitura com IA e recuperação

O cabeçalho permite escolher prova em PDF ou gabarito, uma das provas salvas ou um novo simulado. O botão **Importar arquivo**, junto à central de exportação, fixa o destino na prova aberta. Trocar o destino antes de enviar preserva o arquivo selecionado.

Após **Ler arquivo**, a janela continua aberta e explica que é possível navegar no site. **Continuar pelo site** fecha somente a janela. **Acompanhar leitura** no painel recupera o arquivo original e a mesma leitura; cancelar é uma ação separada. A conferência começa com todas as questões recolhidas.

## Recuperação

- **Tentar novamente** retoma o mesmo trabalho e original, sem novo upload.
- PDFs com mais de seis páginas são lidos em grupos de quatro páginas principais, incluindo capa e páginas vizinhas para preservar contexto. A junção usa os números originais e mantém referências às páginas do PDF original. Divergências entre alternativas ou gabaritos são sinalizadas para conferência; gabaritos conflitantes ficam em branco.
- Cada parte validada é preservada em Storage privado antes de seguir. Uma nova tentativa reaproveita as partes já preservadas. O limite de cinco minutos por execução continua vigente; documentos demorados podem precisar de retomada.
- A extração completa é preservada antes de atualizar o trabalho para `ready`. Se essa atualização falhar, o estado `saving` repete apenas o salvamento, com espera crescente e retomada após o vencimento da reserva do servidor. A consulta do painel ativa a retomada.
- Se Storage e banco estiverem indisponíveis, existe uma cópia temporária em memória do servidor. Ela só é recuperável enquanto o processo continuar ativo; não existe garantia de recuperação após reinício antes de um salvamento persistente.
- Originais e resultados continuam privados por conta. Cancelar ou dispensar remove os arquivos de recuperação; importar mantém o original na prova e remove os arquivos de recuperação.

## Ativação em produção

1. Aplicar `supabase/ai-reading-recovery.sql` no projeto Supabase existente, depois de `ai-reading-jobs.sql` e antes de publicar esta versão. A migração acrescenta progresso e início da leitura, permite o estado `saving`, atualiza índices de concorrência e cria o bucket privado `ai-reading-results`, com políticas por proprietário. Não altera provas nem originais.
2. Publicar o código e dependências atualizados no Render. O modelo continua `gemini-3.1-flash-lite`; nenhuma chave nova é exigida.
3. Validar com uma conta conectada: uma leitura pequena, navegação e retorno ao original, conferência, importação em prova existente e em prova nova. As falhas de persistência foram exercitadas nos testes automatizados; evitar provocar indisponibilidade do banco de produção.

## Avisos e diagnóstico

O som vem ativado e pode ser desligado no modal ou painel; a preferência é compartilhada e persistida no navegador. O áudio é preparado no clique do usuário. Ao concluir, toca quando a leitura não estiver aberta ou a aba estiver oculta. Os flashcards também tocam ao concluir em outra aba. Avisos visuais continuam disponíveis sem permissão de notificação externa. Navegadores podem suspender áudio e consultas em abas inativas; som e atualização imediata dependem dessas permissões. Com o site fechado, o aviso sonoro não é garantido.

Os logs `[AI reading]` registram identificador do trabalho, modelo, etapa, parte, tentativa, duração e status do serviço. Há eventos de leitura, preservação, nova tentativa de salvamento, retomada de resultado e falha. Não incluem credenciais, nomes de arquivos, enunciados ou respostas. O erro 503 pode continuar ocorrendo no Google; a recuperação reduz o trabalho perdido.

## Validação desta implementação — 4 de outubro de 2026

- TypeScript, 183 testes e builds web/offline concluídos. Os testes cobrem repetição usando o mesmo original, recuperação do resultado após falhas no banco, reutilização de partes, conflitos na junção, escolha entre três provas, retorno ao modal, questões recolhidas e preferência de som.
- Navegador local: escolha do destino no cabeçalho, importação fixa na prova, apresentação do andamento, navegação pelo site e retorno ao arquivo, conferência com todas as questões fechadas. Estados assíncronos foram apresentados com dados fictícios.
- PDF Dataprev real, envio autorizado pelo usuário ao Google: quatro chamadas de partes, 70 questões extraídas e validadas em 152.505 ms. A última parte retornou 503 na primeira tentativa e concluiu na segunda. Três partes continham questões; a última não acrescentou questões. Esse teste usa a configuração local e não aplica o resultado à conta nem confirma a configuração do Render.
- Em 4 de outubro de 2026, o usuário informou ter aplicado a migração no Supabase. A atualização da branch ligada ao Render é realizada depois dessa confirmação.
