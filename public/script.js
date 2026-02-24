const socket = io();
let selectedName = null;
let myUsername = "";
let myGrid = [];

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

// 2. Beitreten (Bleibt in der Lobby!)
function join() {
    if (selectedName) {
        myUsername = selectedName;
        socket.emit('join', selectedName);
        
        // UI-Wechsel: Beitritts-Knopf weg, Liste zeigen
        document.getElementById('joinBtn').style.display = "none";
        document.getElementById('namePicker').style.display = "none";
        console.log("Joined as " + myUsername);
    }
}

// 3. Spielerliste aktualisieren & Start-Button zeigen
socket.on('updatePlayers', (players) => {
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

    // Nur der erste Spieler (Host) sieht den "Spiel Starten" Button
    const startBtn = document.getElementById('startBtn');
    if (players.length > 0 && players[0].username === myUsername) {
        startBtn.style.display = "block";
    }
});

// 4. Der eigentliche Spielstart (Vom Host ausgelöst)
function startGame() {
    socket.emit('gameStart');
}

// 5. Grid empfangen und DANN erst zur Spielansicht wechseln
// Speichert die Spieler global, damit die Sidebar sie immer kennt
let allPlayers = []; 

socket.on('updatePlayers', (players) => {
    allPlayers = players; // WICHTIG: Liste speichern
    renderPlayerList(players, 'playerList'); // Lobby-Liste
    if (document.getElementById('game').style.display === "block") {
        updateActiveSidebar(); // Sidebar-Liste falls Spiel läuft
    }
});

socket.on('initGame', (finalBoard) => {
    myGrid = finalBoard.map(item => ({ ...item, clicked: false }));
    
    document.getElementById('lobby').style.display = "none";
    document.getElementById('game').style.display = "block";
    
    renderBingoField();
    updateActiveSidebar(); // Zeige Mitspieler beim Start direkt an
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
            checkWin(); // Prüfe nach jedem Klick
        };
        gridElement.appendChild(cell);
    });
}

function checkWin() {
    // Alle Gewinn-Kombinationen (Indizes im 25er Array)
    const lines = [
        // Horizontal
        [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24],
        // Vertikal
        [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24],
        // Diagonal
        [0,6,12,18,24], [4,8,12,16,20]
    ];

    const won = lines.some(line => {
        return line.every(index => myGrid[index] && myGrid[index].clicked);
    });

    if (won) {
        console.log("BINGO gefunden!");
        socket.emit('bingo', { name: myUsername, grid: myGrid });
    }
}
