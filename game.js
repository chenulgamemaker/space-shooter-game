const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let ship = { x: 375, y: 550, width: 50, height: 20, speed: 5 };
let bullets = [];
let enemies = [];
let keys = {};

function createEnemies() {
  for (let i = 0; i < 5; i++) {
    enemies.push({ x: i * 150 + 50, y: 50, width: 40, height: 20, alive: true });
  }
}

document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

function shoot() {
  bullets.push({ x: ship.x + ship.width / 2 - 2, y: ship.y, width: 4, height: 10, speed: 7 });
}

function update() {
  if (keys["ArrowLeft"] && ship.x > 0) ship.x -= ship.speed;
  if (keys["ArrowRight"] && ship.x + ship.width < canvas.width) ship.x += ship.speed;
  if (keys[" "] && bullets.length < 5) { shoot(); keys[" "] = false; }

  bullets.forEach((b, i) => {
    b.y -= b.speed;
    if (b.y < 0) bullets.splice(i, 1);
  });

  enemies.forEach(enemy => {
    bullets.forEach((b, i) => {
      if (b.x < enemy.x + enemy.width &&
          b.x + b.width > enemy.x &&
          b.y < enemy.y + enemy.height &&
          b.y + b.height > enemy.y) {
        enemy.alive = false;
        bullets.splice(i, 1);
      }
    });
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "lime";
  ctx.fillRect(ship.x, ship.y, ship.width, ship.height);

  ctx.fillStyle = "red";
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  ctx.fillStyle = "yellow";
  enemies.forEach(enemy => {
    if (enemy.alive) ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
  });
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

createEnemies();
gameLoop();
