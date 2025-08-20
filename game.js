// Space Shooter v2 — Lose condition + working gun unlock/swaps + sprites (placeholders)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// -------- Sprites --------
const sprites = {};
const spriteList = {
  player: 'sprites/playerShip.png',
  enemy: 'sprites/enemyShip.png',
  boss: 'sprites/boss.png',
  laser: 'sprites/laserRed.png',
  rocket: 'sprites/rocket.png',
  missile: 'sprites/missile.png',
  nuke: 'sprites/nuke.png',
  explosion: 'sprites/explosion.png',
  background: 'sprites/background.png'
};
for (const k in spriteList) { sprites[k] = new Image(); sprites[k].src = spriteList[k]; }

// -------- Game State --------
let gameState = 'menu'; // menu | playing | paused | gameover | win
const keys = {};
let score = 0, kills = 0, level = 1;
let player, enemies = [], pBullets = [], eBullets = [], particles = [], lastShot = 0, lastEnemySpawn = 0, boss = null;

// -------- Input --------
document.addEventListener('keydown',(e)=>{
  keys[e.code] = true;

  if (e.code === 'KeyP' && (gameState === 'playing' || gameState === 'paused')) {
    gameState = (gameState === 'playing') ? 'paused' : 'playing';
  }
  if (gameState === 'menu') {
    if (e.code === 'Enter') { restartGame(); gameState='playing'; }
  } else if (gameState === 'gameover') {
    if (e.code === 'Enter') { restartGame(); gameState='playing'; }
  } else if (gameState === 'win') {
    if (e.code === 'Enter') { gameState='menu'; }
  }
});
document.addEventListener('keyup',(e)=>{ keys[e.code] = false; });

function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
function now(){ return performance.now(); }
function rand(a,b){ return Math.random()*(b-a)+a; }
function overlap(ax,ay,aw,ah,bx,by,bw,bh){
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// -------- Stars --------
const stars = Array.from({length:120}, ()=>({x:Math.random()*canvas.width, y:Math.random()*canvas.height, s:Math.random()*2+0.5, v:Math.random()*1.5+0.5, a:Math.random()*0.8+0.2}));
function drawStars(){
  ctx.fillStyle='#000'; ctx.fillRect(0,0,canvas.width,canvas.height);
  for(const st of stars){ st.y += st.v; if(st.y>canvas.height){ st.y = -2; st.x = Math.random()*canvas.width; } ctx.globalAlpha = st.a; ctx.fillStyle='#fff'; ctx.fillRect(st.x,st.y,st.s,st.s); }
  ctx.globalAlpha = 1;
}

// -------- Player --------
function makePlayer(){
  return {
    x: canvas.width/2 - 20, y: canvas.height-80, w: 44, h: 48, speed: 6,
    health: 5, maxHealth: 5, inv: 0, gun: 'single'
  };
}

// -------- Guns & Unlocks --------
const gunDefs = [
  { name:'single',     label:'Single',        kills:0,  delay:160 },
  { name:'pistol',     label:'Laser Pistol',  kills:5,  delay:120 },
  { name:'minigun',    label:'Laser Minigun', kills:10, delay:60  },
  { name:'rocket',     label:'Laser Rocket',  kills:15, delay:420 },
  { name:'quadRocket', label:'Quad Rocket',   kills:25, delay:600 },
  { name:'missile',    label:'Missile',       kills:30, delay:260 },
  { name:'nuke',       label:'NUKE',          kills:40, delay:4000},
];

function bestUnlockedGun(){
  let g = 'single';
  for(const def of gunDefs){ if(kills >= def.kills) g = def.name; }
  return g;
}
function gunMeta(name){ return gunDefs.find(g=>g.name===name) || gunDefs[0]; }
function nextUnlockText(){
  for (const def of gunDefs){ if (kills < def.kills) return `Next: ${def.label} @ ${def.kills} Kills`; }
  return 'All guns unlocked';
}

// -------- Shooting --------
function shoot(){
  const current = bestUnlockedGun();
  player.gun = current;
  const meta = gunMeta(current);
  if (now() - lastShot < meta.delay) return;
  lastShot = now();

  const cx = player.x + player.w/2;

  switch(current){
    case 'single':
      pBullets.push({x:cx-3,y:player.y-8,w:6,h:16,vx:0,vy:-12,damage:1,type:'laser'});
      break;
    case 'pistol':
      pBullets.push({x:cx-3,y:player.y-10,w:6,h:18,vx:0,vy:-13.5,damage:1,type:'laser'});
      break;
    case 'minigun':
      pBullets.push({x:cx-2,y:player.y-6,w:4,h:12,vx:-1.6,vy:-14,damage:1,type:'laser'});
      pBullets.push({x:cx-2,y:player.y-6,w:4,h:12,vx:0,vy:-14,damage:1,type:'laser'});
      pBullets.push({x:cx-2,y:player.y-6,w:4,h:12,vx:1.6,vy:-14,damage:1,type:'laser'});
      break;
    case 'rocket':
      pBullets.push({x:cx-6,y:player.y-10,w:12,h:22,vx:0,vy:-8,damage:4,type:'rocket',trail:0});
      break;
    case 'quadRocket':
      pBullets.push({x:cx-6,y:player.y-10,w:12,h:22,vx:-2.3,vy:-7.5,damage:3,type:'rocket',trail:0});
      pBullets.push({x:cx-6,y:player.y-10,w:12,h:22,vx:-0.8,vy:-7.5,damage:3,type:'rocket',trail:0});
      pBullets.push({x:cx-6,y:player.y-10,w:12,h:22,vx:0.8,vy:-7.5,damage:3,type:'rocket',trail:0});
      pBullets.push({x:cx-6,y:player.y-10,w:12,h:22,vx:2.3,vy:-7.5,damage:3,type:'rocket',trail:0});
      break;
    case 'missile':
      pBullets.push({x:cx-6,y:player.y-10,w:12,h:20,vx:0,vy:-10,damage:2.5,type:'missile',t:0,zig:2.5});
      break;
    case 'nuke':
      detonateNuke();
      break;
  }
}

function detonateNuke(){
  // particles
  for(let i=0;i<140;i++){ particles.push({x:rand(0,canvas.width),y:rand(0,canvas.height*0.8),vx:rand(-2,2),vy:rand(-2,2),life:30,color:'white'}); }
  // wipe enemies
  for (let i=enemies.length-1; i>=0; i--){
    const e = enemies[i]; spawnExplosion(e.x+e.w/2,e.y+e.h/2);
    score += 10; kills += 1; enemies.splice(i,1);
  }
  if (boss){
    boss.hp -= 25;
    if (boss.hp <= 0){ spawnExplosion(boss.x+boss.w/2,boss.y+boss.h/2,60); boss = null; gameState='win'; }
  }
}

// -------- Enemies --------
function spawnEnemy(){
  if (boss) return;
  const t = now();
  if (t - lastEnemySpawn < 550) return;
  lastEnemySpawn = t;
  const r = Math.random();
  if (r < 0.5) enemies.push({type:'normal',x:rand(0,canvas.width-36),y:-40,w:36,h:36,vy:2+Math.random(),hp:1});
  else if (r < 0.75) enemies.push({type:'fast',x:rand(0,canvas.width-28),y:-35,w:28,h:28,vy:3.6+Math.random()*1.2,hp:1});
  else if (r < 0.9) enemies.push({type:'tanky',x:rand(0,canvas.width-48),y:-48,w:48,h:48,vy:1.6,hp:3});
  else enemies.push({type:'zigzag',x:rand(0,canvas.width-36),y:-40,w:36,h:36,vy:2.2,hp:2,vx:2.2});
}

function updateEnemies(){
  for (let i=enemies.length-1; i>=0; i--){
    const e = enemies[i];
    e.y += e.vy;
    if (e.type === 'zigzag'){ e.x += e.vx; if (e.x<=0 || e.x+e.w>=canvas.width) e.vx *= -1; }
    // random shooting
    if (Math.random() < 0.011){
      eBullets.push({x:e.x + e.w/2 - 3, y:e.y + e.h, w:6,h:14,vy:4.5});
    }
    // collide with player
    if (overlap(player.x,player.y,player.w,player.h, e.x,e.y,e.w,e.h)){
      enemies.splice(i,1);
      damagePlayer(1);
      continue;
    }
    if (e.y > canvas.height + 60) enemies.splice(i,1);
  }
}

function drawEnemies(){
  for (const e of enemies){
    ctx.drawImage(sprites.enemy, e.x, e.y, e.w, e.h);
  }
}

function maybeSpawnBoss(){
  if (!boss && score >= 300 * level){
    boss = {x:canvas.width/2-110,y:60,w:220,h:110,hp:50 + 12*level,vx:3 + level*0.4};
  }
}
function updateBoss(){
  if (!boss) return;
  boss.x += boss.vx; if (boss.x<=0 || boss.x+boss.w>=canvas.width) boss.vx *= -1;
  // barrages
  if (Math.random() < 0.05){
    const bx = boss.x + boss.w/2 - 3;
    eBullets.push({x:bx-34,y:boss.y+boss.h,w:6,h:18,vy:5.6});
    eBullets.push({x:bx,   y:boss.y+boss.h,w:6,h:18,vy:6.8});
    eBullets.push({x:bx+34,y:boss.y+boss.h,w:6,h:18,vy:5.6});
  }
}
function drawBoss(){
  if (!boss) return;
  ctx.drawImage(sprites.boss, boss.x, boss.y, boss.w, boss.h);
}

// -------- Bullets --------
function updatePlayerBullets(){
  for (let i=pBullets.length-1; i>=0; i--){
    const b = pBullets[i];
    b.x += (b.vx||0); b.y += b.vy;
    if (b.type === 'missile'){ b.t = (b.t||0) + 0.15; b.vx = Math.sin(b.t) * (b.zig||2.5); }
    if (b.type === 'rocket'){ b.trail = (b.trail||0)+1; if (b.trail%2===0) particles.push({x:b.x+b.w/2,y:b.y+b.h,vx:(Math.random()-.5),vy:Math.random()*1.5,life:12,color:'#fde68a'}); }
    // hit enemies
    let removed = false;
    for (let j=enemies.length-1; j>=0; j--){
      const e = enemies[j];
      if (overlap(b.x,b.y,b.w||6,b.h||16, e.x,e.y,e.w,e.h)){
        e.hp -= (b.damage || 1);
        if (b.type === 'rocket' || b.type === 'missile') spawnExplosion(b.x+(b.w||6)/2, b.y);
        if (e.hp <= 0){
          kills += 1; score += 10;
          spawnExplosion(e.x+e.w/2, e.y+e.h/2);
          enemies.splice(j,1);
        }
        pBullets.splice(i,1); removed = true; break;
      }
    }
    if (removed) continue;
    // hit boss
    if (boss && overlap(b.x,b.y,b.w||6,b.h||16, boss.x,boss.y,boss.w,boss.h)){
      boss.hp -= (b.damage||1);
      spawnExplosion(b.x+(b.w||6)/2, b.y);
      pBullets.splice(i,1); removed = true;
      if (boss.hp <= 0){ spawnExplosion(boss.x+boss.w/2,boss.y+boss.h/2,60); boss=null; level++; gameState='win'; }
    }
    if (!removed && (b.y < -30 || b.x < -40 || b.x > canvas.width+40)) pBullets.splice(i,1);
  }
}
function drawPlayerBullets(){
  for (const b of pBullets){
    if (b.type === 'rocket') ctx.drawImage(sprites.rocket, b.x, b.y, b.w, b.h);
    else if (b.type === 'missile') ctx.drawImage(sprites.missile, b.x, b.y, b.w, b.h);
    else ctx.drawImage(sprites.laser, b.x, b.y, b.w||6, b.h||16);
  }
}

function updateEnemyBullets(){
  for (let i=eBullets.length-1; i>=0; i--){
    const b = eBullets[i];
    b.y += b.vy;
    if (overlap(player.x,player.y,player.w,player.h, b.x,b.y,b.w,b.h)){
      eBullets.splice(i,1);
      damagePlayer(1);
      continue;
    }
    if (b.y > canvas.height+20) eBullets.splice(i,1);
  }
}
function drawEnemyBullets(){
  ctx.fillStyle = '#fb923c';
  for (const b of eBullets){ ctx.fillRect(b.x,b.y,b.w,b.h); }
}

// -------- Particles / Explosions --------
function spawnExplosion(x,y,count=20){
  for(let i=0;i<count;i++){ particles.push({x,y,vx:rand(-3,3),vy:rand(-3,3),life:18+Math.random()*18,color:'#fca5a5'}); }
}
function drawParticles(){
  for (let i=particles.length-1; i>=0; i--){
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vx *= 0.98; p.vy *= 0.98; p.life -= 1;
    ctx.globalAlpha = Math.max(p.life/36, 0); ctx.fillStyle = p.color; ctx.fillRect(p.x,p.y,3,3); ctx.globalAlpha = 1;
    if (p.life <= 0) particles.splice(i,1);
  }
}

// -------- Damage / Death --------
function damagePlayer(d){
  if (player.inv > 0) return;
  player.health -= d;
  player.inv = 40; // brief i-frames
  spawnExplosion(player.x+player.w/2, player.y+player.h/2, 28);
  if (player.health <= 0){ gameState='gameover'; }
}

// -------- UI & Screens --------
function drawUI(){
  ctx.fillStyle='#fff'; ctx.textAlign='left'; ctx.font='18px system-ui';
  ctx.fillText(`Score: ${score}`, 12, 26);
  ctx.fillText(`Kills: ${kills}`, 12, 50);
  const label = (gunDefs.find(g=>g.name===bestUnlockedGun())?.label)||'Single';
  ctx.textAlign='right';
  ctx.fillText(`Gun: ${label}`, canvas.width-12, 26);
  ctx.fillStyle='rgba(255,255,255,.85)'; ctx.fillText(nextUnlockText(), canvas.width-12, 50);
  ctx.textAlign='left';

  // Player health
  const hearts = player.maxHealth;
  for (let i=0;i<hearts;i++){
    ctx.fillStyle = i < player.health ? '#22c55e' : 'rgba(255,255,255,.2)';
    ctx.fillRect(12 + i*16, 64, 12, 12);
  }

  // Boss bar
  if (boss){
    const maxHp = 50 + 12*(level-1);
    const pct = clamp(boss.hp/maxHp, 0, 1);
    const w=260,h=12,x=canvas.width/2-w/2,y=20;
    ctx.fillStyle='#1f2937'; ctx.fillRect(x,y,w,h);
    ctx.fillStyle='#a78bfa'; ctx.fillRect(x,y,w*pct,h);
    ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.strokeRect(x,y,w,h);
  }
}

function drawMenu(){
  drawStars();
  ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#fff'; ctx.textAlign='center';
  ctx.font='bold 48px system-ui'; ctx.fillText('SPACE SHOOTER', canvas.width/2, 200);
  ctx.font='22px system-ui'; ctx.fillText('Press ENTER to Start', canvas.width/2, 300);
  ctx.fillText('Unlock guns by kills', canvas.width/2, 336);
}
function drawGameOver(){
  drawStars(); ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.font='bold 46px system-ui'; ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2-36);
  ctx.font='20px system-ui'; ctx.fillText(`Score: ${score}   •   Kills: ${kills}`, canvas.width/2, canvas.height/2);
  ctx.fillText('Press ENTER to Restart', canvas.width/2, canvas.height/2+36);
}
function drawWin(){
  drawStars(); ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.font='bold 46px system-ui'; ctx.fillText('YOU WIN!', canvas.width/2, canvas.height/2-36);
  ctx.font='20px system-ui'; ctx.fillText(`Score: ${score}   •   Kills: ${kills}`, canvas.width/2, canvas.height/2);
  ctx.fillText('Press ENTER for Menu', canvas.width/2, canvas.height/2+36);
}

// -------- Main Update --------
function update(){
  if (gameState === 'menu'){ drawMenu(); return; }
  if (gameState === 'gameover'){ drawGameOver(); return; }
  if (gameState === 'win'){ drawWin(); return; }
  if (gameState === 'paused'){ // show paused overlay over current frame
    drawFrame(); 
    ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.font='40px system-ui'; ctx.fillText('PAUSED', canvas.width/2, canvas.height/2);
    return;
  }

  // playing
  updateLogic();
  drawFrame();
}

function updateLogic(){
  // stars background moves in draw
  // movement
  if (keys['ArrowLeft']) player.x -= player.speed;
  if (keys['ArrowRight']) player.x += player.speed;
  player.x = clamp(player.x, 0, canvas.width - player.w);

  // auto shooting if holding Space
  if (keys['Space']) shoot();

  // timers
  if (player.inv > 0) player.inv--;

  spawnEnemy();
  updateEnemies();
  maybeSpawnBoss();
  updateBoss();
  updatePlayerBullets();
  updateEnemyBullets();
  // remove offscreen particles handled in draw
}

function drawFrame(){
  drawStars();
  // player
  if (player.inv > 0 && Math.floor(player.inv/4)%2===0) ctx.globalAlpha = 0.4;
  ctx.drawImage(sprites.player, player.x, player.y, player.w, player.h);
  ctx.globalAlpha = 1;

  drawPlayerBullets();
  drawEnemyBullets();
  drawEnemies();
  drawBoss();
  drawParticles();
  drawUI();
}

// -------- Reset / Start --------
function restartGame(){
  score=0; kills=0; level=1;
  enemies.length=0; pBullets.length=0; eBullets.length=0; particles.length=0;
  player = makePlayer(); boss = null; lastShot = 0; lastEnemySpawn = 0;
}

// -------- Loop --------
function loop(){ update(); requestAnimationFrame(loop); }
restartGame(); // create player for menu render
loop();
