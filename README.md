# BOT Jodita

BOT Jodita es un asistente local para detectar preventas, anuncios, horarios y links de compra de eventos de musica electronica en Argentina y LATAM.

La idea principal es simple:

1. Tu computadora lee tus grupos de WhatsApp Web.
2. BOT Jodita analiza mensajes con reglas locales y, si queres, OpenAI.
3. Si detecta algo importante, manda una alerta a Telegram.

Importante: BOT Jodita corre en tu computadora. Si tu PC esta apagada o el programa esta cerrado, el bot no lee WhatsApp ni manda alertas.

## Antes de empezar

Necesitas:

- Visual Studio Code abierto en esta carpeta.
- Node.js instalado.
- Una cuenta de Telegram.
- Un bot creado con BotFather.
- WhatsApp en tu celular para escanear el QR.

Nunca subas tu archivo `.env` a GitHub. Ahi van tokens y claves privadas.

## Seguridad importante

Si pegaste tu token de Telegram en algun chat, documento o lugar publico, lo mas seguro es regenerarlo.

En Telegram:

1. Abrir `@BotFather`.
2. Entrar a `/mybots`.
3. Elegir tu bot.
4. Ir a `API Token`.
5. Usar `Revoke current token`.
6. Copiar el token nuevo al archivo `.env`.

## Paso 1: abrir la terminal

En Visual Studio Code:

1. Abrir la carpeta `BOT Jodita`.
2. Ir a `Terminal`.
3. Elegir `New Terminal`.

La terminal deberia quedar en:

```text
C:\Users\Luka\Documents\BOT Jodita
```

## Paso 2: crear el archivo `.env`

En la terminal:

```powershell
Copy-Item .env.example .env
```

Despues abri `.env` desde Visual Studio Code.

## Paso 3: poner el token de Telegram

En `.env`, completar solo esto primero:

```env
TELEGRAM_BOT_TOKEN=TU_TOKEN_DE_BOTFATHER
TELEGRAM_CHAT_ID=
TELEGRAM_POLLING_ENABLED=true
WHATSAPP_ENABLED=false
OPENAI_ENABLED=false
```

Por ahora dejamos `WHATSAPP_ENABLED=false` para probar Telegram sin mezclarlo con WhatsApp.

Muy importante: `TELEGRAM_CHAT_ID` no es el numero que aparece al principio del token del bot. El chat id es el numero del chat donde queres recibir alertas.

Ejemplo incorrecto:

```env
TELEGRAM_CHAT_ID=8023918722
```

Ese numero suele ser el ID del bot, no tu chat privado ni tu grupo.

## Paso 4: instalar dependencias

En la terminal:

```powershell
.\setup-bot-jodita.ps1
```

Si Windows dice que no permite ejecutar scripts, correr una vez:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Y despues repetir:

```powershell
.\setup-bot-jodita.ps1
```

## Paso 5: iniciar el bot solo para probar Telegram

En la terminal:

```powershell
.\start-bot-jodita.ps1
```

Si todo esta bien, deberias ver algo parecido a:

```text
BOT Jodita started
Telegram bot ready
WhatsApp disabled by WHATSAPP_ENABLED=false
```

Tambien puede aparecer este aviso:

```text
TELEGRAM_CHAT_ID esta vacio. Esto es normal en el primer arranque.
```

Eso no es un error. Significa que ahora tenes que pedirle el chat id al bot.

Ahora abri Telegram, entra al chat privado con tu bot y toca `Start` o mandale:

```text
/start
```

Despues mandale:

```text
/status
```

O:

```text
/chatid
```

El bot deberia responder algo como:

```text
Este chat_id: 123456789
```

Ese numero es el que tenes que copiar.

## Paso 6: completar `TELEGRAM_CHAT_ID`

Apaga el bot con:

```text
Ctrl + C
```

En `.env`, completar:

```env
TELEGRAM_CHAT_ID=123456789
```

Guardar el archivo.

Volver a iniciar:

```powershell
.\start-bot-jodita.ps1
```

Mandar otra vez:

```text
/status
```

Si responde, Telegram ya esta funcionando.

## Usar un grupo de Telegram

Tambien podes recibir alertas en un grupo de Telegram con amigos.

Tus amigos no necesitan instalar nada. Vos sos el unico que ejecuta BOT Jodita.

Pasos:

1. Crear un grupo de Telegram.
2. Agregar tu bot al grupo.
3. Si no puede responder, hacerlo admin del grupo.
4. Mandar en el grupo:

```text
/chatid
```

El bot va a responder un numero parecido a:

```text
-1001234567890
```

Ese numero negativo es el `TELEGRAM_CHAT_ID` del grupo.

En `.env`:

```env
TELEGRAM_CHAT_ID=-1001234567890
```

Apagar y volver a iniciar el bot.

## Paso 7: activar WhatsApp

Cuando Telegram ya responde, recien ahi activar WhatsApp.

En `.env`:

```env
WHATSAPP_ENABLED=true
WHATSAPP_HEADLESS=false
```

Iniciar:

```powershell
.\start-bot-jodita.ps1
```

La primera vez va a aparecer un QR.

En tu celular:

```text
WhatsApp > Dispositivos vinculados > Vincular dispositivo
```

Escanear el QR.

La sesion queda guardada en `.wwebjs_auth/`, asi que no deberias escanear el QR cada vez.

## Si WhatsApp no abre navegador

Agregar en `.env` la ruta de Chrome:

```env
PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

Si tu Chrome esta en otra carpeta, usar esa ruta.

En Windows, BOT Jodita intenta detectar automaticamente:

```text
C:\Program Files\Google\Chrome\Application\chrome.exe
C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
C:\Program Files\Microsoft\Edge\Application\msedge.exe
C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
```

Si ves un error parecido a `Could not find Chrome`, revisa si Chrome esta instalado o completa `PUPPETEER_EXECUTABLE_PATH`.

## Paso 8: elegir grupos de WhatsApp

Por defecto, BOT Jodita evalua todos los grupos de WhatsApp que ve tu cuenta, salvo los muteados.

Cuando WhatsApp diga `ready`, en Telegram podes mandar:

```text
/whatsappgroups
```

Eso lista los grupos que detecto.

Para monitorear solo algunos:

```text
/watchgroups add Mandarine
/watchgroups add Bombo
```

El nombre puede ser exacto o parcial. Si agregas `Mandarine`, toma grupos cuyo nombre contenga `Mandarine`.

Para quitar uno:

```text
/watchgroups remove Mandarine
```

Para mutear un grupo:

```text
/mute Nombre del grupo
```

Para desmutear:

```text
/unmute Nombre del grupo
```

Para ver la configuracion:

```text
/watchgroups
```

Archivo manual:

```text
config/groups.json
```

Reglas:

- `watch_all_groups: true`: evalua todos los grupos, excepto muteados.
- `watch_all_groups: false` y `priority_groups: []`: evalua todos los grupos, excepto muteados.
- `watch_all_groups: false` y `priority_groups` con nombres: evalua solo esos grupos.
- `muted_groups`: nunca evalua esos grupos.

## Paso 9: probar una alerta

Cuando Telegram y WhatsApp esten funcionando, si aparece en un grupo algo como:

```text
salio link bombo https://wearebombo.app.link/eq3A2ynou3b entren ya
```

BOT Jodita deberia mandar alerta critica.

El prefijo critico de BOMBO esta configurado en:

```text
config/platforms.json
```

Con:

```json
"critical_deep_link_prefixes": [
  "https://wearebombo.app.link/",
  "http://wearebombo.app.link/",
  "wearebombo://",
  "bombo://"
]
```

## OpenAI

Para usar analisis con IA, completar:

```env
OPENAI_API_KEY=TU_API_KEY
OPENAI_ENABLED=true
```

Si no tenes API key, dejar:

```env
OPENAI_ENABLED=false
```

El bot igual funciona con reglas locales: links, horarios, artistas, venues, hype y scoring.

## Comandos de Telegram

- `/status`: estado general del bot.
- `/chatid`: muestra el chat id actual.
- `/last`: ultimos eventos guardados.
- `/keywords`: resumen de keywords.
- `/addartist Nombre`: agrega artista.
- `/addkeyword sales palabra`: agrega keyword de venta.
- `/addkeyword hype palabra`: agrega keyword de hype.
- `/addkeyword urgency palabra`: agrega keyword de urgencia.
- `/mute Nombre Grupo`: ignora ese grupo.
- `/unmute Nombre Grupo`: deja de ignorarlo.
- `/threshold critical_min 23`: cambia umbral.
- `/watchgroups`: muestra grupos configurados.
- `/watchgroups add Nombre`: agrega grupo a monitoreo.
- `/watchgroups remove Nombre`: quita grupo.
- `/watchgroups all on`: evalua todos los grupos.
- `/watchgroups all off`: vuelve a modo grupos prioritarios.
- `/whatsappgroups`: lista grupos detectados en WhatsApp.
- `/memory`: resumen simple de patrones vistos.

## Donde se configura cada cosa

- Artistas: `config/artists.json`
- Venues: `config/venues.json`
- Palabras de venta: `config/keywords_sales.json`
- Hype: `config/keywords_hype.json`
- Urgencia: `config/keywords_urgency.json`
- Links y dominios: `config/platforms.json`
- Scoring: `config/scoring.json`
- Grupos: `config/groups.json`

## Logs

Los eventos quedan en:

```text
data/events.jsonl
data/learned-patterns.json
data/whatsapp-groups.json
```

Estos archivos no se suben a GitHub.

## Apagar el bot

En la terminal donde corre:

```text
Ctrl + C
```

Si pregunta, responder:

```text
Y
```

## Problemas comunes

### El bot no responde en Telegram

Revisar:

- Que `TELEGRAM_BOT_TOKEN` este completo.
- Que hayas tocado `Start` en el chat con el bot.
- Que el programa siga corriendo en la terminal.
- Que no haya errores rojos en la terminal.
- Que `TELEGRAM_POLLING_ENABLED=true`.

### Puse TELEGRAM_CHAT_ID pero no llegan alertas

Recordar: `TELEGRAM_CHAT_ID` no es el ID del bot. Usar `/chatid` y copiar exactamente lo que responde.

### El programa se cae antes de Telegram

Probar primero:

```env
WHATSAPP_ENABLED=false
```

Cuando Telegram funcione, volver a activar WhatsApp.

### No aparece el QR de WhatsApp

Revisar:

- `WHATSAPP_ENABLED=true`
- `WHATSAPP_HEADLESS=false`
- `PUPPETEER_EXECUTABLE_PATH` si Chrome no abre.

### No quiero arriesgar mi numero de WhatsApp

BOT Jodita solo lee grupos desde WhatsApp Web. No vamos a enviar alertas por WhatsApp. Las alertas salen por Telegram.

## Roadmap

- OCR de flyers.
- Transcripcion de audios.
- Analisis de screenshots.
- Instagram publico con Playwright.
- Embeddings y vector DB.
- Clustering de RRPPs.
- Dashboard web.
- Push notifications.
- Mejor soporte deep links BOMBO.
- Analisis historico de eventos.
- Migracion opcional a SQLite.
- Docker futuro.
