const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rota simples de teste
app.get('/api/test', (req, res) => {
    res.json({ status: 'OK', message: 'Servidor funcionando', timestamp: new Date() });
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor de teste rodando na porta ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/test`);
});
