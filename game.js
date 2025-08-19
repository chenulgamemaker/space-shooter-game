
game_js = r"""// Space Shooter (no external images) — rectangles & particles version
// Features: 3 guns, enemy types, enemy bullets, boss, power-ups, starfield, explosions, lives, score, restart

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* =================== State =================== */
const keys = {};
const bullets = [];
const enemyBullets = [];
const enemies = [];
const powerUps = [];
const particles = []; // explosions
let stars = [];
let score = 0;
let level = 1;
let gameOver = false;
let boss = null;
let lastShotAt = 0;

/* =================== Player =================== */
const player = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 80,
  w: 40,
  h: 48,
  speed: 6,
  maxHealth: 6,
  health: 6,
  gun: "single",
  shield: 0 // frames of invincibility
};

/* =================== Input =================== */
document.addEventListener("keydown", (e) => { keys[e.code] = true; if (e.code === "Enter" && gameOver) resetGame(); });
document.addEventListener("keyup", (e) => { keys[e.code] = false; });

/* =================== Helpers =================== */
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(a, b) { return Math.random() * (b - a) + a; }
function now() { return performance.now(); }

/* =================== Visuals: Starfield =================== */
function initStars() {
  stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      s: Math.random() * 2 + 0.5,
      v: Math.random() * 1.5 + 0.5,
      a: Math.random() * 0.8 + 0.2
    });
  }
}
function drawStars() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  stars.forEach(st => {
    st.y += st.v;
    if (st.y > canvas.height) {
      st.y = -2;
      st.x = Math.random() * canvas.width;
    }
    ctx.globalAlpha = st.a;
    ctx.fillStyle = "#fff";
    ctx.fillRect(st.x, st.y, st.s, st.s);
    ctx.globalAlpha = 1;
  });
}

/* =================== Player drawing & control =================== */
function drawPlayer() {
  // body
  ctx.fillStyle = player.shield > 0 ? "#9bdcff" : "#38bdf8";
  ctx.fillRect(player.x, player.y, player.w, player.h);
  // little nose cone
  ctx.fillStyle = "#e0f2fe";
  ctx.fillRect(player.x + player.w/2 - 4, player.y - 8, 8, 12);
  // wings
  ctx.fillStyle = "#0ea5e9";
  ctx.fillRect(player.x - 8, player.y + 10, 8, 14);
  ctx.fillRect(player.x + player.w, player.y + 10, 8, 14);
  // thruster glow
  ctx.fillStyle = "rgba(255,170,0,0.8)";
  ctx.fillRect(player.x + player.w/2 - 3, player.y + player.h, 6, 10);
}

function movePlayer() {
  if (keys["ArrowLeft"])  player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;
  player.x = clamp(player.x, 0, canvas.width - player.w);

  if (keys["Digit1"]) player.gun = "single";
  if (keys["Digit2"]) player.gun = "double";
  if (keys["Digit3"]) player.gun = "spread";

  if (keys["Space"]) shoot();
}

function shoot() {
  const fireDelay = player.gun === "single" ? 150 : (player.gun === "double" ? 200 : 250); // ms
  if (now() - lastShotAt < fireDelay) return;
  lastShotAt = now();

  if (player.gun === "single") {
    bullets.push({ x: player.x + player.w/2 - 3, y: player.y - 10, w: 6, h: 16, vy: -10, vx: 0 });
  } else if (player.gun === "double") {
    bullets.push({ x: player.x + 6, y: player.y - 6, w: 6, h: 16, vy: -10, vx: 0 });
    bullets.push({ x: player.x + player.w - 12, y: player.y - 6, w: 6, h: 16, vy: -10, vx: 0 });
  } else if (player.gun === "spread") {
    bullets.push({ x: player.x + player.w/2 - 3, y: player.y - 6, w: 6, h: 16, vy: -10, vx: -3 });
    bullets.push({ x: player.x + player.w/2 - 3, y: player.y - 10, w: 6, h: 16, vy: -10, vx: 0 });
    bullets.push({ x: player.x + player.w/2 - 3, y: player.y - 6, w: 6, h: 16, vy: -10, vx: 3 });
  }
}

/* =================== Bullets =================== */
function drawPlayerBullets() {
  ctx.fillStyle = "#fde047"; // yellow
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y += b.vy;
    b.x += b.vx || 0;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    if (b.y + b.h < 0) bullets.splice(i, 1);
  }
}

function drawEnemyBullets() {
  ctx.fillStyle = "#fb923c"; // orange
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.y += b.vy;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    if (b.y > canvas.height) enemyBullets.splice(i, 1);
  }
}

/* =================== Enemies =================== */
function spawnEnemy() {
  if (boss) return;
  const chance = 0.02 + Math.min(score / 2000, 0.03); // ramps slightly with score
  if (Math.random() < chance) {
    const r = Math.random();
    if (r < 0.5) {
      enemies.push({ type: "normal", x: rand(0, canvas.width - 36), y: -40, w: 36, h: 36, vy: 2 + Math.random()*0.8, hp: 1 });
    } else if (r < 0.7) {
      enemies.push({ type: "fast", x: rand(0, canvas.width - 28), y: -35, w: 28, h: 28, vy: 3.5 + Math.random()*1.2, hp: 1 });
    } else if (r < 0.9) {
      enemies.push({ type: "tanky", x: rand(0, canvas.width - 48), y: -48, w: 48, h: 48, vy: 1.5, hp: 3 });
    } else {
      enemies.push({ type: "zigzag", x: rand(0, canvas.width - 36), y: -40, w: 36, h: 36, vy: 2.2, hp: 2, vx: 2.2 });
    }
  }
}

function drawEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.type === "normal") ctx.fillStyle = "#ef4444";      // red
    if (e.type === "fast")   ctx.fillStyle = "#22c55e";      // green
    if (e.type === "tanky")  ctx.fillStyle = "#f97316";      // orange
    if (e.type === "zigzag") ctx.fillStyle = "#60a5fa";      // blue

    // movement
    e.y += e.vy;
    if (e.type === "zigzag") {
      e.x += e.vx;
      if (e.x <= 0 || e.x + e.w >= canvas.width) e.vx *= -1;
    }

    // draw body
    ctx.fillRect(e.x, e.y, e.w, e.h);
    // small eye
    ctx.fillStyle = "#111";
    ctx.fillRect(e.x + e.w/2 - 3, e.y + 6, 6, 6);

    // shoot sometimes
    if (Math.random() < 0.006) {
      enemyBullets.push({ x: e.x + e.w/2 - 3, y: e.y + e.h, w: 6, h: 14, vy: 4 });
    }

    if (e.y > canvas.height + 50) {
      enemies.splice(i, 1);
    }
  }
}

/* =================== Boss =================== */
function spawnBoss() {
  if (!boss && score >= 250 * level) {
    boss = { x: canvas.width/2 - 100, y: 60, w: 200, h: 100, hp: 40 + 10*level, vx: 3 + level*0.3 };
  }
}
function drawBoss() {
  if (!boss) return;
  // body
  ctx.fillStyle = "#a78bfa"; // purple
  ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
  // windows
  ctx.fillStyle = "#312e81";
  ctx.fillRect(boss.x + 30, boss.y + 20, boss.w - 60, 20);

  boss.x += boss.vx;
  if (boss.x <= 0 || boss.x + boss.w >= canvas.width) boss.vx *= -1;

  // shoot barrages
  if (Math.random() < 0.05) {
    const bx = boss.x + boss.w/2 - 3;
    enemyBullets.push({ x: bx - 30, y: boss.y + boss.h, w: 6, h: 18, vy: 5.5 });
    enemyBullets.push({ x: bx,       y: boss.y + boss.h, w: 6, h: 18, vy: 6.5 });
    enemyBullets.push({ x: bx + 30, y: boss.y + boss.h, w: 6, h: 18, vy: 5.5 });
  }
}

/* =================== Power-ups =================== */
function dropPowerUp(x, y) {
  const r = Math.random();
  if (r < 0.2) { // 20% drop
    let type = "shield";
    if (r < 0.07) type = "health";
    else if (r < 0.14) type = "gun";
    powerUps.push({ type, x, y, s: 22, vy: 2.2 });
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

    // collide with player
    if (rectsOverlap(player.x, player.y, player.w, player.h, p.x, p.y, p.s, p.s)) {
      if (p.type === "health") player.health = clamp(player.health + 1, 0, player.maxHealth);
      if (p.type === "gun") {
        const guns = ["single", "double", "spread"];
        player.gun = guns[Math.floor(Math.random()*guns.length)];
      }
      if (p.type === "shield") player.shield = 60 * 5; // ~5s at 60fps
      powerUps.splice(i, 1);
    } else if (p.y > canvas.height + 40) {
      powerUps.splice(i, 1);
    }
  }
}

/* =================== Explosions (particles) =================== */
function explode(x, y, color = "#fff", count = 18) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: rand(-3, 3),
      vy: rand(-3, 3),
      life: rand(18, 36),
      color
    });
  }
}
function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.life -= 1;
    ctx.globalAlpha = Math.max(p.life / 36, 0);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 3, 3);
    ctx.globalAlpha = 1;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

/* =================== Collisions =================== */
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function handleCollisions() {
  // player bullets vs enemies
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    let hit = false;
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      if (rectsOverlap(b.x, b.y, b.w, b.h, e.x, e.y, e.w, e.h)) {
        bullets.splice(bi, 1);
        e.hp -= 1;
        explode(b.x, b.y, "#fde047", 8);
        if (e.hp <= 0) {
          score += 10;
          dropPowerUp(e.x + e.w/2, e.y + e.h/2);
          explode(e.x + e.w/2, e.y + e.h/2, "#fca5a5", 22);
          enemies.splice(ei, 1);
        }
        hit = true;
        break;
      }
    }
    if (hit) continue;

    // bullets vs boss
    if (boss && rectsOverlap(b.x, b.y, b.w, b.h, boss.x, boss.y, boss.w, boss.h)) {
      bullets.splice(bi, 1);
      boss.hp -= 1;
      explode(b.x, b.y, "#c4b5fd", 10);
      if (boss.hp <= 0) {
        score += 150;
        explode(boss.x + boss.w/2, boss.y + boss.h/2, "#ddd6fe", 48);
        dropPowerUp(boss.x + boss.w/2, boss.y + boss.h/2);
        boss = null;
        level++;
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
        explode(player.x + player.w/2, player.y + player.h/2, "#60a5fa", 20);
        if (player.health <= 0) {
          gameOver = true;
          explode(player.x + player.w/2, player.y + player.h/2, "#fda4af", 120);
        }
      }
    }
  }
}

/* =================== UI =================== */
function drawUI() {
  ctx.fillStyle = "#fff";
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText(`Score: ${score}`, 12, 28);
  ctx.fillText(`Lives: ${player.health}`, 12, 52);
  ctx.fillText(`Gun: ${player.gun}`, 12, 76);

  if (boss) {
    // boss HP bar
    const w = 220, h = 12;
    const x = canvas.width/2 - w/2;
    const y = 24;
    const pct = boss.hp / (40 + 10*(level-1));
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#a78bfa";
    ctx.fillRect(x, y, w * clamp(pct, 0, 1), h);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.strokeRect(x, y, w, h);
  }
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 48px system-ui, sans-serif";
  ctx.fillText("GAME OVER", canvas.width/2 - 150, canvas.height/2 - 20);
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText("Press Enter to Restart", canvas.width/2 - 120, canvas.height/2 + 20);
}

/* =================== Main Loop =================== */
function update() {
  drawStars();

  if (gameOver) {
    drawPlayer();
    drawParticles();
    drawUI();
    drawGameOver();
    requestAnimationFrame(update);
    return;
  }

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

  requestAnimationFrame(update);
}

function resetGame() {
  bullets.length = 0;
  enemyBullets.length = 0;
  enemies.length = 0;
  powerUps.length = 0;
  particles.length = 0;
  boss = null;
  score = 0;
  level = 1;
  player.x = canvas.width / 2 - player.w/2;
  player.y = canvas.height - 80;
  player.health = player.maxHealth;
  player.gun = "single";
  player.shield = 0;
  gameOver = false;
}

/* =================== Kickoff =================== */
initStars();
update();
"""

# Write files
with open('/mnt/data/index.html', 'w', encoding='utf-8') as f:
    f.write(index_html)

with open('/mnt/data/game.js', 'w', encoding='utf-8') as f:
    f.write(game_js)

print("Files created: /mnt/data/index.html and /mnt/data/game.js")
