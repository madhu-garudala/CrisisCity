import type { Incident } from "./types";

export const incidents: Incident[] = [
  {
    id: "harbor-smoke",
    code: "C-1042",
    title: "Smoke at Harbor Cold Storage",
    report:
      "Caller sees dark smoke rolling from the loading-bay roof. Two workers may still be inside. A forklift battery room is adjacent to the smoke.",
    district: "Harbor",
    caller: "Warehouse supervisor",
    time: "08:14",
    weather: "Wind 18 mph east",
    units: ["Engine 4 · 3 min", "Medic 2 · 5 min", "Patrol 7 · 4 min"],
    coordinates: { x: 21, y: 72 },
    difficulty: "clear",
    truth: {
      incidentType: "fire",
      severity: 3,
      immediateDispatch: true,
      responseAction: "dispatch_multi",
    },
  },
  {
    id: "park-collapse",
    code: "C-1047",
    title: "Runner Down in Meridian Park",
    report:
      "A runner in their 50s collapsed near the north fountain. They are not responding normally and the caller cannot tell whether they are breathing.",
    district: "Meridian",
    caller: "Park visitor",
    time: "08:22",
    weather: "Clear · 71°F",
    units: ["Medic 5 · 2 min", "Engine 1 · 6 min", "Patrol 3 · 3 min"],
    coordinates: { x: 58, y: 30 },
    difficulty: "clear",
    truth: {
      incidentType: "medical",
      severity: 3,
      immediateDispatch: true,
      responseAction: "dispatch_ambulance",
    },
  },
  {
    id: "transformer-pop",
    code: "C-1051",
    title: "Blue Flash Behind Apartments",
    report:
      "Three callers heard a loud pop and saw a blue flash behind Rosewood Apartments. Half the block lost power. No smoke, fire, or injuries are visible.",
    district: "Rosewood",
    caller: "Multiple residents",
    time: "08:31",
    weather: "Light rain",
    units: ["Utility 3 · 7 min", "Engine 6 · 5 min", "Patrol 8 · 8 min"],
    coordinates: { x: 78, y: 58 },
    difficulty: "noisy",
    truth: {
      incidentType: "utility",
      severity: 1,
      immediateDispatch: true,
      responseAction: "dispatch_utility",
    },
  },
  {
    id: "silent-alarm",
    code: "C-1054",
    title: "Silent Alarm at Corner Pharmacy",
    report:
      "A silent hold-up alarm was triggered at Vale Pharmacy. The monitoring company cannot reach staff. A passerby reports the store looks normal from outside.",
    district: "Old Market",
    caller: "Alarm service",
    time: "08:36",
    weather: "Overcast",
    units: ["Patrol 2 · 2 min", "Patrol 9 · 5 min", "Medic 1 · 7 min"],
    coordinates: { x: 43, y: 53 },
    difficulty: "ambiguous",
    truth: {
      incidentType: "police",
      severity: 2,
      immediateDispatch: true,
      responseAction: "dispatch_police",
    },
  },
  {
    id: "bridge-pileup",
    code: "C-1059",
    title: "Three-Car Collision on East Bridge",
    report:
      "A delivery van and two cars collided in the eastbound lanes. One driver is trapped, fuel is leaking, and traffic is backing into the tunnel.",
    district: "East Bridge",
    caller: "Transit camera operator",
    time: "08:44",
    weather: "Road surface wet",
    units: ["Engine 2 · 4 min", "Medic 4 · 4 min", "Patrol 6 · 6 min"],
    coordinates: { x: 88, y: 24 },
    difficulty: "clear",
    truth: {
      incidentType: "traffic",
      severity: 3,
      immediateDispatch: true,
      responseAction: "dispatch_multi",
    },
  },
  {
    id: "grill-glow",
    code: "C-1063",
    title: "Orange Glow on Apartment Balcony",
    report:
      "Caller across the street reports an orange glow and occasional smoke from a third-floor balcony. Resident says by phone they are using a small covered gas grill.",
    district: "Northbank",
    caller: "Neighbor",
    time: "08:51",
    weather: "Wind calm",
    units: ["Engine 7 · 6 min", "Patrol 1 · 5 min", "Medic 6 · 9 min"],
    coordinates: { x: 64, y: 15 },
    difficulty: "ambiguous",
    truth: {
      incidentType: "false_alarm",
      severity: 0,
      immediateDispatch: false,
      responseAction: "monitor",
    },
  },
  {
    id: "station-coughing",
    code: "C-1068",
    title: "Commuters Coughing at Central Station",
    report:
      "Several people on platform 2 suddenly began coughing and tearing up. Cleaning staff spilled an unlabeled container nearby. No one has collapsed yet.",
    district: "Central",
    caller: "Station manager",
    time: "09:03",
    weather: "Indoor concourse",
    units: ["HazMat 1 · 8 min", "Medic 3 · 3 min", "Patrol 4 · 2 min"],
    coordinates: { x: 49, y: 72 },
    difficulty: "noisy",
    truth: {
      incidentType: "medical",
      severity: 2,
      immediateDispatch: true,
      responseAction: "dispatch_multi",
    },
  },
  {
    id: "canal-screams",
    code: "C-1072",
    title: "Shouting Near Canal Footpath",
    report:
      "A caller heard someone shout 'help' twice near the canal footpath, then silence. They saw no person or vehicle and have now left the area.",
    district: "Canal Ward",
    caller: "Anonymous pedestrian",
    time: "09:11",
    weather: "Fog · low visibility",
    units: ["Patrol 5 · 4 min", "Medic 7 · 8 min", "Marine 1 · 12 min"],
    coordinates: { x: 18, y: 29 },
    difficulty: "ambiguous",
    truth: {
      incidentType: "police",
      severity: 2,
      immediateDispatch: true,
      responseAction: "dispatch_police",
    },
  },
];

export const incidentTypeLabels: Record<string, string> = {
  fire: "Fire",
  medical: "Medical",
  police: "Police",
  traffic: "Traffic",
  utility: "Utility",
  false_alarm: "False alarm",
};

export const actionLabels: Record<string, string> = {
  dispatch_fire: "Send fire unit",
  dispatch_ambulance: "Send ambulance",
  dispatch_police: "Send police",
  dispatch_utility: "Send utility crew",
  dispatch_multi: "Multi-agency response",
  monitor: "Monitor / verify",
};

export const severityLabels = ["Routine", "Elevated", "Urgent", "Critical"];
