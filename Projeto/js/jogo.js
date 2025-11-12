const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = 600;
  canvas.height = 300;
}
window.addEventListener('resize', resize);
resize();

const mapScale = 3;
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
sprites.idle.src = "../assets/Idle.png";
sprites.walk.src = "../assets/Walk.png";

// Sistema de árvores - apenas 1 sprite com todos os estágios
const treeSprite = new Image();
treeSprite.src = "../assets/MapleTree.png"; // Sprite com 4 estágios lado a lado (128x32 total)

const trees = []; // array para coordenadas de arvores
let nearbyTree = null; // arvore próxima ao jogador
let showInteraction = false; // Mostrar menu de interação

let loaded = 0;
const totalImages = 4; // mapImage  idle  walk  treeSprite

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
treeSprite.onload = () => {
  loaded++;
  if (loaded === totalImages) startGame();
};

const collisions = [];
let tileSize = 16;

async function loadCollisions() {
  try {
    const response = await fetch("../assets/collisions.txt");
    const text = await response.text();
    const lines = text.trim().split("\n");
    const cols = lines[0].trim().split(/\s+/).length;
    tileSize = 512 / cols;

    for (let row = 0; row < lines.length; row++) {
      const values = lines[row].trim().split(/\s+/);
      for (let col = 0; col < values.length; col++) {
        if (values[col] === "1" || values[col] === "2") {
          collisions.push({
            x: col * tileSize * mapScale,
            y: row * tileSize * mapScale,
            w: tileSize * mapScale,
            h: tileSize * mapScale
          });
        }
      }
    }
  } catch (e) {
    console.error("Erro ao carregar colisões:", e);
  }
}

// Carregar posições das árvores baseado nas colisões
async function loadTrees() {
  try {
    const response = await fetch("../assets/collisions.txt");
    const text = await response.text();
    const lines = text.trim().split("\n");
    const cols = lines[0].trim().split(/\s+/).length;
    const treeTileSize = 512 / cols;

    for (let row = 0; row < lines.length; row++) {
      const values = lines[row].trim().split(/\s+/);  // Dividir por espaços em branco
      for (let col = 0; col < values.length; col++) { // criar ciclo para colunas
        if (values[col] === "2") {  // Se o valor no mapa de colusao for 2 e uma arvore
          // Criar árvore para cada colisão
          trees.push({
            x: col * treeTileSize * mapScale + (treeTileSize * mapScale - 32 * mapScale) / 2,
            y: row * treeTileSize * mapScale + (treeTileSize * mapScale - 32 * mapScale) / 2,
            width: 32 * mapScale,
            height: 48 * mapScale,
            stage: 0, // Stage inicial (0-3)
            growth: 0, // Progresso de crescimento (0-100)
            growthSpeed: 0.05, // Velocidade base de crescimento
            watered: false,
            fertilized: false
          });
        }
      }
    }
  } catch (e) {
    console.error("Erro ao carregar árvores:", e);
  }
}

function rectsOverlap(a, b) { // funcao para detetar colisao
  return !(
    a.x + a.w <= b.x || // a está à esquerda de b
    a.x >= b.x + b.w || // a está à direita de b
    a.y + a.h <= b.y || // a está acima de b 
    a.y >= b.y + b.h  // a está abaixo de b
  );
}

function checkCollision(x, y) { // funcao para verificar colisao
  const hitbox = {  // definir hitbox
    x: x, 
    y: y,
    w: player.width * 2,
    h: player.height * 2
  };
  for (const c of collisions) {
    if (rectsOverlap(hitbox, c)) return true;
  }
  return false;
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

  if (!checkCollision(newX, player.y)) player.x = newX;
  if (!checkCollision(player.x, newY)) player.y = newY;

  player.moving = move;
  player.state = move ? "walk" : "idle";

  if (player.x < 0) player.x = 0;
  if (player.y < 0) player.y = 0;
  if (player.x + 64 > world.width) player.x = world.width - 64;
  if (player.y + 64 > world.height) player.y = world.height - 64;
}

// Verificar proximidade com árvores
function checkTreeProximity() {
  nearbyTree = null;
  showInteraction = false;

  for (const tree of trees) {
    const dist = Math.hypot(
      (player.x + 32) - (tree.x + tree.width / 2),
      (player.y + 32) - (tree.y + tree.height / 2)
    );

    if (dist <= 60) {
      nearbyTree = tree;
      showInteraction = true;
      break;
    }
  }
}

// Atualizar crescimento das árvores
function updateTrees() {
  trees.forEach(tree => {
    if (tree.stage < 3) {
      let speed = tree.growthSpeed;
      
      // Aumentar velocidade se regada
      if (tree.watered) speed *= 1.5;
      
      // Aumentar velocidade se adubada
      if (tree.fertilized) speed *= 100;

      tree.growth += speed;

      if (tree.growth >= 100) {
        tree.growth = 0;
        tree.stage++;
        tree.watered = false;
        tree.fertilized = false;
      }
    }
  });
}

// NOVO: Atualizar progress bars
function updateProgressBars() {
  trees.forEach((tree, index) => {
    const progressBar = document.getElementById(`progress-${index}`);
    const stageText = document.getElementById(`stage-${index}`);
    
    if (progressBar && stageText) {
      // Atualizar largura da barra
      progressBar.style.width = `${tree.growth}%`;
      
      // Atualizar texto do estágio
      stageText.textContent = `Estágio: ${tree.stage + 1}/4`;
      
      // Mudar cor se a árvore estiver completamente crescida
      if (tree.stage === 3) {
        progressBar.style.background = 'linear-gradient(90deg, #f39c12, #f1c40f, #f4d03f)';
        progressBar.style.boxShadow = '0 0 10px rgba(241, 196, 15, 0.8)';
      }
    }
  });
}

// Interação com árvore
function interactTree(action) {
  if (!nearbyTree) return;

  if (action === 'water') {
    nearbyTree.watered = true;
  } else if (action === 'fertilize') {
    nearbyTree.fertilized = true;
  }

  showInteraction = false;
}

// Controle de teclas pressionadas para evitar repetição
const keyPressed = {};

// Evento de tecla para interação
window.addEventListener('keydown', (e) => {
  if (keyPressed[e.key]) return; // Evitar repetição enquanto segura a tecla
  keyPressed[e.key] = true;

  if (!showInteraction || !nearbyTree) return;

  // Q para regar
  if (e.key === 'q' || e.key === 'Q') {
    interactTree('water');
  }
  
  // E para adubar
  if (e.key === 'e' || e.key === 'E') {
    interactTree('fertilize');
  }
});

window.addEventListener('keyup', (e) => {
  keyPressed[e.key] = false;
});

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

// Desenhar árvores usando sprite sheet horizontal
function drawTrees() {
  if (!treeSprite.complete) return;

  trees.forEach(tree => {
    const screenX = tree.x - camera.x;
    const screenY = tree.y - camera.y;

    // Apenas desenhar se estiver visível na tela
    if (screenX + tree.width >= 0 && screenX <= canvas.width &&
        screenY + tree.height >= 0 && screenY <= canvas.height) {
      
      // Calcular posição X no sprite baseado no estágio
      // Estágio 0 = 0px, Estágio 1 = 32px, Estágio 2 = 64px, Estágio 3 = 96px
      const spriteX = tree.stage * 32;
      
      ctx.drawImage(
        treeSprite,
        spriteX, 
        0,      // Posição no sprite (move 32px para cada estágio)
        32, 
        48,          // Tamanho da fonte no sprite
        screenX + 24, 
        screenY - 24, // Posição na tela
        tree.width, 
        tree.height // Tamanho renderizado
      );
    }
  });
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
      -32,
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

// Desenhar menu de interação
function drawInteractionMenu() {
  if (!showInteraction) return;

  const menuWidth = 240;
  const menuHeight = 50;
  const menuX = canvas.width / 2 - menuWidth / 2;
  const menuY = canvas.height - 50;

  // Fundo do menu
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(menuX, menuY, menuWidth, menuHeight);

  // Borda
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(menuX, menuY, menuWidth, menuHeight);

  // Botão Regar
  ctx.fillStyle = '#4a9eff';
  ctx.fillRect(menuX + 10, menuY + 5, 100, 40);
  ctx.strokeRect(menuX + 10, menuY + 5, 100, 40);

  // Botão Adubar
  ctx.fillStyle = '#502d14e6';
  ctx.fillRect(menuX + 130, menuY + 5, 100, 40);
  ctx.strokeRect(menuX + 130, menuY + 5, 100, 40);

  // Texto dos botões
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Q Regar', menuX + 60, menuY + 30);
  ctx.fillText('E Adubar', menuX + 180, menuY + 30);
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  movePlayer();
  updateCamera();
  animateFrame();
  checkTreeProximity();
  updateTrees();
  updateProgressBars(); // NOVO: Atualizar progress bars
  drawWorld();
  drawTrees();
  drawPlayer();
  drawInteractionMenu();
  requestAnimationFrame(loop);
}

async function startGame() {
  await loadCollisions();
  await loadTrees();
  requestAnimationFrame(loop);
}

// NOVO: Event listener para o botão de menu
document.getElementById('menuButton').addEventListener('click', () => {
  alert('Menu! Aqui você pode adicionar funcionalidades futuras.');
});