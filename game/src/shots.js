// Adegan screenshot Porto Verde lewat ?shot=1..4.
import { makeCar } from './vehicles.js';
import { spawnThugs } from './combat.js';
import { addWanted, spawnPolice } from './police.js';
import { startMission } from './missions.js';

export function applyShot(state, n) {
  const p = state.player;
  if (n === 1) {
    state.mode = 'title';
    p.x = 1000; p.y = 600;
    return;
  }
  state.mode = 'play';
  if (n === 2) {
    // Dante mengendarai mobil di jalan downtown.
    const car = makeCar(1400, 1000, 0, '#c0392b');
    car.speed = 300;
    state.cars.push(car);
    p.car = car;
    p.onFoot = false;
    p.x = car.x; p.y = car.y; p.angle = 0; p.speed = 300;
    p.hp = 100;
    startMission(state, 0);
  } else if (n === 3) {
    // Kejar-kejaran: wanted 3, polisi mengepung.
    const car = makeCar(1800, 1400, -Math.PI / 2, '#2980b9');
    car.speed = 260;
    state.cars.push(car);
    p.car = car;
    p.onFoot = false;
    p.x = car.x; p.y = car.y; p.angle = -Math.PI / 2; p.speed = 260;
    addWanted(state, 3);
    spawnPolice(state);
    for (const cop of state.police) {
      cop.car.x = p.x + (Math.random() < 0.5 ? -260 : 260);
      cop.car.y = p.y + (Math.random() < 0.5 ? -200 : 200);
    }
    startMission(state, 1);
  } else if (n === 4) {
    // Misi brankas: Dante di depan vault, preman menjaga.
    p.x = 2600; p.y = 1690;
    p.angle = Math.PI / 2;
    p.onFoot = true;
    p.hp = 82;
    state.cash = 2400;
    spawnThugs(state, 2600, 1800, 3);
    startMission(state, 4);
  }
  state.camera.x = p.x - state.view.w / 2;
  state.camera.y = p.y - state.view.h / 2;
}
