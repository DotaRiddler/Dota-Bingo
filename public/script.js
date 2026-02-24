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
socket.on('initGame', (finalBoard) => {
    myGrid = finalBoard.map(item => ({ ...item, clicked: false }));
    renderBingoField();
    
    // Jetzt erst die Lobby ausblenden und das Spiel einblenden
    document.getElementById('lobby').style.display = "none";
    document.getElementById('game').style.display = "block";
    document.querySelector('.rules-box').style.display = "none";
});

function renderBingoField() {
    const gridElement = document.getElementById('bingoGrid');
    gridElement.innerHTML = "";
    myGrid.forEach((item, index) => {
        const cell = document.createElement('div');
        cell.className = "cell";
        cell.innerText = item.text;
        cell.style.borderBottom = `5px solid ${item.color}`;
        cell.onclick = () => {
            item.clicked = !item.clicked;
            cell.classList.toggle('marked');
            checkWin();
        };
        gridElement.appendChild(cell);
    });
}

function checkWin() {
    // Hier kommt deine Gewinn-Logik (Lines prüfen)
    // Wenn gewonnen: socket.emit('bingo', { name: myUsername, grid: myGrid });
}
