 const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let keys = {};
let bullets = [];
let enemyBullets = [];
let enemies = [];
let powerUps = [];
let score = 0;
let level = 1;
let gameOver = false;
let boss = null;

const player = {
  x: canvas.width / 2 - 25,
  y: canvas.height - 60,
  width: 50,
  height: 50,
  speed: 5,
  health: 5,
  gun: "single",
  shield: 0 // frames of invincibility
};

document.addEventListener("keydown", (e) => keys[e.code] = true);
document.addEventListener("keyup", (e) => keys[e.code] = false);

// === PLAYER ===
function drawPlayer() {
  ctx.fillStyle = player.shield > 0 ? "lightblue" : "cyan";
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

function movePlayer() {
  if (keys["ArrowLeft"] && player.x > 0) player.x -= player.speed;
  if (keys["ArrowRight"] && player.x < canvas.width - player.width) player.x += player.speed;
  if (keys["Space"]) shoot();
  if (keys["Digit1"]) player.gun = "single";
  if (keys["Digit2"]) player.gun = "double";
  if (keys["Digit3"]) player.gun = "spread";
}

function shoot() {
  if (bullets.length === 0 || bullets[bullets.length - 1].y < player.y - 100) {
    if (player.gun === "single") {
      bullets.push({ x: player.x + player.width/2 - 5, y: player.y, width: 10, height: 20, speed: 7 });
    } else if (player.gun === "double") {
      bullets.push({ x: player.x + 5, y: player.y, width: 10, height: 20, speed: 7 });
      bullets.push({ x: player.x + player.width - 15, y: player.y, width: 10, height: 20, speed: 7 });
    } else if (player.gun === "spread") {
      bullets.push({ x: player.x + player.width/2 - 5, y: player.y, width: 10, height: 20, speed: 7, dx: -2 });
      bullets.push({ x: player.x + player.width/2 - 5, y: player.y, width: 10, height: 20, speed: 7, dx: 0 });
      bullets.push({ x: player.x + player.width/2 - 5, y: player.y, width: 10, height: 20, speed: 7, dx: 2 });
    }
  }
}

// === BULLETS ===
function drawBullets() {
  ctx.fillStyle = "yellow";
  bullets.forEach((b, i) => {
    b.y -= b.speed;
    if (b.dx) b.x += b.dx;
    ctx.fillRect(b.x, b.y, b.width, b.height);
    if (b.y < 0) bullets.splice(i, 1);
  });
}

function drawEnemyBullets() {
  ctx.fillStyle = "orange";
  enemyBullets.forEach((b, i) => {
    b.y += b.speed;
    ctx.fillRect(b.x, b.y, b.width, b.height);
    if (b.y > canvas.height) enemyBullets.splice(i, 1);
  });
}

// === ENEMIES ===
function spawnEnemy() {
  if (boss) return;
  if (Math.random() < 0.02) {
    const type = Math.random();
    if (type < 0.5) { // normal
      enemies.push({ type: "normal", x: Math.random() * (canvas.width - 40), y: -40, width: 40, height: 40, speed: 2, health: 1 });
    } else if (type < 0.7) { // fast
      enemies.push({ type: "fast", x: Math.random() * (canvas.width - 30), y: -30, width: 30, height: 30, speed: 4, health: 1 });
    } else if (type < 0.9) { // tanky
      enemies.push({ type: "tanky", x: Math.random() * (canvas.width - 50), y: -50, width: 50, height: 50, speed: 1.5, health: 3 });
    } else { // zigzag
      enemies.push({ type: "zigzag", x: Math.random() * (canvas.width - 40), y: -40, width: 40, height: 40, speed: 2, health: 2, dx: 2 });
    }
  }
}

function drawEnemies() {
  ctx.fillStyle = "red";
  enemies.forEach((e, i) => {
    e.y += e.speed;
    if (e.type === "zigzag") {
      e.x += e.dx;
      if (e.x <= 0 || e.x + e.width >= canvas.width) e.dx *= -1;
    }
    ctx.fillRect(e.x, e.y, e.width, e.height);

    if (Math.random() < 0.005) {
      enemyBullets.push({ x: e.x + e.width/2 - 5, y: e.y + e.height, width: 10, height: 20, speed: 4 });
    }

    if (e.y > canvas.height) enemies.splice(i, 1);
  });
}

// === POWER UPS ===
function dropPowerUp(x, y) {
  const rand = Math.random();
  if (rand < 0.2) { // 20% chance
    let type;
    if (rand < 0.07) type = "health";
    else if (rand < 0.14) type = "gun";
    else type = "shield";
    powerUps.push({ type, x, y, size: 20, speed: 2 });
  }
}

function drawPowerUps() {
  powerUps.forEach((p, i) => {
    p.y += p.speed;
    if (p.type === "health") ctx.fillStyle = "green";
    if (p.type === "gun") ctx.fillStyle = "blue";
    if (p.type === "shield") ctx.fillStyle = "lightblue";
    ctx.fillRect(p.x, p.y, p.size, p.size);

    if (p.y > canvas.height) powerUps.splice(i, 1);

    // collision with player
    if (p.x < player.x + player.width && p.x + p.size > player.x && p.y < player.y + player.height && p.y + p.size > player.y) {
      if (p.type === "health") player.health++;
      if (p.type === "gun") {
        const guns = ["single", "double", "spread"];
        player.gun = guns[Math.floor(Math.random() * guns.length)];
      }
      if (p.type === "shield") player.shield = 300; // ~5 sec
      powerUps.splice(i, 1);
    }
  });
}

// === BOSS ===
function spawnBoss() {
  if (!boss && score >= 200) {
    boss = { x: canvas.width/2 - 100, y: 50, width: 200, height: 100, health: 30, dx: 3 };
  }
}

function drawBoss() {
  if (!boss) return;
  ctx.fillStyle = "purple";
  ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
  boss.x += boss.dx;
  if (boss.x <= 0 || boss.x + boss.width >= canvas.width) boss.dx *= -1;

  if (Math.random() < 0.05) {
    enemyBullets.push({ x: boss.x + boss.width/2 - 5, y: boss.y + boss.height, width: 15, height: 30, speed: 5 });
  }
}

// === COLLISIONS ===
function checkCollisions() {
  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      if (b.x < e.x + e.width && b.x + b.width > e.x && b.y < e.y + e.height && b.y + b.height > e.y) {
        bullets.splice(bi, 1);
        e.health -= 1;
        if (e.health <= 0) {
          dropPowerUp(e.x, e.y);
          enemies.splice(ei, 1);
          score += 10;
        }
      }
    });

    if (boss && b.x < boss.x + boss.width && b.x + b.width > boss.x && b.y < boss.y + boss.height && b.y + b.height > boss.y) {
      bullets.splice(bi, 1);
      boss.health -= 1;
      if (boss.health <= 0) {
        score += 100;
        dropPowerUp(boss.x + boss.width/2, boss.y + boss.height/2);
        boss = null;
        level++;
      }
    }
  });

  enemyBullets.forEach((b, bi) => {
    if (b.x < player.x + player.width && b.x + b.width > player.x && b.y < player.y + player.height && b.y + b.height > player.y) {
      enemyBullets.splice(bi, 1);
      if (player.shield <= 0) {
        player.health -= 1;
        if (player.health <= 0) gameOver = true;
      }
    }
  });
}

// === UI ===
function drawUI() {
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, 10, 30);
  ctx.fillText("Lives: " + player.health, 10, 60);
  ctx.fillText("Gun: " + player.gun, 10, 90);
  if (boss) {
    ctx.fillText("Boss HP: " + boss.health, canvas.width/2 - 50, 30);
  }
}

function drawGameOver() {
  ctx.fillStyle = "red";
  ctx.font = "40px Arial";
  ctx.fillText("GAME OVER", canvas.width/2 - 100, canvas.height/2);
}

// === MAIN LOOP ===
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameOver) {
    drawGameOver();
    return;
  }

  movePlayer();
  drawPlayer();
  drawBullets();
  drawEnemyBullets();
  spawnEnemy();
  drawEnemies();
  spawnBoss();
  drawBoss();
  drawPowerUps();
  checkCollisions();
  drawUI();

  if (player.shield > 0) player.shield--;

  requestAnimationFrame(gameLoop);
}

gameLoop();


