const socket = io();
let selectedName = null;
let myUsername = "";
let myGrid = [];
let allPlayers = [];

if (document.getElementById('joinBtn')) {
    document.getElementById('joinBtn').disabled = true;
}

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

function join() {
    if (selectedName) {
        myUsername = selectedName;
        socket.emit('join', selectedName);
        document.getElementById('joinBtn').style.display = "none";
        document.getElementById('namePicker').style.display = "none";
        console.log("Joined as " + myUsername);
    }
}

socket.on('updatePlayers', (players) => {
    allPlayers = players; 
    renderPlayerList(players, 'playerList'); 
    if (document.getElementById('game').style.display === "block") {
        updateActiveSidebar(); 
    }
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        if (players.length > 0 && players[0].username === myUsername) {
            startBtn.style.display = "block";
        } else {
            startBtn.style.display = "none";
        }
    }
});

function startGame() {
    socket.emit('gameStart');
}

socket.on('initGame', (finalBoard) => {
    myGrid = finalBoard.map(item => ({ ...item, clicked: false }));
    document.getElementById('lobby').style.display = "none";
    document.getElementById('game').style.display = "block";
    document.getElementById('gameLogContainer').style.display = "block";
    document.querySelector('h1').innerText = "Bingo";
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
            socket.emit('logAction', {
                name: myUsername,
                text: `markiert: "${item.text}"`
            });
        };
        gridElement.appendChild(cell);
    });
} // <--- Hier war die erste fehlende Klammer!

function checkWin() {
    const lines = [
        [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24],
        [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24],
        [0,6,12,18,24], [4,8,12,16,20]
    ];

    let maxInRow = 0;
    lines.forEach(line => {
        const count = line.filter(index => myGrid[index] && myGrid[index].clicked).length;
        if (count > maxInRow) maxInRow = count;
    });

    // WICHTIG: Dem Server sagen, wie weit wir sind
    socket.emit('updateProgress', { maxInRow: maxInRow });

    if (maxInRow === 5) {
        console.log("BINGO gefunden!");
        socket.emit('bingo', { name: myUsername, grid: myGrid });
    }
}

// Log-Empfänger (JETZT AN DER RICHTIGEN STELLE)
socket.on('updateLog', (data) => {
    addLog(data.name, data.color || "white", data.text);
});

socket.on('announceWinner', (data) => {
    const overlay = document.getElementById('winnerOverlay');
    const nameDisplay = document.getElementById('winnerNameDisplay');
    if (!overlay || !nameDisplay) return;

    nameDisplay.innerText = `${data.name} hat BINGO!`;
    
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

    overlay.classList.add('active');
});

function addLog(playerName, playerColor, actionText) {
    const logElement = document.getElementById('gameLog');
    if (!logElement) return;
    const entry = document.createElement('div');
    entry.className = "log-entry";
    entry.innerHTML = `<span style="color: ${playerColor}"><strong>${playerName}:</strong></span> ${actionText}`;
    logElement.appendChild(entry);
    logElement.scrollTop = logElement.scrollHeight;
}
