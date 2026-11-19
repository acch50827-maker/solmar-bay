// Screenshot scenes for Porto Verde. ?shot=1..4 sets up a fixed, readable scene
// so the dossier screenshots show the title, driving, a police chase and a mission.
import { addCrime } from './police.js';
import { spawnThug } from './combat.js';

export function applyShot(G, shot) {
  const s = G.city.spots;
  if (shot === 1) {
    G.mode = 'title';
    G.cam.x = 1600; G.cam.y = 1200;
    G.player.x = s.parkCenter.x; G.player.y = s.parkCenter.y;
    return;
  }
  G.mode = 'playing';
  if (shot === 2) {
    // Driving down the main avenue with traffic around.
    const car = G.cars.find((c) => c.kind === 'parked');
    if (car) { G.player.car = car; car.kind = 'player'; G.player.x = car.x; G.player.y = car.y; }
    G.player.car.speed = 320;
    G.player.car.angle = 0;
    G.player.car.x = 1000; G.player.car.y = 600;
    G.player.x = 1000; G.player.y = 600;
    G.cam.x = 1000; G.cam.y = 600;
  } else if (shot === 3) {
    // Three-star chase: police cars closing in on the player's car.
    const car = G.cars.find((c) => c.kind === 'parked');
    if (car) { G.player.car = car; car.kind = 'player'; G.player.x = car.x; G.player.y = car.y; }
    G.player.car.speed = 380;
    G.player.car.angle = Math.PI / 2;
    G.player.car.x = 1800; G.player.car.y = 1400;
    G.player.x = 1800; G.player.y = 1400;
    G.cam.x = 1800; G.cam.y = 1400;
    addCrime(G.wanted, 3);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      G.police.push({ x: 1800 + Math.cos(a) * 320, y: 1400 + Math.sin(a) * 320, angle: a + Math.PI, speed: 300, color: '#2244aa', kind: 'police', hp: 100, dir: 0, targetSpeed: 300, honk: 0 });
    }
  } else if (shot === 4) {
    // Rescue mission at the docks, thugs in sight, marker on the HUD.
    G.mission.index = 3;
    G.mission.step = 1;
    G.player.x = 2700; G.player.y = 1980;
    G.player.angle = 0;
    G.cam.x = 2800; G.cam.y = 2030;
    const spots = [[2820, 1980], [2900, 2060], [2760, 2100]];
    for (const [x, y] of spots) G.thugs.push(spawnThug(x, y));
  }
}
