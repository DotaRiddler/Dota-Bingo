JavaScript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let players = {};
const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6"];

// Hier definierst du deine Kategorien und Begriffe
const DATA = {
    "Allgemein": ["Kurier stirbt", "Aegis geklaut", "Rampage", "First Blood", "Turm fällt", "Roshan", "Divines Kauf", "Pause", "GG wp", "Rage Quit"],
    "Spieler1": ["Begriff A1", "Begriff A2", "Begriff A3", "Begriff A4", "Begriff A5", "Begriff A6"],
    "Spieler2": ["Begriff B1", "Begriff B2", "Begriff B3", "Begriff B4", "Begriff B5", "Begriff B6"],
    // Füge hier weitere Spieler und Begriffe hinzu
};

io.on('connection', (socket) => {
    socket.on('joinGame', (username) => {
        if (Object.keys(players).length < 5) {
            players[socket.id] = { 
                username, 
                color: COLORS[Object.keys(players).length] 
            };
            io.emit('updatePlayers', Object.values(players));
        }
    });

    socket.on('gameStart', () => {
        io.emit('initGame', DATA);
    });

    socket.on('bingo', (name) => {
        io.emit('announceWinner', name);
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('updatePlayers', Object.values(players));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
