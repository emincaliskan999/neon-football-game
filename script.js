const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreAEl = document.getElementById("scoreA");
const scoreBEl = document.getElementById("scoreB");
const timerEl = document.getElementById("timer");
const matchStatusEl = document.getElementById("matchStatus");

const teamALogoHud = document.getElementById("teamALogoHud");
const teamBLogoHud = document.getElementById("teamBLogoHud");

const teamANameInput = document.getElementById("teamAName");
const teamBNameInput = document.getElementById("teamBName");
const teamALogoPathInput = document.getElementById("teamALogoPath");
const teamBLogoPathInput = document.getElementById("teamBLogoPath");
const applyBtn = document.getElementById("applyBtn");

const startOverlay = document.getElementById("startOverlay");
const winnerOverlay = document.getElementById("winnerOverlay");
const winnerText = document.getElementById("winnerText");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const W = canvas.width;
const H = canvas.height;

const WIN_SCORE = 3;
const FRICTION = 0.989;
const DISC_RADIUS = 24;
const BALL_RADIUS = 10;

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

let gameRunning = false;
let gameFinished = false;
let dragging = false;
let dragStart = null;
let dragCurrent = null;

let tickCount = 0;
let displayedMinute = 31;

const arena = {
  x: W / 2,
  y: H / 2 + 82,
  r: 170
};

const player = {
  x: arena.x,
  y: arena.y + 82,
  r: DISC_RADIUS,
  vx: 0,
  vy: 0
};

const opponent = {
  x: arena.x,
  y: arena.y - 76,
  r: DISC_RADIUS,
  vx: 0,
  vy: 0
};

const ball = {
  x: arena.x,
  y: arena.y,
  r: BALL_RADIUS,
  vx: 0,
  vy: 0
};

function setHud() {
  scoreAEl.textContent = scoreA;
  scoreBEl.textContent = scoreB;

  if (gameFinished) {
    timerEl.textContent = "FT";
  } else if (gameRunning) {
    timerEl.textContent = `${displayedMinute}'`;
  } else {
    timerEl.textContent = "Kickoff";
  }

  matchStatusEl.textContent = `BO5 • First to ${WIN_SCORE}`;
}

function resetPositions(lastScoredBy = null) {
  player.x = arena.x;
  player.y = arena.y + 82;
  player.vx = 0;
  player.vy = 0;

  opponent.x = arena.x;
  opponent.y = arena.y - 76;
  opponent.vx = 0;
  opponent.vy = 0;

  ball.x = arena.x;
  ball.y = arena.y;
  ball.vx = 0;
  ball.vy = 0;

  if (lastScoredBy === "A") {
    ball.y -= 10;
  } else if (lastScoredBy === "B") {
    ball.y += 10;
  }
}

function resetMatch() {
  scoreA = 0;
  scoreB = 0;
  gameFinished = false;
  displayedMinute = 31;
  tickCount = 0;
  resetPositions();
  setHud();
}

function getTopGoal() {
  return {
    x: arena.x + 112,
    y: arena.y - 148,
    w: 74,
    h: 28
  };
}

function getBottomGoal() {
  return {
    x: arena.x - 186,
    y: arena.y + 122,
    w: 74,
    h: 28
  };
}

function drawGoal(goal, upsideDown = false) {
  ctx.beginPath();

  if (!upsideDown) {
    ctx.moveTo(goal.x, goal.y + goal.h);
    ctx.lineTo(goal.x, goal.y);
    ctx.lineTo(goal.x + goal.w, goal.y);
    ctx.lineTo(goal.x + goal.w, goal.y + goal.h);
  } else {
    ctx.moveTo(goal.x, goal.y);
    ctx.lineTo(goal.x, goal.y + goal.h);
    ctx.lineTo(goal.x + goal.w, goal.y + goal.h);
    ctx.lineTo(goal.x + goal.w, goal.y);
  }

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.shadowBlur = 16;
  ctx.shadowColor = "#ffffff";
  ctx.stroke();
  ctx.shadowBlur = 0;
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

function drawArena() {
  drawGlowCircle(arena.x, arena.y, arena.r, "#79f7ff");
  drawGoal(getTopGoal(), false);
  drawGoal(getBottomGoal(), true);
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

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = "#171717";
  ctx.fill();
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

function clampToArena(obj) {
  const dx = obj.x - arena.x;
  const dy = obj.y - arena.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxDist = arena.r - obj.r;

  if (dist > maxDist) {
    const angle = Math.atan2(dy, dx);
    obj.x = arena.x + Math.cos(angle) * maxDist;
    obj.y = arena.y + Math.sin(angle) * maxDist;

    const dot = obj.vx * Math.cos(angle) + obj.vy * Math.sin(angle);
    if (dot > 0) {
      obj.vx -= Math.cos(angle) * dot;
      obj.vy -= Math.sin(angle) * dot;
    }
  }
}

function updatePhysics(obj) {
  obj.x += obj.vx;
  obj.y += obj.vy;
  obj.vx *= FRICTION;
  obj.vy *= FRICTION;

  if (Math.abs(obj.vx) < 0.01) obj.vx = 0;
  if (Math.abs(obj.vy) < 0.01) obj.vy = 0;

  clampToArena(obj);
}

function resolveCollision(a, b, pushBoth = true) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = a.r + b.r;

  if (dist === 0 || dist >= minDist) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;

  if (pushBoth) {
    a.x -= nx * (overlap * 0.5);
    a.y -= ny * (overlap * 0.5);
    b.x += nx * (overlap * 0.5);
    b.y += ny * (overlap * 0.5);
  } else {
    b.x += nx * overlap;
    b.y += ny * overlap;
  }

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const velAlongNormal = rvx * nx + rvy * ny;

  if (velAlongNormal > 0) return;

  const restitution = 0.92;
  const impulse = -(1 + restitution) * velAlongNormal / 2;
  const impulseX = impulse * nx;
  const impulseY = impulse * ny;

  a.vx -= impulseX;
  a.vy -= impulseY;
  b.vx += impulseX;
  b.vy += impulseY;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function updateOpponentAI() {
  if (!gameRunning || gameFinished) return;

  const targetX = ball.x;
  const targetY = ball.y - 24;

  const dx = targetX - opponent.x;
  const dy = targetY - opponent.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;

  opponent.vx += (dx / dist) * 0.12;
  opponent.vy += (dy / dist) * 0.12;

  const maxSpeed = 2.8;
  const speed = Math.sqrt(opponent.vx * opponent.vx + opponent.vy * opponent.vy);

  if (speed > maxSpeed) {
    opponent.vx = (opponent.vx / speed) * maxSpeed;
    opponent.vy = (opponent.vy / speed) * maxSpeed;
  }
}

function checkGoalScored() {
  const topGoal = getTopGoal();
  const bottomGoal = getBottomGoal();

  const inTopGoal =
    ball.x + ball.r > topGoal.x &&
    ball.x - ball.r < topGoal.x + topGoal.w &&
    ball.y + ball.r > topGoal.y &&
    ball.y - ball.r < topGoal.y + topGoal.h;

  const inBottomGoal =
    ball.x + ball.r > bottomGoal.x &&
    ball.x - ball.r < bottomGoal.x + bottomGoal.w &&
    ball.y + ball.r > bottomGoal.y &&
    ball.y - ball.r < bottomGoal.y + bottomGoal.h;

  if (inTopGoal) {
    scoreA += 1;
    setHud();
    if (scoreA >= WIN_SCORE) {
      endMatch(config.teamA.name);
    } else {
      resetPositions("A");
    }
  } else if (inBottomGoal) {
    scoreB += 1;
    setHud();
    if (scoreB >= WIN_SCORE) {
      endMatch(config.teamB.name);
    } else {
      resetPositions("B");
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
  const dist = Math.sqrt(dx * dx + dy * dy);

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

  const powerX = (dragStart.x - dragCurrent.x) * 0.085;
  const powerY = (dragStart.y - dragCurrent.y) * 0.085;

  player.vx += powerX;
  player.vy += powerY;

  const maxLaunch = 8.5;
  const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
  if (speed > maxLaunch) {
    player.vx = (player.vx / speed) * maxLaunch;
    player.vy = (player.vy / speed) * maxLaunch;
  }

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

applyBtn.addEventListener("click", () => {
  config.teamA.name = teamANameInput.value.trim() || "Team 1";
  config.teamB.name = teamBNameInput.value.trim() || "Team 2";
  config.teamA.logo = teamALogoPathInput.value.trim() || "assets/team1.png";
  config.teamB.logo = teamBLogoPathInput.value.trim() || "assets/team2.png";
  loadLogos();
});

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
  updateOpponentAI();

  updatePhysics(player);
  updatePhysics(opponent);
  updatePhysics(ball);

  resolveCollision(player, opponent, true);
  resolveCollision(player, ball, false);
  resolveCollision(opponent, ball, false);

  checkGoalScored();
}

function render() {
  ctx.clearRect(0, 0, W, H);
  drawArena();
  drawAimLine();
  drawDisc(opponent, teamBLogoImg);
  drawDisc(player, teamALogoImg);
  drawBall();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

setHud();
resetPositions();
loop();
