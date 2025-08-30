const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

// Catálogo de missões e estado em memória
const questsCatalog = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../data/quests.json'), 'utf8')
);
const players = {}; // jogadores conectados
const npcs = [
    { id: 1, name: 'Matemago', map: 'map-city', x: 600, y: 400, active: true, hpMax: 30, hp: 30, type: 'slime' },
    { id: 2, name: 'Calculista', map: 'map-city', x: 700, y: 500, active: true, hpMax: 30, hp: 30, type: 'slime' }
];
const duels = {};

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 4000;

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Servir arquivos estáticos CORRETAMENTE
app.use(express.static(path.join(__dirname, '../public'), {
    index: false,
    setHeaders: (res, filePath) => {
        // Configurar MIME types corretamente
        const ext = path.extname(filePath);
        const mimeTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.ico': 'image/x-icon',
            '.json': 'application/json'
        };
        
        if (mimeTypes[ext]) {
            res.setHeader('Content-Type', mimeTypes[ext]);
        }
    }
}));

// Rotas explícitas para garantir funcionamento
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/css/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/css/style.css'));
});

app.get('/game.js', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/game.js'));
});

app.get('/net.js', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/net.js'));
});

app.get('/assets/:file', (req, res) => {
    const filePath = path.join(__dirname, '../public/assets', req.params.file);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Arquivo não encontrado');
    }
});

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/favicon.ico'));
});

// API Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Servidor funcionando',
        timestamp: new Date().toISOString()
    });
});

// Utilidades de missões
function initPlayerQuests(player) {
    if (!player.quests) player.quests = {};
}
function getQuestState(player) {
    initPlayerQuests(player);
    const active = [], done = [];
    for (const [id, q] of Object.entries(player.quests)) {
        const cat = questsCatalog.find(c => c.id === id);
        if (!cat) continue;
        const entry = {
            id: cat.id,
            title: cat.title,
            desc: cat.desc,
            count: cat.count,
            progress: q.progress || 0,
            status: q.status
        };
        if (q.status === 'done' || q.status === 'claimed') done.push(entry);
        else active.push(entry);
    }
    return { active, done };
}
function syncQuest(player) {
    io.to(player.socketId).emit('quest:update', getQuestState(player));
}
function acceptQuest(player, questId) {
    initPlayerQuests(player);
    if (player.quests[questId]) return;
    const cat = questsCatalog.find(c => c.id === questId);
    if (!cat) return;
    player.quests[questId] = { status: 'active', progress: 0 };
}
function updateQuestProgress(player, { type, target }) {
    initPlayerQuests(player);
    for (const [id, q] of Object.entries(player.quests)) {
        if (q.status !== 'active') continue;
        const cat = questsCatalog.find(c => c.id === id);
        if (!cat) continue;
        if (cat.type === type && ((type === 'kill' && cat.target === target) || (type === 'fetch' && cat.item === target))) {
            q.progress = (q.progress || 0) + 1;
            if (q.progress >= cat.count) q.status = 'done';
        }
    }
}
function claimQuest(player, questId) {
    initPlayerQuests(player);
    const q = player.quests[questId];
    if (q && q.status === 'done') {
        q.status = 'claimed';
        const cat = questsCatalog.find(c => c.id === questId);
        if (cat) {
            player.xp = (player.xp || 0) + (cat.reward?.xp || 0);
            player.gold = (player.gold || 0) + (cat.reward?.gold || 0);
        }
    }
}

// Utilidades de duelo
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
function genQuestion() {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const correct = a + b;
    const choices = shuffle([correct, correct + 1, correct - 1]);
    return { qid: Date.now(), text: `${a}+${b}=?`, choices, correct: choices.indexOf(correct) };
}
function inviteDuel(player, targetId) {
    const target = players[targetId];
    if (!target) return;
    io.to(target.socketId).emit('duel:invited', { fromId: player.id, fromName: player.name });
}
function acceptDuel(player, fromId) {
    const opponent = players[fromId];
    if (!opponent) return;
    const roomId = `${player.id}-${opponent.id}`;
    duels[roomId] = { aId: player.id, bId: opponent.id, scoreA: 0, scoreB: 0, round: 0, maxRounds: 5, firstTo: 3 };
    player.duelRoom = roomId;
    opponent.duelRoom = roomId;
    player.locked = true;
    opponent.locked = true;
    startDuel(roomId);
}
function rejectDuel(player, fromId) {
    const opponent = players[fromId];
    if (opponent) io.to(opponent.socketId).emit('duel:rejected', { fromId: player.id });
}
function startDuel(roomId) {
    const duel = duels[roomId];
    if (!duel) return;
    duel.round++;
    const q = genQuestion();
    duel.current = q;
    const payload = { qid: q.qid, text: q.text, choices: q.choices, timeoutMs: 15000 };
    io.to(players[duel.aId].socketId).emit('duel:question', payload);
    io.to(players[duel.bId].socketId).emit('duel:question', payload);
}
function handleDuelAnswer(player, { qid, choiceIdx }) {
    const roomId = player.duelRoom;
    const duel = duels[roomId];
    if (!duel || !duel.current || duel.current.qid !== qid) return;
    const correct = choiceIdx === duel.current.correct;
    if (player.id === duel.aId && correct) duel.scoreA++;
    if (player.id === duel.bId && correct) duel.scoreB++;
    io.to(players[duel.aId].socketId).emit('duel:score', { you: duel.scoreA, opponent: duel.scoreB });
    io.to(players[duel.bId].socketId).emit('duel:score', { you: duel.scoreB, opponent: duel.scoreA });
    if (duel.scoreA >= duel.firstTo || duel.scoreB >= duel.firstTo || duel.round >= duel.maxRounds) {
        endDuel(roomId);
    } else {
        startDuel(roomId);
    }
}
function endDuel(roomId) {
    const duel = duels[roomId];
    if (!duel) return;
    const a = players[duel.aId];
    const b = players[duel.bId];
    const winnerId = duel.scoreA > duel.scoreB ? duel.aId : duel.bId;
    io.to(a.socketId).emit('duel:end', { winnerId, youWon: winnerId === a.id, score: [duel.scoreA, duel.scoreB] });
    io.to(b.socketId).emit('duel:end', { winnerId, youWon: winnerId === b.id, score: [duel.scoreB, duel.scoreA] });
    a.locked = false;
    b.locked = false;
    delete a.duelRoom;
    delete b.duelRoom;
    delete duels[roomId];
}

// Socket.io básico
io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('player:join', (data) => {
        console.log('Jogador entrando:', data.name);

        const playerData = {
            id: socket.id,
            name: data.name,
            level: 1,
            xp: 0,
            max_hp: 30,
            hp: 30,
            gold: 0,
            map: 'map-city',
            x: 400,
            y: 300,
            quests: {},
            socketId: socket.id
        };
        players[socket.id] = playerData;

        socket.emit('player:joined', {
            player: playerData,
            npcs: npcs,
            missions: [],
            otherPlayers: Object.values(players).filter(p => p.id !== socket.id)
        });
    });

    socket.on('quiz:answer', ({ npcId, correct }) => {
        const player = players[socket.id];
        const npc = npcs.find(n => n.id === npcId);
        if (!player || !npc) return;
        const dmg = 10;
        if (correct) {
            npc.hp = Math.max(0, npc.hp - dmg);
            io.emit('npc:hp', { npcId: npc.id, hp: npc.hp, hpMax: npc.hpMax });
            if (npc.hp <= 0) {
                player.xp = (player.xp || 0) + 10;
                player.gold = (player.gold || 0) + 5;
                socket.emit('quiz:end', { result: 'win' });
                updateQuestProgress(player, { type: 'kill', target: npc.type });
                syncQuest(player);
            }
        } else {
            player.hp = Math.max(0, player.hp - dmg);
            socket.emit('player:hp', { hp: player.hp, hpMax: player.max_hp });
            if (player.hp <= 0) {
                player.hp = player.max_hp;
                player.x = 400;
                player.y = 300;
                socket.emit('quiz:end', { result: 'lose' });
            }
        }
    });

    socket.on('quest:list', () => {
        const player = players[socket.id];
        if (player) socket.emit('quest:list', getQuestState(player));
    });
    socket.on('quest:accept', (questId) => {
        const player = players[socket.id];
        if (!player) return;
        acceptQuest(player, questId);
        syncQuest(player);
    });
    socket.on('quest:claim', (questId) => {
        const player = players[socket.id];
        if (!player) return;
        claimQuest(player, questId);
        syncQuest(player);
    });

    socket.on('duel:invite', (targetId) => {
        const player = players[socket.id];
        if (player) inviteDuel(player, targetId);
    });
    socket.on('duel:accept', (fromId) => {
        const player = players[socket.id];
        if (player) acceptDuel(player, fromId);
    });
    socket.on('duel:reject', (fromId) => {
        const player = players[socket.id];
        if (player) rejectDuel(player, fromId);
    });
    socket.on('duel:answer', (payload) => {
        const player = players[socket.id];
        if (player) handleDuelAnswer(player, payload);
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        console.log('Cliente desconectado:', socket.id);
    });
});

// Tratamento de erros
server.on('error', (error) => {
    console.error('Erro no servidor:', error);
});

// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
    console.log('===================================');
    console.log('🚀 Servidor Reino dos Números');
    console.log(`📍 Porta: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    console.log('===================================');
});

process.on('uncaughtException', (error) => {
    console.error('Erro não tratado:', error);
});
