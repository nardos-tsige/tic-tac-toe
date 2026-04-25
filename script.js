// ======================== STATE MANAGEMENT =========================
let gameBoard = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';      // X always starts
let gameActive = true;
let gameMode = 'two';         // 'single' or 'two'
let scores = { X: 0, O: 0 };
let winningCombos = [
  [0,1,2], [3,4,5], [6,7,8],
  [0,3,6], [1,4,7], [2,5,8],
  [0,4,8], [2,4,6]
];
let currentWinnerCombo = null;
let aiTimeout = null;

// DOM Elements
const boardEl = document.getElementById('board');
const singleModeBtn = document.getElementById('singleModeBtn');
const twoModeBtn = document.getElementById('twoModeBtn');
const playerXInput = document.getElementById('playerXName');
const playerOInput = document.getElementById('playerOName');
const scoreXSpan = document.getElementById('scoreX');
const scoreOSpan = document.getElementById('scoreO');
const scoreXNameSpan = document.getElementById('scoreXName');
const scoreONameSpan = document.getElementById('scoreOName');
const turnTextSpan = document.getElementById('turnText');
const restartRoundBtn = document.getElementById('restartRoundBtn');
const resetGameBtn = document.getElementById('resetGameBtn');
const gameToast = document.getElementById('gameToast');
const toastMessageSpan = document.getElementById('toastMessage');

// Helper: Show toast message
function showToast(message, isError = false) {
  toastMessageSpan.innerText = message;
  gameToast.classList.remove('hidden');
  if (isError) gameToast.style.borderLeftColor = '#ef4444';
  else gameToast.style.borderLeftColor = '#facc15';
  setTimeout(() => {
    gameToast.classList.add('hidden');
  }, 2000);
}

// Update UI names from inputs
function updateUINames() {
  let xName = playerXInput.value.trim() || 'X Player';
  let oName = playerOInput.value.trim() || 'O Player';
  scoreXNameSpan.innerText = xName;
  scoreONameSpan.innerText = oName;
  updateTurnDisplay();
}

// Turn display with names
function updateTurnDisplay() {
  let xName = playerXInput.value.trim() || 'X';
  let oName = playerOInput.value.trim() || 'O';
  if (gameActive) {
    let playerName = currentPlayer === 'X' ? xName : oName;
    turnTextSpan.innerHTML = `${playerName}'s turn (${currentPlayer}) <i class="fas fa-${currentPlayer === 'X' ? 'times' : 'circle'}"></i>`;
  }
}

// Render board from gameBoard array
function renderBoard() {
  const cells = document.querySelectorAll('.cell');
  cells.forEach((cell, idx) => {
    cell.innerText = gameBoard[idx] === 'X' ? '✕' : gameBoard[idx] === 'O' ? '○' : '';
    cell.classList.remove('X-move', 'O-move');
    if (gameBoard[idx] === 'X') cell.classList.add('X-move');
    if (gameBoard[idx] === 'O') cell.classList.add('O-move');
    cell.classList.remove('winner-glow');
  });
  if (currentWinnerCombo) {
    currentWinnerCombo.forEach(idx => {
      const cell = document.querySelector(`.cell[data-idx='${idx}']`);
      if (cell) cell.classList.add('winner-glow');
    });
  }
}

// Check winner / draw (pure function)
function checkGameStatus() {
  for (let combo of winningCombos) {
    const [a,b,c] = combo;
    if (gameBoard[a] && gameBoard[a] === gameBoard[b] && gameBoard[a] === gameBoard[c]) {
      gameActive = false;
      currentWinnerCombo = combo;
      scores[gameBoard[a]]++;
      updateScoresUI();
      showToast(`${getPlayerName(gameBoard[a])} wins! 🎉`);
      renderBoard();
      updateTurnDisplay();
      return { winner: gameBoard[a], draw: false };
    }
  }
  if (!gameBoard.includes('')) {
    gameActive = false;
    currentWinnerCombo = null;
    showToast(`✨ DRAW! ✨`, false);
    updateTurnDisplay();
    renderBoard();
    return { winner: null, draw: true };
  }
  return { winner: null, draw: false };
}

function getPlayerName(symbol) {
  if (symbol === 'X') return playerXInput.value.trim() || 'X Player';
  return playerOInput.value.trim() || 'O Player';
}

function updateScoresUI() {
  scoreXSpan.innerText = scores.X;
  scoreOSpan.innerText = scores.O;
}

// Reset round (keep scores & mode, clear board)
function resetRound() {
  if (aiTimeout) clearTimeout(aiTimeout);
  gameBoard = ['', '', '', '', '', '', '', '', ''];
  gameActive = true;
  currentPlayer = 'X';
  currentWinnerCombo = null;
  renderBoard();
  updateTurnDisplay();
  // if single player & currentPlayer is O? Actually X starts, so no AI move needed.
  if (gameMode === 'single' && !gameActive === false) {
    // do nothing, wait for human
  }
}

// Full reset (scores to zero)
function fullReset() {
  scores = { X: 0, O: 0 };
  updateScoresUI();
  resetRound();
  showToast('Game fully reset!', false);
}

// Place move logic (returns boolean success)
function makeMove(index, playerSymbol) {
  if (!gameActive) return false;
  if (gameBoard[index] !== '') return false;
  if (currentPlayer !== playerSymbol) return false;
  
  gameBoard[index] = playerSymbol;
  renderBoard();
  
  const status = checkGameStatus();
  if (status.winner || status.draw) {
    updateTurnDisplay();
    return true;
  }
  
  // Switch turns
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateTurnDisplay();
  
  // AI trigger (single player and game still active and currentPlayer is O and not game over)
  if (gameMode === 'single' && gameActive && currentPlayer === 'O') {
    if (aiTimeout) clearTimeout(aiTimeout);
    aiTimeout = setTimeout(() => computerMove(), 450);
  }
  return true;
}

// ============= SMART AI (win/block/priority) =============
function getBoardState() {
  return [...gameBoard];
}

function simulateWin(board, symbol) {
  for (let combo of winningCombos) {
    let [a,b,c] = combo;
    let values = [board[a], board[b], board[c]];
    if (values.filter(v => v === symbol).length === 2 && values.includes('')) {
      if (board[a] === '') return a;
      if (board[b] === '') return b;
      if (board[c] === '') return c;
    }
  }
  return null;
}

function getBestAIMove() {
  const board = getBoardState();
  // 1. Win move
  let winMove = simulateWin(board, 'O');
  if (winMove !== null) return winMove;
  // 2. Block player win
  let blockMove = simulateWin(board, 'X');
  if (blockMove !== null) return blockMove;
  // 3. Priority: center, corners, edges
  const priority = [4, 0, 2, 6, 8, 1, 3, 5, 7];
  for (let pos of priority) {
    if (board[pos] === '') return pos;
  }
  return null;
}

function computerMove() {
  if (!gameActive || currentPlayer !== 'O' || gameMode !== 'single') return;
  const bestIndex = getBestAIMove();
  if (bestIndex !== null) {
    // add little flash effect on AI cell
    const cellDiv = document.querySelector(`.cell[data-idx='${bestIndex}']`);
    if (cellDiv) {
      cellDiv.style.transform = 'scale(0.95)';
      setTimeout(() => { if(cellDiv) cellDiv.style.transform = ''; }, 200);
    }
    makeMove(bestIndex, 'O');
  }
}

// Create board UI cells
function createBoardUI() {
  boardEl.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.setAttribute('data-idx', i);
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!gameActive) {
        showToast('Game over! Press restart', true);
        return;
      }
      if (gameMode === 'single' && currentPlayer !== 'X') {
        showToast('Wait for AI move...', true);
        return;
      }
      if (gameBoard[i] !== '') {
        // flash red for invalid
        cell.classList.add('invalid-flash');
        setTimeout(() => cell.classList.remove('invalid-flash'), 400);
        return;
      }
      makeMove(i, currentPlayer);
    });
    boardEl.appendChild(cell);
  }
  renderBoard();
}

// Mode switchers with reset
function setMode(mode) {
  gameMode = mode;
  if (mode === 'single') {
    singleModeBtn.classList.add('active');
    twoModeBtn.classList.remove('active');
    showToast('🤖 Single Player vs Smart AI', false);
  } else {
    twoModeBtn.classList.add('active');
    singleModeBtn.classList.remove('active');
    showToast('👥 Two Player Mode: X vs O', false);
  }
  if (aiTimeout) clearTimeout(aiTimeout);
  resetRound();
  // extra AI prevention: if single mode but AI turn right after reset? no because currentPlayer X
}

// Event Listeners
singleModeBtn.addEventListener('click', () => setMode('single'));
twoModeBtn.addEventListener('click', () => setMode('two'));
restartRoundBtn.addEventListener('click', () => resetRound());
resetGameBtn.addEventListener('click', () => fullReset());
playerXInput.addEventListener('input', () => { updateUINames(); renderBoard(); });
playerOInput.addEventListener('input', () => { updateUINames(); renderBoard(); });

// initialization
function init() {
  createBoardUI();
  setMode('two');    // default duo mode
  updateUINames();
  updateScoresUI();
}
init();