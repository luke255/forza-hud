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
    - **Note for Forza Horizon 4:** The Xbox version has a known bug that prevents telemetry from working. The PC version is currently untested. Forza Horizon 5 is fully supported.

### Known Limitations/Issues
- **Home Assistant Sensors:** While many telemetry points are received, only the "Active/Running" sensor is currently published to Home Assistant to avoid overwhelming systems.
- **Aspect ratio:** The dashboard was created for fullscreen 16:9.
- **Fonts:** Forza uses the Amsi Pro / Amsi Pro Condensed fonts, which I can't include. It will fall back to the Google font "Barlow" if you don't have them installed. I am taking suggestions for closer free alternatives.
- **Roll level:** The roll level indicator does not roate around the correct point. Though it's lined up when flat, it will drift the more you roll.

### Configuration Options (`.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `MQTT_BROKER_URL` | URL of your MQTT broker (e.g., `ws://10.0.0.4:1884`) | - |
| `MQTT_USERNAME` | Username for MQTT authentication | - |
| `MQTT_PASSWORD` | Password for MQTT authentication | - |
| `DEVICE_UID_PREFIX` | Prefix for Home Assistant entity unique IDs | `forza-` |
| `DEVICE_IDENTIFIERS` | Device identifier for Home Assistant | `forza-horizon-hud` |
| `DEVICE_MANUFACTURER` | Device manufacturer name | `Custom` |
| `DEVICE_MODEL` | Device model name | `Forza Horizon Data` |
| `DEVICE_NAME` | Name of the device as it appears in Home Assistant | `Forza Horizon` |
| `DEVICE_SW_VERSION` | Software version of the device | `1` |
| `PORT` | Port for the web dashboard | `8080` |
| `UDP_PORT` | Port to listen for Forza telemetry data | `20127` |
| `SPEED_UNIT` | Unit for speed display (`km/h`, `mph`, `m/s`) | `km/h` |
| `POWER_UNIT` | Unit for power display (`kW`, `W`, `hp`) | `kW` |
| `TORQUE_UNIT` | Unit for torque display (`Nm`, `lb-ft`) | `Nm` |
| `BOOST_UNIT` | Unit for boost display (`bar`, `psi`, `kPa`) | `bar` |

### Forza Horizon Setup

1.  Open Forza Horizon settings.
2.  Go to **HUD and Gameplay**.
3.  Scroll to the bottom to find **Data Out** settings.
4.  Set **Data Out** to `ON`.
5.  Set **Data Out IP Address** to the IP of the machine running this application.
6.  Set **Data Out IP Port** to match `UDP_PORT` in your `.env` (default `20127`).

### Home Assistant & MQTT Performance

While the application receives high-frequency data (60Hz), publishing all this to Home Assistant/MQTT is not recommended.

- **Broker/HA Stress:** Exposing values that update many times per second (like `speed`, `rpm`, or `position`) can significantly stress your MQTT broker and Home Assistant instance.
- **Database Size:** Frequent updates will cause your Home Assistant database to grow rapidly if not managed.

#### Best Practices

1. **Selective Publishing:** Currently, only the Active sensor is implemented for HA.
2. **Exclude from History:** If you decide to add more sensors (like Speed), it is highly recommended to exclude them from Home Assistant's `recorder` and `history` stats.

Start the server:
**Example `configuration.yaml` for Home Assistant:**

```yaml
recorder:
  exclude:
    entities:
      - sensor.forza_horizon_speed
      - sensor.forza_horizon_rpm
```

*Remember: Only publish high-frequency data if your infrastructure can handle it.*

### Running the Application

#### Using Node.js directly
```bash
node app.js
```
Then open `http://localhost:8080` in your web browser.

#### Using PM2 (Process Manager)

If you prefer to run it in the background:
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

#### Using Docker

You can run the application in a Docker container, which provides isolation and easier deployment.

**Build the image:**
```bash
docker build -t forza-hud .
```

**Run the container:**
```bash
docker run -d \
  --name forza-hud \
  -p 8080:8080 \
  -p 20127:20127/udp \
  --env-file .env \
  --restart unless-stopped \
  forza-hud
```

**Using Docker Compose (recommended):**
```bash
docker-compose up -d
```

To stop:
```bash
docker-compose down
```

The Docker image includes all necessary dependencies and exposes the required ports (UDP 20127 for telemetry, TCP 8080 for the web interface). Environment variables can be set in the `.env` file or passed directly.


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## AI warning

I created this project before AI was a thing. It wasn't suitable to publish then, mainly because the .env file didn't exist, and I didn't have the energy to sort that, or fix the lingering issues. I apologise for any halucinated oddness!