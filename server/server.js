const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

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

// Dados em memória
const players = new Map();
const npcs = [
    { id: 1, name: 'Matemago', map: 'map-city', x: 600, y: 400, active: true, dialogue: 'Saudações, aventureiro!' },
    { id: 2, name: 'Calculista', map: 'map-city', x: 700, y: 500, active: true, dialogue: 'Você está pronto para um desafio?' }
];

// Socket.io com suporte a multiplayer simples e diálogo com NPCs
io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('player:join', (data) => {
        console.log('Jogador entrando:', data.name);

        const playerData = {
            id: socket.id,
            name: data.name,
            level: 1,
            exp: 0,
            hp: 100,
            max_hp: 100,
            coins: 0,
            wins: 0,
            losses: 0,
            map: 'map-city',
            x: 400,
            y: 300
        };

        // Registrar jogador
        players.set(socket.id, playerData);

        // Enviar dados iniciais
        socket.emit('player:joined', {
            player: playerData,
            npcs: npcs,
            missions: [
                { id: 1, code: 'M001', title: 'Primeiro Contato', description: 'Fale com 1 NPC', type: 'talk_npc', target: 1, progress: 0, status: 'active' }
            ],
            otherPlayers: Array.from(players.values()).filter(p => p.id !== socket.id)
        });

        // Notificar outros jogadores
        socket.broadcast.emit('player:entered', {
            id: socket.id,
            name: data.name,
            map: 'map-city',
            x: 400,
            y: 300
        });
    });

    // Movimentação do jogador
    socket.on('player:move', (data) => {
        const player = players.get(socket.id);
        if (!player) return;

        player.x = data.x;
        player.y = data.y;
        player.map = data.map;

        socket.broadcast.emit('player:moved', {
            id: player.id,
            x: player.x,
            y: player.y,
            map: player.map
        });
    });

    // Interação com NPC - envia diálogo e inicia batalha simples
    socket.on('player:interact', (data) => {
        const npc = npcs.find(n => n.id === data.npcId);
        if (!npc) return;

        // Enviar diálogo
        socket.emit('npc:dialogue', { npcId: npc.id, dialogue: npc.dialogue });

        // Pergunta matemática simples
        const question = { prompt: 'Quanto é 2 + 2?', answer: '4', explanation: 'Somar 2 e 2 resulta em 4.' };
        socket.emit('battle:start', {
            battleId: Date.now(),
            npcId: npc.id,
            npcName: npc.name,
            question: question.prompt,
            correctAnswer: question.answer,
            explanation: question.explanation
        });
    });

    // Resultado da batalha
    socket.on('battle:answer', (data) => {
        const correct = data.answer.trim() === data.correctAnswer;
        socket.emit('battle:result', {
            correct,
            playerDamage: correct ? 20 : 0,
            enemyDamage: correct ? 0 : 20,
            npcDefeated: correct,
            playerHp: 100,
            expGain: correct ? 10 : 0
        });
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
        players.delete(socket.id);
        socket.broadcast.emit('player:left', { id: socket.id });
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
