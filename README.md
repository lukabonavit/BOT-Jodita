# BOT Jodita

BOT Jodita es un asistente local en Node.js/TypeScript para detectar preventas, anuncios, hints y links de compra de eventos de musica electronica en Argentina y LATAM.

El objetivo critico es operativo: si aparece un link accionable, especialmente un deep link de BOMBO como `https://wearebombo.app.link/`, se manda primero a Telegram sin esperar IA ni cooldown.

## Stack

- Node.js 20+
- TypeScript
- whatsapp-web.js
- Telegram Bot API
- OpenAI API
- Playwright, preparado para Instagram publico y screenshots futuros
- dotenv
- JSONL local, con interfaz lista para migrar a SQLite
- arquitectura modular
- Dockerfile base para futuro

## Instalacion

Si es tu primera vez, empezá por [START_HERE.md](./START_HERE.md).

```bash
npm install
cp .env.example .env
npm run dev
```

En Windows PowerShell:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

## Configuracion `.env`

Completar:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
OPENAI_API_KEY=
WHATSAPP_ENABLED=true
WHATSAPP_HEADLESS=false
OPENAI_ENABLED=true
PUPPETEER_EXECUTABLE_PATH=
```

Si `OPENAI_API_KEY` falta, el bot sigue funcionando con analisis local por scoring, entidades, links y horarios.

## Telegram

1. Abrir Telegram y hablar con `@BotFather`.
2. Crear bot con `/newbot`.
3. Copiar el token en `TELEGRAM_BOT_TOKEN`.
4. Obtener `TELEGRAM_CHAT_ID`:
   - Mandale un mensaje al bot.
   - Usar temporalmente algun bot/helper de chat id, o consultar updates de Telegram.
   - Pegar el chat id en `.env`.

Comandos incluidos:

- `/status`
- `/last`
- `/keywords`
- `/addartist Nombre Del Artista`
- `/addkeyword sales|hype|urgency palabra o frase`
- `/mute Nombre Grupo`
- `/unmute Nombre Grupo`
- `/threshold critical_min 23`
- `/watchgroups`
- `/watchgroups list`
- `/watchgroups add Nombre Grupo`
- `/watchgroups remove Nombre Grupo`
- `/watchgroups all on`
- `/watchgroups all off`
- `/memory`

## WhatsApp Web

Al ejecutar `npm run dev`, el bot muestra un QR en terminal. Escanearlo desde WhatsApp:

`WhatsApp > Dispositivos vinculados > Vincular dispositivo`

La sesion se guarda localmente en `.wwebjs_auth/`.

Por defecto se monitorean grupos si `config/groups.json` no define grupos prioritarios. Para restringir:

```json
{
  "watch_all_groups": false,
  "priority_groups": ["Nombre exacto o parcial del grupo"],
  "muted_groups": [],
  "group_aliases": {}
}
```

## Config editable

Los datos viven en `config/`:

- `artists.json`
- `venues.json`
- `keywords_sales.json`
- `keywords_hype.json`
- `keywords_urgency.json`
- `aliases.json`
- `platforms.json`
- `scoring.json`
- `groups.json`

No hace falta tocar el codigo para agregar artistas, aliases, venues, palabras de venta o dominios.

El prefijo critico de BOMBO queda en `config/platforms.json`:

```json
"critical_deep_link_prefixes": [
  "https://wearebombo.app.link/",
  "http://wearebombo.app.link/",
  "wearebombo://",
  "bombo://"
]
```

Importante: BOMBO vende principalmente desde aplicacion movil. Este proyecto no asume que exista una web publica scrapeable estable; prioriza links copiados desde WhatsApp, RRPPs, universal links y deep links.

## Scoring

Pesos iniciales en `config/scoring.json`:

- link detectado: +8
- palabra de venta: +5
- horario detectado: +3
- artista importante: +3
- venue importante: +2
- hype/urgencia: +4
- grupo prioritario: +3
- lote/tier/early bird: +5
- sale hoy: +8
- en minutos: +8
- purchase link: +10
- deep link critico: +14

Niveles:

- `< 6`: ignorar
- `6-10`: guardar log
- `11-15`: alerta media
- `16-22`: alerta alta
- `23+`: alerta critica

## Deteccion

El pipeline hace:

1. Normalizacion: minusculas, tildes, letras repetidas, typos y slang.
2. Extraccion de links, incluyendo URLs pegadas a emojis o puntuacion.
3. Clasificacion de links: BOMBO/deep link, compra, shortener, social, desconocido.
4. Deteccion de horarios: `13hs`, `13:00`, `18.30`, `hoy a las 19`, `en 30 minutos`, `mediodia`, `esta noche`.
5. Matching de artistas y venues por aliases.
6. Scoring configurable.
7. Alerta rapida si hay link nuevo de compra.
8. Analisis OpenAI en JSON.
9. Log JSONL y aprendizaje simple de patrones.

## Logs

Los eventos se guardan en:

```text
data/events.jsonl
data/learned-patterns.json
```

Cada registro incluye timestamp, grupo, mensaje original, normalizado, score, analisis IA, links, alerta y urgencia.

## Troubleshooting

- No aparece QR: borrar `.wwebjs_auth/` solo si queres resetear sesion.
- WhatsApp no abre Chromium: probar `WHATSAPP_HEADLESS=false` y verificar dependencias del navegador.
- Si instalaste sin descargar Chromium, setear `PUPPETEER_EXECUTABLE_PATH` al Chrome local, por ejemplo `C:\Program Files\Google\Chrome\Application\chrome.exe`.
- No llegan alertas: revisar `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` y que hayas iniciado chat con el bot.
- OpenAI falla: el bot usa fallback local y deja warning en consola.
- Mucho ruido: subir `medium_min`, agregar grupos a `muted_groups` o ajustar keywords.
- Faltan alertas: bajar thresholds o agregar aliases en `artists.json`, `venues.json` o keywords.

## Roadmap

- OCR de flyers.
- Transcripcion de audios.
- Analisis de screenshots.
- Scraping Instagram publico con Playwright.
- Scraping de stories si hay una fuente autorizada.
- Embeddings y vector DB.
- Clustering de RRPPs.
- Clasificacion automatica de importancia.
- Dashboard web.
- Push notifications.
- Mejor soporte deep links BOMBO.
- Analisis historico de eventos.
- Migracion opcional a SQLite.
- Docker con volumen persistente para sesion WhatsApp.
