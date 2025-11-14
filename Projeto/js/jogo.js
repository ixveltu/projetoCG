const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Redimensionar canvas
function resize() {
  canvas.width = 600;
  canvas.height = 300;
}
window.addEventListener('resize', resize);
resize();

// Definir tamanho e escala do mundo 
const mapScale = 3;
const world = {
  width: 512 * mapScale,
  height: 512 * mapScale
};

const camera = { x: 0, y: 0 };

// Definir tamanho do jogador
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

// carregar imagem do mapa
const mapImage = new Image();
mapImage.src = "../assets/Mapa.png";

// carregar sprites do jogador parado e a andar
const sprites = {
  idle: new Image(),
  walk: new Image()
};
sprites.idle.src = "../assets/Idle.png";
sprites.walk.src = "../assets/Walk.png";

// sistema de árvores - 1 sprite horizontal com 4 estágios 
const treeSprite = new Image();
treeSprite.src = "../assets/MapleTree.png"; // sprite com 4 estágios

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

// carregar mapa de colisões
async function loadCollisions() {
  try {
    const response = await fetch("../assets/collisions.txt"); // carregar ficheiro de colisao
    const text = await response.text(); // vai ler como texto
    const lines = text.trim().split("\n");  // dividir em linhas
    const cols = lines[0].trim().split(/\s+/).length; // contar colunas
    tileSize = 512 / cols;  // calcular tamanho do tile tendo em conta o tamanho do mapa

    for (let row = 0; row < lines.length; row++) {  // ciclo para linhas
      const values = lines[row].trim().split(/\s+/);  // dividir onde tem espaços em branco
      for (let col = 0; col < values.length; col++) { // ciclo para colunas
        if (values[col] === "1" || values[col] === "2") { // Se o valor no mapa de colisao for 1 ou 2 (colisao ou arvore)
          collisions.push({ // adicionar retangulo de colisao
            x: col * tileSize * mapScale, 
            y: row * tileSize * mapScale, // definir posicao em x e y
            w: tileSize * mapScale,
            h: tileSize * mapScale  // definir largura e altura
          });
        }
      }
    }
  } catch (e) {
    console.error("Erro ao carregar colisões:", e); // log de erro
  }
}

// carregar posições das árvores baseado nas colisões
async function loadTrees() {  // carregar arvores
  try {
    const response = await fetch("../assets/collisions.txt"); // carregar ficheiro de colisao
    const text = await response.text(); // ler como texto
    const lines = text.trim().split("\n");  // dividir em linhas
    const cols = lines[0].trim().split(/\s+/).length; // contar colunas
    const treeTileSize = 512 / cols;  // calcular tamanho do tile tendo em conta o tamanho do mapa

    for (let row = 0; row < lines.length; row++) {
      const values = lines[row].trim().split(/\s+/);  // Dividir por espaços em branco
      for (let col = 0; col < values.length; col++) { // criar ciclo para colunas
        if (values[col] === "2") {  // Se o valor no mapa de colusao for 2 e uma arvore
          // criar árvore para cada colisão
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
    console.error("Erro ao carregar árvores:", e);  // log de erro
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
    y: y, // difinir posicao x e y do jogador
    w: player.width * 2,
    h: player.height * 2  // definir altura e largura do jogador
  };
  for (const c of collisions) {
    if (rectsOverlap(hitbox, c)) return true; // se houver colisao retorna true
  }
  return false; // senao retorna false e acaba a funcao
}

// função para mover o jogador
function movePlayer() {
  let move = false; // flag para verificar se o jogador está a mover-se
  let newX = player.x;  
  let newY = player.y;  // definir nova posicao x e y

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

  if (!checkCollision(newX, player.y)) player.x = newX; // atualizar posicao x se nao houver colisao
  if (!checkCollision(player.x, newY)) player.y = newY; // atualizar posicao y se nao houver colisao

  player.moving = move; // atualizar estado de movimento
  player.state = move ? "walk" : "idle";  // atualizar estado do jogador

  // limitar movimento ao mundo
  if (player.x < 0) player.x = 0; 
  if (player.y < 0) player.y = 0; 
  if (player.x + 64 > world.width) player.x = world.width - 64; 
  if (player.y + 64 > world.height) player.y = world.height - 64;
}

// verificar proximidade com árvores para ativar intereação
function checkTreeProximity() {
  nearbyTree = null;  // resetar arvore próxima
  showInteraction = false;  // resetar menu de interação

  for (const tree of trees) { // ciclo por todas as arvores
    const dist = Math.hypot(
      (player.x + 32) - (tree.x + tree.width / 2),
      (player.y + 32) - (tree.y + tree.height / 2)  // calcular distancia entre jogador e arvore
    );

    // se estiver dentro do raio de interação
    if (dist <= 60) {
      nearbyTree = tree;
      showInteraction = true;
      break;
    }
  }
}

// atualizar crescimento das árvores
function updateTrees() {
  trees.forEach(tree => {
    if (tree.stage < 3) {
      let speed = tree.growthSpeed;
      
      // Aumentar velocidade se regada
      if (tree.watered) speed *= 1.5;
      
      // Aumentar velocidade se adubada
      if (tree.fertilized) speed *= 100;  // TROCAR ANTES DE ENVIAR 

      tree.growth += speed;

      // Verificar se a árvore cresceu para o próximo estágio
      if (tree.growth >= 100) {
        tree.growth = 0;
        tree.stage++;
        tree.watered = false;
        tree.fertilized = false;
      }
    }
  });
}

// atualizar barras de progresso no HTML
function updateProgressBars() {
  trees.forEach((tree, index) => {  // para cada arvore associar ao index uma progressbar
    const progressBar = document.getElementById(`progress-${index}`); // selecionar progressbar pelo index
    const stageText = document.getElementById(`stage-${index}`);  // selecionar texto do estágio pelo index
    
    if (progressBar && stageText) {
      // Atualizar largura da barra
      progressBar.style.width = `${tree.growth}%`;
      
      // Atualizar texto do estágio
      stageText.textContent = `Estágio: ${tree.stage + 1}/4`;
      
      // Mudar cor de progressbar se a árvore estiver crescida
      if (tree.stage === 3 && tree.growth >= 100) {
        progressBar.style.background = '#00ff00'; // nao esta a funcionar 
        progressBar.style.boxShadow = '0 0 10px rgba(241, 196, 15, 0.8)';
      }
    }
  });
}


// Interação com árvore
function interactTree(action) {
  if (!nearbyTree) return;  // verificar se há árvore próximo do jogador

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
window.addEventListener('keydown', (e) => { // detectar tecla pressionada
  if (keyPressed[e.key]) return; // Evitar repetição enquanto segura a tecla
  keyPressed[e.key] = true;

  if (!showInteraction || !nearbyTree) return;  // verificar se o menu de interação está visível

  // Q para regar
  if (e.key === 'q' || e.key === 'Q') {
    interactTree('water');
  }
  
  // E para adubar
  if (e.key === 'e' || e.key === 'E') {
    interactTree('fertilize');
  }
});

window.addEventListener('keyup', (e) => { // detectar tecla solta
  keyPressed[e.key] = false;
});

// atualizar camera para seguir o jogador
function updateCamera() {
  camera.x = player.x - canvas.width / 2 + 32;
  camera.y = player.y - canvas.height / 2 + 32; // centralizar camera no jogador em x e y

  // limitar camera ao mundo
  if (camera.x < 0) camera.x = 0; 
  if (camera.y < 0) camera.y = 0; 
  if (camera.x + canvas.width > world.width)  
    camera.x = world.width - canvas.width;
  if (camera.y + canvas.height > world.height)
    camera.y = world.height - canvas.height;
}

// animar frames do jogador
let frameCount = 0;
function animateFrame() { 
  frameCount++;
  if (frameCount % 10 === 0) {
    player.frameX = (player.frameX + 1) % 3;
  }
}

// desenhar mundo
function drawWorld() {
  if (!mapImage.complete) return;
  ctx.drawImage(
    mapImage,
    0,
    0,
    512, 
    512,
    -camera.x, 
    -camera.y,
    world.width, 
    world.height
  );
}

// desenhar árvores 
function drawTrees() {
  if (!treeSprite.complete) return; // verificar se a imagem carregou

  trees.forEach(tree => {
    const screenX = tree.x - camera.x;
    const screenY = tree.y - camera.y;  // calcular posição na tela em x e y

    if (screenX + tree.width >= 0 && screenX <= canvas.width &&
        screenY + tree.height >= 0 && screenY <= canvas.height) { // verificar se está na tela
      
      const spriteX = tree.stage * 32;  // definir x do sprite baseado no stage da árvore
      
      ctx.drawImage(
        treeSprite,
        spriteX, 
        0,  // posição no sprite (move 32px para cada estágio)
        32, 
        48, // tamanho da fonte no sprite
        screenX + 24, 
        screenY - 24, // posição na tela
        tree.width, 
        tree.height // tamanho renderizado
      );
    }
  });
}

// Desenhar jogador
function drawPlayer() {
  const img = sprites[player.state];  // selecionar sprite baseado no estado
  if (!img.complete) return;  // verificar se a imagem carregou

  const screenX = player.x - camera.x;  
  const screenY = player.y - camera.y;  // calcular posição na tela

  ctx.save(); // salvar canvas 
  if (player.facing === -1) { // virar sprite se estiver virado para a esquerda
    ctx.translate(screenX + 64, screenY); // mover o ponto de origem
    ctx.scale(-1, 1); // inverter persongaem horizontalmente 
    ctx.drawImage(  // desenhar 
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

    // caso esteja virado para a direita nao inverte
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
  ctx.restore();  // restaurar canvas 
}

// desenhar menu de interação
function drawInteractionMenu() {
  if (!showInteraction) return;

  const menuWidth = 240;
  const menuHeight = 50;
  const menuX = canvas.width / 2 - menuWidth / 2;
  const menuY = canvas.height - 50;

  // fundo do menu
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(menuX, menuY, menuWidth, menuHeight);

  // borda
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(menuX, menuY, menuWidth, menuHeight);

  // botão Regar
  ctx.fillStyle = '#4a9eff';
  ctx.fillRect(menuX + 10, menuY + 5, 100, 40);
  ctx.strokeRect(menuX + 10, menuY + 5, 100, 40);

  // botão Adubar
  ctx.fillStyle = '#502d14e6';
  ctx.fillRect(menuX + 130, menuY + 5, 100, 40);
  ctx.strokeRect(menuX + 130, menuY + 5, 100, 40);

  // texto dos botões
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Q Regar', menuX + 60, menuY + 30);
  ctx.fillText('E Adubar', menuX + 180, menuY + 30);
}

// mensagem de parabens quando todas as arvores crescerem
const congratsMessage = document.getElementById('congratsMessage');
if (allTreesGrown && trees.length > 0) {
  if (congratsMessage) {
    congratsMessage.style.display = 'flex';
  }
} else {
  if (congratsMessage) {
    congratsMessage.style.display = 'none';
  }
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  movePlayer();
  updateCamera();
  animateFrame();
  checkTreeProximity();
  updateTrees();
  updateProgressBars(); 
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
