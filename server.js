const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let players = {};
const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6", "#e67e22", "#1abc9c"];

const bingoData = {
    "Allgemein": [
        "Kurier stirbt", "Aegis geklaut", "Rampage", "First Blood", 
        "Turm fällt", "Roshan", "Divines Kauf", "Pause", "Russisch", "Rage Quit", 
        "Rülpser", "1. Tormentor in 30 min", "Mid lost", "Smurf", "inhouse", "AFK", "Throw", 
        "Comeback", "Schreie", "Russen", "Zuschauer joinen", "Pipi", 
        "BB", "CC", "DD", "EE"
    ],
    "Shockwave": ["unbekanntes Wort", "Begriff A2", "Begriff A3", "Begriff A4", "Begriff A5", "Begriff A6"],
    "Schoki": ["Hiiiilfeee", "Wowi", "Coolio", "pick WR", "Forcestaff Mobbing", "Klaut Lasthit", "Weini, Weini", "Lasthitlilly", "Mmmmh Mmmmh Mmmmh"],
    "Jerrylarry": ["I blame Klausi", "Lob an Schocki", "miau", "Klausi Alarm", "spielt Rolli Boy", "Hamdulilla", "Klausiiii"],
    "Nobody": ["Ich kann nicht mehr", "ey Leude", "picked Techies", "Grief Pick", "Begriff D5", "Begriff D6"],
    "Brezel": ["Was soll ich bauen", "Neiiiin", "meeeh hab Angst", "ist verwirrt", "Begriff B5", "Begriff B6"],
    "Barid": ["spielt Rubick", "Ausraster", "was ist das für ne Scheiße", "lass mal dagon bauen", "erzählt von kacke", "besoffen", "traurig weil kein Rubick"],
    "Dome": ["AFK in Pickphase", "Begriff D2", "Begriff D3", "Begriff D4", "Begriff D5", "Begriff D6"]
};

function sendAvailableNamesToAll() {
    const allKeys = Object.keys(bingoData); 
    const playerNamesOnly = allKeys.filter(name => name !== "Allgemein");
    const takenNames = Object.values(players).map(p => p.username);
    const freeNames = playerNamesOnly.filter(name => !takenNames.includes(name));
    io.emit('availableNames', freeNames);
}

io.on('connection', (socket) => {
    console.log('Neuer User verbunden:', socket.id);
    
    const allKeys = Object.keys(bingoData); 
    const playerNamesOnly = allKeys.filter(name => name !== "Allgemein");
    const takenNames = Object.values(players).map(p => p.username);
    const freeNames = playerNamesOnly.filter(name => !takenNames.includes(name));
    socket.emit('availableNames', freeNames); 

    socket.on('join', (name) => {
        if (bingoData[name]) {
            players[socket.id] = { 
                username: name, 
                color: COLORS[Object.keys(players).length % COLORS.length]
            };
            sendAvailableNamesToAll();
            io.emit('updatePlayers', Object.values(players));
        }
    });

    socket.on('gameStart', () => {
        const connectedPlayers = Object.values(players);
        Object.keys(players).forEach(socketId => {
            const currentPlayer = players[socketId];
            let boardPool = [];
            connectedPlayers.forEach(p => {
                if (p.username !== currentPlayer.username) {
                    const category = bingoData[p.username] || [];
                    const shuffledCategory = [...category].sort(() => 0.5 - Math.random());
                    const picked = shuffledCategory.slice(0, 5);
                    picked.forEach(text => boardPool.push({ text: text, color: p.color }));
                }
            });
            let needed = 25 - boardPool.length;
            const generalShuffled = [...bingoData["Allgemein"]].sort(() => 0.5 - Math.random());
            const pickedGeneral = generalShuffled.slice(0, Math.max(0, needed));
            pickedGeneral.forEach(text => boardPool.push({ text: text, color: "#444444" }));
            let finalBoard = boardPool.sort(() => 0.5 - Math.random()).slice(0, 25);
            io.to(socketId).emit('initGame', finalBoard);
        });
        io.emit('startGameNow');
    });

    socket.on('bingo', (data) => {
        io.emit('announceWinner', data);
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        sendAvailableNamesToAll();
        io.emit('updatePlayers', Object.values(players));
        console.log('User getrennt');
    });
}); // Diese Klammer hat gefehlt!

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
