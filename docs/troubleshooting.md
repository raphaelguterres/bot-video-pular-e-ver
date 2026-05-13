# Troubleshooting

## CDP nao conecta

Se aparecer `ECONNREFUSED 127.0.0.1:9222`, o Brave nao foi iniciado com depuracao remota.

1. Feche todas as janelas do Brave.
2. Confira no Gerenciador de Tarefas se nao restou `brave.exe`.
3. Rode:

```powershell
npm run brave:debug
```

4. Clique em `Verificar CDP` no app.

## Brave abriu, mas o bot nao controla a aba

Use `Usar aba nova no Brave ja aberto` quando quiser controlar o navegador aberto com CDP. Se preferir uma janela controlada separada, desative essa opcao.

## Erros de cache no Brave

Mensagens como `Unable to create cache` ou `Acesso negado` normalmente indicam disputa de perfil/cache. Elas costumam nao impedir o bot. Para reduzir ruido, feche o Brave antes de abrir com CDP ou use uma janela controlada separada.

## Nenhum video encontrado

Possiveis causas:

- A pagina ainda esta carregando.
- O seletor de video nao e `video`.
- O item atual e leitura ou cenario sem video.
- A plataforma mudou o DOM.

No Coursera, ative `Avancar conteudo sem video` para leituras e cenarios praticos.

## O bot pausou em avaliacao

Isso e esperado. O app nao automatiza respostas de provas, quizzes ou assignments. Use o painel de modo estudo para revisar o que foi visto e continue manualmente.

## Build falha no Windows

Feche janelas antigas do app se o `dist/win-unpacked` estiver em uso. Depois rode:

```powershell
npm run build:win
```

## Diagnostico

Use o botao `Diagnostico` na UI. O arquivo e salvo no diretorio `userData` do Electron e contem settings sanitizados, status e eventos recentes.
