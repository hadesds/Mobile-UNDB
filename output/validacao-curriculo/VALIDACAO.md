# Validação local do currículo

Ambiente: Windows, API Django em `127.0.0.1:8000`, build web Expo em
`127.0.0.1:8081`. Banco SQLite e arquivos de teste isolados nesta pasta.
Somente dados fictícios do seed e das fixtures dos testes. Docker não foi necessário.

## Entregas verificadas

- PDF gerado na hora pelo endpoint autenticado, com seleção de seções.
- Download real pelo app web, incluindo uma exportação somente de competências.
- Seleção vazia desabilita o botão; checkboxes expõem o estado à acessibilidade.
- Edição da instituição pelo app para `UNDB - Perfil atualizado`, seguida de novo
  download: o texto atualizado está no PDF.
- Upload de DOCX pelo app, prévia de 18 sugestões e confirmação de 12 itens.
- Perfil final: 4 experiências, 10 competências, 2 formações, 2 idiomas e 3 cursos.
- Original e texto extraído removidos após confirmação com a opção marcada.
- Nenhum segredo configurado no `.env` do backend encontrado no bundle web.
- Layout verificado em desktop e em viewport 390 × 844. Capturas JPG nesta pasta.
- PDF final renderizado com Poppler e ambas as páginas inspecionadas visualmente.

## Verificações automatizadas

- `npx tsc --noEmit`: passou.
- `npx expo export --platform web`: passou.
- `npx expo export --platform android`: passou, incluindo bytecode Hermes.
- Testes de exportação e importação: 26 passaram.
- Suíte backend + solicitacoes: 130 passaram e um teste antigo falhou por usar
  `/dev/null` no Windows. Corrigido para `StringIO`; o teste foi reexecutado e passou.
- `git diff --check`: passou.
- `makemigrations --check --dry-run`: nenhuma migração nova necessária.

## Repetir a API isolada no PowerShell

Na raiz do repositório, após instalar `requirements.txt`:

```powershell
$env:PYTHONPATH = "$PWD/output/validacao-curriculo"
.venv/Scripts/python.exe manage.py migrate --settings=settings_local
.venv/Scripts/python.exe manage.py seed --settings=settings_local
.venv/Scripts/python.exe manage.py runserver 127.0.0.1:8000 --settings=settings_local
```

Em outro terminal, na pasta `frontend`:

```powershell
$env:EXPO_PUBLIC_API_URL = 'http://127.0.0.1:8000'
npx expo start --web --localhost
```

O compartilhamento usa `expo-file-system` e `expo-sharing` no Android/iOS.
A interação com a folha nativa de compartilhamento ainda precisa de um aparelho
ou emulador. Certificados continuam dependendo da integração T1 do grupo.
Nada foi publicado no Render ou enviado ao GitHub nesta implementação.
