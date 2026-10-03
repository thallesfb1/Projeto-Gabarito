# Gabarito Pro

Plataforma local para transformar provas e simulados em diagnóstico de estudo. O foco do produto não é replicar um banco fechado de questões: o estudante pode usar uma prova de qualquer fonte, registrar o gabarito, mapear disciplinas e descobrir o que revisar em seguida.

## Proposta de valor

- **Biblioteca de Provas** com estruturas prontas de ENEM, Cebraspe, FGV, tribunais e revisão rápida.
- **Cartão-resposta interativo** para múltipla escolha e Certo/Errado, com atalhos de teclado.
- **Mapeamento por disciplina** usando intervalos editáveis de questões.
- **Diagnóstico consolidado** que compara desempenho entre provas e evidencia os pontos fracos.
- **Fila de revisão** gerada por erros e questões sinalizadas, com controle do que já foi revisado.
- **Gabarito oficial e correção automática**, incluindo nota líquida para provas Cebraspe.
- **Cronômetro, filtros, relatórios, backup e restauração** de todos os simulados.
- **Modo local sem cadastro** e **login Google opcional**, com sincronização das provas na conta Supabase.

Os modelos da biblioteca guardam somente a estrutura pedagógica da prova. Eles não incluem enunciados ou conteúdo protegido de terceiros.

## Executar localmente

Requer Node.js 22.13+ ou 24+.

```bash
npm install
npm run dev
```

A aplicação será aberta em [http://localhost:3000](http://localhost:3000).

## Qualidade e testes

```bash
npm run lint
npm run test:run
npm run build
```

- `lint`: valida os tipos TypeScript.
- `test:run`: verifica importação, recuperação local, isolamento entre contas, sincronização, diagnóstico e fila de revisão.
- `build`: gera a aplicação web e também a versão offline em arquivo único.

## Versão offline

Depois do build, abra `gabarito.html` diretamente no navegador. O script de empacotamento funciona em Windows, macOS e Linux e também gera cópias em `dist/gabarito-offline.html` e `public/gabarito-offline.html`.

## Estrutura principal

```text
src/
├── App.tsx
├── types.ts
├── components/
│   ├── ExamLibrary.tsx
│   ├── StudyInsights.tsx
│   ├── SubjectMapperModal.tsx
│   ├── QuestionGrid.tsx
│   ├── ScorePanel.tsx
│   └── Sidebar.tsx
└── utils/
    ├── examCatalog.ts
    ├── examCatalog.test.ts
    ├── parser.ts
    └── provasManager.ts
```

## Persistência

Provas, disciplinas, respostas e revisões são salvas no IndexedDB, com espelho no localStorage. A recuperação acontece antes de qualquer gravação inicial, preservando dados de versões anteriores. Backups JSON e pontos de restauração permitem recuperar alterações. Cada conta tem seu próprio espaço local; sair da conta volta ao espaço sem login.

## Supabase e login Google

1. Copie `.env.example` para `.env.local` e configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com a URL e a chave pública do projeto. Nunca use `service_role` no navegador. Reinicie o servidor após alterar essas variáveis.
2. A tabela existente `public.provas` deve ter `id text`, `user_id uuid`, `title text`, `data jsonb` e `updated_at timestamptz`. `id` é a chave primária e `user_id` referencia `auth.users`.
3. Revise e execute [supabase/provas-security.sql](supabase/provas-security.sql) no SQL Editor do projeto. O script habilita RLS, bloqueia acesso anônimo e restringe leitura, escrita e exclusão ao dono da prova, inclusive diante de políticas permissivas antigas. Ele não apaga provas. A chave pública não permite aplicar ou auditar essas políticas administrativas.
4. Ative o provedor Google em Authentication e configure o OAuth do Google com o callback do Supabase. Cadastre as URLs de retorno da aplicação em Authentication → URL Configuration, incluindo `http://localhost:3000` e `http://localhost:3001` para desenvolvimento e o domínio HTTPS de produção.
5. Faça login com a conta usada anteriormente. As provas da tabela são recuperadas automaticamente. O botão “Importar provas deste dispositivo” copia o catálogo sem login para a conta, preservando os originais.

A sincronização compara o estado local, o último estado sincronizado e a nuvem. Edições simultâneas conflitantes preservam uma cópia local; escritas e exclusões conferem a versão remota antes de alterar uma prova. Falhas de leitura bloqueiam envios até uma recuperação bem-sucedida. O botão de sincronização busca mudanças feitas em outros dispositivos. Alterações sem conexão ficam no navegador até nova sincronização.

Sem configuração Supabase, a aplicação continua funcionando localmente. O arquivo aberto por `file://` usa somente o modo local. Exportar um backup continua recomendado: limpar os dados do site manualmente apaga o armazenamento do navegador.

## Validação da revisão

Veja [docs/validacao.md](docs/validacao.md) para os fluxos verificados e os limites da validação do banco remoto.

## Leitura com IA: PDF e gabarito em imagem

Na página inicial, “Importar com IA” sempre cria um novo simulado, tanto para PDF de prova quanto para imagem ou PDF de gabarito, preservando os cartões existentes. Dentro de uma prova, a importação fica vinculada àquele cartão: o PDF atualiza o nome identificado na capa/cabeçalho e adiciona enunciados e disciplinas, preservando respostas e gabarito; a leitura do gabarito atualiza as respostas oficiais e exige nova correção. O nome continua editável na prévia antes de aplicar. A Central de Gabarito aparece somente dentro da prova.

Use o botão “Importar com IA” no topo para escolher entre PDF de prova e gabarito em imagem ou PDF. A leitura pode levar alguns minutos. Se houver tempo excedido, a mensagem explica que a demora pode ser temporária, preserva o arquivo selecionado e oferece “Tentar novamente”, sem alterar a prova antes da conferência.

A IA identifica as disciplinas pelos cabeçalhos e seções do PDF e monta intervalos contíguos de questões. Sem cabeçalhos, pode inferir a disciplina pelo enunciado e registrar um aviso; questões incertas ficam sem disciplina. Confira e edite os nomes na prévia; depois, os intervalos continuam editáveis no mapa da prova. Arraste o arquivo para a área de seleção ou escolha-o no dispositivo. O envio ocorre ao solicitar a leitura. Para gabaritos com várias versões, informe a cor ou o tipo do caderno. O importador não resolve as questões nem deve inventar alternativas ilegíveis.

- Limites da aplicação: 10 MB por arquivo, até 200 questões e uma leitura simultânea por usuário.
- Configure `GEMINI_API_KEY` **somente no servidor**. O usuário seleciona um arquivo e confere a leitura, sem informar chave nem modelo. A sessão é verificada no Supabase e há um limite de 20 solicitações por 10 minutos por usuário. O servidor utiliza somente `gemini-3.1-flash-lite`; `GEMINI_MODEL`, se preenchido, deve ter esse valor. A extração tem prazo total de cinco minutos, incluindo espera progressiva e novas tentativas: até duas para falhas temporárias 500, 502 e 503, e uma para timeout/504. Cada tentativa tem até quatro minutos, sempre limitada pelo prazo total restante. O navegador aguarda mais 15 segundos para receber a resposta do servidor. Erros de cota, chave, permissões ou arquivo não são repetidos. Cancelar a leitura interrompe também as novas tentativas. Flashcards mantêm o prazo total de dois minutos. As mensagens distinguem cota, indisponibilidade, configuração e tempo excedido, e o servidor registra somente códigos de erro, sem chaves ou arquivos. O modelo tem uma camada gratuita no Google, mas o plano e os limites reais dependem do projeto no AI Studio, não da escolha do modelo. O limite usa memória de um processo; várias réplicas precisam de um limitador compartilhado.
- Na leitura, os arquivos são processados em memória e enviados ao Google. O tratamento pelo Google depende dos termos do serviço e do plano da chave. Ao confirmar a importação, o original é enviado ao bucket privado `prova-originais` no Supabase Storage, na pasta da conta autenticada. A prova guarda os metadados e o caminho em `provas.data`, sem incluir bytes em JSON/localStorage. O upload precisa concluir antes de criar a prova ou substituir o gabarito; em caso de falha, a leitura permanece na prévia para nova tentativa.

### Ativar o armazenamento dos originais

No dashboard do projeto Supabase, abra **SQL Editor → New query**, copie todo o conteúdo de [supabase/prova-originais-storage.sql](supabase/prova-originais-storage.sql), cole na consulta e clique em **Run**. O resultado deve indicar sucesso. Em **Storage**, confira o bucket privado **prova-originais**. O script é reaplicável e preserva as provas existentes.

As políticas permitem somente ao dono da pasta ler, inserir e excluir os arquivos; não há links públicos. Em cada prova, **Arquivos originais da prova → Ver original** abre o PDF ou a imagem com download autenticado. O limite é 10 MB por arquivo e 100 originais por prova. Cancelar uma prévia não salva o arquivo. Originais confirmados são preservados mesmo se uma prova for excluída, para que backups anteriores ainda possam referenciá-los; podem ser removidos pelo administrador no Storage. Os backups JSON incluem referências, não cópias dos arquivos: a consulta dos originais exige a mesma conta, o mesmo projeto Supabase e os arquivos ainda presentes no bucket. Trocar de conta durante o salvamento impede aplicar a leitura na outra conta.

O cabeçalho mostra a foto Google (ou iniciais quando indisponível). **Meu perfil** reúne troca de tema, sincronização, exportação de backup e saída da conta. Os três temas possuem luz ambiente e elementos de parallax; o movimento é desativado em telas pequenas e para quem prefere movimento reduzido.

O perfil também reúne **Importar provas deste dispositivo**, para recuperar cartões criados antes do login. A faixa de importação/exportação abaixo do cabeçalho foi removida, assim como o seletor de tema da lateral. Backups continuam disponíveis no perfil e na área de backup. Os atalhos e o painel de preenchimento por teclado ficam ocultos em telas menores que 768 px e em dispositivos com ponteiro de toque, inclusive na versão instalada no celular.

Na primeira interação com uma questão de cada cartão, um convite animado oferece iniciar o cronômetro, mesmo sem PDF. **Sim, iniciar** começa a contagem; **Agora não**, X ou Escape dispensam o convite, que não reaparece naquele cartão. O relógio do cabeçalho permite iniciar ou pausar manualmente. **Corrigir Simulado** para a contagem imediatamente; reiniciar a prova também para e zera o tempo. Trocar de cartão ou conta pausa a contagem. O tempo acumulado é salvo; recarregar a página mantém esse valor e deixa o relógio pausado.

Para organizar a lateral, arraste o cartão ou sua alça no computador; no celular, segure por cerca de meio segundo e mova. O destino recebe destaque e a lista rola ao alcançar suas bordas. Um toque normal abre a prova e deslizar antes de segurar mantém a rolagem. Com a alça focada, ↑/↓ também movem o cartão. A ordem permanece no backup e nos dados sincronizados da conta; a busca precisa estar limpa para reorganizar.

### Consultar questões e revisar com flashcards

Os enunciados importados ficam recolhidos. Clique no número ou na área da questão fora das alternativas para abrir o enunciado em um modal, inclusive após a correção. Marcar uma alternativa ou uma dúvida não abre o modal. A opção **Ver arquivo original da prova** consulta os arquivos privados da conta e permite abrir uma cópia local. PDFs são desenhados pelo PDF.js dentro da aplicação, com páginas e zoom, sem depender do visualizador nativo do Chrome. A consulta começa na página indicada pela questão; também é possível baixar o original ou abrir em outra aba.

No computador (a partir de 1024 px), abrir o original amplia o modal e coloca o enunciado e o PDF lado a lado, com rolagem independente. Quando há um único original da prova na conta, ele abre automaticamente. No celular e em telas menores, as abas **Questão** e **PDF original** alternam a leitura preservando o arquivo selecionado e a página. Os controles de consulta têm áreas de toque de pelo menos 44 px e respeitam as margens seguras do dispositivo.

O botão **Flashcards** aparece à direita no cartão-resposta (no canto inferior em telas pequenas). Antes de corrigir, ele orienta a concluir a prova e não chama a IA. Após uma correção válida, **Gerar meus flashcards** cria 10 cartões priorizando respostas erradas com gabarito oficial e contexto: enunciado importado ou disciplina mapeada. Com menos de cinco erros com contexto, acertos podem complementar a rodada: pelo menos sete cartões se baseiam nos erros e até três reforçam acertos. Se não houver erros com contexto, a rodada reforça acertos. Questões em branco e itens sem gabarito não entram. A IA identifica a disciplina e o conceito de cada cartão. Uma rodada envia até 30 erros distribuídos entre as disciplinas, usando apenas o Gemini 3.1 Flash Lite, a chave do servidor, autenticação e os mesmos limites de uso da importação. O envio acontece ao solicitar a geração; revisar cartões salvos não faz novas chamadas. As explicações da IA devem ser conferidas com o material de estudo.

Os flashcards usam a apresentação anterior: um cartão por vez, com fundo desfocado, capa adaptada ao tema e navegação pelos botões anterior e próximo. Os efeitos de entrada e virada foram preservados. No celular, o texto tem rolagem independente e os controles de ação permanecem fora do cartão. Pense na resposta, clique em **Revelar resposta** e escolha **Já sei** ou **Revisar de novo**. Os cartões e o progresso acompanham a prova, a sincronização e o backup e continuam disponíveis após editar ou refazer a prova. Após nova correção, **Gerar novos flashcards** oferece outra rodada; a anterior permanece no seletor **Rodada de revisão**, com seu próprio progresso. Uma geração que falha ou é cancelada preserva as revisões salvas. Trocar a prova ou a conta e fechar a tela cancela uma geração em andamento. As animações respeitam a preferência por movimento reduzido.

Cada novo cartão apresenta contexto da questão e uma pergunta com um objetivo focado. O verso traz resposta direta, explicação do raciocínio e, quando houver base suficiente, exemplo e erro comum a evitar. O botão **Q…** consulta a questão de origem sem editar a resposta da prova, quando a rodada corresponde à correção atual. Rodadas anteriores mantêm o contexto salvo no cartão. **Revelar resposta** fica fora da área de rolagem para continuar acessível no celular. **Atualizar cartões com mais contexto** solicita uma nova rodada à IA e arquiva a anterior somente quando a geração termina com sucesso, preservando seu progresso. A formulação segue a orientação de perguntas focadas com contexto e fontes do [SuperMemo](https://www.supermemo.com/en/blog/twenty-rules-of-formulating-knowledge) e explicações após a recuperação propostas pelo [Retrieval Practice](https://www.retrievalpractice.org/feedback).

`npm run dev` e `npm run preview` incluem a API de IA. Para servir o build com a API em produção:

```bash
npm run build
npm run start
```

Configure as variáveis do Supabase e `GEMINI_API_KEY` no ambiente do servidor, `PORT` e HTTPS no provedor/reverse proxy. Hospedagem somente estática e o arquivo offline não fornecem a API de IA; use o servidor Node ou encaminhe `/api/ai` para ele. Nunca use `VITE_GEMINI_API_KEY`, pois variáveis `VITE_` são públicas.

A implementação segue a documentação oficial de [chaves e proteção no servidor](https://ai.google.dev/gemini-api/docs/api-key), [leitura de PDF](https://ai.google.dev/gemini-api/docs/generate-content/document-processing), [Gemini 3.1 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite), [limites por projeto](https://ai.google.dev/gemini-api/docs/rate-limits) e [saída estruturada](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).

Os exemplos de respostas e gabarito usam o total da prova ativa e um par comum que produz cerca de 70% de acertos, em qualquer ordem de importação. Essa vinculação vale apenas para exemplos inseridos pelos botões de teste; editar ou importar dados pessoais desfaz a vinculação correspondente.

### Avisos e histórico das mudanças

Ao terminar a leitura de uma prova ou de um gabarito, a aplicação mostra **Leitura concluída!**, com o arquivo e o total de questões. O aviso pode ser fechado com **X**; a importação ainda exige a conferência do usuário. Falhas e cancelamentos não disparam avisos de conclusão. **Ativar aviso neste dispositivo** solicita permissão somente por clique; quando autorizada e a página estiver em segundo plano, o navegador também pode avisar. Se esse recurso não estiver disponível no dispositivo, o aviso dentro do site continua funcionando. A implementação segue a [API de notificações do navegador](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API).

O banner de avisos da conta também tem **X**. Fechá-lo não apaga provas nem altera o erro de sincronização; um erro novo ou uma nova tentativa pode mostrá-lo novamente.

A versão anterior às mudanças de avisos e carrossel está salva na branch **codex/antes-flashcards-dinamicos** do GitHub. As mudanças estão na branch **codex/flashcards-dinamicos-e-avisos**, mantendo a versão anterior disponível para comparação e retorno. O visual dos flashcards foi restaurado à apresentação anterior, preservando os avisos de leitura, o botão de fechar o banner e a prioridade dos erros com complemento por acertos.
