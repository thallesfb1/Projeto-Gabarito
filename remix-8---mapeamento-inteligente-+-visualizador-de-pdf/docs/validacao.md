# Validação — revisão completa

Branch: `codex/revisao-completa`.

## Verificações automatizadas

Resultado atual: 81 testes aprovados em 12 arquivos e TypeScript sem erros.

- TypeScript com modo estrito.
- Testes de recuperação IndexedDB antes da primeira gravação, migração com localStorage corrompido, catálogo intencionalmente vazio, backups inválidos e IDs duplicados.
- Isolamento de provas e snapshots por conta; troca de conta/saída sob StrictMode; leitura da nuvem com falha sem envio destrutivo; snapshots periódicos durante edições contínuas.
- Sincronização com comparação de três estados, cópia em conflitos e escritas/exclusões condicionadas à versão remota.
- Importação de respostas com lacunas, JSON e alternativas específicas de cada tipo de prova.
- Segurança da API de IA: assinatura de arquivo, formatos, origem, modelo permitido, sessão obrigatória para chave compartilhada, limite de solicitações, erros sem credenciais e resposta incompleta/duplicada recusada.
- Conferência de IA: seleção e arraste de um arquivo, formatos inválidos recusados, revisão antes de aplicar, edição da leitura, falhas da API/armazenamento sem fechamento da prévia e bloqueio de gabarito de tipo incompatível.

## Navegador e integração real

- Criar cartão de quatro questões e importar `A-C-`: posições em branco preservadas.
- Importar gabarito `A B C D`, conferir e corrigir: dois acertos, zero erros, dois itens em branco e 50%.
- Mapear dois blocos e abrir diagnóstico: 50% em cada bloco.
- Criar snapshot e restaurar com confirmação: respostas, gabarito, correção e mapa preservados.
- Temas Clean, Caderno e Escuro; modais de mapeamento, backup e IA; tela inicial em 390 × 844 sem largura excedente.
- Login Google e recuperação das provas reais: confirmados pelo usuário.
- Chave Google fornecida pelo usuário: lista de modelos recebida da API real. Imagem de exemplo lida pelo Gemini 3.8 Flash: `1-A, 2-B, 3-C`. PDF de exemplo lido pelo Gemini 3.5 Flash: três enunciados e suas cinco alternativas extraídos corretamente. Uma tentativa com modelo em alta demanda retornou erro tratado; não houve mudança de provas nessa tentativa.

Os testes reais usaram documentos sintéticos de três questões, sem enviar provas pessoais. Não validam precisão em todo tipo de digitalização, fórmula ou figura. A prévia e o leitor permitem conferir essas partes no arquivo original.

## Banco e publicação

A integração utiliza a tabela existente `public.provas`. A configuração pública de autenticação respondeu e indicou Google habilitado; a consulta anônima não retornou linhas. Isso não comprova todas as políticas de acesso entre contas.

O script `supabase/provas-security.sql` está preparado, mas **não foi aplicado ao projeto remoto**: a chave pública não concede administração do banco. É necessário revisar/aplicar as políticas pelo SQL Editor para garantir o isolamento também no servidor. Não houve publicação, alteração administrativa remota ou exclusão de provas reais nesta revisão.

A IA precisa do servidor Node. O build estático/offline continua com as funções locais; hospedar apenas arquivos estáticos exige publicar a API separadamente. A chave Google configurada localmente está em `.env.local`, ignorado pelo Git.

## Ajustes solicitados: IA, temas e exemplos

- A tela de IA pede apenas arquivo e conferência. Não há campo de chave nem seletor de modelo. A credencial pertence ao servidor; cabeçalhos de chave pessoal não contornam o login. A configuração atual usa somente gemini-3.1-flash-lite e não repete chamadas nem muda de modelo quando a cota é atingida.
- Testes de exemplos cobrem múltipla escolha e Certo/Errado em 7, 70, 120 e 200 questões, nos formatos pares, tabela e sequência. Dados pessoais e edições manuais desativam a vinculação.
- No navegador, o exemplo de múltipla escolha com respostas importadas primeiro e o exemplo de Certo/Errado com gabarito importado primeiro produziram 84 acertos em 120 questões (70%).
- Botões principais e seleções usam cores do tema: verde Clean, marrom Caderno e verde claro Escuro. Ícones seguem a convenção solicitada: importar com Download; exportar com Upload.
- A API real leu o PDF sintético de três questões e a imagem 1-A, 2-B, 3-C. O teste isolado simula a validação da sessão Supabase, mas faz chamadas reais ao Google com a chave local. O Google também retornou alta demanda em algumas tentativas; o servidor tratou esses erros sem alterar provas. A precisão em provas pessoais ainda depende da conferência da prévia.

Verificação final: TypeScript sem erros, builds web e offline gerados e modal de IA em 390 × 844 sem transbordamento horizontal. A chave real não apareceu nos 70 arquivos rastreados nem nos 19 arquivos públicos gerados.

## Originais, perfil e fundos

- O Gemini 3.1 Flash-Lite foi verificado na API real com dois documentos sintéticos: imagem de gabarito com 1-A, 2-B, 3-C e PDF com três questões. Ambas as chamadas retornaram HTTP 200 e leitura validada. Nesse teste isolado, a sessão Supabase é simulada; a chamada ao Google usa a chave local real, sem exibi-la. Não houve envio de provas pessoais.
- O modelo possui camada gratuita, mas a implementação não altera o plano de cobrança do projeto nem promete 500 usos. Os limites reais devem ser conferidos no AI Studio.
- Testes do Storage verificam pasta por usuário, upload sem sobrescrita, metadados preservados em backups, formatos/tamanhos/caminhos inválidos recusados, falta de sessão e download de outra conta bloqueados. Os arquivos só são enviados ao Storage ao confirmar a prévia. Falhas deixam a leitura aberta e não substituem os dados da prova.
- Testes do perfil verificam foto Google, fallback para iniciais, tema selecionado, sincronização, backup e logout com erro tratado.
- O usuário informou ter executado supabase/prova-originais-storage.sql no SQL Editor. O teste remoto de upload anônimo retornou HTTP 400 com recusa por RLS, sem mensagem de bucket ausente e sem criar objeto. Isso verifica a recusa desse acesso, mas não substitui o teste de upload/download autenticado nem a validação entre duas contas. A aplicação com chave pública não administra o bucket ou as políticas; os testes automatizados de Storage usam o SDK simulado.
- Os originais acompanham a conta pelo Storage e pelas referências em provas.data; não são embutidos nos backups JSON. A exclusão de uma prova preserva originais para backups anteriores; remoção definitiva pode ser feita pelo administrador no Storage.

A prévia de IA foi conferida nos temas Clean, Caderno e Escuro e em 390 × 844, sem transbordamento horizontal. O modal mantém uma única área interna de rolagem. TypeScript, 81 testes e builds web/offline passaram. A busca pela chave real nos 72 arquivos rastreados, nove arquivos novos e 19 arquivos públicos gerados não encontrou exposição.

## Destino da importação, disciplinas e rodadas de revisão

- Testes da aplicação com serviços simulados verificam que a importação de gabarito na página inicial cria outro simulado e preserva integralmente a prova corrigida existente. Dentro da prova, a importação de gabarito altera somente o cartão aberto; o PDF preserva respostas e gabarito e adiciona enunciados e intervalos de disciplinas.
- Testes da extração verificam o modelo aprovado e a orientação de classificar pelas seções do PDF. Os intervalos agrupam questões contíguas, mantêm blocos separados quando a disciplina reaparece e não preenchem lacunas incertas. A precisão da classificação real continua sujeita à conferência da prévia.
- Testes de revisão cobrem edição, reinício, nova correção, geração opcional, histórico de rodadas, progresso independente, falha de geração e preservação no backup JSON. Uma geração atrasada após alterar a prova é descartada sem substituir revisões salvas.
- No navegador, a página inicial foi conferida sem a Central de Gabarito e a prévia mostrou o destino “Novo simulado”. Uma demonstração isolada com duas rodadas confirmou revisão após reinício, seleção da rodada anterior e opção de nova geração após corrigir novamente. Em 390 × 844 não houve largura excedente e o botão de revelar continuou acessível; a apresentação também foi conferida em 1280 × 900. Nenhuma prova real foi editada nessa verificação.

TypeScript, 136 testes em 20 arquivos e builds web/offline passaram nesta revisão.

## Cronômetro, identificação da prova e organização da biblioteca

- Testes da aplicação confirmam o convite na primeira interação sem PDF, início opcional, recusa pelo X sem repetição ao reabrir e interrupção ao corrigir. Atalhos de respostas não alteram o cartão enquanto o convite está aberto. Quando há enunciado extraído, o leitor abre após a decisão, sem sobrepor dois modais.
- A confirmação do PDF atualiza o nome da prova aberta e preserva respostas e gabarito. A prévia permite editar o nome identificado. O prompt pede identificação pela capa/cabeçalho e classificação das disciplinas pelo conteúdo quando não houver títulos explícitos. Esses testes usam a API simulada; não houve nova verificação de precisão com uma prova real nesta revisão.
- Testes de reordenação cobrem arraste com mouse, toque mantido por 450 ms, cancelamento para permitir rolagem normal e alternativa por setas do teclado. A posição é preservada pelo backup JSON e pela reconciliação dos dados da conta, sem alterar respostas. A validação de sincronização usa serviços simulados.
- No navegador, uma demonstração isolada confirmou arraste no computador, convite com X e sim/não, parada ao corrigir e ações de importação/backup no perfil. Em 390 × 844, os atalhos de teclado ficaram ocultos e não houve transbordamento horizontal. Nenhuma prova real foi editada nessa demonstração. O gesto de segurar no celular foi validado nos testes automatizados, sem teste em aparelho físico.
- A faixa abaixo do cabeçalho e o seletor duplicado de tema na lista foram removidos. As informações da conta e a importação de provas locais ficam no perfil; backup continua disponível como recurso secundário.

Verificação: 146 testes em 22 arquivos passaram. Após os últimos ajustes, os 10 testes de aplicação/perfil foram executados novamente e passaram. TypeScript e builds web/offline também passaram.
