const socket = io();
let selectedName = null;
let myUsername = "";
let myColor = "";
let allPlayers = [];
let myGrid = []; // Speichert den Zustand des 5x5 Feldes

// 1. BEITRETEN
function join() {
    if (selectedName) {
        myUsername = selectedName;
        socket.emit('join', myUsername);
        
        // UI Elemente ausblenden
        document.getElementById('namePicker').style.display = "none";
        document.getElementById('joinBtn').style.display = "none";
        const p = document.querySelector('#lobby p');
        if(p) p.style.display = "none";
    }
}

// 2. SPIELERLISTE & NAMENSWAHL
socket.on('updatePlayers', (players) => {
    allPlayers = players;
    const list = document.getElementById('playerList');
    if (!list) return;
    list.innerHTML = "";
    
    players.forEach(p => {
        const span = document.createElement('span');
        span.innerText = p.username;
        span.className = "player-tag";
        span.style.backgroundColor = p.color;
        list.appendChild(span);
        if(p.username === myUsername) myColor = p.color;
    });

    // Start-Button nur für den ersten Spieler (Host) anzeigen
    const startBtn = document.getElementById('startBtn');
    if (players.length >= 1 && players[0].username === myUsername) {
        startBtn.style.display = "block";
    } else {
        startBtn.style.display = "none";
    }
});

socket.on('availableNames', (names) => {
    const picker = document.getElementById('namePicker');
    if (!picker) return;
    
    // Falls gewählter Name weg ist
    if (selectedName && !names.includes(selectedName)) {
        selectedName = null;
        const joinBtn = document.getElementById('joinBtn');
        joinBtn.disabled = true;
        joinBtn.innerText = "Zuerst Namen wählen";
    }

    picker.innerHTML = ""; 
    names.forEach(name => {
        const btn = document.createElement('button');
        btn.innerText = name;
        btn.className = "name-select-btn";
        if(name === selectedName) btn.classList.add('active-name');
        
        btn.onclick = () => selectName(name, btn);
        picker.appendChild(btn);
    });
});

function selectName(name, element) {
    selectedName = name;
    document.querySelectorAll('.name-select-btn').forEach(b => {
        b.classList.remove('active-name');
    });
    element.classList.add('active-name');
    
    const joinBtn = document.getElementById('joinBtn');
    joinBtn.disabled = false;
    joinBtn.innerText = `${name} beitreten`;
}

// 3. SPIEL-LOGIK
function startGame() {
    socket.emit('gameStart');
}

// Empfange das fertige Board vom Server
socket.on('initGame', (board) => {
    // Wir speichern das ganze Objekt (text und color) und fügen 'clicked' hinzu
    myGrid = board.map(item => ({ 
        text: item.text, 
        color: item.color, 
        clicked: false 
    }));
    
    document.getElementById('welcomeMsg').innerText = `Viel Glück, ${myUsername}!`;
    updateActiveSidebar();
});

// Signal vom Host, dass es jetzt wirklich losgeht
socket.on('startGameNow', () => {
    document.getElementById('lobby').style.display = "none";
    document.getElementById('game').style.display = "block";
    renderBingoField();
});

function updateActiveSidebar() {
    const sidebarList = document.getElementById('activePlayerList');
    if (!sidebarList) return;
    sidebarList.innerHTML = "";
    
    allPlayers.forEach(p => {
        const span = document.createElement('span');
        span.innerText = p.username;
        span.className = "player-tag";
        span.style.backgroundColor = p.color;
        sidebarList.appendChild(span);
    });
}

function renderBingoField() {
    const gridElement = document.getElementById('bingoGrid');
    if (!gridElement) return;
    gridElement.innerHTML = "";

    myGrid.forEach((item, index) => {
        const cell = document.createElement('div');
        cell.className = "cell";
        
        // WICHTIG: .text aufrufen!
        cell.innerText = item.text; 
        
        // Die Farbe des Spielers dezent als Rahmen unten anzeigen
        cell.style.borderBottom = `5px solid ${item.color}`;
        
        // Falls das Feld markiert ist (wichtig für die Klick-Logik)
        if(item.clicked) cell.classList.add('marked');
        
        cell.onclick = () => toggleCell(index, cell);
        gridElement.appendChild(cell);
    });
}

function toggleCell(index, element) {
    myGrid[index].clicked = !myGrid[index].clicked;
    
    if (myGrid[index].clicked) {
        element.classList.add('marked');
        // Optional: Die Zelle bekommt beim Klick einen dunkleren Hintergrund
        element.style.backgroundColor = "rgba(164, 35, 35, 0.6)"; 
    } else {
        element.classList.remove('marked');
        element.style.backgroundColor = "#222"; // Zurück zur Standardfarbe
    }
    
    checkWin();
}

function checkWin() {
    const lines = [
        [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
        [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
        [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
    ]; 

    const hasWon = lines.some(line => line.every(idx => myGrid[idx] && myGrid[idx].clicked));
    
    if (hasWon) {
        socket.emit('bingo', myUsername);
    }
}


        socket.on('announceWinner', (winner) => {
    const overlay = document.getElementById('winnerOverlay');
    const nameDisplay = document.getElementById('winnerNameDisplay');
    
    // Den Namen des Gewinners anzeigen
    nameDisplay.innerText = `${winner} hat BINGO!`;
    
    // Das Overlay sichtbar machen
    overlay.style.display = "flex";

    // Optional: Ein kleiner Soundeffekt, falls du eine Datei hast
    // let audio = new Audio('victory_sound.mp3');
    // audio.play();
});

