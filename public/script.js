const cache = {},
  nearest = (val, to) => {
    const toOut = to || 1;
    return Math.round(val * toOut) / toOut;
  },
  handlers = {
    active: (v) => {
      svgHide("Active", !strBool(v));
      svgHide("Logo", strBool(v));
    },
    rpm_percent: (v) => {
      svgBar("RPM", v);
    },
    bearing: (v) => {
      svgRotate("Navigation-Dial", 360 - v);
    },
    roll: (v) => {
      svgRotate("Roll-Level", v);
    },
    class: (v) => {
      svgTexter("Roam-Rank-Class", v);
      svgTexter("Race-Rank-Class", v);
      let color =
        "#" +
        {
          X: "75f85f",
          S2: "2f7df6",
          S1: "e984f8",
          A: "eb3466",
          B: "ef7a30",
          C: "fadb4a",
          D: "76e3fb",
        }[v];
      svg.getElementById("Roam-Rank-Box").style.fill = color;
      svg.getElementById("Race-Rank-Box-Colour").style.fill = color;
    },
    performance: (v) => {
      svgTexter("Roam-Rank-Value", v);
      svgTexter("Race-Rank-Value", v);
    },
    drivetrain: (v) => {
      svgTexter("Roam-Drivetrain-Value", v);
      svgTexter("Race-Drivetrain-Value", v);
      svgHide("Roam-Drivetrain-Car-Wheels-Rear", v === "FWD");
      svgHide("Roam-Drivetrain-Car-Wheels-Front", v === "RWD");
      svgHide("Roam-Drivetrain-Car-Wheels-Drive_Shaft", v !== "AWD");
      svgHide("Race-Drivetrain-Car-Wheels-Rear", v === "FWD");
      svgHide("Race-Drivetrain-Car-Wheels-Front", v === "RWD");
      svgHide("Race-Drivetrain-Car-Wheels-Drive_Shaft", v !== "AWD");
    },
    cylinders: (v) => {
      svgTexter("Roam-Cylinders-Value", v);
      svgHide("Roam-Cylinders-Value", v === 0);
      svgHide("Roam-Cylinders-Icon", v === 0);
      svgHide("Roam-Cylinders-EV", v > 0);
    },
    speed: (v, u) => {
      let bar = false;
      ("000" + v)
        .slice(-3)
        .split("")
        .forEach((v, i) => {
          svgTexter("Speed-Digit-" + i, v);
          let light = bar || v > 0;
          svgDim("Speed-Digit-" + i, !light);
          bar = light;
        });
    },
    power: (v, u) => {
      svgTexter("Specs-Power-Value", v + " " + u);
    },
    torque: (v, u) => {
      svgTexter("Specs-Torque-Value", v + " " + u);
    },
    boost: (v, u) => {
      svgTexter("Specs-Boost-Value", v + " " + u);
    },
    gear: (v) => {
      svgTexter("Gear-Value", v);
    },
    handbrake: (v) => {
      svgDim("Handbrake", !strBool(v));
    },
    race: (v) => {
      svgHide("Race-Mode", !strBool(v));
      svgHide("Roam-Mode", strBool(v));
    },
    lap: (v) => {
      svgTexter("Lap-Counter-Value", v);
    },
    position: (v) => {
      svgTexter("Race-Position-Value", v);
    },
    timer_race: (v) => {
      svgTexter("Race-Time", v);
    },
    timer_lap_current: (v) => {
      svgTexter("Lap-Times-Current-Value", v);
    },
    timer_lap_best: (v) => {
      svgTexter("Lap-Times-Best-Value", v);
    },
    timer_lap_last: (v) => {
      svgTexter("Lap-Times-Last-Value", v);
    },
    direction: (v) => {
      svgTexter("Navigation-Direction", v);
    },
  },
  initSocket = () => {
    // Attempt to use the host of the current page if WEBSOCKET_URL isn't set
    const host = window.location.hostname || 'localhost';
    const port = window.location.port || '8080';
    const socket = new WebSocket(`ws://${host}:${port}`);
    socket.onmessage = parse;
  },
  parse = (event) => {
    const data = JSON.parse(event.data);
    for (let [key, value] of Object.entries(data.values)) {
      if (cache[key] !== value && handlers[key] !== undefined) {
        cache[key] = value;
        handlers[key](value, data.units[key]);
      }
    }
  },
  ready = () => {
    svg = document.getElementById("svgObject").contentDocument;
    initSocket();
  },
  strBool = (str) => {
    return str === "ON";
  },
  svgBar = (id, prcnt) => {
    const needle = svg.querySelectorAll(`#${id} .needle`)[0],
      trail = svg.querySelectorAll(`#${id} .trail`)[0];
    needle.style.transform = `translateX(${
      parseFloat(needle.dataset.scale) * prcnt
    }px)`;
    trail.style.transform = `scaleX(${
      1 + parseFloat(trail.dataset.scale) * prcnt
    })`;
  },
  svgDim = (id, dim) => {
    svg.getElementById(id).setAttribute("fill-opacity", dim ? "0.2" : "1");
  },
  svgHide = (id, hide) => {
    svg.getElementById(id).style.display = hide ? "none" : "inline";
  },
  svgFade = (id, hide) => {
    svg.getElementById(id).style.opacity = hide ? 0 : 1;
  },
  htmlHide = (id, hide) => {
    document.getElementById(id).style.display = hide ? "none" : "inline";
  },
  svgRotateCache = {},
  svgRotate = (id, deg) => {
    const from = svgRotateCache[id] || 0,
      to = from + ((((deg - from) % 360) + 540) % 360) - 180;
    svgRotateCache[id] = to;
    svg.getElementById(id).style.transform = `rotate(${to}deg)`;
  },
  svgTexter = (id, text) => {
    svg.getElementById(id).childNodes[0].nodeValue = text;
  };
let svg = null;
document.onreadystatechange = () => {
  if (document.readyState == "complete") {
    ready();
  }
};
