require('dotenv').config();
const { log } = require("console");
const dgram = require("dgram"),
  http = require("http"),
  mqtt = require("mqtt");

const units = {
  rpm_percent: "%",
  bearing: "°",
  roll: "°",
  speed: "km/h",
  power: "kW",
  torque: "Nm",
  boost: "bar",
};

let cache = {},
  webSocket;

const socket = dgram.createSocket("udp4"),
  client = mqtt.connect(process.env.MQTT_BROKER_URL, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  });

initMQTT({
  uid_prefix: process.env.DEVICE_UID_PREFIX,
  device: {
    identifiers: process.env.DEVICE_IDENTIFIERS,
    manufacturer: process.env.DEVICE_MANUFACTURER,
    model: process.env.DEVICE_MODEL,
    name: process.env.DEVICE_NAME,
    sw_version: process.env.DEVICE_SW_VERSION,
  },
  domains: [
    {
      name: "binary_sensor",
      entities: [
        {
          name: "Active",
          options: { device_class: "running" },
        },
      ],
    },
  ],
});

function safe(str) {
  return str.split(" ").join("-");
}

function initMQTT(options) {
  const safeDevice = safe(options.device.name),
    state_topic = `${safeDevice}/state`;
  for (const domain of options.domains) {
    for (const entity of domain.entities) {
      const key = entity.key || entity.name.toLowerCase().split(" ").join("_"),
        configTopic = `homeassistant/${domain.name}/${safeDevice}/${safeDevice}_${key}/config`,
        config = Object.assign(
          {
            icon: entity.icon,
            unique_id: options.uid_prefix + key,
            device: options.device,
            name: entity.name,
            object_id: `${options.device.name} ${key}`,
            retain: true,
            state_topic,
            value_template: `{{ value_json.${key} }}`,
          },
          entity.options
        );
      if (units[key] !== undefined) {
        config["unit_of_measurement"] = units[key];
      }
      client.publish(configTopic, JSON.stringify(config), {
        retain: true,
      });
    }
  }

  socket.on("message", (...args) => {
    const fullData = parseData(args[0].toJSON().data),
      data = JSON.stringify({ active: fullData.values.active });
    if (webSocket !== undefined) {
      webSocket.send(JSON.stringify(fullData));
    }
    if (data !== cache) {
      client.publish(state_topic, data);
      cache = data;
    }
  });

  socket.bind(process.env.UDP_PORT || 20127);
}

function parseData(data) {
  let r = {};
  for (let [name, type] of Object.entries(DATATYPES)) {
    let size = DATASIZES[type];
    let cur = data.splice(0, size);
    let dec;
    switch (type) {
      case "s32":
        dec = Buffer.from(cur).readInt32LE(0);
        break;
      case "u32":
        dec = Buffer.from(cur).readUInt32LE(0);
        break;
      case "f32":
        dec = Buffer.from(cur).readFloatLE(0);
        break;
      case "u16":
        dec = Buffer.from(cur).readUInt16LE(0);
        break;
      case "u8":
        dec = Buffer.from(cur).readUInt8(0);
        break;
      case "s8":
        dec = Buffer.from(cur).readInt8(0);
        break;
    }
    r[name] = dec;
  }
  return {
    units,
    values: {
      active: boolStr(r.CarPerformanceIndex > 0),
      rpm: r.CurrentEngineRpm,
      rpm_max: r.EngineMaxRpm,
      rpm_percent: percent(r.CurrentEngineRpm, r.EngineMaxRpm, 10),
      bearing: radsToBear(r.Yaw),
      direction: bearLost(r.Yaw),
      roll: radsToBear(r.Roll),
      class: ["D", "C", "B", "A", "S1", "S2", "X"][r.CarClass],
      performance: r.CarPerformanceIndex,
      drivetrain: ["FWD", "RWD", "AWD"][r.DrivetrainType],
      cylinders: r.NumCylinders,
      speed: nearest(r.Speed * 3.6), // kilometers per hour
      power: nearest(r.Power * 0.001), // kilowatts
      torque: nearest(r.Torque), // newton meter
      boost: nearest(r.Boost * 0.068947572932), // bar
      accel: r.Accel,
      brake: r.Brake,
      handbrake: boolStr(r.HandBrake > 1),
      gear: r.Gear.toString().replace("0", "R").replace("1R", "10"),
      steering: r.Steer,
      race: boolStr(r.RacePosition > 0),
      lap: r.LapNumber + 1,
      position: notZero(r.RacePosition),
      timer_race: timer(r.CurrentRaceTime),
      timer_lap_current: timer(r.CurrentLap),
      timer_lap_best: timer(r.BestLap),
      timer_lap_last: timer(r.LastLap),
      id: r.CarOrdinal,
    },
  };
}

function timer(time) {
  return secondsToTime(nearest(time, 1000));
}

function radsToBear(rads) {
  const degs = Math.round(rads * 57.29578 + (rads < 0 ? 360 : 0));
  return degs < 360 ? degs : 0;
}

function bearLost(rads) {
  const ind = Math.round(rads * 1.27324 + (rads < 0 ? 8 : 0));
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][ind > 7 ? 0 : ind];
}

function percent(val, max, to) {
  return nearest((val / max) * 100, to);
}

function nearest(val, to) {
  const toOut = to || 1;
  return Math.round(val * toOut) / toOut;
}

function notZero(val) {
  return val > 0 ? val : null;
}

function boolStr(bool) {
  return bool ? "ON" : "OFF";
}

function secondsToTime(e) {
  const m = Math.floor((e % 3600) / 60).toString(),
    s = Math.floor(e % 60)
      .toString()
      .padStart(2, "0");
  ms = Math.floor((e * 10) % 10).toString();

  return `${m}:${s}.${ms}`;
}

const DATATYPES = {
  IsRaceOn: "s32",
  TimestampMS: "u32",
  EngineMaxRpm: "f32",
  EngineIdleRpm: "f32",
  CurrentEngineRpm: "f32",
  AccelerationX: "f32",
  AccelerationY: "f32",
  AccelerationZ: "f32",
  VelocityX: "f32",
  VelocityY: "f32",
  VelocityZ: "f32",
  AngularVelocityX: "f32",
  AngularVelocityY: "f32",
  AngularVelocityZ: "f32",
  Yaw: "f32",
  Pitch: "f32",
  Roll: "f32",
  NormalizedSuspensionTravelFrontLeft: "f32",
  NormalizedSuspensionTravelFrontRight: "f32",
  NormalizedSuspensionTravelRearLeft: "f32",
  NormalizedSuspensionTravelRearRight: "f32",
  TireSlipRatioFrontLeft: "f32",
  TireSlipRatioFrontRight: "f32",
  TireSlipRatioRearLeft: "f32",
  TireSlipRatioRearRight: "f32",
  WheelRotationSpeedFrontLeft: "f32",
  WheelRotationSpeedFrontRight: "f32",
  WheelRotationSpeedRearLeft: "f32",
  WheelRotationSpeedRearRight: "f32",
  WheelOnRumbleStripFrontLeft: "s32",
  WheelOnRumbleStripFrontRight: "s32",
  WheelOnRumbleStripRearLeft: "s32",
  WheelOnRumbleStripRearRight: "s32",
  WheelInPuddleDepthFrontLeft: "f32",
  WheelInPuddleDepthFrontRight: "f32",
  WheelInPuddleDepthRearLeft: "f32",
  WheelInPuddleDepthRearRight: "f32",
  SurfaceRumbleFrontLeft: "f32",
  SurfaceRumbleFrontRight: "f32",
  SurfaceRumbleRearLeft: "f32",
  SurfaceRumbleRearRight: "f32",
  TireSlipAngleFrontLeft: "f32",
  TireSlipAngleFrontRight: "f32",
  TireSlipAngleRearLeft: "f32",
  TireSlipAngleRearRight: "f32",
  TireCombinedSlipFrontLeft: "f32",
  TireCombinedSlipFrontRight: "f32",
  TireCombinedSlipRearLeft: "f32",
  TireCombinedSlipRearRight: "f32",
  SuspensionTravelMetersFrontLeft: "f32",
  SuspensionTravelMetersFrontRight: "f32",
  SuspensionTravelMetersRearLeft: "f32",
  SuspensionTravelMetersRearRight: "f32",
  CarOrdinal: "s32",
  CarClass: "s32",
  CarPerformanceIndex: "s32",
  DrivetrainType: "s32",
  NumCylinders: "s32",
  HorizonPlaceholder: "hzn",
  PositionX: "f32",
  PositionY: "f32",
  PositionZ: "f32",
  Speed: "f32",
  Power: "f32",
  Torque: "f32",
  TireTempFrontLeft: "f32",
  TireTempFrontRight: "f32",
  TireTempRearLeft: "f32",
  TireTempRearRight: "f32",
  Boost: "f32",
  Fuel: "f32",
  DistanceTraveled: "f32",
  BestLap: "f32",
  LastLap: "f32",
  CurrentLap: "f32",
  CurrentRaceTime: "f32",
  LapNumber: "u16",
  RacePosition: "u8",
  Accel: "u8",
  Brake: "u8",
  Clutch: "u8",
  HandBrake: "u8",
  Gear: "u8",
  Steer: "s8",
  NormalizedDrivingLine: "s8",
  NormalizedAIBrakeDifference: "s8",
};
const DATASIZES = {
  s32: 4,
  u32: 4,
  f32: 4,
  u16: 2,
  u8: 1,
  s8: 1,
  hzn: 12,
};

const express = require("express"),
  WebSocket = require("ws"),
  app = express(),
  server = http.createServer(app),
  wss = new WebSocket.Server({ server }),
  path = require("path");
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/index.html"));
});
wss.on("connection", (ws) => {
  webSocket = ws;
});
server.listen(process.env.PORT || 8080);
