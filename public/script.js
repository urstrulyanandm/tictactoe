const socket = new WebSocket(`ws://${location.host}`);
let playerSymbol = null;
let currentTurn = null;
let gameOver = false;
let winningLine = [];

function joinRoom() {
  const roomId = document.getElementById('roomInput').value.trim();
  if (!roomId) return;

  const joinPayload = JSON.stringify({ type: 'join', room: roomId });

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(joinPayload);
  } else {
    socket.addEventListener('open', () => {
      socket.send(joinPayload);
    }, { once: true });
  }
}

socket.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === 'init') {
    playerSymbol = msg.symbol;
    currentTurn = msg.turn;
    gameOver = false;
    winningLine = [];
    createBoard(msg.board);
    document.getElementById('playerSymbol').textContent = playerSymbol;
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    document.getElementById('restartBtn').style.display = 'none';
    updateStatus(msg.players);
  }

  if (msg.type === 'update') {
    currentTurn = msg.turn;
    winningLine = msg.winningLine || [];
    createBoard(msg.board);

    // Corrected draw/winner handling
    if (msg.winner === 'X' || msg.winner === 'O') {
      document.getElementById('status').textContent = `${msg.winner} wins!`;
      document.getElementById('restartBtn').style.display = 'inline-block';
      gameOver = true;
    } else if (msg.winner === null && msg.board.every(cell => cell !== null)) {
      document.getElementById('status').textContent = 'Draw!';
      document.getElementById('restartBtn').style.display = 'inline-block';
      gameOver = true;
    } else {
      gameOver = false;
      updateStatus();
    }
  }

  if (msg.type === 'restart') {
    gameOver = false;
    winningLine = [];
    createBoard(msg.board);
    currentTurn = msg.turn;
    updateStatus();
    document.getElementById('restartBtn').style.display = 'none';
  }

  if (msg.type === 'full') {
    alert('Room is full!');
  }
});

function createBoard(board) {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  board.forEach((cell, i) => {
    const div = document.createElement('div');
    div.className = 'cell';
    if (winningLine.includes(i)) div.classList.add('winner');
    div.textContent = cell || '';
    div.addEventListener('click', () => {
      if (!div.textContent && playerSymbol === currentTurn && !gameOver) {
        socket.send(JSON.stringify({ type: 'move', index: i }));
      }
    });
    boardEl.appendChild(div);
  });
}

function updateStatus(players = 2) {
  const status = document.getElementById('status');
  if (players < 2) {
    status.textContent = 'Waiting for opponent...';
  } else if (gameOver) {
    // already handled
  } else {
    status.textContent = currentTurn === playerSymbol ? 'Your move' : 'Opponent\'s move';
  }
}

function restartGame() {
  socket.send(JSON.stringify({ type: 'restart' }));
  document.getElementById('restartBtn').style.display = 'none';
  document.getElementById('status').textContent = 'Waiting for opponent...';
}
