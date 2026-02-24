const socket = io();
let selectedName = null;
let myUsername = "";
let myColor = "";
let allPlayers = [];
let myGrid = [];

// 1. BEITRETEN & LOBBY
function selectName(name, element) {
    selectedName = name;
    document.querySelectorAll('.name-select-btn').forEach(b => b.classList.remove('active-name'));
    element.classList.add('active-name');
    
    const joinBtn = document.getElementById('joinBtn');
    joinBtn.disabled = false;
    joinBtn.innerText = `${name} beitreten`;
}

function join() {
    if (selectedName) {
        myUsername = selectedName;
        socket.emit('join', myUsername);
        
        // UI aufräumen
        document.getElementById('namePicker').style.display = "none";
        document.getElementById('joinBtn').style.display = "none";
        const p = document.querySelector('#lobby p');
        if(p) p.style.display = "none";
    }
}

function startGame() {
    socket.emit('gameStart');
}

// 2. SOCKET LISTENERS (Empfang vom Server)

// Verfügbare Namen für die Buttons
socket.on('availableNames', (names) => {
    const picker = document.getElementById('namePicker');
    if (!picker) return;
    
    // Falls unser gewählter Name plötzlich von jemand anderem geschnappt wurde
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

// Spielerliste (Lobby & Sidebar)
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
            if(p.username === myUsername) myColor = p.color;
        });
    }

    // Start-Button Logik (nur für den Host)
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.style.display = (players.length >= 1 && players[0].username === myUsername) ? "block" : "none";
    }

    updateActiveSidebar();
});

// Board-Daten empfangen
socket.on('initGame', (board) => {
    myGrid = board.map(item => ({ 
        text: item.text, 
        color: item.color, 
        clicked: false 
    }));
    
    const welcome = document.getElementById('welcomeMsg');
    if(welcome) welcome.innerText = `Viel Glück, ${myUsername}!`;
});

// Umschalten zur Spielansicht
socket.on('startGameNow', () => {
    document.getElementById('lobby').style.display = "none";
    document.getElementById('game').style.display = "block";
    renderBingoField();
});

// Sieger-Nachricht empfangen (Das stand vorher falsch!)
socket.on('announceWinner', (data) => {
    const overlay = document.getElementById('winnerOverlay');
    const nameDisplay = document.getElementById('winnerNameDisplay');
    if(!overlay || !nameDisplay) return;

    nameDisplay.innerText = `${data.name} hat BINGO!`;
    
    const winningGridPreview = document.createElement('div');
    winningGridPreview.id = "winningGridPreview"; // Nutzt dein neues CSS!
    
    data.grid.forEach(item => {
        const miniCell = document.createElement('div');
        miniCell.style.borderBottom = `3px solid ${item.color}`;
        if(item.clicked) {
            miniCell.style.backgroundColor = "rgba(164, 35, 35, 0.8)";
            miniCell.style.color = "white";
        }
        miniCell.innerText = item.text;
        winningGridPreview.appendChild(miniCell);
    });

    const oldPreview = document.getElementById('winningGridPreview');
    if(oldPreview) oldPreview.remove();
    
    const content = document.querySelector('.overlay-content');
    content.insertBefore(winningGridPreview, content.querySelector('button'));
    overlay.style.display = "flex";
});

// 3. GAME FUNCTIONS (UI Rendering)

function updateActiveSidebar() {
    const sidebarList = document.getElementById('activePlayerList');
    if (!sidebarList) return;
    sidebarList.innerHTML = "";
    
    allPlayers.forEach(p => {
        const div = document.createElement('div');
        div.innerText = p.username;
        div.className = "player-tag";
        div.style.backgroundColor = p.color;
        div.style.display = "block";
        div.style.margin = "5px 0";
        sidebarList.appendChild(div);
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
        
        if(item.clicked) cell.classList.add('marked');
        cell.onclick = () => toggleCell(index, cell);
        gridElement.appendChild(cell);
    });
}

function toggleCell(index, element) {
    myGrid[index].clicked = !myGrid[index].clicked;
    
    if (myGrid[index].clicked) {
        element.classList.add('marked');
        element.style.backgroundColor = "rgba(164, 35, 35, 0.6)"; 
    } else {
        element.classList.remove('marked');
        element.style.backgroundColor = "#222";
    }
    
    checkWin();
}

function checkWin() {
    const lines = [
        [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12,
