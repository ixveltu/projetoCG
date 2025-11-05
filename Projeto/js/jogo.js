const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// === Configurações do jogador ===
const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  width: 48,   
  height: 24,  
  frameX: 0,
  frameY: 0,
  speed: 3,
  moving: false,
  state: "idle"
};

// === Carregar sprites ===
const sprites = {
  idle: new Image(),
  walk: new Image()
};
sprites.idle.src = "../assets/Idle.png";
sprites.walk.src = "../assets/Walk.png";

const keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

function movePlayer() {
  player.moving = false;
  let moved = false;

  if (keys["ArrowUp"] || keys["w"]) {
    player.y -= player.speed;
    player.frameY = 3; // Cima
    moved = true;
  }
  if (keys["ArrowDown"] || keys["s"]) {
    player.y += player.speed;
    player.frameY = 0; // Baixo
    moved = true;
  }
  if (keys["ArrowLeft"] || keys["a"]) {
    player.x -= player.speed;
    player.frameY = 1; // Esquerda
    moved = true;
  }
  if (keys["ArrowRight"] || keys["d"]) {
    player.x += player.speed;
    player.frameY = 2; // Direita
    moved = true;
  }

  player.state = moved ? "walk" : "idle";
  player.moving = moved;

  // Limites do ecrã
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}

let frameCount = 0;
function handleSpriteFrame() {
  if (!player.moving) {
    player.frameX = 0;
    return;
  }
  frameCount++;
  if (frameCount % 8 === 0) {
    player.frameX = (player.frameX + 1) % 4; // 4 colunas no sprite
  }
}

function drawPlayer() {
  const sprite = sprites[player.state];
  if (!sprite.complete) return;

  ctx.drawImage(
    sprite,
    player.frameX * player.width,
    player.frameY * player.height,
    player.width,
    player.height,
    player.x,
    player.y,
    player.width * 2,  // desenhar um pouco maior
    player.height * 2
  );
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  movePlayer();
  handleSpriteFrame();
  drawPlayer();
  requestAnimationFrame(gameLoop);
}

let loaded = 0;
for (let key in sprites) {
  sprites[key].onload = () => {
    loaded++;
    if (loaded === Object.keys(sprites).length) {
      gameLoop();
    }
  };
}
