const socket = io();
let selectedName = null;
let myUsername = "";
let myColor = "";
let allPlayers = [];
let myGrid = [];

console.log("Dota Bingo geladen...");

// 1. NAMENS-AUSWAHL & LOBBY
socket.on('availableNames', (names) => {
    console.log("Namen vom Server erhalten:", names);
    const picker = document.getElementById('namePicker');
    if (!picker) return;
    
    picker.innerHTML = ""; 
    names.forEach(name => {
        const btn = document.createElement('button');
        btn.innerText = name;
        btn.className = "name-select-btn";
        if(name === selectedName) btn.classList.add('active-name');
        
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
        socket.emit('join', myUsername);
        document.getElementById('lobby').style.display = "none";
        document.getElementById('game').style.display = "block";
    }
}

socket.on('updatePlayers', (players) => {
    allPlayers = players;
    const list = document.getElementById('playerList');
    if (list) {
        list.innerHTML = "";
        players.forEach(p => {
            const span = document.createElement('span');
            span.innerText = p.username;
            span.className = "player-tag";
            span.style.backgroundColor = p.color;
            list.appendChild(span);
        });
    }

    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.style.display = (players.length >= 1 && players[0].username === myUsername) ? "block" : "none";
    }
    updateActiveSidebar();
});

// 2. SPIEL-LOGIK
function startGame() {
    socket.emit('gameStart');
}

socket.on('initGame', (board) => {
    myGrid = board.map(item => ({ 
        text: item.text, 
        color: item.color, 
        clicked: false 
    }));
    document.getElementById('welcomeMsg').innerText = `Viel Glück, ${myUsername}!`;
});

socket.on('startGameNow', () => {
    document.getElementById('lobby').style.display = "none";
    document.getElementById('game').style.display = "block";
    renderBingoField();
});

function renderBingoField() {
    const gridElement = document.getElementById('bingoGrid');
    if (!gridElement) return;
    gridElement.innerHTML = "";

    myGrid.forEach((item, index) => {
        const cell = document.createElement('div');
        cell.className = "cell";
        cell.innerText = item.text; 
        cell.style.borderBottom = `5px solid ${item.color}`;
        if(item.clicked) cell.classList.add('marked');
        cell.onclick = () => toggleCell(index, cell);
        gridElement.appendChild(cell);
    });
}

function toggleCell(index, element) {
    myGrid[index].clicked = !myGrid[index].clicked;
    if (myGrid[index].clicked) {
        element.classList.add('marked');
    } else {
        element.classList.remove('marked');
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
        socket.emit('bingo', { name: myUsername, grid: myGrid });
    }
}

// 3. SIEGER-ANZEIGE (NEU)
socket.on('announceWinner', (data) => {
    const overlay = document.getElementById('winnerOverlay');
    const nameDisplay = document.getElementById('winnerNameDisplay');
    if(!overlay) return;

    nameDisplay.innerText = `${data.name} hat BINGO!`;
    
    const preview = document.createElement('div');
    preview.id = "winningGridPreview";
    data.grid.forEach(item => {
        const mini = document.createElement('div');
        mini.innerText = item.text;
        mini.style.borderBottom = `2px solid ${item.color}`;
        if (item.clicked) {
            mini.style.background = "rgba(164, 35, 35, 0.8)";
            mini.style.color = "white";
        }
        preview.appendChild(mini);
    });

    const old = document.getElementById('winningGridPreview');
    if (old) old.remove();
    const content = document.querySelector('.overlay-content');
    content.insertBefore(preview, content.querySelector('button'));
    overlay.style.display = "flex";
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

function closeOverlay() {
    document.getElementById('winnerOverlay').style.display = "none";
}
