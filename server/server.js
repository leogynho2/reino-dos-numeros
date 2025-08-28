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

// Socket.io básico
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

        socket.emit('player:joined', {
            player: playerData,
            npcs: [
                { id: 1, name: 'Matemago', map: 'map-city', x: 600, y: 400, active: true },
                { id: 2, name: 'Calculista', map: 'map-city', x: 700, y: 500, active: true }
            ],
            missions: [
                { id: 1, code: 'M001', title: 'Primeiro Contato', description: 'Fale com 1 NPC', type: 'talk_npc', target: 1, progress: 0, status: 'active' }
            ],
            otherPlayers: []
        });
    });

    socket.on('disconnect', () => {
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
