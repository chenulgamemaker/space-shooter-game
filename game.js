const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let keys = {};
let bullets = [];
let enemies = [];
let score = 0;

const player = {
  x: canvas.width / 2 - 25,
  y: canvas.height - 60,
  width: 50,
  height: 50,
  speed: 5
};

document.addEventListener("keydown", (e) => keys[e.code] = true);
document.addEventListener("keyup", (e) => keys[e.code] = false);

function drawPlayer() {
  ctx.fillStyle = "cyan";
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

function movePlayer() {
  if (keys["ArrowLeft"] && player.x > 0) player.x -= player.speed;
  if (keys["ArrowRight"] && player.x < canvas.width - player.width) player.x += player.speed;
  if (keys["Space"]) shoot();
}

function shoot() {
  if (bullets.length === 0 || bullets[bullets.length - 1].y < player.y - 100) {
    bullets.push({ x: player.x + player.width/2 - 5, y: player.y, width: 10, height: 20, speed: 7 });
  }
}

function drawBullets() {
  ctx.fillStyle = "yellow";
  bullets.forEach((b, i) => {
    b.y -= b.speed;
    ctx.fillRect(b.x, b.y, b.width, b.height);
    if (b.y < 0) bullets.splice(i, 1);
  });
}

function spawnEnemy() {
  if (Math.random() < 0.02) {
    enemies.push({ x: Math.random() * (canvas.width - 40), y: -40, width: 40, height: 40, speed: 2 });
  }
}

function drawEnemies() {
  ctx.fillStyle = "red";
  enemies.forEach((e, i) => {
    e.y += e.speed;
    ctx.fillRect(e.x, e.y, e.width, e.height);
    if (e.y > canvas.height) enemies.splice(i, 1);
  });
}

function checkCollisions() {
  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      if (b.x < e.x + e.width && b.x + b.width > e.x && b.y < e.y + e.height && b.y + b.height > e.y) {
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);
        score += 10;
      }
    });
  });
}

function drawScore() {
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, 10, 30);
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  movePlayer();
  drawPlayer();
  drawBullets();
  spawnEnemy();
  drawEnemies();
  checkCollisions();
  drawScore();

  requestAnimationFrame(gameLoop);
}

gameLoop();
