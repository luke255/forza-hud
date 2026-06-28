# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Run the server
node app.js
# or
npm start

# Run with PM2 (process manager)
pm2 start ecosystem.config.js

# Docker Compose (recommended for deployment)
docker-compose up -d
docker-compose down
```

The web dashboard is served at `http://localhost:8080` (configurable via `PORT`).

## Architecture

This is a single-process Node.js server (`app.js`) with a static browser frontend (`public/script.js`, `index.html`).

**Data flow:**

1. Forza Horizon sends raw UDP telemetry packets to the configured `UDP_PORT` (default 20127)
2. `app.js` receives packets via Node's `dgram` socket, parses them with `parseData()` using the `DATATYPES`/`DATASIZES` spec (the Forza Sled format), and converts raw values to display units
3. Parsed data is forwarded over a WebSocket to any connected browser
4. On active-sensor changes, an MQTT message is published to a Home Assistant-compatible topic hierarchy (`homeassistant/<domain>/<device>/...`)
5. The browser (`public/script.js`) receives WebSocket messages, diffs against a local cache, and updates SVG elements in-place via ID-targeted DOM manipulation

**Frontend:** `index.html` is a full 3840×2160 inline SVG HUD. All gauges, text fields, and indicators are addressed by their SVG `id`. `public/script.js` defines a `handlers` map keyed by telemetry field name — each handler calls SVG helpers (`svgBar`, `svgTexter`, `svgRotate`, `svgHide`, `svgDim`) to animate the corresponding SVG element. No build step; plain JS only.

**Modes:** The HUD has two display modes controlled by the `race` telemetry value — `Roam-Mode` (free roam) and `Race-Mode` — toggled by showing/hiding SVG groups. The `Active` group is hidden and replaced by the `Logo` splash when the game is not running.

**MQTT integration:** Only the `Active` (running) binary sensor is currently published to MQTT/Home Assistant. The `initMQTT()` function publishes Home Assistant discovery config topics on startup (retained). High-frequency fields (speed, RPM, etc.) are intentionally excluded to avoid broker/database stress.

**Configuration:** All runtime config is via environment variables loaded from `.env` (see `.env.example`). Unit conversions (speed, power, torque, boost) happen in `parseData()` server-side based on `SPEED_UNIT`, `POWER_UNIT`, etc.

**Known limitations from the README:**
- Only one WebSocket client is tracked at a time (last connection wins)
- Aspect ratio is fixed at 16:9; designed for fullscreen
- The `HorizonPlaceholder` field in the Forza packet is a 12-byte padding block with no data type equivalent — it is handled by the special `hzn` type in `DATASIZES`
