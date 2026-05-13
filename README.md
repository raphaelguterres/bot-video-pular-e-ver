# Video Course Bot

App desktop em Electron + Playwright para acompanhar aulas em video, controlar velocidade, detectar fim do video e avancar para o proximo item usando Brave via CDP.

## Recursos

- Interface desktop com sidebar, status de sessao, timeline, historico e modo estudo.
- Preset Coursera e fallback generico por adapters em `src/platforms`.
- Compatibilidade com Brave/Chrome via CDP em uma aba nova do navegador ja aberto.
- Controle de velocidade de reproducao.
- Avanco automatico quando o video termina.
- Tratamento de conteudos sem video com espera configuravel.
- Pausa automatica ao detectar prova, quiz ou assessment.
- Modo simulacao para detectar o proximo passo sem clicar.
- Import/export de configuracoes.
- Diagnostico com settings sanitizados e eventos recentes.
- Build cross-platform com Electron Builder.

## Uso Seguro

Este projeto nao automatiza respostas de provas, quizzes, assignments ou avaliacoes. Ao detectar uma avaliacao, o bot pausa a automacao e exibe um aviso. Use a ferramenta para organizar acompanhamento de aulas e progresso de estudo, respeitando as regras da plataforma.

## Instalar

```powershell
npm install
```

## Rodar em desenvolvimento

```powershell
npm start
```

## Abrir Brave com CDP

Se o Brave ja estiver aberto sem CDP, feche todas as janelas antes.

```powershell
npm run brave:debug
```

Depois rode:

```powershell
npm start
```

## Modo terminal

```powershell
npm run cli
```

## Testes e qualidade

```powershell
npm run lint
npm test
npm run format
```

## Builds locais

```powershell
npm run build
npm run build:win
npm run build:win:portable
npm run build:linux
npm run build:mac
```

Os artefatos ficam em `dist/`. Builds macOS devem rodar em macOS; builds Linux devem rodar em Linux ou CI Linux.

## Configuracao

Use a interface ou `config.json` local. `config.json` nao deve ser versionado.

- `startUrl`: URL inicial do curso ou video.
- `platformPreset`: `coursera` ou `custom`.
- `useExistingBrowser`: cria aba nova no Brave conectado por CDP.
- `browserCdpUrl`: normalmente `http://127.0.0.1:9222`.
- `browserExecutablePath`: caminho local do Brave.
- `videoSelector`: seletor CSS do player.
- `playbackRate`: velocidade inicial entre `0.25` e `4`.
- `stopOnAssessment`: pausa quando detectar prova, quiz ou avaliacao.
- `simulationMode`: detecta a acao sem clicar.
- `autoAdvanceNonVideo`: avanca conteudos sem video apos espera.
- `nonVideoWaitMs`: tempo minimo em conteudos sem video.
- `nextButtonSelectors`: seletores de proxima aula.
- `completionButtonSelectors`: seletores de conclusao de conteudo sem video.

## Documentacao

- [Arquitetura](docs/architecture.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Release](RELEASE.md)
- [Changelog](CHANGELOG.md)
