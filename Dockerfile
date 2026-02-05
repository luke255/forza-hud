# Use official Node.js LTS image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose ports
# UDP port for telemetry data (default 20127)
# HTTP port for web interface (default 8080)
EXPOSE 8080/udp 20127/udp 8080

# Define environment variables (can be overridden)
ENV PORT=8080 \
    UDP_PORT=20127 \
    SPEED_UNIT=km/h \
    POWER_UNIT=kW \
    TORQUE_UNIT=Nm \
    BOOST_UNIT=bar \
    MQTT_BROKER_URL=mqtt://localhost:1883 \
    MQTT_USERNAME= \
    MQTT_PASSWORD= \
    DEVICE_UID_PREFIX=forza_hud_ \
    DEVICE_IDENTIFIERS=forza_hud \
    DEVICE_MANUFACTURER=Forza \
    DEVICE_MODEL=Horizon \
    DEVICE_NAME="Forza HUD" \
    DEVICE_SW_VERSION=1.0.0

# Run the application
CMD ["node", "app.js"]