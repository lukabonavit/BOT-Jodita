# Empezar BOT Jodita desde cero

Esta guia esta pensada para usar el bot sin saber mucho de sistemas.

## Idea general

BOT Jodita corre en **una sola computadora**: la tuya.

Esa computadora hace tres cosas:

1. Lee mensajes de grupos de WhatsApp Web donde este tu cuenta.
2. Analiza si hay preventas, links, horarios, artistas o hype importante.
3. Manda alertas a Telegram.

Las otras personas **no necesitan ejecutar nada**. Si agregas el bot a un grupo de Telegram, todos los que esten en ese grupo pueden ver las alertas.

## Paso 1: abrir la terminal en Visual Studio Code

1. Abri la carpeta `BOT Jodita` en Visual Studio Code.
2. Arriba anda a `Terminal`.
3. Toca `New Terminal` o `Nueva terminal`.
4. Abajo deberia abrirse una consola.

La consola deberia estar parada en algo parecido a:

```text
C:\Users\Luka\Documents\BOT Jodita
```

## Paso 2: crear el archivo `.env`

En la carpeta del proyecto ya existe `.env.example`.

Tenes que crear una copia llamada `.env`.

En la terminal de VS Code escribi:

```powershell
Copy-Item .env.example .env
```

Despues abri el archivo `.env` en Visual Studio Code y completalo.

## Paso 3: crear el bot de Telegram

1. Abri Telegram.
2. Busca `@BotFather`.
3. Mandale:

```text
/newbot
```

4. Elegi un nombre, por ejemplo:

```text
BOT Jodita
```

5. Elegi un username terminado en `bot`, por ejemplo:

```text
bot_jodita_alertas_bot
```

6. BotFather te va a dar un token parecido a:

```text
123456789:ABCDEF....
```

Pegalo en `.env`:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCDEF....
```

## Paso 4: decidir donde queres recibir alertas

### Opcion A: alertas solo para vos

1. Abri un chat privado con tu bot.
2. Ejecuta BOT Jodita con:

```powershell
.\start-bot-jodita.ps1
```

3. Mandale al bot:

```text
/status
```

El bot te va a responder algo como:

```text
Este chat_id: 123456789
```

Pegalo en `.env`:

```env
TELEGRAM_CHAT_ID=123456789
```

Despues apaga el bot con `Ctrl + C` y volvelo a iniciar.

### Opcion B: alertas en un grupo de Telegram con amigos

Si, se puede.

Vos sos el unico que ejecuta BOT Jodita en tu PC. Tus amigos solo tienen que estar dentro del grupo de Telegram.

Pasos:

1. Crea un grupo de Telegram.
2. Agrega tu bot al grupo.
3. Ejecuta BOT Jodita con:

```powershell
.\start-bot-jodita.ps1
```

4. En el grupo manda:

```text
/status
```

5. El bot te va a responder el `chat_id` del grupo. Suele ser un numero negativo, parecido a:

```text
-1001234567890
```

6. Pegalo en `.env`:

```env
TELEGRAM_CHAT_ID=-1001234567890
```

7. Apaga el bot con `Ctrl + C` y volvelo a iniciar.

Importante: si el bot no puede escribir en el grupo, hacelo admin del grupo.

## Paso 5: OpenAI

Si tenes API key de OpenAI, pegala:

```env
OPENAI_API_KEY=tu_api_key
OPENAI_ENABLED=true
```

Si todavia no queres usar OpenAI, podes dejar:

```env
OPENAI_ENABLED=false
```

El bot igual detecta links, horarios, venues, artistas y scoring con logica local.

## Paso 6: Chrome / WhatsApp Web

Para leer WhatsApp, el bot abre una sesion tipo WhatsApp Web.

En `.env` deja:

```env
WHATSAPP_ENABLED=true
WHATSAPP_HEADLESS=false
```

Si WhatsApp no abre navegador, agrega el Chrome local:

```env
PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

## Paso 7: instalar dependencias

En la terminal de VS Code:

```powershell
.\setup-bot-jodita.ps1
```

Si Windows pregunta permisos por scripts, usa este comando una vez:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Despues repeti:

```powershell
.\setup-bot-jodita.ps1
```

## Paso 8: iniciar BOT Jodita

En la terminal de VS Code:

```powershell
.\start-bot-jodita.ps1
```

La primera vez va a aparecer un QR de WhatsApp.

En tu celular:

```text
WhatsApp > Dispositivos vinculados > Vincular dispositivo
```

Escaneas el QR y listo.

## Paso 9: probar Telegram

En Telegram mandale al bot:

```text
/status
```

Si responde, Telegram esta bien.

Tambien podes probar:

```text
/keywords
```

## Paso 10: probar una alerta real

Si en un grupo monitoreado aparece algo como:

```text
salio link bombo https://wearebombo.app.link/eq3A2ynou3b entren ya
```

BOT Jodita deberia mandar alerta critica a Telegram.

## Comandos de Telegram

- `/status`
- `/chatid`
- `/last`
- `/keywords`
- `/addartist Nombre Del Artista`
- `/addkeyword sales|hype|urgency palabra o frase`
- `/mute Nombre Grupo`
- `/unmute Nombre Grupo`
- `/threshold critical_min 23`
- `/watchgroups`
- `/watchgroups list`
- `/watchgroups add Nombre exacto o parcial del grupo`
- `/watchgroups remove Nombre exacto o parcial del grupo`
- `/watchgroups all on`
- `/watchgroups all off`
- `/whatsappgroups`
- `/memory`

## Preguntas comunes

### Tengo que dejar la PC prendida?

Si. Si la PC esta apagada o el programa cerrado, el bot no lee WhatsApp ni manda alertas.

### Mis amigos tienen que instalar algo?

No. Si usas un grupo de Telegram, tus amigos solo entran al grupo y ven las alertas.

### Puedo usar un grupo de Telegram?

Si. Es la mejor opcion para compartir alertas con amigos.

### Puedo mandar alertas a WhatsApp?

Tecnicamente si, pero no es tan prolijo como Telegram.

Con `whatsapp-web.js`, el bot podria mandar mensajes a un grupo de WhatsApp usando tu propia sesion. Eso significa que los mensajes saldrian desde tu numero, como si los mandaras vos.

Riesgos:

- WhatsApp puede limitar o bloquear automatizaciones si detecta abuso.
- No existe un bot oficial simple para grupos personales como en Telegram.
- WhatsApp Business API es oficial, pero no esta pensada para bots dentro de grupos comunes.

Recomendacion: usar Telegram para alertas criticas. Despues se puede agregar envio opcional a WhatsApp, con cuidado y bajo volumen.

## Como apagar el bot

En la terminal donde esta corriendo:

```text
Ctrl + C
```

Si pregunta si queres terminar, escribi:

```text
Y
```

## Que tocar para mejorar detecciones

- Artistas: `config/artists.json`
- Venues: `config/venues.json`
- Palabras de venta: `config/keywords_sales.json`
- Hype: `config/keywords_hype.json`
- Urgencia: `config/keywords_urgency.json`
- Links y dominios: `config/platforms.json`
- Grupos monitoreados: `config/groups.json`

## Como elegir grupos de WhatsApp monitoreados

Por defecto, si `priority_groups` esta vacio, BOT Jodita evalua todos los grupos de WhatsApp que no esten muteados.

Archivo:

```json
{
  "watch_all_groups": false,
  "priority_groups": [],
  "muted_groups": [],
  "group_aliases": {}
}
```

Reglas:

- `watch_all_groups: true`: evalua todos los grupos, salvo los muteados.
- `watch_all_groups: false` y `priority_groups: []`: evalua todos los grupos, salvo los muteados.
- `watch_all_groups: false` y `priority_groups` con nombres: evalua solo esos grupos.
- `muted_groups`: nunca evalua esos grupos.

Tambien podes manejarlo desde Telegram:

```text
/whatsappgroups
/watchgroups add Nombre del grupo
/watchgroups remove Nombre del grupo
/mute Nombre del grupo
/unmute Nombre del grupo
/watchgroups all on
/watchgroups all off
```

El nombre puede ser exacto o parcial. Ejemplo:

```text
/watchgroups add Mandarine
```

Eso toma grupos cuyo nombre contenga `Mandarine`.
