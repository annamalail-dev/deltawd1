const rows = 12;
const cols = 6;
const container = document.querySelector(".container");
const clickSound = new Audio("Click_Sound.mp3");
const bombSound = new Audio("meme_bomb_sound.mp3");
let teleportA = null;
let teleportB = null;
let bombCell = null;
clickSound.preload = "auto";
bombSound.preload = "auto";

let board = [];
let currentPlayer = 1;
let firstMove = { 1: true, 2: true };

let redTotal = 0;
let blueTotal = 0;
let history = [];
let redoStack = [];
function generateBomb() {
  let valid = false;

  while (!valid) {
    let r = Math.floor(Math.random() * (rows - 2)) + 1;
    let c = Math.floor(Math.random() * (cols - 2)) + 1;

    valid = true;

    let dirs = [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];

    for (let [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;

      if (
        (nr === teleportA[0] && nc === teleportA[1]) ||
        (nr === teleportB[0] && nc === teleportB[1])
      ) {
        valid = false;
        break;
      }
    }

    if (valid) {
      bombCell = [r, c];
      console.log("Bomb:", r, c);
    }
  }
}
function explodeBomb(r, c) {
  let removedRed = 0;
  let removedBlue = 0;

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      let nr = r + dr;
      let nc = c + dc;

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

      let cell = board[nr][nc];

      if (cell.owner === 1) removedRed += cell.count;
      else if (cell.owner === 2) removedBlue += cell.count;

      cell.count = 0;
      cell.owner = null;

      cell.el.innerHTML = "";
      cell.el.classList.remove("red", "blue", "bomb");
    }
  }

  redTotal -= removedRed;
  blueTotal -= removedBlue;

  bombCell = null;

  console.log("exploded");
}

function saveState() {
  const state = {
    board: board.map((row) =>
      row.map((cell) => ({
        count: cell.count,
        owner: cell.owner,
      })),
    ),
    currentPlayer,
    firstMove: { ...firstMove },
    redTotal,
    blueTotal,
    gameTime,
    turnTime,
  };

  history.push(JSON.stringify(state));
  redoStack = [];
}

function loadState(stateStr) {
  const state = JSON.parse(stateStr);

  currentPlayer = state.currentPlayer;
  firstMove = state.firstMove;
  redTotal = state.redTotal;
  blueTotal = state.blueTotal;
  gameTime = state.gameTime;
  turnTime = state.turnTime;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      board[r][c].count = state.board[r][c].count;
      board[r][c].owner = state.board[r][c].owner;
    }
  }

  render();
  updateDotCount();
  updateDisplay();

  document.body.className = currentPlayer === 1 ? "player1" : "player2";
}

function undo() {
  if (history.length <= 1) return;

  const current = history.pop();
  redoStack.push(current);

  const prev = history[history.length - 1];
  loadState(prev);
}

function redo() {
  if (redoStack.length === 0) return;

  const state = redoStack.pop();
  history.push(state);
  loadState(state);
}
function generateTeleports() {
  while (true) {
    let r1 = Math.floor(Math.random() * (rows - 2)) + 1;
    let c1 = Math.floor(Math.random() * (cols - 2)) + 1;

    let r2 = Math.floor(Math.random() * (rows - 2)) + 1;
    let c2 = Math.floor(Math.random() * (cols - 2)) + 1;

    if (r1 === r2 && c1 === c2) continue;
    if (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1) continue;

    teleportA = [r1, c1];
    teleportB = [r2, c2];
    break;
  }
}

function initBoard() {
  generateTeleports();
  generateBomb();

  container.innerHTML = "";
  board = [];

  redTotal = 0;
  blueTotal = 0;

  for (let r = 0; r < rows; r++) {
    let row = [];

    for (let c = 0; c < cols; c++) {
      let cell = document.createElement("div");

      // teleport
      if (
        (r === teleportA[0] && c === teleportA[1]) ||
        (r === teleportB[0] && c === teleportB[1])
      ) {
        cell.classList.add("teleport");
      }

      if (bombCell && r === bombCell[0] && c === bombCell[1]) {
        cell.classList.add("bomb");
      }

      cell.classList.add("cell");
      cell.addEventListener("click", () => handleClick(r, c));

      container.appendChild(cell);

      row.push({
        count: 0,
        owner: null,
        el: cell,
      });
    }

    board.push(row);
  }

  saveState();
}
function getCapacity(r, c) {
  let cap = 4;
  if (r === 0 || r === rows - 1) cap--;
  if (c === 0 || c === cols - 1) cap--;
  return cap;
}

function handleClick(r, c) {
  if (isPaused) return;

  let cell = board[r][c];

  if (cell.owner !== null && cell.owner !== currentPlayer) return;

  let willExplode = false;

  if (firstMove[currentPlayer] && cell.count === 0) {
    let added = getCapacity(r, c) - 1;

    if (added >= getCapacity(r, c)) {
      willExplode = true;
    }

    if (!willExplode) {
      clickSound.currentTime = 0;
      clickSound.play();
    }

    cell.count = added;
    cell.owner = currentPlayer;
    firstMove[currentPlayer] = false;

    if (currentPlayer === 1) redTotal += added;
    else blueTotal += added;
  } else {
    if (cell.owner === null) return;
    if (cell.count + 1 >= getCapacity(r, c)) {
      willExplode = true;
    }

    if (!willExplode) {
      clickSound.currentTime = 0;
      clickSound.play();
    }

    cell.count++;
    cell.owner = currentPlayer;

    if (currentPlayer === 1) redTotal++;
    else blueTotal++;
  }

  explodeChain();
  if (checkWinner()) {
    clearAllTimers();
  }
  render();
  updateDotCount();

  currentPlayer = currentPlayer === 1 ? 2 : 1;

  document.body.className = currentPlayer === 1 ? "player1" : "player2";

  turnTime = 30;
  updateDisplay();

  saveState();
}

function explodeChain() {
  let queue = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].count >= getCapacity(r, c)) {
        queue.push([r, c]);
      }
    }
  }

  while (queue.length > 0) {
    let [r, c] = queue.shift();
    let cell = board[r][c];

    if (cell.count < getCapacity(r, c)) continue;

    let owner = cell.owner;

    cell.count = 0;
    cell.owner = null;
    bombSound.currentTime = 0;
    bombSound.play();

    let triggeredBomb = null;

    let dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    for (let [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;

      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        let neighbor = board[nr][nc];

        let targetR = nr;
        let targetC = nc;

        if (nr === teleportA[0] && nc === teleportA[1]) {
          targetR = teleportB[0];
          targetC = teleportB[1] - 1;
        } else if (nr === teleportB[0] && nc === teleportB[1]) {
          targetR = teleportA[0];
          targetC = teleportA[1] - 1;
        }

        if (targetC < 0) targetC = 0;
        if (targetC >= cols) targetC = cols - 1;
        let targetCell = board[targetR][targetC];

        targetCell.count++;
        targetCell.owner = owner;

        if (owner === 1) redTotal++;
        else blueTotal++;

        if (bombCell && targetR === bombCell[0] && targetC === bombCell[1]) {
          triggeredBomb = [targetR, targetC];
          continue;
        }

        if (targetCell.count >= getCapacity(targetR, targetC)) {
          queue.push([targetR, targetC]);
        }
      }
    }

    if (triggeredBomb) {
      explodeBomb(triggeredBomb[0], triggeredBomb[1]);
    }
  }
}

function render() {
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.innerHTML = "";
  });

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let cell = board[r][c];
      let el = cell.el;

      if (cell.owner) {
        for (let i = 0; i < cell.count; i++) {
          let dot = document.createElement("div");
          dot.classList.add("dot");
          dot.classList.add(cell.owner === 1 ? "red" : "blue");

          dot.style.top = `${10 + (i % 2) * 12}px`;
          dot.style.left = `${10 + Math.floor(i / 2) * 12}px`;

          el.appendChild(dot);
        }
      }
    }
  }
}

function updateDotCount() {
  document.getElementById("redCount").textContent = "🔴 Red: " + redTotal;

  document.getElementById("blueCount").textContent = "🔵 Blue: " + blueTotal;
}

function checkWinner() {
  let red = false;
  let blue = false;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].owner === 1) red = true;
      if (board[r][c].owner === 2) blue = true;
    }
  }

  if (!firstMove[1] && !firstMove[2]) {
    if (red && !blue) {
      setTimeout(() => {
        alert("🔴 Red Wins!");
        location.reload();
      }, 300);
      return true;
    }

    if (blue && !red) {
      setTimeout(() => {
        alert("🔵 Blue Wins!");
        location.reload();
      }, 300);
      return true;
    }

    if (!red && !blue) {
      redTotal = 0;
      blueTotal = 0;

      document.getElementById("redCount").textContent = "🔴 Red: " + redTotal;
      document.getElementById("blueCount").textContent =
        "🔵 Blue: " + blueTotal;

      setTimeout(() => {
        alert("Everyone was wiped out! It's a Draw!");
        location.reload();
      }, 300);
      return true;
    }
  }

  return false;
}

let gameTime = 600;
let turnTime = 30;

let gameInterval;
let turnInterval;
let isPaused = false;

const bigTimer = document.getElementById("bigtimer");
const turnTimer = document.getElementById("timer");
const pauseBtn = document.getElementById("pausebtn");

function formatTime(t) {
  let min = Math.floor(t / 60);
  let sec = String(t % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

function updateDisplay() {
  bigTimer.textContent = "Game Time: " + formatTime(gameTime);

  turnTimer.textContent =
    (currentPlayer === 1 ? "Player 1 (Red): " : "Player 2 (Blue): ") +
    formatTime(turnTime);
}

function startTimers() {
  updateDisplay();

  gameInterval = setInterval(() => {
    if (isPaused) return;

    gameTime--;
    updateDisplay();

    if (gameTime <= 0) {
      clearAllTimers();

      if (redTotal > blueTotal) alert("Red Wins!");
      else if (blueTotal > redTotal) alert("Blue Wins!");
      else alert("Draw!");
    }
  }, 1000);

  turnInterval = setInterval(() => {
    if (isPaused) return;

    turnTime--;
    updateDisplay();

    if (turnTime < 0) {
      turnTime = 30;
      currentPlayer = currentPlayer === 1 ? 2 : 1;

      document.body.className = currentPlayer === 1 ? "player1" : "player2";

      updateDisplay();
    }
  }, 1000);
}

function clearAllTimers() {
  clearInterval(gameInterval);
  clearInterval(turnInterval);
}

pauseBtn.addEventListener("click", () => {
  isPaused = !isPaused;
  pauseBtn.innerText = isPaused ? "Resume" : "Pause";
});

document.getElementById("undobtn").addEventListener("click", undo);
document.getElementById("redobtn").addEventListener("click", redo);
initBoard();
updateDotCount();
startTimers();
