# Video Course Bot

Aplicativo desktop para abrir uma aba no Brave via CDP, monitorar o elemento `<video>`, controlar velocidade e avancar automaticamente quando a aula termina.

## Recursos

- Input para colar URL do video ou curso.
- Preset Coursera para seletores e deteccao de avaliacoes.
- Historico de sessoes, aulas vistas e avaliacoes detectadas.
- Modo Estudo com checklist e perguntas de revisao baseadas nas aulas vistas.
- Interface separada para acompanhar status, progresso e eventos.
- Controle de velocidade de reproducao.
- Deteccao de fim do video e tentativa de avancar para o proximo.
- Avanco de conteudos sem video, como leituras e cenarios praticos, apos espera configuravel.
- Deteccao de fim do curso quando nao existe proxima aula.
- Deteccao de prova/quiz com pausa da automacao.
- Compatibilidade com Brave via CDP.
- Build para Windows, Linux e macOS com Electron Builder.

## Instalar

```powershell
npm install
```

## Rodar com interface

```powershell
npm start
```

## Usar o Brave atual

O Brave precisa estar aberto com a porta de depuracao remota ativa. O app tem o botao "Abrir Brave CDP", mas se o Brave ja estiver aberto sem CDP, feche todas as janelas antes.

```powershell
npm run brave:debug
```

Depois abra o app:

```powershell
npm start
```

## Modo terminal

```powershell
npm run cli
```

## Build

```powershell
npm run build:win
npm run build:win:portable
npm run build:linux
npm run build:mac
```

Os artefatos saem na pasta `dist`. O comando `build:win` gera o instalador Windows; `build:win:portable` gera o executavel portatil. Para macOS, o build precisa rodar em macOS; para Linux, rode em Linux ou em CI com ambiente Linux.

## Configuracoes

- `startUrl`: URL inicial do video ou curso.
- `platformPreset`: preset de plataforma, como `coursera` ou `custom`.
- `useExistingBrowser`: cria uma aba nova no Brave conectado por CDP.
- `browserCdpUrl`: endereco da porta CDP, normalmente `http://127.0.0.1:9222`.
- `browserExecutablePath`: caminho do Brave.
- `videoSelector`: seletor CSS do player, normalmente `video`.
- `playbackRate`: velocidade inicial.
- `stopOnAssessment`: pausa quando detectar prova, quiz ou avaliacao.
- `autoAdvanceWaitMs`: tempo de espera para troca automatica.
- `autoAdvanceNonVideo`: avanca conteudos sem video apos uma espera.
- `nonVideoWaitMs`: tempo minimo de permanencia em conteudos sem video.
- `nextButtonSelectors`: seletores de botao/link de proxima aula.
