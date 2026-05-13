# Release

## Checklist

1. Atualizar `CHANGELOG.md`.
2. Rodar qualidade local:

```powershell
npm run lint
npm test
npm run format
```

3. Gerar build local quando necessario:

```powershell
npm run build:win
npm run build:win:portable
```

4. Criar tag:

```powershell
git tag v1.1.0
git push origin main --tags
```

5. Conferir artefatos no GitHub Actions.

## Artefatos

- Windows installer: `Video Course Bot Setup *.exe`
- Windows portable: `*.exe`
- Linux: `AppImage` e `deb`
- macOS: `dmg` e `zip`

## Observacoes

O app nao e assinado digitalmente nesta fase. Windows e macOS podem exibir avisos de fornecedor desconhecido.
