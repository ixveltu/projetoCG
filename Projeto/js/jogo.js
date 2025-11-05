const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
    
function resize() {
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const player = {
  x: canvas.width / 2 - 32, // x onde nasce
  y: canvas.height / 2 - 32,  // y onde nasce
  width: 32,
  height: 32,
  frameX: 0,
  frameY: 0,
  state: "idle",
  speed: 7,
  moving: false,
  facing: 1
};

const keys = {};
  window.addEventListener('keydown', e => keys[e.key] = true);
  window.addEventListener('keyup', e => keys[e.key] = false);

const sprites = {
  idle: new Image(),
  walk: new Image()
  };
  sprites.idle.src = "../assets/Idle.png";
  sprites.walk.src = "../assets/Walk.png";

let loaded = 0;
for (let key in sprites) {
  sprites[key].onload = () => {
  loaded++;
  console.log(key + " carregado");
  if (loaded === Object.keys(sprites).length) {
  requestAnimationFrame(loop);
    }
  };
}

function movePlayer() {
  let move = false;
      
    if (keys["ArrowUp"] || keys["w"]) {
        player.y -= player.speed;
        player.frameY = 1;
        move = true;
      }
      if (keys["ArrowDown"] || keys["s"]) {
        player.y += player.speed;
        player.frameY = 0;
        move = true;
      }
      if (keys["ArrowLeft"] || keys["a"]) {
        player.x -= player.speed;
        player.frameY = 2;
        move = true;
        player.facing = -1;
      }
      if (keys["ArrowRight"] || keys["d"]) {
        player.x += player.speed;
        player.frameY = 2;
        move = true;
        player.facing = 1;
      }

      player.moving = move;
      player.state = move ? "walk" : "idle";

      // Limites
      if (player.x < 0) player.x = 0;
      if (player.y < 0) player.y = 0;
      if (player.x + 64 > canvas.width) player.x = canvas.width - 64;
      if (player.y + 64 > canvas.height) player.y = canvas.height - 64;
    }

    let frameCount = 0;
    function animateFrame() {
      frameCount++;
      if (frameCount % 10 === 0) {
        player.frameX = (player.frameX + 1) % 3;
      }
    }

    function drawPlayer() {
      const img = sprites[player.state];
      if (!img.complete) return;

      ctx.save();

      if (player.facing === -1) {
        // Para virar à esquerda: translada para a posição + largura, depois inverte
        ctx.translate(player.x + 64, player.y);
        ctx.scale(-1, 1);

        ctx.drawImage(
          img,
          player.frameX * player.width,
          player.frameY * player.height,
          player.width,
          player.height,
          0,
          0,
          player.width * 2,
          player.height * 2
        );
      } else {
        // Normal - virado para a direita
  ctx.drawImage(
  img,
  player.frameX * player.width,
  player.frameY * player.height,
  player.width,
  player.height,
  player.x,
  player.y,
  player.width * 2,
  player.height * 2
    );
  }

  ctx.restore();
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  movePlayer();
  animateFrame();
  drawPlayer();
  requestAnimationFrame(loop);
}