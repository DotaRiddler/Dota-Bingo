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

// Einheitlich kleingeschrieben: bingoData
const bingoData = {
    "Allgemein": [
        "Kurier stirbt", "Aegis geklaut", "Rampage", "First Blood", 
        "Turm fällt", "Roshan", "Divines Kauf", "Pause", "GG wp", "Rage Quit", 
        "Rülpser", "Zucker", "Mid lost", "Smurf", "inhouse", "AFK", "Throw", 
        "Comeback", "Schreie", "Russen", "Zuschauer joinen", "Pipi", 
        "BB", "CC", "DD", "EE"
    ],
    "Shockwave": ["Begriff A1", "Begriff A2", "Begriff A3",
                  "Begriff A4", "Begriff A5", "Begriff A6"],
    "Schocki": ["Begriff B1", "Begriff B2", "Begriff B3", 
                "Begriff B4", "Begriff B5", "Begriff B6"],
    "Jerrylarry": ["Begriff C1", "Begriff C2", "Begriff C3",
                   "Begriff C4", "Begriff C5", "Begriff C6"],
    "Nobody": ["Begriff D1", "Begriff D2", "Begriff D3",
               "Begriff D4", "Begriff D5", "Begriff D6"],
    "Brezel": ["Begriff B1", "Begriff B2", "Begriff B3", 
               "Begriff B4", "Begriff B5", "Begriff B6"],
    "Barid": ["Begriff C1", "Begriff C2", "Begriff C3", 
              "Begriff C4", "Begriff C5", "Begriff C6"],
    "Dome": ["Begriff D1", "Begriff D2", "Begriff D3", 
             "Begriff D4", "Begriff D5", "Begriff D6"]
};

io.on('connection', (socket) => {
    
    // Hilfsfunktion zum Senden der freien Namen
    const sendAvailableNames = () => {
        const allKeys = Object.keys(bingoData); 
        const playerNamesOnly = allKeys.filter(name => name !== "Allgemein");
        const takenNames = Object.values(players).map(p => p.username);
        const freeNames = playerNamesOnly.filter(name => !takenNames.includes(name));
        io.emit('availableNames', freeNames);
    };

    sendAvailableNames();

    socket.on('join', (name) => {
        // Falls der Name in bingoData existiert, erstellen wir das Board
        if (bingoData[name]) {
            // Kombiniere Allgemein + Spieler-spezifisch
            let combinedPool = [...bingoData["Allgemein"], ...bingoData[name]];
            
            // Zufällige Auswahl von 25 Begriffen
            let shuffled = combinedPool.sort(() => 0.5 - Math.random());
            let board = shuffled.slice(0, 25);

            players[socket.id] = { 
                username: name, 
                color: COLORS[Object.keys(players).length % COLORS.length],
                board: board 
            };

            sendAvailableNames();
            io.emit('updatePlayers', Object.values(players));
            
            // Schicke dem Spieler sein individuelles Board
            socket.emit('initGame', board);
        }
    });

    socket.on('gameStart', () => {
        // Da jeder sein Board schon beim Joinen bekommt, 
        // signalisieren wir hier nur noch den Start des Layouts
        io.emit('startGameNow'); 
    });

    socket.on('bingo', (name) => {
        io.emit('announceWinner', name);
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        sendAvailableNames();
        io.emit('updatePlayers', Object.values(players));
    });
}); // Hier endet io.on('connection') korrekt

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
