const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = 600;
  canvas.height = 300;
}
window.addEventListener('resize', resize);
resize();

const mapScale = 3; // Zoom 3x no mapa
const world = {
  width: 512 * mapScale,
  height: 512 * mapScale
};

const camera = { x: 0, y: 0 };

const player = {
  x: world.width / 2 - 95,
  y: world.height / 2 - 20,
  width: 32,
  height: 32,
  frameX: 0,
  frameY: 0,
  state: "idle",
  speed: 5,
  moving: false,
  facing: 1
};

const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

const mapImage = new Image();
mapImage.src = "../assets/Mapa.png";

const sprites = {
  idle: new Image(),
  walk: new Image()
};
sprites.idle.src = "../assets/Idle.png";  // Sprites de idle
sprites.walk.src = "../assets/Walk.png";  // Sprites de caminhada

let loaded = 0;
const totalImages = 3;

mapImage.onload = () => {
  loaded++;
  if (loaded === totalImages) startGame();
};
for (let key in sprites) {
  sprites[key].onload = () => {
    loaded++;
    if (loaded === totalImages) startGame();
  };
}

const collisions = [];  // Criar array vazio para adicionar as colisoes
let tileSize = 16;  // Tamanho padrão de cada tile antes de carregar o arquivo

async function loadCollisions() { 
  try { // Ir buscar arquivo de colisoes a assets
    const response = await fetch("../assets/collisions.txt");
    const text = await response.text(); // ler arquivo 
    const lines = text.trim().split("\n");  // dividir em linhas
    const cols = lines[0].trim().split(/\s+/).length;   // contar colunas
    tileSize = 512 / cols;  // calcular tamanho do tile com base no número de colunas

    for (let row = 0; row < lines.length; row++) {  
      const values = lines[row].trim().split(/\s+/);  // dividir linha em valores
      for (let col = 0; col < values.length; col++) { // para cada valor na linha se for 1 cria a colisao caso contrario pode andar
        if (values[col] === "1") {
          collisions.push({
            x: col * tileSize * mapScale, // define a coordenada em x da colisao
            y: row * tileSize * mapScale, // define a coordenada em y da colisao
            w: tileSize * mapScale, // define a largura da tile onde ha colisao
            h: tileSize * mapScale  // define a altura da tile onde ha colisao
          });
        }
      }
    }
  } catch (e) {
    console.error("Erro ao carregar colisões:", e); // log caso de erro
  }
}

function rectsOverlap(a, b) {
  return !(
    a.x + a.w <= b.x ||
    a.x >= b.x + b.w ||
    a.y + a.h <= b.y ||
    a.y >= b.y + b.h  // verifica se dois retângulos se sobrepõem
  );
}

function checkCollision(x, y) {
  const hitbox = {  // criar hitbox do jogador
    x: x,
    y: y,
    w: player.width * 2,
    h: player.height * 2
  };
  for (const c of collisions) { // verifica cada colisao para o array
    if (rectsOverlap(hitbox, c)) return true; // se houver colisao da return
    console.log(hitbox, c);s
  }
  return false; // se nao houver colisao da return false
}

function movePlayer() {
  let move = false;
  let newX = player.x;
  let newY = player.y;

  if (keys["ArrowUp"] || keys["w"]) {
    newY -= player.speed;
    player.frameY = 1;
    move = true;
  }
  if (keys["ArrowDown"] || keys["s"]) {
    newY += player.speed;
    player.frameY = 0;
    move = true;
  }
  if (keys["ArrowLeft"] || keys["a"]) {
    newX -= player.speed;
    player.frameY = 2;
    move = true;
    player.facing = -1;
  }
  if (keys["ArrowRight"] || keys["d"]) {
    newX += player.speed;
    player.frameY = 2;
    move = true;
    player.facing = 1;
  }

  if (!checkCollision(newX, player.y)) player.x = newX; // verifica colisao em x
  if (!checkCollision(player.x, newY)) player.y = newY; // verifica colisao em y

  player.moving = move;
  player.state = move ? "walk" : "idle";

  // Limites do mapa
  if (player.x < 0) player.x = 0; 
  if (player.y < 0) player.y = 0;
  if (player.x + 64 > world.width) player.x = world.width - 64;
  if (player.y + 64 > world.height) player.y = world.height - 64; // delimitar mapa
}

function updateCamera() {
  camera.x = player.x - canvas.width / 2 + 32;
  camera.y = player.y - canvas.height / 2 + 32;

  if (camera.x < 0) camera.x = 0;
  if (camera.y < 0) camera.y = 0;
  if (camera.x + canvas.width > world.width)
    camera.x = world.width - canvas.width;
  if (camera.y + canvas.height > world.height)
    camera.y = world.height - canvas.height;
}

let frameCount = 0;
function animateFrame() {
  frameCount++;
  if (frameCount % 10 === 0) {
    player.frameX = (player.frameX + 1) % 3;
  }
}

function drawWorld() {
  if (!mapImage.complete) return;
  ctx.drawImage(
    mapImage,
    0, 0,
    512, 512,
    -camera.x, -camera.y,
    world.width, world.height
  );
}

function drawPlayer() {
  const img = sprites[player.state];
  if (!img.complete) return;

  const screenX = player.x - camera.x;
  const screenY = player.y - camera.y;

  ctx.save();
  if (player.facing === -1) {
    ctx.translate(screenX + 64, screenY);
    ctx.scale(-1, 1);
    ctx.drawImage(
      img,
      player.frameX * player.width,
      player.frameY * player.height,
      player.width,
      player.height,
      -32,  // tamanho do boneco para virar corretamente
      0,
      player.width * 3,
      player.height * 3
    );
  } else {
    ctx.drawImage(
      img,
      player.frameX * player.width,
      player.frameY * player.height,
      player.width,
      player.height,
      screenX,
      screenY,
      player.width * 3,
      player.height * 3
    );
  }
  ctx.restore();
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  movePlayer();
  updateCamera();
  animateFrame();
  drawWorld();
  drawPlayer();
  requestAnimationFrame(loop);
}

async function startGame() {
  await loadCollisions();
  requestAnimationFrame(loop);
}
