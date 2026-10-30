# Conectar o app ao Expo Go (QR code)

Guia para rodar o app TEIA no celular com Windows + WSL2 (Arch), backend em Docker e frontend com Expo.

## Pré-requisitos

- Celular e computador **na mesma rede Wi-Fi** (sem isolamento entre dispositivos; redes de faculdade e Wi-Fi público costumam bloquear).
- App **Expo Go** instalado no celular.
- A versão do SDK do projeto **deve ser igual** à do Expo Go. Hoje: **SDK 58**.
- Windows 11 22H2 ou mais novo (necessário para o mirrored networking).

## 1. Configuração única do WSL (mirrored networking)

No modo mirrored, o WSL usa o mesmo IP do Windows, sem portproxy.

Crie `C:\Users\SEU_USUARIO\.wslconfig`:

```ini
[wsl2]
networkingMode=mirrored
```

No PowerShell:

```powershell
wsl --shutdown
```

Abra o Arch de novo. No **PowerShell como administrador**, libere o firewall e remova portproxies antigos (eles conflitam com o mirrored e causam `address already in use`):

```powershell
Set-NetFirewallHyperVVMSetting -Name '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -DefaultInboundAction Allow
New-NetFirewallRule -DisplayName "Expo e Django" -Direction Inbound -Protocol TCP -LocalPort 8000,8081 -Action Allow
netsh interface portproxy reset
```

## 2. Descobrir o IP da máquina

Rode isto sempre que trocar de rede, porque o IP muda:

```bash
ip -4 -br addr
```

Use o IP da interface `eth0` (rede local, ex.: `192.168.0.28`). Ignore o `lo` (`127.x`, `10.255.x`), o `172.x` (Docker) e IPs públicos (VPN).

## 3. Configurar os `.env`

Troque `SEU_IP` pelo IP do passo 2.

`.env` (raiz do repositório):

```
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,SEU_IP
SEED_DEMO=1
```

`frontend/.env`:

```
EXPO_PUBLIC_API_URL=http://SEU_IP:8000/api/v1
```

## 4. Subir o backend

```bash
cd ~/MobileUNDB
dcdev up -d --force-recreate backend
dcdev logs -f backend
```

Variáveis de ambiente só são relidas ao recriar o container (`--force-recreate`). Se mudar o `requirements.txt`, use `dcdev up -d --build`.

## 5. Testar a API pelo celular

No navegador do celular abra:

```
http://SEU_IP:8000/api/v1/cursos/
```

Deve aparecer um JSON com os cursos. Se aparecer, a rede está certa. Se não, veja a seção de problemas.

## 6. Subir o Expo

```bash
cd ~/MobileUNDB/frontend
REACT_NATIVE_PACKAGER_HOSTNAME=SEU_IP npx expo start -c
```

O terminal deve mostrar `exp://SEU_IP:8081`. Abra o **Expo Go**, toque em **Scan QR code** e escaneie o QR do terminal.

Não use `sudo` com o Expo: causa erros de permissão no cache e o aviso do DevTools (`Running as root without --no-sandbox`), que é inofensivo.

## Logins de demonstração (seed)

Senha de todos: `Teia@Demo2026`

| Perfil | E-mail |
|---|---|
| Aluna | marina.costa@aluno.undb.edu.br |
| Gestor | gestor.teia@undb.edu.br |
| Admin | admin@undb.edu.br |

## Problemas comuns

| Sintoma | Causa | Solução |
|---|---|---|
| `Project is incompatible with this version of Expo Go` | SDK do projeto diferente do Expo Go | `npx expo install expo@^58.0.0` e `npx expo install --fix` (ou use `expo@latest`) |
| `Invalid HTTP_HOST header` nos logs do Django | IP não está no `DJANGO_ALLOWED_HOSTS` | Adicione o IP e recrie o backend (`--force-recreate`) |
| App abre mas "não foi possível conectar" | `EXPO_PUBLIC_API_URL` com IP antigo | Atualize `frontend/.env` e reinicie com `-c` |
| Navegador do celular não abre `:8000` | Firewall do Windows ou rede isolando dispositivos | Refaça os comandos de firewall do passo 1; teste com hotspot do celular |
| `address already in use` na 8000 ou 8081 | Portproxy antigo do Windows | `netsh interface portproxy reset` (PowerShell admin) |
| `ModuleNotFoundError: corsheaders` | Imagem do Docker antiga | `dcdev up -d --build` |
| `Application labels aren't unique, duplicates: rest_framework` | App repetido em `INSTALLED_APPS` | Deixe `rest_framework` uma única vez |
| `package.json does not exist` | `expo start` rodado fora de `frontend/` | `cd frontend` antes |
| `--tunnel` falha (`remote gone away`) | Rede bloqueia o ngrok | Use o IP da rede local, como neste guia |

## Alternativa: modo web

Se o celular não alcançar o computador, rode o Expo e aperte `w`. O navegador do computador acessa o app em `http://localhost:8081`, e o CORS do backend já aceita essa origem.
