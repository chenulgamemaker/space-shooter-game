 const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let keys = {};
let bullets = [];
let enemies = [];
let rockets = [];
let killCount = 0;
let currentWeapon = 1;
let weaponsUnlocked = [true, false, false, false, false, false];
let boss = null;
let bossHealth = 200;
let shootCooldown = 0;

const player = { x: 400, y: 550, w: 40, h: 40, speed: 5 };

document.addEventListener("keydown", e => {
  keys[e.code] = true;
  if (e.code.startsWith("Digit")) {
    let num = parseInt(e.code.slice(5));
    if (weaponsUnlocked[num - 1]) currentWeapon = num;
  }
});
document.addEventListener("keyup", e => keys[e.code] = false);

function spawnEnemy() {
  enemies.push({ x: Math.random() * (canvas.width - 30), y: -30, w: 30, h: 30, speed: 2 });
}

function shoot() {
  if (shootCooldown > 0) return;
  switch (currentWeapon) {
    case 1: // Basic gun
      bullets.push({ x: player.x + player.w/2 - 3, y: player.y, w: 6, h: 15, speed: 7 });
      shootCooldown = 60;
      break;
    case 2: // Laser minigun
      bullets.push({ x: player.x + player.w/2 - 2, y: player.y, w: 4, h: 20, speed: 10 });
      shootCooldown = 10;
      break;
    case 3: // Laser beam
      bullets.push({ x: player.x + player.w/2 - 2, y: player.y, w: 4, h: 30, speed: 12 });
      shootCooldown = 5;
      break;
    case 4: // Rockets
      rockets.push({ x: player.x + player.w/2 - 5, y: player.y, w: 10, h: 20, speed: 8 });
      shootCooldown = 30;
      break;
    case 5: // Quad minigun
      bullets.push({ x: player.x + 5, y: player.y, w: 4, h: 15, speed: 12 });
      bullets.push({ x: player.x + player.w - 9, y: player.y, w: 4, h: 15, speed: 12 });
      bullets.push({ x: player.x + 10, y: player.y, w: 4, h: 15, speed: 12 });
      bullets.push({ x: player.x + player.w - 14, y: player.y, w: 4, h: 15, speed: 12 });
      shootCooldown = 8;
      break;
    case 6: // Quad rockets
      rockets.push({ x: player.x + 5, y: player.y, w: 8, h: 20, speed: 8 });
      rockets.push({ x: player.x + player.w - 13, y: player.y, w: 8, h: 20, speed: 8 });
      rockets.push({ x: player.x + 10, y: player.y, w: 8, h: 20, speed: 8 });
      rockets.push({ x: player.x + player.w - 18, y: player.y, w: 8, h: 20, speed: 8 });
      shootCooldown = 15;
      break;
  }
}

function update() {
  // Player movement
  if (keys["ArrowLeft"] && player.x > 0) player.x -= player.speed;
  if (keys["ArrowRight"] && player.x + player.w < canvas.width) player.x += player.speed;
  if (keys["Space"]) shoot();

  // Cooldown
  if (shootCooldown > 0) shootCooldown--;

  // Update bullets
  bullets.forEach(b => b.y -= b.speed);
  rockets.forEach(r => r.y -= r.speed);

  // Remove offscreen
  bullets = bullets.filter(b => b.y + b.h > 0);
  rockets = rockets.filter(r => r.y + r.h > 0);

  // Spawn enemies until boss
  if (!boss && Math.random() < 0.02) spawnEnemy();

  // Move enemies
  enemies.forEach(e => e.y += e.speed);

  // Collisions
  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
        enemies.splice(ei, 1);
        bullets.splice(bi, 1);
        killCount++;
        checkUnlocks();
      }
    });
    if (boss && b.x < boss.x + boss.w && b.x + b.w > boss.x && b.y < boss.y + boss.h && b.y + b.h > boss.y) {
      bossHealth -= 1;
      bullets.splice(bi, 1);
    }
  });

  rockets.forEach((r, ri) => {
    enemies.forEach((e, ei) => {
      if (r.x < e.x + e.w && r.x + r.w > e.x && r.y < e.y + e.h && r.y + r.h > e.y) {
        enemies.splice(ei, 1);
        rockets.splice(ri, 1);
        killCount++;
        checkUnlocks();
      }
    });
    if (boss && r.x < boss.x + boss.w && r.x + r.w > boss.x && r.y < boss.y + boss.h && r.y + r.h > boss.y) {
      bossHealth -= 5;
      rockets.splice(ri, 1);
    }
  });

  // Remove enemies off screen
  enemies = enemies.filter(e => e.y < canvas.height);

  // Boss spawn
  if (!boss && killCount >= 50) {
    boss = { x: 200, y: 50, w: 400, h: 100 };
  }

  // Boss defeat
  if (boss && bossHealth <= 0) {
    boss = null;
    alert("You Win!");
    resetGame();
  }
}

function checkUnlocks() {
  if (killCount >= 5) weaponsUnlocked[1] = true;
  if (killCount >= 10) weaponsUnlocked[2] = true;
  if (killCount >= 15) weaponsUnlocked[3] = true;
  if (killCount >= 20) weaponsUnlocked[4] = true;
  if (killCount >= 40) weaponsUnlocked[5] = true;
}

function resetGame() {
  bullets = [];
  rockets = [];
  enemies = [];
  killCount = 0;
  weaponsUnlocked = [true, false, false, false, false, false];
  currentWeapon = 1;
  bossHealth = 200;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Player
  ctx.fillStyle = "cyan";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // Bullets
  ctx.fillStyle = "yellow";
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));

  // Rockets
  ctx.fillStyle = "red";
  rockets.forEach(r => ctx.fillRect(r.x, r.y, r.w, r.h));

  // Enemies
  ctx.fillStyle = "lime";
  enemies.forEach(e => ctx.fillRect(e.x, e.y, e.w, e.h));

  // Boss
  if (boss) {
    ctx.fillStyle = "purple";
    ctx.fillRect(boss.x, boss.y, boss.w, boss.h);

    // Health bar
    ctx.fillStyle = "white";
    ctx.fillRect(200, 30, 400, 10);
    ctx.fillStyle = "red";
    ctx.fillRect(200, 30, (bossHealth / 200) * 400, 10);
  }

  // HUD
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Kills: " + killCount, 10, 20);
  ctx.fillText("Weapon: " + currentWeapon, 10, 50);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
function drawPlayerShip(x, y) {
  // Main body
  ctx.fillStyle = "cyan";
  ctx.fillRect(x + 15, y, 10, 40);

  // Wings
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.moveTo(x, y + 40);
  ctx.lineTo(x + 20, y + 20);
  ctx.lineTo(x, y + 20);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x + 40, y + 40);
  ctx.lineTo(x + 20, y + 20);
  ctx.lineTo(x + 40, y + 20);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = "orange";
  ctx.fillRect(x + 17, y + 5, 6, 10);
}

function drawEnemyShip(x, y) {
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.moveTo(x + 15, y);
  ctx.lineTo(x, y + 30);
  ctx.lineTo(x + 30, y + 30);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "yellow";
  ctx.fillRect(x + 13, y + 10, 4, 8);
}

function drawBossShip(boss) {
  // Main body
  ctx.fillStyle = "gray";
  ctx.fillRect(boss.x, boss.y, boss.w, boss.h);

  // Turrets
  ctx.fillStyle = "darkred";
  ctx.fillRect(boss.x + 50, boss.y - 10, 10, 20);
  ctx.fillRect(boss.x + boss.w - 60, boss.y - 10, 10, 20);

  // Command tower
  ctx.fillStyle = "lightgray";
  ctx.fillRect(boss.x + boss.w/2 - 15, boss.y - 20, 30, 20);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Player
  drawPlayerShip(player.x, player.y);

  // Bullets
  ctx.fillStyle = "yellow";
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));

  // Rockets
  ctx.fillStyle = "red";
  rockets.forEach(r => ctx.fillRect(r.x, r.y, r.w, r.h));

  // Enemies
  enemies.forEach(e => drawEnemyShip(e.x, e.y));

  // Boss
  if (boss) {
    drawBossShip(boss);
    // Health bar
    ctx.fillStyle = "white";
    ctx.fillRect(200, 30, 400, 10);
    ctx.fillStyle = "red";
    ctx.fillRect(200, 30, (bossHealth / 200) * 400, 10);
  }

  // HUD
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Kills: " + killCount, 10, 20);
  ctx.fillText("Weapon: " + currentWeapon, 10, 50);
}

