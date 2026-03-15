const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreAEl = document.getElementById("scoreA");
const scoreBEl = document.getElementById("scoreB");
const timerEl = document.getElementById("timer");
const matchStatusEl = document.getElementById("matchStatus");

const teamALogoHud = document.getElementById("teamALogoHud");
const teamBLogoHud = document.getElementById("teamBLogoHud");

const startOverlay = document.getElementById("startOverlay");
const winnerOverlay = document.getElementById("winnerOverlay");
const winnerText = document.getElementById("winnerText");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const W = canvas.width;
const H = canvas.height;

const WIN_SCORE = 3;
const FRICTION = 0.996;
const WALL_BOUNCE = 0.96;
const DISC_RADIUS = 24;
const PLAYER_MAX_SPEED = 8.6;
const BOT_MAX_SPEED = 3.8;

const config = {
  teamA: {
    name: "Team 1",
    logo: "assets/team1.png"
  },
  teamB: {
    name: "Team 2",
    logo: "assets/team2.png"
  }
};

const teamALogoImg = new Image();
const teamBLogoImg = new Image();

function loadLogos() {
  teamALogoImg.src = config.teamA.logo;
  teamBLogoImg.src = config.teamB.logo;
  teamALogoHud.src = config.teamA.logo;
  teamBLogoHud.src = config.teamB.logo;
}
loadLogos();

let scoreA = 0;
let scoreB = 0;
let displayedMinute = 1;
let tickCount = 0;
let gameRunning = false;
let gameFinished = false;

let dragging = false;
let dragStart = null;
let dragCurrent = null;

const arena = {
  x: W / 2,
  y: H / 2 + 85,
  r: 170
};

const player = {
  x: 0,
  y: 0,
  r: DISC_RADIUS,
  vx: 0,
  vy: 0
};

const opponent = {
  x: 0,
  y: 0,
  r: DISC_RADIUS,
  vx: 0,
  vy: 0
};

let goalAngle = -0.72;
const goalSpinSpeed = 0.01;

function setHud() {
  scoreAEl.textContent = scoreA;
  scoreBEl.textContent = scoreB;

  if (gameFinished) {
    timerEl.textContent = "FT";
  } else if (gameRunning) {
    timerEl.textContent = `${displayedMinute}'`;
  } else {
    timerEl.textContent = "1'";
  }

  matchStatusEl.textContent = `BO5 • First to ${WIN_SCORE}`;
}

function resetPositions() {
  player.x = arena.x - 52;
  player.y = arena.y + 58;
  player.vx = 0;
  player.vy = 0;

  opponent.x = arena.x + 52;
  opponent.y = arena.y - 58;
  opponent.vx = 0;
  opponent.vy = 0;
}

function resetMatch() {
  scoreA = 0;
  scoreB = 0;
  displayedMinute = 1;
  tickCount = 0;
  dragging = false;
  dragStart = null;
  dragCurrent = null;
  gameFinished = false;
  goalAngle = -0.72;
  resetPositions();
  setHud();
}

function getGoal() {
  const openingWidth = 72;
  const depth = 26;

  const nx = Math.cos(goalAngle);
  const ny = Math.sin(goalAngle);

  const tx = -ny;
  const ty = nx;

  const cx = arena.x + nx * arena.r;
  const cy = arena.y + ny * arena.r;

  return {
    cx,
    cy,
    nx,
    ny,
    tx,
    ty,
    openingWidth,
    depth
  };
}

function drawGlowCircle(x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.shadowBlur = 24;
  ctx.shadowColor = color;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawGoal() {
  const goal = getGoal();
  const half = goal.openingWidth / 2;

  const leftX = goal.cx - goal.tx * half;
  const leftY = goal.cy - goal.ty * half;

  const rightX = goal.cx + goal.tx * half;
  const rightY = goal.cy + goal.ty * half;

  const backLeftX = leftX + goal.nx * goal.depth;
  const backLeftY = leftY + goal.ny * goal.depth;

  const backRightX = rightX + goal.nx * goal.depth;
  const backRightY = rightY + goal.ny * goal.depth;

  ctx.beginPath();
  ctx.moveTo(leftX, leftY);
  ctx.lineTo(backLeftX, backLeftY);
  ctx.lineTo(backRightX, backRightY);
  ctx.lineTo(rightX, rightY);

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.shadowBlur = 16;
  ctx.shadowColor = "#ffffff";
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawArena() {
  drawGlowCircle(arena.x, arena.y, arena.r, "#79f7ff");
  drawGoal();
}

function drawDisc(obj, img) {
  ctx.save();

  ctx.beginPath();
  ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = "#0b0f12";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.clip();

  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, obj.x - obj.r, obj.y - obj.r, obj.r * 2, obj.r * 2);
  }

  ctx.restore();

  ctx.beginPath();
  ctx.arc(obj.x, obj.y, obj.r + 2, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.82)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawAimLine() {
  if (!dragging || !dragCurrent || !gameRunning || gameFinished) return;

  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(dragCurrent.x, dragCurrent.y);
  ctx.strokeStyle = "rgba(255, 90, 90, 0.85)";
  ctx.lineWidth = 4;
  ctx.shadowBlur = 12;
  ctx.shadowColor = "rgba(255, 90, 90, 0.85)";
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function limitSpeed(obj, maxSpeed) {
  const speed = Math.hypot(obj.vx, obj.vy);
  if (speed > maxSpeed) {
    obj.vx = (obj.vx / speed) * maxSpeed;
    obj.vy = (obj.vy / speed) * maxSpeed;
  }
}

function bounceOffArena(obj) {
  const dx = obj.x - arena.x;
  const dy = obj.y - arena.y;
  const dist = Math.hypot(dx, dy);
  const maxDist = arena.r - obj.r;

  if (dist <= maxDist || dist === 0) return;

  const nx = dx / dist;
  const ny = dy / dist;

  obj.x = arena.x + nx * maxDist;
  obj.y = arena.y + ny * maxDist;

  const vn = obj.vx * nx + obj.vy * ny;
  if (vn > 0) {
    obj.vx = obj.vx - (1 + WALL_BOUNCE) * vn * nx;
    obj.vy = obj.vy - (1 + WALL_BOUNCE) * vn * ny;
  }

  obj.vx *= 0.995;
  obj.vy *= 0.995;
}

function updatePhysics(obj) {
  obj.x += obj.vx;
  obj.y += obj.vy;

  obj.vx *= FRICTION;
  obj.vy *= FRICTION;

  if (Math.abs(obj.vx) < 0.01) obj.vx = 0;
  if (Math.abs(obj.vy) < 0.01) obj.vy = 0;

  bounceOffArena(obj);
}

function resolveCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const minDist = a.r + b.r;

  if (dist === 0 || dist >= minDist) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;

  a.x -= nx * overlap * 0.5;
  a.y -= ny * overlap * 0.5;
  b.x += nx * overlap * 0.5;
  b.y += ny * overlap * 0.5;

  const tx = -ny;
  const ty = nx;

  const aTan = a.vx * tx + a.vy * ty;
  const bTan = b.vx * tx + b.vy * ty;

  const aNorm = a.vx * nx + a.vy * ny;
  const bNorm = b.vx * nx + b.vy * ny;

  const newANorm = bNorm * 0.98;
  const newBNorm = aNorm * 0.98;

  a.vx = tx * aTan + nx * newANorm;
  a.vy = ty * aTan + ny * newANorm;
  b.vx = tx * bTan + nx * newBNorm;
  b.vy = ty * bTan + ny * newBNorm;

  limitSpeed(a, PLAYER_MAX_SPEED);
  limitSpeed(b, BOT_MAX_SPEED + 2.5);
}

function updateOpponentAI() {
  if (!gameRunning || gameFinished) return;

  const goal = getGoal();
  const defendX = goal.cx - goal.nx * 95;
  const defendY = goal.cy - goal.ny * 95;

  let targetX = defendX;
  let targetY = defendY;

  const playerNearGoal =
    Math.hypot(player.x - goal.cx, player.y - goal.cy) < 125;

  if (playerNearGoal) {
    targetX = player.x;
    targetY = player.y;
  }

  const dx = targetX - opponent.x;
  const dy = targetY - opponent.y;
  const dist = Math.hypot(dx, dy) || 1;

  opponent.vx += (dx / dist) * 0.05;
  opponent.vy += (dy / dist) * 0.05;

  limitSpeed(opponent, BOT_MAX_SPEED);
}

function discEnteredGoal(disc) {
  const goal = getGoal();
  const dx = disc.x - goal.cx;
  const dy = disc.y - goal.cy;

  const localT = dx * goal.tx + dy * goal.ty;
  const localN = dx * goal.nx + dy * goal.ny;

  const insideWidth = Math.abs(localT) <= goal.openingWidth / 2 - disc.r * 0.15;
  const insideDepth = localN >= -disc.r * 0.15 && localN <= goal.depth + disc.r * 0.75;

  return insideWidth && insideDepth;
}

function checkGoalScored() {
  if (discEnteredGoal(player)) {
    scoreA += 1;
    setHud();

    if (scoreA >= WIN_SCORE) {
      endMatch(config.teamA.name);
    } else {
      resetPositions();
    }
    return;
  }

  if (discEnteredGoal(opponent)) {
    scoreB += 1;
    setHud();

    if (scoreB >= WIN_SCORE) {
      endMatch(config.teamB.name);
    } else {
      resetPositions();
    }
  }
}

function endMatch(winnerName) {
  gameRunning = false;
  gameFinished = true;
  setHud();
  winnerText.textContent = `${winnerName} kazandı`;
  winnerOverlay.classList.remove("hidden");
}

function getPointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height)
  };
}

function pointerDown(e) {
  if (!gameRunning || gameFinished) return;

  const p = getPointerPos(e);
  const dx = p.x - player.x;
  const dy = p.y - player.y;
  const dist = Math.hypot(dx, dy);

  if (dist <= player.r + 18) {
    dragging = true;
    dragStart = p;
    dragCurrent = p;
  }
}

function pointerMove(e) {
  if (!dragging || !gameRunning || gameFinished) return;
  dragCurrent = getPointerPos(e);
}

function pointerUp() {
  if (!dragging || !dragStart || !dragCurrent || !gameRunning || gameFinished) {
    dragging = false;
    dragStart = null;
    dragCurrent = null;
    return;
  }

  const powerX = (dragStart.x - dragCurrent.x) * 0.09;
  const powerY = (dragStart.y - dragCurrent.y) * 0.09;

  player.vx += powerX;
  player.vy += powerY;

  limitSpeed(player, PLAYER_MAX_SPEED);

  dragging = false;
  dragStart = null;
  dragCurrent = null;
}

canvas.addEventListener("mousedown", pointerDown);
canvas.addEventListener("mousemove", pointerMove);
canvas.addEventListener("mouseup", pointerUp);
canvas.addEventListener("mouseleave", pointerUp);

canvas.addEventListener("touchstart", pointerDown);
canvas.addEventListener(
  "touchmove",
  (e) => {
    pointerMove(e);
    e.preventDefault();
  },
  { passive: false }
);
canvas.addEventListener("touchend", pointerUp);

startBtn.addEventListener("click", () => {
  resetMatch();
  gameRunning = true;
  startOverlay.classList.add("hidden");
  winnerOverlay.classList.add("hidden");
  setHud();
});

restartBtn.addEventListener("click", () => {
  resetMatch();
  gameRunning = true;
  winnerOverlay.classList.add("hidden");
  startOverlay.classList.add("hidden");
  setHud();
});

function updateClock() {
  if (!gameRunning || gameFinished) return;

  tickCount += 1;
  if (tickCount % 240 === 0 && displayedMinute < 90) {
    displayedMinute += 1;
    setHud();
  }
}

function update() {
  if (!gameRunning || gameFinished) return;

  updateClock();

  goalAngle += goalSpinSpeed;
  if (goalAngle > Math.PI * 2) goalAngle -= Math.PI * 2;

  updateOpponentAI();

  updatePhysics(player);
  updatePhysics(opponent);

  resolveCollision(player, opponent);

  bounceOffArena(player);
  bounceOffArena(opponent);

  checkGoalScored();
}

function render() {
  ctx.clearRect(0, 0, W, H);
  drawArena();
  drawAimLine();
  drawDisc(opponent, teamBLogoImg);
  drawDisc(player, teamALogoImg);
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

setHud();
resetPositions();
loop();
