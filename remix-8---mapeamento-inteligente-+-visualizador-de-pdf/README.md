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
- **Privacidade local**: os dados ficam no navegador, sem cadastro ou telemetria.

Os modelos da biblioteca guardam somente a estrutura pedagógica da prova. Eles não incluem enunciados ou conteúdo protegido de terceiros.

## Executar localmente

Requer Node.js 18 ou superior.

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
- `test:run`: executa os testes unitários do diagnóstico, agregação e fila de revisão.
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

Provas, disciplinas, respostas e revisões são salvas no IndexedDB. O produto mantém migração para dados de versões anteriores e permite exportar backups em JSON para uso em outro navegador ou dispositivo.

## Próximos passos de produto

Para uma versão comercial, as próximas camadas recomendadas são sincronização opcional entre dispositivos, autenticação, planos de estudo adaptativos e uma área editorial para publicar catálogos de provas com procedência e licenciamento claros.
