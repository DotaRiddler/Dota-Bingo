const socket = io();
let selectedName = null;
let myUsername = "";
let myGrid = [];
let allPlayers = []; // Global speichern für die Sidebar

// 1. Namen empfangen
socket.on('availableNames', (names) => {
    const picker = document.getElementById('namePicker');
    if (!picker) return;
    picker.innerHTML = ""; 
    names.forEach(name => {
        const btn = document.createElement('button');
        btn.innerText = name;
        btn.className = "name-select-btn";
        btn.onclick = () => {
            selectedName = name;
            document.querySelectorAll('.name-select-btn').forEach(b => b.classList.remove('active-name'));
            btn.classList.add('active-name');
            const joinBtn = document.getElementById('joinBtn');
            joinBtn.disabled = false;
            joinBtn.innerText = `${name} beitreten`;
        };
        picker.appendChild(btn);
    });
});

// 2. Beitreten Funktion
function join() {
    if (selectedName) {
        myUsername = selectedName;
        socket.emit('join', selectedName);
        
        // UI-Wechsel in der Lobby
        document.getElementById('joinBtn').style.display = "none";
        document.getElementById('namePicker').style.display = "none";
        console.log("Joined as " + myUsername);
    }
}

// 3. Hilfsfunktion für Spielerlisten
function renderPlayerList(players, elementId) {
    const list = document.getElementById(elementId);
    if (!list) return;
    list.innerHTML = "";
    players.forEach(p => {
        const span = document.createElement('span');
        span.innerText = p.username;
        span.className = "player-tag";
        span.style.backgroundColor = p.color;
        list.appendChild(span);
    });
}

// 4. Spieler-Updates verarbeiten (ZENTRAL)
socket.on('updatePlayers', (players) => {
    allPlayers = players; 
    
    // Lobby-Liste aktualisieren
    renderPlayerList(players, 'playerList'); 
    
    // Sidebar-Liste aktualisieren (falls Spiel läuft)
    if (document.getElementById('game').style.display === "block") {
        updateActiveSidebar(); 
    }

    // Host-Check für den Start-Button
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        if (players.length > 0 && players[0].username === myUsername) {
            startBtn.style.display = "block";
        } else {
            startBtn.style.display = "none";
        }
    }
});

// 5. Spielstart auslösen
function startGame() {
    socket.emit('gameStart');
}

// 6. Grid empfangen und Spiel starten
socket.on('initGame', (finalBoard) => {
    myGrid = finalBoard.map(item => ({ ...item, clicked: false }));
    
    document.getElementById('lobby').style.display = "none";
    document.getElementById('game').style.display = "block";
    
    renderBingoField();
    updateActiveSidebar();
});

function updateActiveSidebar() {
    const sidebar = document.getElementById('activePlayerList');
    if (!sidebar) return;
    sidebar.innerHTML = "";
    
    allPlayers.forEach(p => {
        const div = document.createElement('div');
        div.className = "player-tag";
        div.style.backgroundColor = p.color;
        div.innerText = p.username;
        sidebar.appendChild(div);
    });
}

function renderBingoField() {
    const gridElement = document.getElementById('bingoGrid');
    if (!gridElement) return;
    gridElement.innerHTML = "";
    
    myGrid.forEach((item, index) => {
        const cell = document.createElement('div');
        cell.className = "cell";
        cell.innerText = item.text;
        cell.style.borderBottom = `5px solid ${item.color}`;
        if (item.clicked) cell.classList.add('marked');

        cell.onclick = () => {
            myGrid[index].clicked = !myGrid[index].clicked;
            cell.classList.toggle('marked');
            checkWin();
        };
        gridElement.appendChild(cell);
    });
}

function checkWin() {
    const lines = [
        [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24], // H
        [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24], // V
        [0,6,12,18,24], [4,8,12,16,20] // D
    ];

    const won = lines.some(line => line.every(index => myGrid[index] && myGrid[index].clicked));

    if (won) {
        console.log("BINGO gefunden!");
        socket.emit('bingo', { name: myUsername, grid: myGrid });
    }
}

// 7. Sieges-Nachricht empfangen
socket.on('announceWinner', (data) => {
    const overlay = document.getElementById('winnerOverlay');
    const nameDisplay = document.getElementById('winnerNameDisplay');
    
    if (!overlay || !nameDisplay) return;

    nameDisplay.innerText = `${data.name} hat BINGO!`;
    
    // Sieger-Grid Preview erstellen
    let previewHTML = `<div id="winningGridPreview" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; margin: 20px auto; max-width: 300px;">`;
    
    data.grid.forEach(item => {
        const color = item.clicked ? "rgba(164, 35, 35, 0.9)" : "#333";
        const textColor = item.clicked ? "white" : "#777";
        const border = item.clicked ? "1px solid gold" : "1px solid #444";
        previewHTML += `<div style="background: ${color}; color: ${textColor}; border: ${border}; font-size: 0.6rem; padding: 5px; aspect-ratio: 1/1; display: flex; align-items: center; justify-content: center; text-align: center; border-radius: 3px;">${item.text}</div>`;
    });
    previewHTML += `</div>`;

    const oldPreview = document.getElementById('winningGridPreview');
    if (oldPreview) oldPreview.remove();
    
    const content = overlay.querySelector('.overlay-content');
    const button = content.querySelector('button');
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = previewHTML;
    content.insertBefore(tempDiv.firstChild, button);

    overlay.style.display = "flex";
});
