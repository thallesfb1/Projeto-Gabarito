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
5. Faça login com a conta usada anteriormente. As provas da tabela são recuperadas automaticamente. O botão “Trazer provas deste dispositivo” copia o catálogo sem login para a conta, preservando os originais.

A sincronização compara o estado local, o último estado sincronizado e a nuvem. Edições simultâneas conflitantes preservam uma cópia local; escritas e exclusões conferem a versão remota antes de alterar uma prova. Falhas de leitura bloqueiam envios até uma recuperação bem-sucedida. O botão de sincronização busca mudanças feitas em outros dispositivos. Alterações sem conexão ficam no navegador até nova sincronização.

Sem configuração Supabase, a aplicação continua funcionando localmente. O arquivo aberto por `file://` usa somente o modo local. Exportar um backup continua recomendado: limpar os dados do site manualmente apaga o armazenamento do navegador.

## Validação da revisão

Veja [docs/validacao.md](docs/validacao.md) para os fluxos verificados e os limites da validação do banco remoto.

## Leitura com IA: PDF e gabarito em imagem

Use “Importar com IA” no cabeçalho ou “Ler gabarito com IA” no cartão. A prova em PDF vira uma nova prova com enunciados e alternativas navegáveis. PNG, JPEG, WebP e PDF de gabarito passam por uma prévia editável antes de substituir o gabarito do cartão selecionado. É necessário confirmar o envio ao Google e conferir a leitura. Para gabaritos com várias versões, informe a cor ou o tipo do caderno. O importador não resolve as questões nem deve inventar alternativas ilegíveis.

- Limites da aplicação: 10 MB por arquivo, até 200 questões e uma leitura simultânea por usuário/IP.
- “Verificar chave” consulta os modelos disponíveis para a chave, sem fixar um modelo que possa ficar indisponível. Chaves novas de autorização (`AQ…`) e chaves antigas restritas são aceitas. Erros de cota, autorização, alta demanda e respostas truncadas aparecem na tela.
- A chave pessoal digitada fica apenas na memória da tela e é enviada ao servidor da aplicação e ao Google; ela não entra em provas, backups, localStorage ou logs da aplicação. Fechar a tela descarta a chave.
- Para disponibilizar sua própria chave a usuários autenticados, configure `GEMINI_API_KEY` **somente no servidor**. Essa opção verifica a sessão com Supabase e limita a 20 solicitações por 10 minutos por usuário. Sem chave compartilhada, cada pessoa pode usar sua própria chave. O limite usa memória de um processo; instalações com várias réplicas precisam de um limitador compartilhado.
- Os arquivos são processados em memória e enviados ao Google após consentimento. O servidor da aplicação não os salva. O tratamento pelo Google depende dos termos do serviço e do plano da chave. O texto extraído acompanha a prova na conta e nos backups; o PDF original pode ser aberto localmente no leitor para conferir figuras e fórmulas.

`npm run dev` e `npm run preview` incluem a API de IA. Para servir o build com a API em produção:

```bash
npm run build
npm run start
```

Configure as variáveis do Supabase e, opcionalmente, `GEMINI_API_KEY` no ambiente do servidor, `PORT` e HTTPS no provedor/reverse proxy. Hospedagem somente estática e o arquivo offline não fornecem a API de IA; use o servidor Node ou encaminhe `/api/ai` para ele. Nunca use `VITE_GEMINI_API_KEY`, pois variáveis `VITE_` são públicas.

A implementação segue a documentação oficial de [chaves e proteção no servidor](https://ai.google.dev/gemini-api/docs/api-key), [leitura de PDF](https://ai.google.dev/gemini-api/docs/generate-content/document-processing) e [saída estruturada](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).
