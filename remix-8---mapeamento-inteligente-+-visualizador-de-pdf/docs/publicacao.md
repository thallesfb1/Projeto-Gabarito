# Publicação — 3 de outubro de 2026

Site: https://proximoacerto.site/ (HTTPS). O endereço www redireciona para o domínio principal.

## Render

- Serviço `proximoacerto`, plano Free, região Oregon.
- ID: `srv-db0m8pu0tbcc738fcer0`.
- Frontend e API Node/Express no mesmo serviço; endereço alternativo https://proximoacerto.onrender.com/.
- Repositório `thallesfb1/Projeto-Gabarito`, branch `codex/flashcards-dinamicos-e-avisos`, publicação automática a cada commit.
- Versão inicial publicada: `a33c837128d55e1465be86a3da0c885852a3ed3f`.
- Root Directory vazio; a pasta contém `+`, não aceito pelo formulário do Render.
- Build: `cd 'remix-8---mapeamento-inteligente-+-visualizador-de-pdf' && npm ci --include=dev && npm run build`.
- Start: `cd 'remix-8---mapeamento-inteligente-+-visualizador-de-pdf' && npm start`.
- Health check: `/`. Porta atribuída pelo Render.
- Variáveis: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.1-flash-lite`, `NODE_VERSION=22`, `NODE_ENV=production`.
- Os valores das chaves não estão neste documento. A chave Gemini permanece no servidor.

## Hostinger

Nameservers mantidos: `lunar.dns-parking.com` e `solar.dns-parking.com`.

| Tipo | Nome | Destino | TTL |
| --- | --- | --- | --- |
| A | @ | 216.24.57.1 | 300 |
| CNAME | www | proximoacerto.onrender.com | 300 |

Certificados emitidos pelo Render para os dois nomes. Antes da publicação: A `@` apontava para `2.57.91.91` (TTL 50) e CNAME `www` para `proximoacerto.site` (TTL 300).

## Supabase

Projeto existente `Projeto_Gabarito` preservado. Site URL: `https://proximoacerto.site`.

Redirect URLs permitidas: raiz `/` e caminhos `/**` de `http://localhost:3000`, `https://proximoacerto.site`, `https://www.proximoacerto.site` e `https://proximoacerto.onrender.com`.

RLS da tabela `provas` confirmado ativo. As políticas existentes de leitura e alteração exigem `auth.uid() = user_id`. As sete políticas existentes de `prova-originais` foram conferidas no painel; nenhuma política ou dado foi alterado durante a publicação.

## Validação e pendências

- 153 testes em 23 arquivos passaram; lint e builds web/offline passaram antes da publicação.
- Deploy inicial Live; domínio principal e www verificados com certificados emitidos.
- Login Google no domínio principal confirmado, com recuperação das provas existentes da conta.
- A configuração do Gemini está publicada, mas a leitura de PDF em produção será testada manualmente pelo usuário, conforme solicitado. A extensão não tinha acesso a arquivos locais; nenhum PDF de teste foi enviado.
- Nenhuma contratação paga foi realizada. O serviço gratuito pode suspender por inatividade e demorar a responder no primeiro acesso.
- Para voltar uma versão da aplicação, usar um deploy anterior no Render ou um commit anterior no GitHub. Reverter DNS para os valores anteriores apenas restaura o estacionamento do domínio, não uma versão anterior do aplicativo.
