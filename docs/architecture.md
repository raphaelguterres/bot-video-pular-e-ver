# Arquitetura

## Visao Geral

O app e dividido em quatro camadas:

- `src/electron`: processo principal, preload e IPC seguro.
- `src/ui`: HTML, CSS e JavaScript do renderer.
- `src/core`: motor do bot, configuracao, historico, validacao e state machine.
- `src/platforms`: adapters especificos por plataforma.

## Fluxo

1. O renderer coleta settings e chama IPC seguro.
2. O processo principal normaliza e valida a configuracao.
3. `VideoCourseBot` abre ou conecta ao Brave via CDP.
4. O adapter ativo detecta aula, video, avaliacao e controles de proximo.
5. O core emite eventos estruturados para a UI.
6. Historico e diagnostico sao persistidos no `userData` do Electron.

## Adapters

Cada adapter expõe:

- `detectLesson(page)`
- `detectVideo(page, selector)`
- `detectAssessment(page, config)`
- `clickNext(page, config)`
- `clickCompletion(page, config)`

O adapter Coursera contem regras de URL, leitura e avaliacao da Coursera. O adapter generico fornece fallback simples.

## Estados

Estados ficam em `src/core/bot-state.js`:

- `idle`
- `connecting`
- `opening`
- `running`
- `waiting_video`
- `reading`
- `advancing`
- `assessment`
- `finished`
- `error`
- `stopped`

O core deve emitir status por `emitStatus`, que passa pela state machine antes de chegar ao renderer.

## Seguranca Electron

- `nodeIntegration: false`
- `contextIsolation: true`
- Renderer acessa apenas metodos expostos em `preload.js`
- Diagnostico usa settings sanitizados
- O bot pausa ao detectar avaliacao e nao responde provas
