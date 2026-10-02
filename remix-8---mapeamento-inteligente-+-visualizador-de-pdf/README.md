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

Requer Node.js 20.19+ ou 22.12+.

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

Use “Importar com IA” no cabeçalho ou “Ler gabarito com IA” no cartão. A prova em PDF vira uma nova prova com enunciados e alternativas navegáveis. PNG, JPEG, WebP e PDF de gabarito passam por uma prévia editável antes de substituir o gabarito do cartão selecionado. Arraste o arquivo para a área de seleção ou escolha-o no dispositivo. O envio ocorre ao solicitar a leitura; a prévia deve ser conferida antes de aplicar. Para gabaritos com várias versões, informe a cor ou o tipo do caderno. O importador não resolve as questões nem deve inventar alternativas ilegíveis.

- Limites da aplicação: 10 MB por arquivo, até 200 questões e uma leitura simultânea por usuário.
- Configure `GEMINI_API_KEY` **somente no servidor**. O usuário seleciona um arquivo e confere a leitura, sem informar chave nem modelo. A sessão é verificada no Supabase e há um limite de 20 solicitações por 10 minutos por usuário. O servidor utiliza somente `gemini-3.1-flash-lite`; `GEMINI_MODEL`, se preenchido, deve ter esse valor. Não há busca nem troca automática para modelos mais novos, nem novas chamadas em caso de cota ou alta demanda. Esse modelo tem uma camada gratuita no Google, mas o plano e os limites reais dependem do projeto no AI Studio, não da escolha do modelo. O limite usa memória de um processo; várias réplicas precisam de um limitador compartilhado.
- Na leitura, os arquivos são processados em memória e enviados ao Google. O tratamento pelo Google depende dos termos do serviço e do plano da chave. Ao confirmar a importação, o original é enviado ao bucket privado `prova-originais` no Supabase Storage, na pasta da conta autenticada. A prova guarda os metadados e o caminho em `provas.data`, sem incluir bytes em JSON/localStorage. O upload precisa concluir antes de criar a prova ou substituir o gabarito; em caso de falha, a leitura permanece na prévia para nova tentativa.

### Ativar o armazenamento dos originais

No dashboard do projeto Supabase, abra **SQL Editor → New query**, copie todo o conteúdo de [supabase/prova-originais-storage.sql](supabase/prova-originais-storage.sql), cole na consulta e clique em **Run**. O resultado deve indicar sucesso. Em **Storage**, confira o bucket privado **prova-originais**. O script é reaplicável e preserva as provas existentes.

As políticas permitem somente ao dono da pasta ler, inserir e excluir os arquivos; não há links públicos. Em cada prova, **Arquivos originais da prova → Ver original** abre o PDF ou a imagem com download autenticado. O limite é 10 MB por arquivo e 100 originais por prova. Cancelar uma prévia não salva o arquivo. Originais confirmados são preservados mesmo se uma prova for excluída, para que backups anteriores ainda possam referenciá-los; podem ser removidos pelo administrador no Storage. Os backups JSON incluem referências, não cópias dos arquivos: a consulta dos originais exige a mesma conta, o mesmo projeto Supabase e os arquivos ainda presentes no bucket. Trocar de conta durante o salvamento impede aplicar a leitura na outra conta.

O cabeçalho mostra a foto Google (ou iniciais quando indisponível). **Meu perfil** reúne troca de tema, sincronização, exportação de backup e saída da conta. Os três temas possuem luz ambiente e elementos de parallax; o movimento é desativado em telas pequenas e para quem prefere movimento reduzido.

`npm run dev` e `npm run preview` incluem a API de IA. Para servir o build com a API em produção:

```bash
npm run build
npm run start
```

Configure as variáveis do Supabase e `GEMINI_API_KEY` no ambiente do servidor, `PORT` e HTTPS no provedor/reverse proxy. Hospedagem somente estática e o arquivo offline não fornecem a API de IA; use o servidor Node ou encaminhe `/api/ai` para ele. Nunca use `VITE_GEMINI_API_KEY`, pois variáveis `VITE_` são públicas.

A implementação segue a documentação oficial de [chaves e proteção no servidor](https://ai.google.dev/gemini-api/docs/api-key), [leitura de PDF](https://ai.google.dev/gemini-api/docs/generate-content/document-processing), [Gemini 3.1 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite), [limites por projeto](https://ai.google.dev/gemini-api/docs/rate-limits) e [saída estruturada](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).

Os exemplos de respostas e gabarito usam o total da prova ativa e um par comum que produz cerca de 70% de acertos, em qualquer ordem de importação. Essa vinculação vale apenas para exemplos inseridos pelos botões de teste; editar ou importar dados pessoais desfaz a vinculação correspondente.
