# Site de apresentação

Página estática (HTML + CSS, sem build) que apresenta o app e oferece o APK para download.

## Ver localmente

O `docker-compose.dev.yml` já sobe o site junto (serviço `site`, nginx) em <http://localhost:8080>.
Sem Docker:

```bash
cd site
python3 -m http.server 8080
# abrir http://localhost:8080
```

## Publicar o APK (GitHub Releases)

Os botões apontam para o APK do release mais recente:
`https://github.com/hadesds/Mobile-UNDB/releases/latest/download/curriculo-sob-medida.apk`.
O APK não vai para o git nem para o deploy do site.

1. Gere o APK: `cd frontend && npx eas-cli build -p android --profile preview`
   (responda **no** para instalar no emulador).
2. Baixe o `.apk` e crie o release com o arquivo **com esse nome exato**:

```bash
gh release create v0.X.0 curriculo-sob-medida.apk --target 01-backend --title "v0.X.0" --notes "..."
```

O site passa a baixar a versão nova sozinho. Atualize o texto "versão 1.0.0" em `index.html`
quando mudar a versão do app.

## Deploy na Vercel

Pelo painel: **Add New → Project**, importe o repositório, em **Root Directory** escolha `site`,
**Framework Preset: Other**, sem build command, e clique em **Deploy**.

Pela CLI: `cd site && npx vercel --prod`.
