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

## Publicar o APK

Os botões apontam para `downloads/curriculo-sob-medida.apk`. Enquanto o arquivo não existir,
a página desativa os botões e mostra "disponível em breve".

Para gerar o APK com o EAS (Expo):

```bash
cd frontend
npx eas-cli login
npx eas-cli build -p android --profile preview   # perfil com "buildType": "apk" no eas.json
```

Baixe o `.apk` gerado, salve como `site/downloads/curriculo-sob-medida.apk` e publique a pasta
`site/` em qualquer hospedagem estática (GitHub Pages, Netlify, Vercel).

Ao lançar uma versão nova, atualize também o texto "versão 1.0.0" em `index.html`.
