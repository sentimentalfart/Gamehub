const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let peer = null;
let conn = null;
let isHost = false;

// Game State
let gameState = {
  players: {},
  taggerId: null
};

let myId = null;
const keys = {};

// Keyboard Controls
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

// 1. Host Game
document.getElementById('host-btn').addEventListener('click', () => {
  peer = new Peer();
  
  peer.on('open', id => {
    myId = id;
    isHost = true;
    document.getElementById('display-id').innerText = id;
    
    // Add Host Player
    gameState.players[id] = { x: 100, y: 100, color: 'cyan' };
    gameState.taggerId = id; // Host starts as "IT"
    
    startGame();
  });

  peer.on('connection', connection => {
    conn = connection;
    setupConnection();
  });
});

// 2. Join Game
document.getElementById('join-btn').addEventListener('click', () => {
  const hostId = document.getElementById('join-id').value;
  peer = new Peer();

  peer.on('open', id => {
    myId = id;
    conn = peer.connect(hostId);
    setupConnection();
    startGame();
  });
});

// Connection Handler
function setupConnection() {
  conn.on('data', data => {
    if (isHost) {
      // Host updates player positions from client inputs
      if (data.type === 'input') {
        gameState.players[conn.peer].x = data.x;
        gameState.players[conn.peer].y = data.y;
      }
    } else {
      // Client receives full game state from host
      if (data.type === 'state') {
        gameState = data.state;
      }
    }
  });

  if (isHost) {
    // Add joining player
    gameState.players[conn.peer] = { x: 400, y: 300, color: 'orange' };
  }
}

function startGame() {
  document.getElementById('lobby').classList.add('hidden');
  document.getElementById('game-container').classList.remove('hidden');
  requestAnimationFrame(gameLoop);
}

// Main Game Loop
function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

function update() {
  if (!gameState.players[myId]) return;

  const speed = 4;
  let p = gameState.players[myId];

  // Movement
  if (keys['ArrowUp'] || keys['w']) p.y -= speed;
  if (keys['ArrowDown'] || keys['s']) p.y += speed;
  if (keys['ArrowLeft'] || keys['a']) p.x -= speed;
  if (keys['ArrowRight'] || keys['d']) p.x += speed;

  // Send updates
  if (!isHost && conn) {
    conn.send({ type: 'input', x: p.x, y: p.y });
  }

  // Host Handles Collisions & Tag Logic
  if (isHost) {
    for (let id in gameState.players) {
      if (id !== gameState.taggerId) {
        let other = gameState.players[id];
        let tagger = gameState.players[gameState.taggerId];
        
        // Simple AABB Collision Check
        if (Math.abs(tagger.x - other.x) < 30 && Math.abs(tagger.y - other.y) < 30) {
          gameState.taggerId = id; // Tag!
        }
      }
    }

    // Host sends synced state to client
    if (conn) conn.send({ type: 'state', state: gameState });
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Players
  for (let id in gameState.players) {
    let p = gameState.players[id];
    ctx.fillStyle = (id === gameState.taggerId) ? 'red' : p.color;
    ctx.fillRect(p.x, p.y, 30, 30);
    
    // Draw Name Label
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.fillText(id === myId ? "YOU" : "PLAYER", p.x, p.y - 5);
  }

  // HUD Update
  const roleText = document.getElementById('role-text');
  if (gameState.taggerId === myId) {
    roleText.innerText = "🚨 YOU ARE IT! TAG THE OTHER PLAYER!";
    roleText.style.color = "red";
  } else {
    roleText.innerText = "🏃 RUN AWAY FROM 'IT'!";
    roleText.style.color = "cyan";
  }
}

// 3. Custom Game Upload System (Loads External Code)
document.getElementById('mod-upload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      // Executes the uploaded JS script dynamically
      const customScript = document.createElement('script');
      customScript.text = evt.target.result;
      document.body.appendChild(customScript);
      alert("Custom Game Mod Uploaded Successfully!");
    } catch (err) {
      alert("Error loading custom game file.");
    }
  };
  reader.readAsText(file);
});
