# Validação — revisão completa

Branch: `codex/revisao-completa`.

## Verificações automatizadas

Resultado final: 65 testes aprovados em nove arquivos e TypeScript sem erros.

- TypeScript com modo estrito.
- Testes de recuperação IndexedDB antes da primeira gravação, migração com localStorage corrompido, catálogo intencionalmente vazio, backups inválidos e IDs duplicados.
- Isolamento de provas e snapshots por conta; troca de conta/saída sob StrictMode; leitura da nuvem com falha sem envio destrutivo; snapshots periódicos durante edições contínuas.
- Sincronização com comparação de três estados, cópia em conflitos e escritas/exclusões condicionadas à versão remota.
- Importação de respostas com lacunas, JSON e alternativas específicas de cada tipo de prova.
- Segurança da API de IA: assinatura de arquivo, formatos, origem, modelo permitido, sessão obrigatória para chave compartilhada, limite de solicitações, erros sem credenciais e resposta incompleta/duplicada recusada.
- Conferência de IA: consentimento antes do envio, revisão antes de aplicar, edição da leitura, falha da API sem alteração e bloqueio de gabarito de tipo incompatível.

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

- A tela de IA pede apenas arquivo, consentimento e conferência. Não há campo de chave nem seletor de modelo. A credencial pertence ao servidor; cabeçalhos de chave pessoal não contornam o login. Modelos Flash estáveis são consultados no Google e há alternativa automática para falhas transitórias.
- Testes de exemplos cobrem múltipla escolha e Certo/Errado em 7, 70, 120 e 200 questões, nos formatos pares, tabela e sequência. Dados pessoais e edições manuais desativam a vinculação.
- No navegador, o exemplo de múltipla escolha com respostas importadas primeiro e o exemplo de Certo/Errado com gabarito importado primeiro produziram 84 acertos em 120 questões (70%).
- Botões principais e seleções usam cores do tema: verde Clean, marrom Caderno e verde claro Escuro. Ícones seguem a convenção solicitada: importar com Download; exportar com Upload.
- A API real leu o PDF sintético de três questões e a imagem 1-A, 2-B, 3-C. O teste isolado simula a validação da sessão Supabase, mas faz chamadas reais ao Google com a chave local. O Google também retornou alta demanda em algumas tentativas; o servidor tratou esses erros sem alterar provas. A precisão em provas pessoais ainda depende da conferência da prévia.

Verificação final: TypeScript sem erros, builds web e offline gerados e modal de IA em 390 × 844 sem transbordamento horizontal. A chave real não apareceu nos 70 arquivos rastreados nem nos 19 arquivos públicos gerados.
