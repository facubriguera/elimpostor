// 1. Extraemos la función createClient de la librería global cargada por el HTML
const { createClient } = supabase; 

// 2. TUS CREDENCIALES (Reemplazalas con las de tu proyecto en Supabase)
const SUPABASE_URL = 'https://oldzawhgcgurspzndjhi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZFRnpn468BlB11RXjVvHzA_hpZVczVP';

// 3. Inicializamos el cliente correctamente
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let players = [];
let currentPlayerIndex = 0;

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function addPlayerField() {
    const container = document.getElementById('players-container');
    const div = document.createElement('div');
    div.className = 'input-group';
    div.innerHTML = `
        <input type="text" class="player-input" placeholder="Nombre del jugador">
        <button class="remove-btn" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(div);
    div.querySelector('input').focus();
}

// Traer par aleatorio usando la función RPC que creamos en Supabase
async function getRandomPairFromDB() {
    try {
        const { data, error } = await _supabase.rpc('get_random_word_pair');
        
        if (error) throw error;
        if (!data || data.length === 0) {
            alert("No hay palabras cargadas en la tabla 'word_pairs'.");
            return null;
        }
        return data[0];
    } catch (err) {
        console.error("Error de Supabase:", err);
        alert("Error de conexión. Revisá las credenciales y la función RPC.");
        return null;
    }
}

async function startGame() {
    const inputs = document.querySelectorAll('.player-input');
    const names = Array.from(inputs).map(input => input.value.trim()).filter(n => n !== "");
    const impostorCount = parseInt(document.getElementById('impostor-count').value);

    if (names.length < 3) {
        alert("Se necesitan al menos 3 jugadores.");
        return;
    }
    if (impostorCount >= Math.ceil(names.length / 2)) {
        alert(`Máximo de impostores permitido: ${Math.ceil(names.length / 2) - 1}`);
        return;
    }

    const pair = await getRandomPairFromDB();
    if (!pair) return;

    const isSwapped = Math.random() > 0.5;
    const citizenWord = isSwapped ? pair.impostor_word : pair.citizen_word;
    const impostorWord = isSwapped ? pair.citizen_word : pair.impostor_word;

    players = names.map(name => ({
        name: name,
        role: 'ciudadano',
        word: citizenWord,
        isAlive: true
    }));

    let assigned = 0;
    while (assigned < impostorCount) {
        let idx = Math.floor(Math.random() * players.length);
        if (players[idx].role === 'ciudadano') {
            players[idx].role = 'impostor';
            players[idx].word = impostorWord;
            assigned++;
        }
    }

    players.sort(() => Math.random() - 0.5);
    currentPlayerIndex = 0;
    preparePassScreen();
}

function preparePassScreen() {
    const player = players[currentPlayerIndex];
    document.getElementById('pass-player-name').innerText = player.name;
    switchScreen('screen-pass');
}

function showRevealScreen() {
    const player = players[currentPlayerIndex];
    const wordDisplay = document.getElementById('reveal-word');
    const roleHint = document.getElementById('reveal-role-hint');
    
    document.getElementById('reveal-player-name').innerText = player.name;
    wordDisplay.innerText = player.word;
    
    if (player.role === 'impostor') {
        roleHint.style.display = 'block';
        roleHint.innerText = "¡Sos el impostor! Tu palabra es distinta a la de los demás.";
    } else {
        roleHint.style.display = 'none';
    }
    
    switchScreen('screen-reveal');
}

function hideAndNext() {
    currentPlayerIndex++;
    if (currentPlayerIndex < players.length) {
        preparePassScreen();
    } else {
        buildVoteScreen();
        switchScreen('screen-vote');
    }
}

function buildVoteScreen() {
    const container = document.getElementById('vote-container');
    container.innerHTML = '';
    players.forEach((p, i) => {
        const btn = document.createElement('button');
        btn.className = `vote-btn ${!p.isAlive ? 'eliminated' : ''}`;
        btn.innerHTML = `<span>${p.name}</span> ${!p.isAlive ? `<span>(${p.role.toUpperCase()})</span>` : ''}`;
        if (p.isAlive) btn.onclick = () => eliminatePlayer(i);
        container.appendChild(btn);
    });
}

function eliminatePlayer(index) {
    if (confirm(`¿Eliminar a ${players[index].name}?`)) {
        players[index].isAlive = false;
        alert(`${players[index].name} era ${players[index].role.toUpperCase()}`);
        if (!checkWinCondition()) buildVoteScreen();
    }
}

function checkWinCondition() {
    const imps = players.filter(p => p.role === 'impostor' && p.isAlive).length;
    const cits = players.filter(p => p.role === 'ciudadano' && p.isAlive).length;
    if (imps === 0) { showResult("¡Ganaron Ciudadanos!", "Impostores eliminados", "var(--secondary-color)"); return true; }
    if (imps >= cits) { showResult("¡Ganó el Impostor!", "Los ciudadanos ya no son mayoría", "var(--error-color)"); return true; }
    return false;
}

function showResult(t, m, c) {
    const el = document.getElementById('result-title');
    el.innerText = t; el.style.color = c;
    document.getElementById('result-message').innerText = m;
    switchScreen('screen-result');
}

function resetGame() { switchScreen('screen-setup'); }
function showHelp() { alert('Debatan sutilmente para encontrar al impostor.'); }

// Al final de script.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(reg => console.log('Service Worker registrado', reg))
    .catch(err => console.warn('Error al registrar SW', err));
}