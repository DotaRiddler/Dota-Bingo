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
        "Kurier stirbt", "Aegis geklaut", "Rampage für dein Team", "First Blood für dein Team", 
        "Dein Team gewinnt", "Divine Rapier", "Pause", "Russen im Spiel", "Rage Quit", 
        "Jemand rülpst", "AFK", "Buyback", "Pudge im Spiel", "Jemand schreit", "Roshan vor 25 min", "Mega Creeps vor 40 min",
        "Toxischer Gegner Chat", "Zuschauer will Stream", "Deinen Lane Tower vor 15 min zerstört", 
        "Rax vor 30 min zerstört", "DC", "1. Tormentor vor 30 min", "Du hast 6 Kills / Assists bis 15 min", 
        "Du bist Godlike", "Du hast einen Triple Kill", "Du nimmst Aegis", "Du hast keinen Tod bis 20 min", "Du smoke ganks erfolgreich"
    ],
    "Shockwave": ["unbekanntes Wort", "Sprichwort", "Dad joke", "wird 2x in Midlane geganked", "Lass mal smoken", "Hab Freefarm", "macht Firstblood", "feeded 3 mal vor 10. min"],
    "Schoki": ["Hiiiilfeee", "Coolio", "pick WR", "Forcestaff Mobbing", "Klaut Lasthit", "Weini, Weini", "Lasthitlilly"],
    "Jerrylarry": ["I blame Klausi", "Lob an Schocki", "miau", "Klausi Alarm", "spielt Rolli Boy", "Skill issue", "Klausiiii", "Das ist bodenlos"],
    "Nobody": ["Ich kann nicht mehr", "ey Leude", "pick Techies", "pick AM", "wiederholt Witz", "Smurfed"],
    "Brezel": ["Was soll ich bauen", "Neiiiin", "meeeh hab Angst", "ist verwirrt", "pick Snapfire", "Isst etwas"],
    "Barid": ["pick Rubick", "Ausraster", "was ist das für ne Scheiße", "Dagon", "erzählt von Kacke", "besoffen", "traurig weil kein Rubick", "mit Jerry streiten"],
    "Dome": ["AFK beim Pick", "full Mute", "Snippy Pippy", "HA HA", "Meteor Hammer"],
    "Noctex": ["Pick mir Arcana Held", "Braucht wer Skin XY"],
    "Spacy": ["Leise wegen Freundin", "Berlinert", "Lacht sich schlapp", "Ich hasse Sniper"]
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
