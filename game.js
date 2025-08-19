// Space Shooter — Menus + Kill-Based Gun Unlocks (no images, rectangles only)

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ---------------- State ----------------
let gameState = "menu"; // "menu" | "instructions" | "playing" | "paused" | "gameover" | "win"
const keys = {};
const bullets = [];      // player projectiles
const enemyBullets = []; // enemy projectiles
const enemies = [];
const powerUps = [];
const particles = [];
let stars = [];
let score = 0;
let kills = 0;
let level = 1;
let gameOver = false;
let boss = null;
let lastShotAt = 0;
let paused = false;

// ---------------- Player ----------------
const player = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 90,
  w: 40,
  h: 48,
  speed: 6,
  maxHealth: 6,
  health: 6,
  shield: 0,
  gun: "single",
};

// ---------------- Guns & Unlocks ----------------
const gunOrder = [
  { name: "single",      label: "Single",              unlockKills: 0,  fireDelay: 160 },
  { name: "pistol",      label: "Laser Pistol",        unlockKills: 5,  fireDelay: 120 },
  { name: "minigun",     label: "Laser Minigun",       unlockKills: 10, fireDelay: 55  },
  { name: "rocket",      label: "Laser Rocket",        unlockKills: 15, fireDelay: 420 },
  { name: "quadRocket",  label: "Laser Quad Rocket",   unlockKills: 25, fireDelay: 550 },
  { name: "missile",     label: "Missile",             unlockKills: 30, fireDelay: 280 },
  { name: "nuke",        label: "Ultimate Nuke",       unlockKills: 40, fireDelay: 4000 },
];

function highestUnlockedGunName() {
  let current = "single";
  for (const g of gunOrder) if (kills >= g.unlockKills) current = g.name;
  return current;
}

function gunMeta(name) {
  return gunOrder.find(g => g.name === name);
}

// ---------------- Input ----------------
document.addEventListener("keydown", (e) => {
  keys[e.code] = true;

  // Global controls
  if (e.code === "KeyP" && (gameState === "playing" || gameState === "paused")) {
    paused = !paused;
    gameState = paused ? "paused" : "playing";
  }

  if (gameState === "menu") {
    if (e.code === "Enter") { restartGame(); gameState = "playing"; }
    if (e.code === "KeyI") { gameState = "instructions"; }
  } else if (gameState === "instructions") {
    if (e.code === "KeyB" || e.code === "Escape") { gameState = "menu"; }
    if (e.code === "Enter") { restartGame(); gameState = "playing"; }
  } else if (gameState === "gameover") {
    if (e.code === "Enter") { restartGame(); gameState = "playing"; }
    if (e.code === "Escape") { gameState = "menu"; }
  } else if (gameState === "win") {
    if (e.code === "Enter") { gameState = "menu"; }
  }
});

document.addEventListener("keyup", (e) => { keys[e.code] = false; });

// ---------------- Utils ----------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand  = (a, b) => Math.random() * (b - a) + a;
const now   = () => performance.now();

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ---------------- Stars ----------------
function initStars() {
  stars = [];
  for (let i = 0; i < 130; i++) {
    stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, s: Math.random() * 2 + .5, v: Math.random() * 1.6 + .5, a: Math.random() * .8 + .2 });
  }
}
function drawStars() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const st of stars) {
    st.y += st.v;
    if (st.y > canvas.height) { st.y = -2; st.x = Math.random() * canvas.width; }
    ctx.globalAlpha = st.a;
    ctx.fillStyle = "#fff";
    ctx.fillRect(st.x, st.y, st.s, st.s);
  }
  ctx.globalAlpha = 1;
}

// ---------------- Player ----------------
function movePlayer() {
  if (keys["ArrowLeft"])  player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;
  player.x = clamp(player.x, 0, canvas.width - player.w);

  // auto-select the best unlocked gun
  player.gun = highestUnlockedGunName();

  if (keys["Space"]) shoot();
}

function drawPlayer() {
  ctx.fillStyle = player.shield > 0 ? "#9bdcff" : "#38bdf8";
  ctx.fillRect(player.x, player.y, player.w, player.h);
  // nose
  ctx.fillStyle = "#e0f2fe";
  ctx.fillRect(player.x + player.w/2 - 3, player.y - 8, 6, 10);
  // wings
  ctx.fillStyle = "#0ea5e9";
  ctx.fillRect(player.x - 8, player.y + 12, 8, 14);
  ctx.fillRect(player.x + player.w, player.y + 12, 8, 14);
  // thruster
  ctx.fillStyle = "rgba(255,170,0,0.85)";
  ctx.fillRect(player.x + player.w/2 - 3, player.y + player.h, 6, 10);
}

// ---------------- Shooting ----------------
function shoot() {
  const meta = gunMeta(player.gun);
  const delay = meta ? meta.fireDelay : 180;
  if (now() - lastShotAt < delay) return;
  lastShotAt = now();

  const cx = player.x + player.w/2;

  // Shared helper to push a projectile
  function addBullet(props) { bullets.push({ damage: 1, type: "laser", ...props }); }

  switch (player.gun) {
    case "single": {
      addBullet({ x: cx - 3, y: player.y - 8, w: 6, h: 16, vy: -10, vx: 0, damage: 1, type: "laser" });
      break;
    }
    case "pistol": {
      addBullet({ x: cx - 3, y: player.y - 8, w: 6, h: 16, vy: -12, vx: 0, damage: 1, type: "laser" });
      break;
    }
    case "minigun": {
      // little spread
      addBullet({ x: cx - 2, y: player.y - 6, w: 4, h: 12, vy: -14, vx: -1.5, damage: .9, type: "laser" });
      addBullet({ x: cx - 2, y: player.y - 6, w: 4, h: 12, vy: -14, vx: 0,    damage: .9, type: "laser" });
      addBullet({ x: cx - 2, y: player.y - 6, w: 4, h: 12, vy: -14, vx: 1.5,  damage: .9, type: "laser" });
      break;
    }
    case "rocket": {
      // slow, chunky rocket
      bullets.push({ x: cx - 5, y: player.y - 10, w: 10, h: 22, vy: -7, vx: 0, damage: 4, type: "rocket", trail: 0 });
      break;
    }
    case "quadRocket": {
      bullets.push({ x: cx - 7, y: player.y - 10, w: 10, h: 22, vy: -7, vx: -2.5, damage: 3, type: "rocket", trail: 0 });
      bullets.push({ x: cx - 7, y: player.y - 10, w: 10, h: 22, vy: -7, vx: -1,   damage: 3, type: "rocket", trail: 0 });
      bullets.push({ x: cx - 7, y: player.y - 10, w: 10, h: 22, vy: -7, vx: 1,    damage: 3, type: "rocket", trail: 0 });
      bullets.push({ x: cx - 7, y: player.y - 10, w: 10, h: 22, vy: -7, vx: 2.5,  damage: 3, type: "rocket", trail: 0 });
      break;
    }
    case "missile": {
      // zigzag missile
      bullets.push({ x: cx - 5, y: player.y - 10, w: 10, h: 20, vy: -8, vx: 0, damage: 2.5, type: "missile", zig: 2.2, dir: 1, t: 0 });
      break;
    }
    case "nuke": {
      // screen wipe + boss damage
      nukeDetonate();
      break;
    }
    default: break;
  }
}

function nukeDetonate() {
  // Visual flash
  for (let i = 0; i < 140; i++) {
    particles.push({ x: rand(0, canvas.width), y: rand(0, canvas.height/1.3), vx: rand(-2,2), vy: rand(-2,2), life: rand(20,40), color: "#ffffff" });
  }
  // Kill all regular enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    explode(e.x + e.w/2, e.y + e.h/2, "#fca5a5", 26);
    dropPowerUp(e.x + e.w/2, e.y + e.h/2);
    enemies.splice(i, 1);
    score += 10;
    kills += 1;
  }
  // Damage boss heavy
  if (boss) {
    boss.hp -= 25; // huge hit
    if (boss.hp <= 0) {
      explode(boss.x + boss.w/2, boss.y + boss.h/2, "#ddd6fe", 60);
      dropPowerUp(boss.x + boss.w/2, boss.y + boss.h/2);
      score += 200;
      boss = null;
      level++;
      gameState = "win";
    }
  }
}

// ---------------- Bullets Render/Update ----------------
function drawPlayerBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];

    // update
    b.y += b.vy;
    b.x += b.vx || 0;

    // missile zigzag
    if (b.type === "missile") {
      b.t += 0.15;
      b.vx = Math.sin(b.t) * b.zig * (b.dir || 1);
    }

    // rocket trail particles
    if (b.type === "rocket") {
      b.trail = (b.trail || 0) + 1;
      if (b.trail % 2 === 0) particles.push({ x: b.x + b.w/2, y: b.y + b.h, vx: rand(-0.5,0.5), vy: rand(0,1.5), life: 14, color: "#fde68a" });
    }

    // draw
    if (b.type === "rocket") {
      ctx.fillStyle = "#f97316";
      ctx.fillRect(b.x, b.y, b.w, b.h);
    } else if (b.type === "missile") {
      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(b.x, b.y, b.w, b.h);
    } else {
      ctx.fillStyle = "#fde047";
      ctx.fillRect(b.x, b.y, b.w || 6, b.h || 16);
    }

    if (b.y + b.h < -20 || b.x < -40 || b.x > canvas.width + 40) bullets.splice(i, 1);
  }
}

function drawEnemyBullets() {
  ctx.fillStyle = "#fb923c";
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.y += b.vy;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    if (b.y > canvas.height + 20) enemyBullets.splice(i, 1);
  }
}

// ---------------- Enemies ----------------
function spawnEnemy() {
  if (boss) return;
  const chance = 0.02 + Math.min(score / 2500, 0.035);
  if (Math.random() < chance) {
    const r = Math.random();
    if (r < 0.5)       enemies.push({ type: "normal", x: rand(0, canvas.width - 36), y: -40, w: 36, h: 36, vy: 2 + Math.random()*1, hp: 1 });
    else if (r < 0.7)  enemies.push({ type: "fast",   x: rand(0, canvas.width - 28), y: -35, w: 28, h: 28, vy: 3.6 + Math.random()*1.2, hp: 1 });
    else if (r < 0.9)  enemies.push({ type: "tanky",  x: rand(0, canvas.width - 48), y: -48, w: 48, h: 48, vy: 1.5, hp: 3 });
    else               enemies.push({ type: "zigzag", x: rand(0, canvas.width - 36), y: -40, w: 36, h: 36, vy: 2.2, hp: 2, vx: 2.2 });
  }
}

function drawEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.type === "normal") ctx.fillStyle = "#ef4444";
    if (e.type === "fast")   ctx.fillStyle = "#22c55e";
    if (e.type === "tanky")  ctx.fillStyle = "#f97316";
    if (e.type === "zigzag") ctx.fillStyle = "#60a5fa";

    e.y += e.vy;
    if (e.type === "zigzag") {
      e.x += e.vx;
      if (e.x <= 0 || e.x + e.w >= canvas.width) e.vx *= -1;
    }

    ctx.fillRect(e.x, e.y, e.w, e.h);
    // little eye
    ctx.fillStyle = "#111";
    ctx.fillRect(e.x + e.w/2 - 3, e.y + 6, 6, 6);

    // enemy shoots
    if (Math.random() < 0.006) {
      enemyBullets.push({ x: e.x + e.w/2 - 3, y: e.y + e.h, w: 6, h: 14, vy: 4.2 });
    }

    if (e.y > canvas.height + 60) enemies.splice(i, 1);
  }
}

// ---------------- Boss ----------------
function spawnBoss() {
  if (!boss && score >= 300 * level) {
    boss = { x: canvas.width/2 - 110, y: 60, w: 220, h: 110, hp: 45 + 12*level, vx: 3 + level*0.35 };
  }
}
function drawBoss() {
  if (!boss) return;
  ctx.fillStyle = "#a78bfa";
  ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
  ctx.fillStyle = "#312e81";
  ctx.fillRect(boss.x + 28, boss.y + 22, boss.w - 56, 20);

  boss.x += boss.vx;
  if (boss.x <= 0 || boss.x + boss.w >= canvas.width) boss.vx *= -1;

  // barrages
  if (Math.random() < 0.05) {
    const bx = boss.x + boss.w/2 - 3;
    enemyBullets.push({ x: bx - 34, y: boss.y + boss.h, w: 6, h: 18, vy: 5.6 });
    enemyBullets.push({ x: bx,      y: boss.y + boss.h, w: 6, h: 18, vy: 6.8 });
    enemyBullets.push({ x: bx + 34, y: boss.y + boss.h, w: 6, h: 18, vy: 5.6 });
  }
}

// ---------------- Power-ups ----------------
function dropPowerUp(x, y) {
  const r = Math.random();
  if (r < 0.18) { // ~18% drop
    let type = "shield";
    if (r < 0.06) type = "health";
    else if (r < 0.12) type = "gun";
    powerUps.push({ type, x: x - 11, y: y - 11, s: 22, vy: 2.2 });
  }
}
function drawPowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];
    p.y += p.vy;
    if (p.type === "health") ctx.fillStyle = "#22c55e";
    if (p.type === "gun")    ctx.fillStyle = "#38bdf8";
    if (p.type === "shield") ctx.fillStyle = "#93c5fd";
    ctx.fillRect(p.x, p.y, p.s, p.s);

    if (rectsOverlap(player.x, player.y, player.w, player.h, p.x, p.y, p.s, p.s)) {
      if (p.type === "health") player.health = clamp(player.health + 1, 0, player.maxHealth);
      if (p.type === "gun") {
        // small boost: instantly bump kills by 1 to help unlocks
        kills += 1;
      }
      if (p.type === "shield") player.shield = 60 * 5;
      powerUps.splice(i, 1);
    } else if (p.y > canvas.height + 30) {
      powerUps.splice(i, 1);
    }
  }
}

// ---------------- Particles ----------------
function explode(x, y, color = "#fff", count = 18) {
  for (let i = 0; i < count; i++) {
    particles.push({ x, y, vx: rand(-3,3), vy: rand(-3,3), life: rand(18,36), color });
  }
}
function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.98; p.vy *= 0.98;
    p.life -= 1;
    ctx.globalAlpha = Math.max(p.life / 36, 0);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 3, 3);
    ctx.globalAlpha = 1;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ---------------- Collisions ----------------
function handleCollisions() {
  // player bullets vs enemies and boss
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    let hitSomething = false;

    // vs enemies
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      if (rectsOverlap(b.x, b.y, b.w || 6, b.h || 16, e.x, e.y, e.w, e.h)) {
        hitSomething = true;
        e.hp -= (b.damage || 1);
        if (b.type === "rocket" || b.type === "missile") explode(b.x + (b.w||6)/2, b.y, "#fde047", 18);
        else particles.push({ x: b.x, y: b.y, vx: 0, vy: -1, life: 10, color: "#fde047" });

        if (e.hp <= 0) {
          score += 10;
          kills += 1;
          dropPowerUp(e.x + e.w/2, e.y + e.h/2);
          explode(e.x + e.w/2, e.y + e.h/2, "#fca5a5", 22);
          enemies.splice(ei, 1);
        }
        // rockets/missiles disappear on hit; lasers too
        bullets.splice(bi, 1);
        break;
      }
    }
    if (hitSomething) continue;

    // vs boss
    if (boss && rectsOverlap(b.x, b.y, b.w || 6, b.h || 16, boss.x, boss.y, boss.w, boss.h)) {
      boss.hp -= (b.damage || 1);
      if (b.type === "rocket" || b.type === "missile") explode(b.x + (b.w||6)/2, b.y, "#c4b5fd", 20);
      else particles.push({ x: b.x, y: b.y, vx: 0, vy: -1, life: 10, color: "#c4b5fd" });
      bullets.splice(bi, 1);

      if (boss.hp <= 0) {
        explode(boss.x + boss.w/2, boss.y + boss.h/2, "#ddd6fe", 60);
        dropPowerUp(boss.x + boss.w/2, boss.y + boss.h/2);
        score += 200;
        boss = null;
        level++;
        gameState = "win";
      }
    }
  }

  // enemy bullets vs player
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    if (rectsOverlap(player.x, player.y, player.w, player.h, b.x, b.y, b.w, b.h)) {
      enemyBullets.splice(i, 1);
      if (player.shield <= 0) {
        player.health -= 1;
        explode(player.x + player.w/2, player.y + player.h/2, "#60a5fa", 18);
        if (player.health <= 0) {
          explode(player.x + player.w/2, player.y + player.h/2, "#fda4af", 120);
          gameOver = true;
          gameState = "gameover";
        }
      }
    }
  }
}

// ---------------- UI ----------------
function nextUnlockText() {
  for (let i = 0; i < gunOrder.length; i++) {
    const g = gunOrder[i];
    if (kills < g.unlockKills) {
      return `Next: ${g.label} @ ${g.unlockKills} Kills`;
    }
  }
  return `All guns unlocked`;
}

function drawUI() {
  ctx.fillStyle = "#fff";
  ctx.font = "20px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 12, 28);
  ctx.fillText(`Lives: ${player.health}`, 12, 52);
  ctx.fillText(`Kills: ${kills}`, 12, 76);

  ctx.textAlign = "right";
  const gunLabel = gunOrder.find(g => g.name === player.gun)?.label || player.gun;
  ctx.fillText(`Gun: ${gunLabel}`, canvas.width - 12, 28);
  ctx.fillStyle = "rgba(255,255,255,.8)";
  ctx.fillText(nextUnlockText(), canvas.width - 12, 52);
  ctx.textAlign = "left";

  // Boss HP bar
  if (boss) {
    const maxHp = 45 + 12 * (level - 1);
    const pct = clamp(boss.hp / maxHp, 0, 1);
    const w = 260, h = 12, x = canvas.width/2 - w/2, y = 24;
    ctx.fillStyle = "#1f2937"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#a78bfa"; ctx.fillRect(x, y, w * pct, h);
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.strokeRect(x, y, w, h);
  }
}

function drawMenu() {
  drawStars();
  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 52px system-ui, sans-serif";
  ctx.fillText("SPACE SHOOTER", canvas.width/2, 200);

  ctx.font = "24px system-ui, sans-serif";
  ctx.fillText("Press ENTER to Start", canvas.width/2, 320);
  ctx.fillText("Press I for Instructions", canvas.width/2, 360);

  ctx.font = "16px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,.8)";
  ctx.fillText("Guns unlock by kills: Pistol(5), Minigun(10), Rocket(15), Quad(25), Missile(30), Nuke(40)", canvas.width/2, 420);
}

function drawInstructions() {
  drawStars();
  ctx.fillStyle = "rgba(0,0,0,.65)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "40px system-ui, sans-serif";
  ctx.fillText("Instructions", canvas.width/2, 160);

  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText("Move with ← →   •   Shoot with Space", canvas.width/2, 230);
  ctx.fillText("Collect power-ups: Health / Shield / Gun Boost", canvas.width/2, 265);
  ctx.fillText("Unlock stronger guns by getting kills", canvas.width/2, 300);
  ctx.fillText("Beat the boss to Win", canvas.width/2, 335);

  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.fillText("Press B to go Back   •   Press Enter to Start", canvas.width/2, 400);
}

function drawPause() {
  ctx.fillStyle = "rgba(0,0,0,.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "40px system-ui, sans-serif";
  ctx.fillText("PAUSED", canvas.width/2, canvas.height/2 - 10);
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillText("Press P to resume", canvas.width/2, canvas.height/2 + 24);
}

function drawGameOver() {
  drawStars();
  ctx.fillStyle = "rgba(0,0,0,.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 50px system-ui, sans-serif";
  ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2 - 40);
  ctx.font = "22px system-ui, sans-serif";
  ctx.fillText(`Score: ${score}   •   Kills: ${kills}`, canvas.width/2, canvas.height/2);
  ctx.fillText("Press ENTER to Restart   •   ESC to Menu", canvas.width/2, canvas.height/2 + 40);
}

function drawWin() {
  drawStars();
  ctx.fillStyle = "rgba(0,0,0,.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 50px system-ui, sans-serif";
  ctx.fillText("YOU WIN!", canvas.width/2, canvas.height/2 - 40);
  ctx.font = "22px system-ui, sans-serif";
  ctx.fillText(`Score: ${score}   •   Kills: ${kills}`, canvas.width/2, canvas.height/2);
  ctx.fillText("Press ENTER for Menu", canvas.width/2, canvas.height/2 + 40);
}

// ---------------- Main Update ----------------
function updatePlaying() {
  drawStars();

  movePlayer();
  drawPlayer();

  drawPlayerBullets();
  drawEnemyBullets();

  spawnEnemy();
  drawEnemies();

  spawnBoss();
  drawBoss();

  drawPowerUps();
  handleCollisions();

  if (player.shield > 0) player.shield--;

  drawParticles();
  drawUI();
}

// ---------------- Loop ----------------
function loop() {
  if (gameState === "menu") {
    drawMenu();
  } else if (gameState === "instructions") {
    drawInstructions();
  } else if (gameState === "paused") {
    updatePlaying(); // show current frame under overlay
    drawPause();
  } else if (gameState === "playing") {
    updatePlaying();
  } else if (gameState === "gameover") {
    drawGameOver();
  } else if (gameState === "win") {
    drawWin();
  }
  requestAnimationFrame(loop);
}

// ---------------- Reset ----------------
function restartGame() {
  bullets.length = 0;
  enemyBullets.length = 0;
  enemies.length = 0;
  powerUps.length = 0;
  particles.length = 0;
  boss = null;
  score = 0;
  kills = 0;
  level = 1;
  gameOver = false;
  paused = false;
  player.x = canvas.width / 2 - player.w/2;
  player.y = canvas.height - 90;
  player.health = player.maxHealth;
  player.shield = 0;
  player.gun = "single";
}

// ---------------- Kickoff ----------------
initStars();
loop();

