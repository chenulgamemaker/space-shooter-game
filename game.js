# game.js content with weapon system, boss, sprites, and sounds
game_js = r"""const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const hudKills = document.getElementById("kills");
const hudWeapon = document.getElementById("weapon");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlay-text");
const bossbarwrap = document.getElementById("bossbarwrap");
const bossbar = document.getElementById("bossbar");

const sndShoot = document.getElementById("sndShoot");
const sndExplosion = document.getElementById("sndExplosion");
const sndBossHit = document.getElementById("sndBossHit");

// Load sprites
function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}
const SPRITES = {
  player: loadImage("assets/player.png"),
  enemy: loadImage("assets/enemy.png"),
  boss: loadImage("assets/boss.png"),
  bullet: loadImage("assets/bullet.png"),
  rocket: loadImage("assets/rocket.png"),
  laser: loadImage("assets/laser.png"),
};

// Game state
let game, inputs;

function resetGame() {
  game = {
    ship: { x: canvas.width/2, y: canvas.height-70, w: 48, h: 48, speed: 6, alive: true },
    bullets: [], // generic projectile list
    enemies: [],
    enemySpawnTimer: 0,
    enemySpawnInterval: 1000,
    kills: 0,
    lastShotTime: 0,
    currentWeapon: 1,
    unlocked: new Set([1]),
    time: 0,
    boss: null,
    bossBullets: [],
  };
  inputs = { left:false, right:false, up:false, down:false, shooting:false };
  bossbarwrap.style.display = "none";
  overlay.style.display = "none";
  updateHud();
}

function restart() {
  resetGame();
}

const WEAPONS = {
  1: { name: "Basic Gun (1)", fireRate: 1, damage: 1, shoot: shootBasic, unlockAt: 0 },
  2: { name: "Laser Minigun (2)", fireRate: 5, damage: 1, shoot: shootMinigun, unlockAt: 5 },
  3: { name: "Laser Beam (3)", fireRate: 2, damage: 3, shoot: shootBeam, unlockAt: 10 },
  4: { name: "Rockets (4)", fireRate: 1, damage: 5, shoot: shootRocket, unlockAt: 15 },
  5: { name: "Quad Minigun (5)", fireRate: 5, damage: 1, shoot: shootQuadMinigun, unlockAt: 20 },
  6: { name: "Quad Rockets (6)", fireRate: 1, damage: 5, shoot: shootQuadRocket, unlockAt: 40 },
};

function updateHud() {
  hudKills.textContent = game.kills;
  const w = WEAPONS[game.currentWeapon];
  hudWeapon.textContent = w ? w.name : "Unknown";
}

// Input
document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (key === "arrowleft" || key === "a") inputs.left = true;
  if (key === "arrowright" || key === "d") inputs.right = true;
  if (key === "arrowup" || key === "w") inputs.up = true;
  if (key === "arrowdown" || key === "s") inputs.down = true;
  if (key === " ") inputs.shooting = true;

  if ("123456".includes(key)) {
    const idx = parseInt(key, 10);
    if (game.unlocked.has(idx)) {
      game.currentWeapon = idx;
      updateHud();
    }
  }
});
document.addEventListener("keyup", (e) => {
  const key = e.key.toLowerCase();
  if (key === "arrowleft" || key === "a") inputs.left = false;
  if (key === "arrowright" || key === "d") inputs.right = false;
  if (key === "arrowup" || key === "w") inputs.up = false;
  if (key === "arrowdown" || key === "s") inputs.down = false;
  if (key === " ") inputs.shooting = false;
});

// Projectiles
function spawnProjectile(opts) {
  // type: "bullet" | "rocket" | "beam"
  game.bullets.push({
    x: opts.x, y: opts.y, vx: opts.vx || 0, vy: opts.vy || -8,
    w: opts.w || 8, h: opts.h || 16, sprite: opts.sprite || SPRITES.bullet,
    damage: opts.damage || 1, type: opts.type || "bullet", life: 800
  });
}

// Shooting functions
function canShoot() {
  const w = WEAPONS[game.currentWeapon];
  if (!w) return false;
  const now = performance.now();
  const interval = 1000 / w.fireRate; // ms per shot
  return (now - game.lastShotTime) >= interval;
}
function doShoot() {
  if (!canShoot()) return;
  const w = WEAPONS[game.currentWeapon];
  w.shoot();
  game.lastShotTime = performance.now();
  try { sndShoot.currentTime = 0; sndShoot.play(); } catch {}
}

function shootBasic() {
  spawnProjectile({ x: game.ship.x, y: game.ship.y-26, w: 6, h: 16, sprite: SPRITES.bullet, damage: 1, vy: -7, type: "bullet" });
}
function shootMinigun() {
  spawnProjectile({ x: game.ship.x - 8, y: game.ship.y-26, w: 6, h: 16, vy: -9, sprite: SPRITES.bullet, damage: 1 });
}
function shootBeam() {
  // Wider beam, slower speed, higher damage
  spawnProjectile({ x: game.ship.x, y: game.ship.y-30, w: 14, h: 40, vy: -12, sprite: SPRITES.laser, damage: 3, type: "beam" });
}
function shootRocket() {
  spawnProjectile({ x: game.ship.x, y: game.ship.y-30, w: 10, h: 24, vy: -6, sprite: SPRITES.rocket, damage: 5, type: "rocket" });
}
function shootQuadMinigun() {
  const offsets = [-22, -8, 8, 22];
  offsets.forEach(dx => spawnProjectile({ x: game.ship.x + dx, y: game.ship.y-26, w: 6, h: 16, vy: -9, sprite: SPRITES.bullet, damage: 1 }));
}
function shootQuadRocket() {
  const offsets = [-28, -10, 10, 28];
  offsets.forEach(dx => spawnProjectile({ x: game.ship.x + dx, y: game.ship.y-28, w: 12, h: 26, vy: -6, sprite: SPRITES.rocket, damage: 5, type: "rocket" }));
}

// Enemies
function spawnEnemy() {
  const x = 40 + Math.random() * (canvas.width - 80);
  const y = -30;
  const speed = 1.2 + Math.random() * 1.2;
  game.enemies.push({ x, y, w: 40, h: 32, vy: speed, vx: Math.sin(game.time/600 + x)*0.7, hp: 3, alive:true });
}

// Boss
function spawnBoss() {
  game.boss = { x: canvas.width/2, y: 100, w: 160, h: 120, vx: 2.0, hp: 100, maxhp: 100, fireTimer: 0 };
  bossbarwrap.style.display = "block";
  updateBossBar();
}

function updateBossBar() {
  if (!game.boss) { bossbarwrap.style.display = "none"; return; }
  const pct = Math.max(0, game.boss.hp) / game.boss.maxhp;
  bossbar.style.width = `${pct*100}%`;
}

// Collision
function rectsOverlap(a,b) {
  return (a.x - a.w/2 < b.x + b.w/2 &&
          a.x + a.w/2 > b.x - b.w/2 &&
          a.y - a.h/2 < b.y + b.h/2 &&
          a.y + a.h/2 > b.y - b.h/2);
}

// Update
function update(dt) {
  game.time += dt;

  // Input movement
  const s = game.ship.speed;
  if (inputs.left) game.ship.x -= s;
  if (inputs.right) game.ship.x += s;
  if (inputs.up) game.ship.y -= s;
  if (inputs.down) game.ship.y += s;
  game.ship.x = Math.max(30, Math.min(canvas.width-30, game.ship.x));
  game.ship.y = Math.max(80, Math.min(canvas.height-40, game.ship.y));

  // Shooting
  if (inputs.shooting) doShoot();

  // Unlock weapons based on kills
  for (const [id, w] of Object.entries(WEAPONS)) {
    if (game.kills >= w.unlockAt) game.unlocked.add(parseInt(id));
  }

  // Enemy spawning (stop at boss)
  if (!game.boss && game.kills < 50) {
    game.enemySpawnTimer += dt;
    const interval = game.enemySpawnInterval * Math.max(0.4, 1 - game.kills / 100);
    if (game.enemySpawnTimer >= interval) {
      spawnEnemy();
      game.enemySpawnTimer = 0;
    }
  }

  // Boss spawn at 50 kills
  if (!game.boss && game.kills >= 50) {
    spawnBoss();
  }

  // Update enemies
  for (const e of game.enemies) {
    if (!e.alive) continue;
    e.y += e.vy;
    e.x += e.vx;
    if (e.y > canvas.height + 40) e.alive = false;
  }
  game.enemies = game.enemies.filter(e => e.alive);

  // Update projectiles
  for (const p of game.bullets) {
    p.x += p.vx || 0;
    p.y += p.vy || 0;
    p.life -= dt;
  }
  game.bullets = game.bullets.filter(p => p.life > 0 && p.y > -50 && p.y < canvas.height + 50);

  // Collisions: projectiles vs enemies
  for (const p of game.bullets) {
    for (const e of game.enemies) {
      if (!e.alive) continue;
      if (rectsOverlap(
            {x:p.x, y:p.y, w:p.w, h:p.h},
            {x:e.x, y:e.y, w:e.w, h:e.h})) {
        e.hp -= p.damage;
        p.life = 0;
        if (e.hp <= 0) {
          e.alive = false;
          game.kills += 1;
          try { sndExplosion.currentTime = 0; sndExplosion.play(); } catch {}
          updateHud();
        }
      }
    }
  }

  // Boss logic
  if (game.boss) {
    const b = game.boss;
    b.x += b.vx;
    if (b.x < 120 || b.x > canvas.width-120) b.vx *= -1;

    // boss fires periodically
    b.fireTimer += dt;
    if (b.fireTimer >= 900) {
      b.fireTimer = 0;
      // fire 5 aimed shots
      for (let i=0;i<5;i++) {
        const angle = Math.atan2(game.ship.y - b.y, (game.ship.x + (i-2)*20) - b.x);
        const speed = 3.2;
        game.bossBullets.push({
          x: b.x + (i-2)*22, y: b.y + 50, w: 8, h: 12,
          vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
          life: 4000
        });
      }
    }

    // boss bullets move
    for (const bb of game.bossBullets) {
      bb.x += bb.vx; bb.y += bb.vy; bb.life -= dt;
    }
    game.bossBullets = game.bossBullets.filter(bb => bb.life > 0 && bb.y < canvas.height+40 && bb.y > -40);

    // projectiles hitting boss
    for (const p of game.bullets) {
      if (rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h}, {x:b.x,y:b.y,w:b.w,h:b.h})) {
        b.hp -= p.damage;
        p.life = 0;
        try { sndBossHit.currentTime = 0; sndBossHit.play(); } catch {}
        updateBossBar();
        if (b.hp <= 0) {
          game.boss = null;
          bossbarwrap.style.display = "none";
          victory();
        }
      }
    }
  }

  // TODO: player damage & lives (optional). For now, avoid damage to keep it arcade-simple.
}

function victory() {
  overlayText.textContent = "You defeated the boss!";
  overlay.style.display = "flex";
}

// Render
function draw() {
  ctx.clearRect(0,0,canvas.width, canvas.height);

  // stars background parallax
  drawStars();

  // ship
  const s = game.ship;
  drawSprite(SPRITES.player, s.x, s.y, 64, 64);

  // enemies
  for (const e of game.enemies) {
    drawSprite(SPRITES.enemy, e.x, e.y, 48, 36);
  }

  // bullets
  for (const p of game.bullets) {
    const img = p.sprite || SPRITES.bullet;
    let w = p.w, h = p.h;
    // Center sprites
    drawSprite(img, p.x, p.y, Math.max(w, img.width*0.7), Math.max(h, img.height*0.7));
  }

  // boss
  if (game.boss) {
    const b = game.boss;
    drawSprite(SPRITES.boss, b.x, b.y, b.w, b.h);
    // boss bullets
    ctx.fillStyle = "#f0f";
    for (const bb of game.bossBullets) {
      ctx.beginPath();
      ctx.arc(bb.x, bb.y, 4, 0, Math.PI*2);
      ctx.fill();
    }
  }
}

function drawSprite(img, cx, cy, w, h) {
  ctx.drawImage(img, cx - w/2, cy - h/2, w, h);
}

let starTime = 0;
function drawStars() {
  starTime += 1;
  ctx.save();
  for (let i=0;i<100;i++) {
    const y = (i*60 + (starTime*0.7)) % (canvas.height+60) - 10;
    const x = (i*37 % canvas.width);
    ctx.fillStyle = i % 10 === 0 ? "#0ff" : "#fff";
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}

// Main loop
let last = performance.now();
function loop() {
  const now = performance.now();
  const dt = now - last;
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// Start
resetGame();
loop();
"""
