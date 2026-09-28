# Gabarito de Simulados 📝

Um aplicativo web moderno, leve e 100% offline para concurseiros e estudantes preencherem, cronometrarem e corrigirem folhas de respostas óticas de simulados e provas.

Projetado com foco em agilidade no preenchimento pelo teclado ou toque, preservação total de privacidade (sem contas, sem servidores, sem telemetria) e autonomia para estudos em qualquer lugar.

---

## ✨ Funcionalidades Principais

- **Múltiplas Provas Locais**:
  - Salve e alterne entre diversos simulados simultaneamente (ex.: *DATAPREV - Simulado 01*, *CNU - Bloco 4*, *Polícia Federal*).
  - Cada prova mantém de forma independente: respostas do aluno, gabarito oficial, status de correção, tempo cronometrado e anotações.
  - Ações na barra lateral: criar nova prova, renomear, duplicar (gerando cópia idêntica) e excluir com confirmação.

- **Cartão-Resposta Interativo & Atalhos de Teclado**:
  - Preenchimento ultrarrápido usando as teclas `A`, `B`, `C`, `D` e `E`.
  - Avanço automático para a próxima questão ao marcar.
  - Navegação vertical com setas para cima/baixo (`↑`/`↓`).
  - Limpar resposta com `Backspace` ou `Delete`.
  - Sinalizar questão para revisão com `F` ou `R` (marcador âmbar/bandeira).
  - Suporte de 1 a 200 questões por prova com seletor rápido.

- **Cronômetro de Prova Integrado**:
  - Cronômetro no cabeçalho com início, pausa e reset.
  - Tempo salvo automaticamente por prova para acompanhar seu ritmo de resolução por questão.

- **Gabarito Oficial e Correção Automática**:
  - Gaveta retrátil para preencher ou colar o gabarito da banca examinadora.
  - Correção instantânea com painel detalhado de desempenho:
    - Total de acertos, erros e questões em branco;
    - Percentual de aproveitamento com código de cores visual;
    - Filtros por estado no cartão: *Todas*, *Erros*, *Acertos*, *Em branco* e *Sinalizadas*.

- **Exportação e Importação Flexíveis**:
  - **Individual**: Exporte as respostas do aluno ou o relatório de desempenho em formatos `.txt` (bloco de notas legível) e `.json`.
  - **Backup Completo**: Gere um arquivo `gabarito-backup-AAAA-MM-DD.json` com todas as suas provas salvas de uma só vez.
  - **Restauração Segura**: Opção de *Mesclar* (preserva suas provas atuais e adiciona as importadas) ou *Substituir* tudo.

- **Totalmente Offline & Autônomo**:
  - Funciona diretamente abrindo o arquivo `gabarito.html` no navegador, sem internet e sem instalar programas.
  - Armazenamento em `localStorage` com migração retrocompatível automática.

---

## 🚀 Como Executar

### Opção 1: Uso Direto Offline (Sem instalar nada)

1. Baixe ou abra a pasta do projeto.
2. Dê **dois cliques** no arquivo `gabarito.html`.
3. Pronto! O aplicativo roda no seu navegador padrão (Chrome, Edge, Firefox, Brave, Safari) sem conexão à internet.

### Opção 2: Modo de Desenvolvimento (React + Vite + TypeScript)

Para editar os componentes, estilos ou lógica do aplicativo:

1. Certifique-se de ter o [Node.js](https://nodejs.org) (v18+) instalado.
2. No terminal da pasta do projeto, instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Acesse no navegador o endereço exibido (geralmente `http://localhost:3000`).

---

## 📦 Estrutura do Projeto

```text
├── gabarito.html             # Aplicação empacotada em arquivo único (HTML + CSS + JS inline)
├── index.html                # Entry point para o servidor de desenvolvimento
├── package.json              # Dependências e scripts de build
├── vite.config.ts            # Configuração do Vite para desenvolvimento SPA
├── vite.standalone.config.ts # Script que gera o gabarito.html autônomo offline
└── src/
    ├── App.tsx               # Componente raiz e gerenciador de estado central
    ├── types.ts              # Definições de tipos TypeScript (SimuladoData, MultiSimuladoStore, etc.)
    ├── components/
    │   ├── Sidebar.tsx            # Barra lateral de gerenciamento de múltiplas provas
    │   ├── Header.tsx             # Cabeçalho com título, data, cronômetro e ações
    │   ├── ControlsBar.tsx        # Barra de controle (total de questões, atalhos, conferência)
    │   ├── QuestionGrid.tsx       # Grade ótica de bolhas de respostas A-E
    │   ├── ScorePanel.tsx         # Painel de métricas e gráficos de correção
    │   ├── OfficialKeyDrawer.tsx  # Gaveta para edição e conferência do gabarito oficial
    │   ├── ExportImportModal.tsx  # Modal de exportação/importação individual de prova
    │   ├── BackupModal.tsx        # Modal de backup e restauração geral (todas as provas)
    │   ├── NewSimuladoModal.tsx   # Modal simplificado para criar nova prova
    │   ├── RenameSimuladoModal.tsx# Modal para renomear prova
    │   └── ConfirmDialog.tsx      # Diálogo in-app para exclusões e ações destrutivas
    └── utils/
        ├── parser.ts              # Formatadores de texto, relatório e parsing de gabaritos
        └── provasManager.ts       # Gerenciador de armazenamento local e migração de dados
```

---

## 💾 Persistência e Backup dos Dados

Os dados são armazenados localmente na chave `gabarito-multi-v1` do navegador:

```json
{
  "version": 3,
  "activeId": "prova_1726690000_abc123",
  "provas": [
    {
      "id": "prova_1726690000_abc123",
      "title": "DATAPREV - Simulado 01",
      "date": "18/09/2026",
      "createdAt": "2026-09-18T15:00:00.000Z",
      "updatedAt": "2026-09-18T15:10:00.000Z",
      "totalQuestions": 70,
      "userAnswers": ["A", "C", "D", null, "E"],
      "keyAnswers": ["A", "B", "D", "A", "E"],
      "flaggedQuestions": [2],
      "isCorrected": true,
      "timeSpentSeconds": 5420
    }
  ]
}
```

- **Migração Automática**: Se você utilizava versões anteriores, o sistema detecta e migra seus dados antigos automaticamente sem perda de informações.
- **Backup Periódico**: Recomendamos utilizar a opção **Backup Completo** na barra lateral para salvar cópias periódicas de todas as suas provas em um arquivo `.json` no seu computador.

---

## 🛠️ Compilando uma Nova Versão Offline

Sempre que fizer alterações no código-fonte em `src/`, compile a versão standalone para atualizar o arquivo `gabarito.html`:

```bash
npm run build
```

Isso compilará a aplicação de desenvolvimento e executará o empacotador de arquivo único, gerando um novo `gabarito.html` autônomo e pronto para distribuição.

---

## 📄 Licença

Distribuído sob a licença MIT. Sinta-se livre para utilizar, modificar e adaptar para seus estudos de concursos e vestibulares.
