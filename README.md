# Forza Horizon HUD

A web-based Heads-Up Display (HUD) for Forza Horizon that receives telemetry data via UDP and can push it to MQTT (for Home Assistant integration) and a local web dashboard via WebSockets.

## Features

- **Real-time Telemetry:** View speed, RPM, gear, boost, and more.
- **Home Assistant Integration:** Automatically discovers and updates sensors in Home Assistant via MQTT.
- **Dynamic HUD:** Interactive SVG-based dashboard that updates in real-time.
- **Easy Configuration:** Managed via environment variables.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later recommended)
- A copy of Forza Horizon (4 or 5) set to send telemetry data.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/forza-hud.git
    cd forza-hud
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure the environment:**
    Copy the example environment file and fill in your details:
    ```bash
    cp .env.example .env
    ```
    Edit `.env` and provide your MQTT broker details and other preferences.

### Configuration Options (`.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `MQTT_BROKER_URL` | URL of your MQTT broker (e.g., `ws://10.0.0.4:1884`) | - |
| `MQTT_USERNAME` | Username for MQTT authentication | - |
| `MQTT_PASSWORD` | Password for MQTT authentication | - |
| `DEVICE_NAME` | Name of the device as it appears in Home Assistant | `Forza Horizon` |
| `PORT` | Port for the web dashboard | `8080` |
| `UDP_PORT` | Port to listen for Forza telemetry data | `20127` |

### Forza Horizon Setup

1.  Open Forza Horizon settings.
2.  Go to **HUD and Gameplay**.
3.  Scroll to the bottom to find **Data Out** settings.
4.  Set **Data Out** to `ON`.
5.  Set **Data Out IP Address** to the IP of the machine running this application.
6.  Set **Data Out IP Port** to match `UDP_PORT` in your `.env` (default `20127`).

### Running the Application

Start the server:
```bash
node app.js
```
Then open `http://localhost:8080` in your web browser.

#### Using PM2

If you prefer to run it in the background:
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
