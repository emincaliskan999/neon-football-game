const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreAEl = document.getElementById("scoreA");
const scoreBEl = document.getElementById("scoreB");
const teamALogoHud = document.getElementById("teamALogoHud");
const teamBLogoHud = document.getElementById("teamBLogoHud");

const teamANameInput = document.getElementById("teamAName");
const teamBNameInput = document.getElementById("teamBName");
const teamALogoPathInput = document.getElementById("teamALogoPath");
const teamBLogoPathInput = document.getElementById("teamBLogoPath");
const applyBtn = document.getElementById("applyBtn");

const W = canvas.width;
const H = canvas.height;

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

const arena = {
  x: W / 2,
  y: H / 2 + 70,
  r: 170
};

const player = {
  x: arena.x,
  y: arena.y + 90,
  r: 24,
  vx: 0,
  vy: 0
};

const opponent = {
  x: arena.x,
  y: arena.y - 10,
  r: 24,
  vx: 0,
  vy: 0
};

const ball = {
  x: arena.x + 8,
  y: arena.y + 18,
  r: 9,
  vx: 0,
  vy: 0
};

let dragging = false;
let dragStart = null;
let dragCurrent = null;

function getGoal() {
  const angle = -Math.PI / 4;
  const attachX = arena.x + Math.cos(angle) * arena.r;
  const attachY = arena.y + Math.sin(angle) * arena.r;

  return {
    x: attachX - 10,
    y: attachY - 28,
    w: 72,
    h: 26
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

function drawArena() {
  drawGlowCircle(arena.x, arena.y, arena.r, "#79f7ff");

  const goal = getGoal();

  ctx.beginPath();
  ctx.moveTo(goal.x, goal.y + goal.h);
  ctx.lineTo(goal.x, goal.y);
  ctx.lineTo(goal.x + goal.w, goal.y);
  ctx.lineTo(goal.x + goal.w, goal.y + goal.h);

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.shadowBlur = 16;
  ctx.shadowColor = "#ffffff";
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawDisc(obj, img) {
  ctx.save();

  ctx.beginPath();
  ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = "#111111";
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
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = "#181818";
  ctx.fill();
}

function drawAimLine() {
  if (!dragging || !dragCurrent) return;

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

function keepInsideArena(obj) {
  const dx = obj.x - arena.x;
  const dy = obj.y - arena.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxDist = arena.r - obj.r;

  if (dist > maxDist) {
    const angle = Math.atan2(dy, dx);
    obj.x = arena.x + Math.cos(angle) * maxDist;
    obj.y = arena.y + Math.sin(angle) * maxDist;
  }
}

function updatePhysics(obj) {
  obj.x += obj.vx;
  obj.y += obj.vy;

  obj.vx *= 0.985;
  obj.vy *= 0.985;

  if (Math.abs(obj.vx) < 0.01) obj.vx = 0;
  if (Math.abs(obj.vy) < 0.01) obj.vy = 0;

  keepInsideArena(obj);
}

function circleCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = a.r + b.r;

  if (dist < minDist && dist > 0) {
    const overlap = minDist - dist;
    const nx = dx / dist;
    const ny = dy / dist;

    b.x += nx * overlap;
    b.y += ny * overlap;

    b.vx += a.vx * 0.6;
    b.vy += a.vy * 0.6;
  }
}

function checkGoal() {
  const goal = getGoal();

  const ballInsideGoal =
    ball.x + ball.r > goal.x &&
    ball.x - ball.r < goal.x + goal.w &&
    ball.y + ball.r > goal.y &&
    ball.y - ball.r < goal.y + goal.h;

  if (ballInsideGoal) {
    scoreA += 1;
    scoreAEl.textContent = scoreA;
    resetPositions();
  }
}

function resetPositions() {
  player.x = arena.x;
  player.y = arena.y + 90;
  player.vx = 0;
  player.vy = 0;

  opponent.x = arena.x;
  opponent.y = arena.y - 10;
  opponent.vx = 0;
  opponent.vy = 0;

  ball.x = arena.x + 8;
  ball.y = arena.y + 18;
  ball.vx = 0;
  ball.vy = 0;
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
  const p = getPointerPos(e);
  const dx = p.x - player.x;
  const dy = p.y - player.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= player.r + 20) {
    dragging = true;
    dragStart = p;
    dragCurrent = p;
  }
}

function pointerMove(e) {
  if (!dragging) return;
  dragCurrent = getPointerPos(e);
}

function pointerUp() {
  if (!dragging || !dragStart || !dragCurrent) return;

  const powerX = (dragStart.x - dragCurrent.x) * 0.08;
  const powerY = (dragStart.y - dragCurrent.y) * 0.08;

  player.vx = powerX;
  player.vy = powerY;

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

function update() {
  updatePhysics(player);
  updatePhysics(ball);
  circleCollision(player, ball);
  checkGoal();
}

function render() {
  ctx.clearRect(0, 0, W, H);
  drawArena();
  drawAimLine();
  drawDisc(opponent, teamBLogoImg);
  drawDisc(player, teamALogoImg);
  drawBall();
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

scoreAEl.textContent = scoreA;
scoreBEl.textContent = scoreB;
gameLoop();
