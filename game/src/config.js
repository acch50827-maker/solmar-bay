// Solmar Bay — every number, colour and city constant in one place.
//
// The city is a fixed 3200 x 2400 world. The renderer shows a 1280 x 720
// window of it through a camera that follows the player, so no rule here
// depends on the browser window size.
export const WORLD = { width: 3200, height: 2400 };
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const ROAD_WIDTH = 96;
export const ROAD_X = [400, 800, 1200, 1600, 2000, 2400, 2800];
export const ROAD_Y = [400, 800, 1200, 1600, 2000];
export const BEACH_X = 2920;

export const PLAYER = {
  radius: 14,
  walkSpeed: 230,
  health: 100,
  punchDamage: 25,
  punchRange: 46,
  punchArc: 1.1,
  shootCooldown: 0.22,
  bulletSpeed: 760,
  bulletDamage: 34,
  invulnerable: 1.0,
};
export const CAR = {
  length: 54,
  width: 28,
  accel: 420,
  reverseAccel: 260,
  maxSpeed: 520,
  maxReverse: 160,
  brake: 700,
  drag: 0.55,
  steer: 2.6,
  trafficSpeed: 150,
  policeSpeed: 560,
};
export const WANTED_MAX = 5;
export const SAVE_KEY = 'solmar-bay.save.v1';
export const BEST_KEY = 'solmar-bay.best-cash';

export const PALETTE = {
  backdrop: '#0d1420',
  grass: '#3f7a44',
  grassDark: '#356b3a',
  park: '#4c8a3f',
  sand: '#d9c27a',
  water: '#1d6f9e',
  waterDeep: '#155a82',
  road: '#33373f',
  roadEdge: '#4a4f58',
  lane: '#e8d44d',
  sidewalk: '#8d8f94',
  building: '#6b5d4f',
  downtown: '#5a6b7d',
  marina: '#7d6a8a',
  suburb: '#8a7a5f',
  industrial: '#5f6b5a',
  roof: '#3f4652',
  tree: '#2e6b2f',
  text: '#f2f4f6',
  muted: '#aab2bd',
  gold: '#f2c94c',
  red: '#e5534b',
  blue: '#4fc3f7',
  green: '#58c96b',
  panel: '#171d29',
  panelEdge: '#2c3547',
  police: '#2f6fd0',
  policeLight: '#ff3b30',
};
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// Named districts: the colour a building gets comes from the district it
// stands in, so the map reads as Downtown, Marina, Old Town and the rest.
export const DISTRICTS = [
  { name: 'Downtown', x0: 1100, y0: 700, x1: 2100, y1: 1700, color: '#5a6b7d' },
  { name: 'Marina', x0: 2400, y0: 0, x1: 2920, y1: 2400, color: '#7d6a8a' },
  { name: 'Old Town', x0: 0, y0: 0, x1: 1100, y1: 700, color: '#8a7a5f' },
  { name: 'Harbour Park', x0: 0, y0: 0, x1: 800, y1: 800, color: '#4c8a3f' },
  { name: 'Southside', x0: 0, y0: 1700, x1: 3200, y1: 2400, color: '#8a7a5f' },
  { name: 'Works', x0: 0, y0: 700, x1: 1100, y1: 1700, color: '#5f6b5a' },
];
export const CAR_COLORS = [
  '#c0392b', '#2980b9', '#f39c12', '#27ae60', '#8e44ad',
  '#e67e22', '#ecf0f1', '#16a085', '#d35400', '#7f8c8d',
];
export const PED_COLORS = [
  '#e74c3c', '#3498db', '#f1c40f', '#2ecc71',
  '#9b59b6', '#fd79a8', '#00cec9', '#e17055',
];
