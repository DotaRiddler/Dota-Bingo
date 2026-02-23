const socket = io();
let myUsername = "";
let myColor = "";
let allPlayers = [];
let bingoData = {};
let myGrid = []; // Speichert den Zustand des 5x5 Feldes

// 1. BEITRETEN
function join() {
    const nameInput = document.getElementById('username');
    if (nameInput.value.trim() !== "") {
        myUsername = nameInput.value.trim();
        socket.emit('joinGame', myUsername);
        document.getElementById('username').disabled = true;
    }
}

// 2. SPIELERLISTE AKTUALISIEREN
socket.on('updatePlayers', (players) => {
    allPlayers = players;
    const list = document.getElementById('playerList');
    list.innerHTML = "";
    
    players.forEach(p => {
        const span = document.createElement('span');
        span.innerText = p.username;
        span.className = "player-tag";
        span.style.backgroundColor = p.color;
        list.appendChild(span);
        if(p.username === myUsername) myColor = p.color;
    });

    // Start-Button nur anzeigen, wenn man der erste Spieler ist
    if (players.length >= 1 && players[0].username === myUsername) {
        document.getElementById('startBtn').style.display = "block";
    }
});

// 3. SPIEL STARTEN (Logik für die Felder)
function startGame() {
    socket.emit('gameStart');
}

socket.on('initGame', (data) => {
    bingoData = data;
    document.getElementById('lobby').style.display = "none";
    document.getElementById('game').style.display = "block";
    document.getElementById('welcomeMsg').innerText = `Viel Glück, ${myUsername}!`;
    
    generateBingoField();
});

function generateBingoField() {
    const gridElement = document.getElementById('bingoGrid');
    gridElement.innerHTML = "";
    let finalTerms = [];

    // Filter: Alle anderen Spieler (außer ich selbst)
    const otherPlayers = allPlayers.filter(p => p.username !== myUsername);
    
    // Begriffe von anderen Spielern sammeln (jeweils 5)
    otherPlayers.forEach(player => {
        const category = bingoData[player.username] || [];
        const picked = category.sort(() => 0.5 - Math.random()).slice(0, 5);
        picked.forEach(term => finalTerms.push({ text: term, color: player.color }));
    });

    // Rest auffüllen mit "Allgemein" bis wir 25 haben
    const needed = 25 - finalTerms.length;
    const generalPicked = (bingoData["Allgemein"] || []).sort(() => 0.5 - Math.random()).slice(0, needed);
    generalPicked.forEach(term => finalTerms.push({ text: term, color: "#444" }));

    // Zufällig mischen
    finalTerms.sort(() => 0.5 - Math.random());
    myGrid = finalTerms.map(item => ({ ...item, clicked: false }));

    // HTML Elemente erstellen
    myGrid.forEach((item, index) => {
        const cell = document.createElement('div');
        cell.className = "cell";
        cell.innerText = item.text;
        cell.style.backgroundColor = item.color;
        cell.onclick = () => toggleCell(index, cell);
        gridElement.appendChild(cell);
    });
}

// 4. KLICK-LOGIK & WIN-CHECK
function toggleCell(index, element) {
    myGrid[index].clicked = !myGrid[index].clicked;
    element.classList.toggle('marked');
    checkWin();
}

function checkWin() {
    // Gewinnmuster (Indizes im 5x5 Feld)
    const lines = [
        // Horizontal
        [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24],
        // Vertikal
        [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24],
        // Diagonal
        [0,6,12,18,24], [4,8,12,16,20]
    ];

    const hasWon = lines.some(line => line.every(idx => myGrid[idx].clicked));
    if (hasWon) {
        socket.emit('bingo', myUsername);
    }
}

socket.on('announceWinner', (winner) => {
    alert("BINGO! " + winner + " hat gewonnen!");
    location.reload(); // Startet die Lobby neu
});
