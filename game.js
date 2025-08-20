// Canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Load sprites
const sprites = {};
const spriteList = {
  player: "sprites/playerShip.png",
  enemy: "sprites/enemyShip.png",
  bullet: "sprites/laserRed.png",
  rocket: "sprites/rocket.png",
  nuke: "sprites/nuke.png",
  explosion: "sprites/explosion.png"
};
for (let key in spriteList) {
  sprites[key] = new Image();
  sprites[key].src = spriteList[key];
}

// Input
let keys = {};
document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);

// Player
const player = {
  x: canvas.width / 2 - 25,
  y: canvas.height - 80,
  w: 50,
  h: 50,
  speed: 5,
  bullets: [],
  currentGun: "single",
  hp: 3
};

// Game state
let enemies = [];
let explosions = [];
let score = 0;
let kills = 0;
let gameOver = false;

// Spawn enemies
function spawnEnemy() {
  if (gameOver) return;
  enemies.push({ x: Math.random() * 750, y: -50, w: 40, h: 40, hp: 1 });
}
setInterval(spawnEnemy, 2000);

// Shoot
function shoot() {
  if (gameOver) return;
  if (player.currentGun === "single") {
    player.bullets.push({ x: player.x + 20, y: player.y, w: 10, h: 20, type: "bullet" });
  } else if (player.currentGun === "rocket") {
    player.bullets.push({ x: player.x + 15, y: player.y, w: 20, h: 40, type: "rocket" });
  } else if (player.currentGun === "quad") {
    player.bullets.push({ x: player.x + 5, y: player.y, w: 20, h: 40, type: "rocket", dx: -2 });
    player.bullets.push({ x: player.x + 25, y: player.y, w: 20, h: 40, type: "rocket", dx: 2 });
    player.bullets.push({ x: player.x, y: player.y - 10, w: 20, h: 40, type: "rocket", dx: -1 });
    player.bullets.push({ x: player.x + 30, y: player.y - 10, w: 20, h: 40, type: "rocket", dx: 1 });
  } else if (player.currentGun === "nuke") {
    // giant explosion clears screen
    explosions.push({ x: canvas.width / 2, y: canvas.height / 2, r: 50, maxR: 400, life: 30, type: "nuke" });
    enemies = [];
  }
}
let canShoot = true;
document.addEventListener("keydown", e => {
  if (e.code === "Space" && canShoot) {
    shoot();
    canShoot = false;
    setTimeout(() => canShoot = true, 300);
  }
});

// Unlock guns
function checkGunUnlock() {
  if (kills >= 5) player.currentGun = "pistol";
  if (kills >= 10) player.currentGun = "minigun";
  if (kills >= 15) player.currentGun = "rocket";
  if (kills >= 25) player.currentGun = "quad";
  if (kills >= 40) player.currentGun = "nuke";
}

// Update
function update() {
  if (gameOver) return;

  // Player movement
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;
  if (player.x < 0) player.x = 0;
  if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;

  // Move bullets
  for (let b of player.bullets) {
    b.y -= 10;
    if (b.dx) b.x += b.dx; // sideways drift for quad rockets
  }
  player.bullets = player.bullets.filter(b => b.y > -20);

  // Move enemies
  for (let e of enemies) {
    e.y += 2;
    // check collision with player
    if (e.x < player.x + player.w && e.x + e.w > player.x && e.y < player.y + player.h && e.y + e.h > player.y) {
      gameOver = true;
    }
  }

  // Bullet-Enemy collision
  for (let b of player.bullets) {
    for (let e of enemies) {
      if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
        if (b.type === "rocket") {
          // Explosion on impact
          explosions.push({ x: b.x, y: b.y, r: 20, maxR: 60, life: 20, type: "explosion" });
          // Damage all enemies in radius
          for (let other of enemies) {
            let dx = other.x - b.x;
            let dy = other.y - b.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 60) {
              other.hp--;
              if (other.hp <= 0) {
                other.dead = true;
                score += 100;
                kills++;
                checkGunUnlock();
              }
            }
          }
        } else {
          e.hp--;
          if (e.hp <= 0) {
            e.dead = true;
            score += 100;
            kills++;
            checkGunUnlock();
          }
        }
        b.y = -100; // remove bullet
      }
    }
  }
  enemies = enemies.filter(e => !e.dead && e.y < canvas.height + 50);

  // Update explosions
  for (let ex of explosions) {
    ex.r += 5;
    ex.life--;
  }
  explosions = explosions.filter(ex => ex.life > 0);
}

// Draw
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sprites.player, player.x, player.y, player.w, player.h);

  // Bullets
  for (let b of player.bullets) {
    let sprite = b.type === "rocket" ? sprites.rocket : sprites.bullet;
    ctx.drawImage(sprite, b.x, b.y, b.w, b.h);
  }

  // Enemies
  for (let e of enemies) {
    ctx.drawImage(sprites.enemy, e.x, e.y, e.w, e.h);
  }

  // Explosions
  for (let ex of explosions) {
    ctx.globalAlpha = ex.life / 20;
    ctx.drawImage(sprites.explosion, ex.x - ex.r / 2, ex.y - ex.r / 2, ex.r, ex.r);
    ctx.globalAlpha = 1.0;
  }

  // UI
  ctx.fillStyle = "white";
  ctx.fillText("Score: " + score, 10, 20);
  ctx.fillText("Kills: " + kills, 10, 40);
  ctx.fillText("Gun: " + player.currentGun, 10, 60);

  if (gameOver) {
    ctx.fillStyle = "red";
    ctx.font = "40px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2 - 120, canvas.height / 2);
    ctx.font = "20px Arial";
    ctx.fillText("Press Enter to Restart", canvas.width / 2 - 100, canvas.height / 2 + 40);
  }
}

// Restart
document.addEventListener("keydown", e => {
  if (e.code === "Enter" && gameOver) {
    enemies = [];
    explosions = [];
    player.hp = 3;
    player.x = canvas.width / 2 - 25;
    player.y = canvas.height - 80;
    score = 0;
    kills = 0;
    player.currentGun = "single";
    gameOver = false;
  }
});

// Game Loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
gameLoop();
