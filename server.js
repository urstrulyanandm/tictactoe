const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game state per room
const rooms = new Map();

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    if (data.type === 'join') {
      const roomId = data.room;
      console.log('Player joining room:', roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          players: [],
          board: Array(9).fill(null),
          turn: 'X',
          winner: null
        });
      }

      const room = rooms.get(roomId);

      if (room.players.length >= 2) {
        ws.send(JSON.stringify({ type: 'full' }));
        return;
      }

      ws.symbol = room.players.length === 0 ? 'X' : 'O';
      ws.roomId = roomId;
      room.players.push(ws);

      ws.send(JSON.stringify({
        type: 'init',
        symbol: ws.symbol,
        board: room.board,
        turn: room.turn,
        players: room.players.length
      }));

      if (room.players.length === 2) {
        room.players.forEach(p => p.send(JSON.stringify({ type: 'start' })));
      }
    }

    if (data.type === 'move') {
      const room = rooms.get(ws.roomId);
      if (!room) return;

      const index = data.index;
      if (room.board[index] !== null || room.turn !== ws.symbol || room.winner) return;

      room.board[index] = ws.symbol;

      const winner = checkWinner(room.board);
      const isDraw = !winner && room.board.every(cell => cell !== null);

      if (winner) {
        room.winner = winner;
      } else if (isDraw) {
        room.winner = null;
      } else {
        room.turn = ws.symbol === 'X' ? 'O' : 'X';
      }

      room.players.forEach(p =>
        p.send(JSON.stringify({
          type: 'update',
          board: room.board,
          turn: room.turn,
          winner: room.winner,
          winningLine: winner ? getWinningLine(room.board, winner) : null
        }))
      );
    }

    if (data.type === 'restart') {
      const room = rooms.get(ws.roomId);
      if (!room) return;

      room.board = Array(9).fill(null);
      room.turn = 'X';
      room.winner = null;

      room.players.forEach(p =>
        p.send(JSON.stringify({
          type: 'restart',
          board: room.board,
          turn: room.turn
        }))
      );
    }
  });

  ws.on('close', () => {
    const room = rooms.get(ws.roomId);
    if (room) {
      room.players = room.players.filter(p => p !== ws);
      if (room.players.length === 0) {
        rooms.delete(ws.roomId);
      }
    }
  });
});

function checkWinner(b) {
  const lines = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];
  for (let [a, b1, c] of lines) {
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) {
      return b[a];
    }
  }
  return null;
}

function getWinningLine(b, symbol) {
  const lines = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];
  for (let line of lines) {
    const [a, b1, c] = line;
    if (b[a] === symbol && b[b1] === symbol && b[c] === symbol) {
      return line;
    }
  }
  return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
