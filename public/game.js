const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const titleEl = document.getElementById('overlay-title');
const copyEl = document.getElementById('overlay-copy');
const obstacles = [24, 38, 55, 31, 62, 44, 27, 51];
const obstacleColors = ['#b46c40', '#6e8e45', '#547fa5', '#b58a31', '#865aa6', '#c35f68'];
const playerInput = document.getElementById('player-name');
const leaderboardList = document.getElementById('leaderboard-list');
let width = 0, height = 0, pixelRatio = 1;
let scroll = 0, speed = 0, score = 0, lives = 3, passed = 0;
let started = false, gameOver = false, jumpHeight = 0, jumpVelocity = 0;
let jumpHeld = false, jumpHoldFrames = 0, nextObstacle = 0;
let playerName = localStorage.getItem('voltrider-player') || '';
playerInput.value = playerName;

function resize() {
  const rect = canvas.getBoundingClientRect();
  pixelRatio = Math.min(devicePixelRatio || 1, 2);
  width = rect.width; height = rect.height;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}
new ResizeObserver(resize).observe(canvas);
function ground(x) {
  return height * .73 + Math.sin((x + scroll * .7) / 75) * 18 + Math.sin((x + scroll * .35) / 29) * 7 + Math.sin((x + scroll * .18) / 155) * 25;
}
function updateHud() {
  scoreEl.textContent = String(score).padStart(4, '0');
  livesEl.textContent = Array.from({ length: 3 }, (_, i) => i < lives ? '♥' : '♡').join(' ');
  const record = getRecords().find(entry => entry.name.toLocaleLowerCase() === playerName.toLocaleLowerCase());
  bestEl.textContent = String(record?.score || 0).padStart(4, '0');
}
function getRecords() {
  try { return JSON.parse(localStorage.getItem('voltrider-leaderboard') || '[]'); }
  catch { return []; }
}
function saveRecord() {
  if (!playerName || score < 1) return;
  const records = getRecords();
  const existing = records.find(entry => entry.name.toLocaleLowerCase() === playerName.toLocaleLowerCase());
  if (existing) existing.score = Math.max(existing.score, score);
  else records.push({ name: playerName, score });
  records.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  localStorage.setItem('voltrider-leaderboard', JSON.stringify(records.slice(0, 10)));
  renderLeaderboard();
  updateHud();
}
function renderLeaderboard() {
  const records = getRecords();
  leaderboardList.innerHTML = records.length
    ? records.map((entry, index) => `<li><span><b>${String(index + 1).padStart(2, '0')}</b> ${escapeHtml(entry.name)}</span><strong>${entry.score}</strong></li>`).join('')
    : '<li class="empty-score">Jeszcze brak wyników — ruszaj na trasę!</li>';
}
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function startRun(newGame = false) {
  if (newGame || gameOver) lives = 3;
  gameOver = false;
  scroll = 0; speed = 3.85; score = 0; passed = 0; nextObstacle = 0;
  jumpHeight = 0; jumpVelocity = 0; jumpHoldFrames = 0;
  started = true;
  updateHud();
  overlay.classList.add('hidden');
}
function loseLife() {
  lives--;
  scroll = 0; speed = 0; score = 0; passed = 0; nextObstacle = 0;
  jumpHeight = 0; jumpVelocity = 0; jumpHeld = false;
  started = false;
  gameOver = lives <= 0;
  updateHud();
  titleEl.textContent = gameOver ? 'Koniec jazdy' : 'Uważaj na przeszkody';
  copyEl.textContent = gameOver
    ? 'Brak żyć · Kliknij „Nowa jazda”, aby zacząć od początku'
    : `Stracone życie · pozostało ${lives} · naciśnij START, aby ruszyć od początku`;
  overlay.classList.remove('hidden');
}
function jumpStart() {
  if (!started) startRun();
  if (jumpHeight === 0) {
    jumpVelocity = 7.4;
    jumpHeight = .1;
    jumpHoldFrames = 0;
  }
  jumpHeld = true;
}
function drawBike(x, y) {
  ctx.save(); ctx.translate(x, y);
  for (const wx of [-29, 29]) {
    ctx.beginPath(); ctx.arc(wx, 0, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#10120f'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#d7ff3f'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx - 12, 0); ctx.lineTo(wx + 12, 0); ctx.moveTo(wx, -12); ctx.lineTo(wx, 12);
    ctx.lineWidth = 1; ctx.strokeStyle = '#85897d'; ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-29, -3); ctx.lineTo(-9, -21); ctx.lineTo(12, -18); ctx.lineTo(29, -3);
  ctx.moveTo(-9, -21); ctx.lineTo(1, -2); ctx.lineTo(-29, -3); ctx.moveTo(12, -18); ctx.lineTo(1, -2);
  ctx.lineWidth = 4; ctx.strokeStyle = '#bfc3b1'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, -25); ctx.lineTo(12, -23); ctx.lineTo(23, -17); ctx.lineTo(8, -14); ctx.lineTo(-7, -16); ctx.closePath();
  ctx.fillStyle = '#d7ff3f'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-4, -25); ctx.lineTo(-9, -42); ctx.lineTo(3, -50); ctx.lineTo(15, -32);
  ctx.lineWidth = 3; ctx.strokeStyle = '#f1f2e9'; ctx.stroke();
  ctx.beginPath(); ctx.arc(3, -54, 7, 0, Math.PI * 2); ctx.fillStyle = '#f1f2e9'; ctx.fill();
  ctx.restore();
}
function drawObstacle(x, y, obstacleHeight, color) {
  ctx.fillStyle = color; ctx.strokeStyle = '#f1f2e9'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x - 15, y); ctx.lineTo(x - 13, y - obstacleHeight * .58);
  ctx.lineTo(x - 4, y - obstacleHeight); ctx.lineTo(x + 10, y - obstacleHeight * .82);
  ctx.lineTo(x + 16, y); ctx.closePath(); ctx.fill(); ctx.stroke();
}
function draw() {
  if (!width || !height) return;
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#18231a'); sky.addColorStop(1, '#546147');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#d7ff3f'; ctx.globalAlpha = .08; ctx.beginPath(); ctx.arc(width * .78, height * .18, 55, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  for (let i = 0; i < 13; i++) {
    const x = ((i * 117 - scroll * .2) % (width + 150) + width + 150) % (width + 150) - 40;
    const y = height * .49 + (i % 3) * 20;
    ctx.fillStyle = i % 2 ? '#202d1e' : '#26351f'; ctx.beginPath(); ctx.moveTo(x, y - 65 - (i % 4) * 12); ctx.lineTo(x - 37, y + 24); ctx.lineTo(x + 38, y + 24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#352c20'; ctx.fillRect(x - 3, y + 15, 6, 50);
  }
  ctx.beginPath(); ctx.moveTo(0, height);
  for (let x = 0; x <= width + 4; x += 4) ctx.lineTo(x, ground(x));
  ctx.lineTo(width, height); ctx.closePath();
  const dirt = ctx.createLinearGradient(0, height * .68, 0, height);
  dirt.addColorStop(0, '#727144'); dirt.addColorStop(1, '#302d20'); ctx.fillStyle = dirt; ctx.fill();
  ctx.beginPath(); for (let x = 0; x <= width + 4; x += 4) x === 0 ? ctx.moveTo(x, ground(x)) : ctx.lineTo(x, ground(x));
  ctx.strokeStyle = '#d7ff3f'; ctx.lineWidth = 3; ctx.stroke();

  const bikeX = width * .32;
  if (started) {
    speed = Math.min(speed + .015, 11);
    scroll += speed;
    score = passed;
    if (jumpHeld && jumpHoldFrames < 24 && jumpHeight > 0) { jumpVelocity += .17; jumpHoldFrames++; }
    if (jumpHeight > 0) {
      jumpVelocity -= .34;
      jumpHeight += jumpVelocity;
      if (jumpHeight <= 0) { jumpHeight = 0; jumpVelocity = 0; jumpHeld = false; }
    }
  }
  const nextWorldX = 700 + nextObstacle * 580;
  const obstacleHeight = obstacles[nextObstacle % obstacles.length];
  const obstacleColor = obstacleColors[nextObstacle % obstacleColors.length];
  const obstacleX = nextWorldX - scroll;
  if (obstacleX > -35 && obstacleX < width + 35) drawObstacle(obstacleX, ground(obstacleX), obstacleHeight, obstacleColor);
  if (started && obstacleX < bikeX + 27 && obstacleX > bikeX - 27) {
    if (jumpHeight < obstacleHeight + 27) loseLife();
    else { nextObstacle++; passed++; score = passed; if (passed % 20 === 0) speed = Math.min(speed + 1.1, 11); updateHud(); saveRecord(); }
  }
  drawBike(bikeX, ground(bikeX) - 13 - jumpHeight);
  requestAnimationFrame(draw);
}

window.addEventListener('keydown', event => {
  if (event.code === 'Space') { event.preventDefault(); if (!event.repeat) jumpStart(); }
});
window.addEventListener('keyup', event => { if (event.code === 'Space') jumpHeld = false; });
document.getElementById('jump-button').addEventListener('pointerdown', event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); jumpStart(); });
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) document.getElementById('jump-button').addEventListener(name, () => { jumpHeld = false; });
document.getElementById('restart').addEventListener('click', () => startRun(true));
document.getElementById('start-game').addEventListener('click', startRun);
document.getElementById('player-form').addEventListener('submit', event => {
  event.preventDefault();
  playerName = playerInput.value.trim().slice(0, 18);
  if (!playerName) return;
  playerInput.value = playerName;
  localStorage.setItem('voltrider-player', playerName);
  saveRecord();
  renderLeaderboard();
  updateHud();
});
window.addEventListener('blur', () => { jumpHeld = false; });
renderLeaderboard(); resize(); updateHud(); requestAnimationFrame(draw);
