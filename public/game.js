// /public/game.js
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.socket = null;
        this.player = null;
        this.otherPlayers = new Map();
        this.npcs = new Map();
        this.currentMap = 'map-city';
        
        // Configurações do jogo
        this.tileSize = 32;
        this.viewportTilesX = 20;
        this.viewportTilesY = 15;
        this.canvas.width = this.viewportTilesX * this.tileSize;
        this.canvas.height = this.viewportTilesY * this.tileSize;
        
        // Câmera
        this.camX = 0;
        this.camY = 0;
        
        // Controles
        this.keys = {};
        this.moveDirection = { x: 0, y: 0 };
        this.lastMoveTime = 0;
        this.moveSpeed = 150; // ms entre movimentos
        this.isMoving = false;
        
        // Assets
        this.assets = {
            player: null,
            npc: null,
            tileset: null
        };
        
        // Animação
        this.animationFrame = 0;
        this.lastFrameTime = 0;
        this.frameInterval = 1000 / 12; // 12 FPS para animações
        
        // Mapas
        this.maps = {
            'map-city': this.generateCityMap(),
            'map-forest': this.generateForestMap()
        };
        
        // Inicialização
        this.init();
    }
    
    init() {
        this.loadAssets();
        this.setupEventListeners();
        this.setupUI();
        this.showLoginModal();
        this.gameLoop();
    }
    
    loadAssets() {
        // Carregar assets (placeholders)
        this.assets.player = new Image();
        this.assets.player.src = 'assets/player.png';
        
        this.assets.npc = new Image();
        this.assets.npc.src = 'assets/npc.png';
        
        this.assets.tileset = new Image();
        this.assets.tileset.src = 'assets/tileset.png';
        
        // Tratar erro de carregamento
        this.assets.player.onerror = () => {
            console.warn('Erro ao carregar sprite do jogador. Usando placeholder.');
            this.createPlaceholderSprite('player');
        };
        
        this.assets.npc.onerror = () => {
            console.warn('Erro ao carregar sprite do NPC. Usando placeholder.');
            this.createPlaceholderSprite('npc');
        };
        
        this.assets.tileset.onerror = () => {
            console.warn('Erro ao carregar tileset. Usando placeholder.');
            this.createPlaceholderTileset();
        };
    }
    
    createPlaceholderSprite(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Cor base baseada no tipo
        const color = type === 'player' ? '#3498db' : '#e74c3c';
        
        // Desenhar spritesheet placeholder
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const x = col * 32;
                const y = row * 32;
                
                ctx.fillStyle = color;
                ctx.fillRect(x, y, 32, 32);
                
                ctx.strokeStyle = '#fff';
                ctx.strokeRect(x, y, 32, 32);
                
                // Desenhar direção
                if (row === 0) ctx.fillText('↓', x + 12, y + 20);
                if (row === 1) ctx.fillText('←', x + 12, y + 20);
                if (row === 2) ctx.fillText('→', x + 12, y + 20);
                if (row === 3) ctx.fillText('↑', x + 12, y + 20);
            }
        }
        
        this.assets[type] = canvas;
    }
    
    createPlaceholderTileset() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Grama
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(0, 0, 32, 32);
        
        // Água
        ctx.fillStyle = '#3498db';
        ctx.fillRect(32, 0, 32, 32);
        
        // Terra
        ctx.fillStyle = '#d35400';
        ctx.fillRect(64, 0, 32, 32);
        
        // Parede
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(96, 0, 32, 32);
        
        // Estrada
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(128, 0, 32, 32);
        
        this.assets.tileset = canvas;
    }
    
    setupEventListeners() {
        // Teclado
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            // Tecla M para missões
            if (e.key === 'm' || e.key === 'M') {
                this.toggleMissionsModal();
            }
            
            // ESC para fechar modais
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            
            // Enter para interagir
            if (e.key === 'Enter') {
                this.interact();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // Redimensionamento da janela
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }
    
    setupUI() {
        // Botão de missões
        document.getElementById('btn-missions').addEventListener('click', () => {
            this.toggleMissionsModal();
        });
        
        // Botão do professor
        document.getElementById('btn-professor').addEventListener('click', () => {
            this.showProfessorModal();
        });
        
        // Login
        document.getElementById('btn-join').addEventListener('click', () => {
            this.joinGame();
        });
        
        document.getElementById('player-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinGame();
            }
        });
        
        // Batalha
        document.getElementById('btn-battle-submit').addEventListener('click', () => {
            this.submitBattleAnswer();
        });
        
        document.getElementById('battle-answer').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitBattleAnswer();
            }
        });
        
        // Missões
        document.getElementById('btn-close-missions').addEventListener('click', () => {
            this.closeMissionsModal();
        });
        
        // Professor
        document.getElementById('btn-professor-login').addEventListener('click', () => {
            this.loginProfessor();
        });
        
        document.getElementById('professor-password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loginProfessor();
            }
        });
    }
    
    showLoginModal() {
        document.getElementById('login-modal').classList.remove('hidden');
    }
    
    hideLoginModal() {
        document.getElementById('login-modal').classList.add('hidden');
    }
    
    showBattleModal(npcName, question, playerHp, npcHp) {
        document.getElementById('battle-npc-name').textContent = `Desafio de ${npcName}`;
        document.getElementById('battle-question').textContent = question;
        document.getElementById('battle-answer').value = '';
        document.getElementById('battle-result').textContent = '';
        document.getElementById('battle-result').className = '';
        document.getElementById('battle-modal').classList.remove('hidden');

        // Inicializar HPs
        if (!this.currentBattle) this.currentBattle = {};
        this.currentBattle.playerHp = playerHp;
        this.currentBattle.npcHp = npcHp;
        this.updateBattleHpUI();

        document.getElementById('battle-answer').focus();
    }
    
    hideBattleModal() {
        document.getElementById('battle-modal').classList.add('hidden');
        this.currentBattle = null;
    }
    
    toggleMissionsModal() {
        const modal = document.getElementById('missions-modal');
        if (modal.classList.contains('hidden')) {
            this.loadMissions();
            modal.classList.remove('hidden');
        } else {
            modal.classList.add('hidden');
        }
    }
    
    closeMissionsModal() {
        document.getElementById('missions-modal').classList.add('hidden');
    }
    
    showProfessorModal() {
        document.getElementById('professor-modal').classList.remove('hidden');
        document.getElementById('professor-password').focus();
    }
    
    hideProfessorModal() {
        document.getElementById('professor-modal').classList.add('hidden');
        document.getElementById('professor-password').value = '';
        document.getElementById('professor-error').textContent = '';
    }
    
    closeAllModals() {
        this.hideBattleModal();
        this.closeMissionsModal();
        this.hideProfessorModal();
    }
    
    joinGame() {
        const nameInput = document.getElementById('player-name-input');
        const name = nameInput.value.trim();
        
        if (name.length < 2) {
            alert('Por favor, digite um nome com pelo menos 2 caracteres');
            return;
        }
        
        this.hideLoginModal();
        this.connectToServer(name);
    }
    
    loginProfessor() {
        const password = document.getElementById('professor-password').value;
        
        if (!password) {
            document.getElementById('professor-error').textContent = 'Por favor, digite a senha';
            return;
        }
        
        // Redirecionar para o painel do professor
        window.open('/admin/index.html', '_blank');
        this.hideProfessorModal();
    }
    
    connectToServer(playerName) {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Conectado ao servidor');
            this.socket.emit('player:join', { name: playerName });
        });
        
        this.socket.on('player:joined', (data) => {
            this.handlePlayerJoined(data);
        });
        
        this.socket.on('player:entered', (data) => {
            this.handlePlayerEntered(data);
        });
        
        this.socket.on('player:moved', (data) => {
            this.handlePlayerMoved(data);
        });
        
        this.socket.on('player:left', (data) => {
            this.handlePlayerLeft(data);
        });
        
        this.socket.on('battle:start', (data) => {
            this.handleBattleStart(data);
        });
        
        this.socket.on('battle:result', (data) => {
            this.handleBattleResult(data);
        });
        
        this.socket.on('battle:error', (data) => {
            this.handleBattleError(data);
        });
        
        this.socket.on('missions:update', (data) => {
            this.updateMissionsUI(data);
        });
        
        this.socket.on('npc:defeated', (data) => {
            this.handleNpcDefeated(data);
        });
        
        this.socket.on('npc:respawned', (data) => {
            this.handleNpcRespawned(data);
        });
        
        this.socket.on('error', (data) => {
            alert(`Erro: ${data.message}`);
        });
        
        this.socket.on('disconnect', () => {
            alert('Desconectado do servidor');
        });
    }
    
    handlePlayerJoined(data) {
        console.log("Player joined data:", data);
        this.player = data.player;
        this.currentMap = data.player.map;
        
        // Verificar se npcs existe antes de usar forEach
        if (data.npcs && Array.isArray(data.npcs)) {
            data.npcs.forEach(npc => {
                this.npcs.set(npc.id, npc);
            });
        } else {
            console.warn("npcs não é um array ou está undefined:", data.npcs);
            data.npcs = [];
        }
        
        // Verificar se otherPlayers existe antes de usar forEach
        if (data.otherPlayers && Array.isArray(data.otherPlayers)) {
            data.otherPlayers.forEach(player => {
                this.otherPlayers.set(player.id, player);
            });
        } else {
            console.warn("otherPlayers não é um array ou está undefined:", data.otherPlayers);
            data.otherPlayers = [];
        }
        
        this.updatePlayerUI();
        
        this.camX = this.player.x - this.canvas.width / 2;
        this.camY = this.player.y - this.canvas.height / 2;
        this.clampCamera();
    }
    
    handlePlayerEntered(data) {
        if (data && data.id) {
            this.otherPlayers.set(data.id, data);
        } else {
            console.warn("Dados inválidos em handlePlayerEntered:", data);
        }
    }
    
    handlePlayerMoved(data) {
        if (this.otherPlayers.has(data.id)) {
            const player = this.otherPlayers.get(data.id);
            player.x = data.x;
            player.y = data.y;
            player.map = data.map;
        }
    }
    
    handlePlayerLeft(data) {
        this.otherPlayers.delete(data.id);
    }
    
    handleBattleStart(data) {
        data.playerHp = this.player ? this.player.hp : 0;
        data.npcHp = 100;
        this.currentBattle = data;
        this.showBattleModal(data.npcName, data.question, data.playerHp, data.npcHp);
    }
    
    handleBattleResult(data) {
        const resultEl = document.getElementById('battle-result');
        
        if (data.correct) {
            resultEl.textContent = `Resposta correta! Você causou ${data.playerDamage || 0} de dano.`;
            resultEl.className = 'correct';
        } else {
            resultEl.textContent = `Resposta incorreta! Você sofreu ${data.enemyDamage || 0} de dano.`;
            resultEl.className = 'incorrect';
        }
        
        // Atualizar stats do jogador
        if (this.player) {
            this.player.hp = data.playerHp;
            
            if (data.expGain) {
                this.player.exp += data.expGain;
                this.player.coins += data.coinGain || 0;
                
                // Verificar level up
                const newLevel = Math.floor(1 + Math.sqrt(this.player.exp) / 2);
                if (newLevel > this.player.level) {
                    this.player.level = newLevel;
                    this.player.max_hp = 100 + (newLevel - 1) * 20;
                    this.player.hp = this.player.max_hp; // Curar completamente no level up
                    alert(`Parabéns! Você subiu para o nível ${newLevel}!`);
                }
            }

            // Atualizar HPs da batalha
            if (this.currentBattle) {
                this.currentBattle.playerHp = this.player.hp;
                this.currentBattle.npcHp = data.npcHp;
                this.updateBattleHpUI();
            }

            if (data.npcDefeated) {
                setTimeout(() => {
                    this.hideBattleModal();
                    alert(`Você derrotou ${this.currentBattle.npcName}!`);
                }, 2000);
            } else if (data.playerDefeated) {
                setTimeout(() => {
                    this.hideBattleModal();
                    alert('Você foi derrotado! Seu HP foi restaurado.');
                }, 2000);
            } else {
                setTimeout(() => {
                    document.getElementById('battle-result').textContent = '';
                    document.getElementById('battle-result').className = '';
                    document.getElementById('battle-answer').value = '';
                    document.getElementById('battle-answer').focus();
                }, 1500);
            }
            
            this.updatePlayerUI();
        }
    }
    
    handleBattleError(data) {
        alert(`Erro na batalha: ${data.message}`);
        this.hideBattleModal();
    }
    
    handleNpcDefeated(data) {
        if (this.npcs.has(data.npcId)) {
            const npc = this.npcs.get(data.npcId);
            npc.active = false;
        }
    }
    
    handleNpcRespawned(data) {
        if (this.npcs.has(data.npcId)) {
            const npc = this.npcs.get(data.npcId);
            npc.active = true;
        }
    }
    
    submitBattleAnswer() {
        if (!this.currentBattle) return;
        
        const answer = document.getElementById('battle-answer').value.trim();
        if (!answer) return;
        
        this.socket.emit('battle:answer', {
            battleId: this.currentBattle.battleId,
            npcId: this.currentBattle.npcId,
            answer: answer,
            question: this.currentBattle.question,
            correctAnswer: this.currentBattle.correctAnswer,
            explanation: this.currentBattle.explanation
        });
    }
    
    loadMissions() {
        if (this.socket) {
            this.socket.emit('missions:get');
        }
    }
    
    updateMissionsUI(missions) {
        const missionsList = document.getElementById('missions-list');
        missionsList.innerHTML = '';
        
        missions.forEach(mission => {
            const missionEl = document.createElement('div');
            missionEl.className = `mission-item ${mission.status === 'completed' ? 'completed' : ''}`;
            
            const progressPercent = mission.target > 0 ? (mission.progress / mission.target) * 100 : 0;
            
            missionEl.innerHTML = `
                <h3 class="mission-title">${mission.title}</h3>
                <p class="mission-desc">${mission.description}</p>
                <p class="mission-progress">Progresso: ${mission.progress}/${mission.target}</p>
                <div class="progress">
                    <div class="progress-bar" style="width: ${progressPercent}%"></div>
                </div>
                <p class="mission-reward">Recompensa: ${mission.reward_exp} EXP, ${mission.reward_coins} moedas</p>
            `;
            
            missionsList.appendChild(missionEl);
        });
    }
    
    updatePlayerUI() {
        if (!this.player) return;
        
        document.getElementById('player-name').textContent = this.player.name;
        document.getElementById('player-level').textContent = this.player.level;
        document.getElementById('player-exp').textContent = this.player.exp;
        document.getElementById('player-hp').textContent = this.player.hp;
        document.getElementById('player-max-hp').textContent = this.player.max_hp;
        document.getElementById('player-wins').textContent = this.player.wins;
        document.getElementById('player-losses').textContent = this.player.losses;
        document.getElementById('player-coins').textContent = this.player.coins;
    }

    updateBattleHpUI() {
        const npcBar = document.getElementById('battle-npc-hp');
        const npcText = document.getElementById('battle-npc-hp-text');
        const playerBar = document.getElementById('battle-player-hp');
        const playerText = document.getElementById('battle-player-hp-text');

        if (!npcBar || !playerBar || !this.currentBattle) return;

        const npcPercent = (this.currentBattle.npcHp / 100) * 100;
        npcBar.style.width = `${npcPercent}%`;
        npcText.textContent = `${this.currentBattle.npcHp}/100`;

        const playerMax = this.player ? this.player.max_hp : 100;
        const playerPercent = (this.currentBattle.playerHp / playerMax) * 100;
        playerBar.style.width = `${playerPercent}%`;
        playerText.textContent = `${this.currentBattle.playerHp}/${playerMax}`;
    }
    
    interact() {
        if (!this.player || !this.socket) return;
        
        // Determinar direção do jogador para interação
        let checkX = this.player.x;
        let checkY = this.player.y;
        
        // Ajustar posição de verificação baseado na direção
        // (simplificado - na implementação real, use a direção atual do sprite)
        checkY += 40; // Verificar à frente (baixo)
        
        // Verificar colisão com NPCs
        for (const [npcId, npc] of this.npcs) {
            if (npc.map !== this.currentMap || !npc.active) continue;
            
            const distance = Math.sqrt(Math.pow(checkX - npc.x, 2) + Math.pow(checkY - npc.y, 2));
            if (distance < 40) {
                this.socket.emit('player:interact', { npcId: npcId });
                return;
            }
        }
        
        // Verificar colisão com portais
        const portals = this.maps[this.currentMap].portals;
        for (const portal of portals) {
            const distance = Math.sqrt(Math.pow(checkX - portal.x, 2) + Math.pow(checkY - portal.y, 2));
            if (distance < 40) {
                this.changeMap(portal.targetMap, portal.targetX, portal.targetY);
                return;
            }
        }
    }
    
    changeMap(newMap, x, y) {
        if (!this.player) return;
        
        this.currentMap = newMap;
        this.player.x = x;
        this.player.y = y;
        
        // Atualizar no servidor
        if (this.socket) {
            this.socket.emit('player:move', {
                x: this.player.x,
                y: this.player.y,
                map: this.currentMap
            });
        }
        
        // Verificar missão de explorador
        if (newMap === 'map-forest') {
            if (this.socket) {
                this.socket.emit('mission:event', {
                    type: 'enter_portal',
                    data: { portalEntered: true }
                });
            }
        }
    }
    
    handleResize() {
        // Ajustar tamanho do canvas para manter aspect ratio
        const container = document.getElementById('game-container');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Manter proporção de 20:15 (4:3)
        const targetRatio = 20 / 15;
        const currentRatio = width / height;
        
        if (currentRatio > targetRatio) {
            // Largura maior que o necessário
            this.canvas.width = height * targetRatio;
            this.canvas.height = height;
        } else {
            // Altura maior que o necessário
            this.canvas.width = width;
            this.canvas.height = width / targetRatio;
        }
        
        // Recalcular viewport
        this.viewportTilesX = Math.floor(this.canvas.width / this.tileSize);
        this.viewportTilesY = Math.floor(this.canvas.height / this.tileSize);
    }
    
    generateCityMap() {
        // Gerar mapa da cidade (50x50 tiles)
        const width = 50;
        const height = 50;
        
        const map = {
            width: width,
            height: height,
            tiles: [],
            collisions: [],
            portals: [
                { x: 800, y: 600, targetMap: 'map-forest', targetX: 100, targetY: 100 }
            ]
        };
        
        // Preencher com grama
        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            map.collisions[y] = [];
            for (let x = 0; x < width; x++) {
                map.tiles[y][x] = 0; // Grama
                map.collisions[y][x] = 0; // Sem colisão
            }
        }
        
        // Adicionar estradas
        for (let x = 10; x < 40; x++) {
            map.tiles[10][x] = 4; // Estrada horizontal
            map.tiles[40][x] = 4; // Estrada horizontal
        }
        
        for (let y = 10; y < 40; y++) {
            map.tiles[y][10] = 4; // Estrada vertical
            map.tiles[y][40] = 4; // Estrada vertical
        }
        
        // Adicionar água
        for (let x = 5; x < 15; x++) {
            for (let y = 5; y < 15; y++) {
                map.tiles[y][x] = 1; // Água
            }
        }
        
        // Adicionar construções com colisão
        for (let x = 15; x < 25; x++) {
            for (let y = 15; y < 25; y++) {
                map.tiles[y][x] = 3; // Parede
                map.collisions[y][x] = 1; // Com colisão
            }
        }
        
        return map;
    }
    
generateForestMap() {
    const width = 64;
    const height = 64;
    
    const map = {
        width: width,
        height: height,
        tiles: [],
        collisions: [],
        portals: [
            { x: 100, y: 100, targetMap: 'map-city', targetX: 800, targetY: 600 }
        ]
    };
    
    for (let y = 0; y < height; y++) {
        map.tiles[y] = [];
        map.collisions[y] = [];
        
        for (let x = 0; x < width; x++) {
            map.tiles[y][x] = 0;
            map.collisions[y][x] = 0;
            
            if (Math.random() < 0.1) {
                map.tiles[y][x] = 3;
                map.collisions[y][x] = 1;
            }
            
            if (Math.random() < 0.03) {
                const lakeSize = Math.floor(Math.random() * 3) + 2;
                for (let ly = y; ly < y + lakeSize && ly < height; ly++) {
                    if (!map.tiles[ly]) {
                        map.tiles[ly] = [];
                        map.collisions[ly] = [];
                    }
                    
                    for (let lx = x; lx < x + lakeSize && lx < width; lx++) {
                        map.tiles[ly][lx] = 1;
                        map.collisions[ly][lx] = 1;
                    }
                }
            }
        }
    }
    
    return map;
}
    
    update(deltaTime) {
        if (!this.player) return;
        
        // Movimento do jogador
        this.handleMovement(deltaTime);
        
        // Atualizar câmera para seguir o jogador
        this.camX = this.player.x - this.canvas.width / 2;
        this.camY = this.player.y - this.canvas.height / 2;
        
        // Limitar câmera aos limites do mapa
        this.clampCamera();
    }
    
    handleMovement(deltaTime) {
        if (!this.player) return;
        
        // Determinar direção do movimento
        let moveX = 0;
        let moveY = 0;
        let isMoving = false;
        
        if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
            moveY -= 1;
            isMoving = true;
            this.player.direction = 'up';
        }
        if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) {
            moveY += 1;
            isMoving = true;
            this.player.direction = 'down';
        }
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            moveX -= 1;
            isMoving = true;
            this.player.direction = 'left';
        }
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
            moveX += 1;
            isMoving = true;
            this.player.direction = 'right';
        }
        
        // Normalizar movimento diagonal
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.7071; // 1/√2
            moveY *= 0.7071;
        }
        
        // Aplicar velocidade
        const speed = 200; // pixels por segundo
        const deltaMoveX = moveX * speed * (deltaTime / 1000);
        const deltaMoveY = moveY * speed * (deltaTime / 1000);
        
        // Verificar colisão antes de mover
        const newX = this.player.x + deltaMoveX;
        const newY = this.player.y + deltaMoveY;
        
        if (this.canMoveTo(newX, newY)) {
            this.player.x = newX;
            this.player.y = newY;
            
            // Enviar movimento para o servidor (com throttle)
            const now = Date.now();
            if (now - this.lastMoveTime > 100) { // 10 updates por segundo
                if (this.socket) {
                    this.socket.emit('player:move', {
                        x: this.player.x,
                        y: this.player.y,
                        map: this.currentMap
                    });
                }
                this.lastMoveTime = now;
            }
        }
        
        // Atualizar estado de movimento para animação
        this.isMoving = isMoving;
    }
    
    canMoveTo(x, y) {
        // Verificar se a posição está dentro dos limites do mapa
        const map = this.maps[this.currentMap];
        if (!map) return false;
        
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);
        
        if (tileX < 0 || tileX >= map.width || tileY < 0 || tileY >= map.height) {
            return false;
        }
        
        // Verificar colisão com tiles
        if (map.collisions[tileY][tileX] === 1) {
            return false;
        }
        
        // Verificar colisão com NPCs
        for (const [npcId, npc] of this.npcs) {
            if (npc.map !== this.currentMap || !npc.active) continue;
            
            const distance = Math.sqrt(Math.pow(x - npc.x, 2) + Math.pow(y - npc.y, 2));
            if (distance < 20) {
                return false;
            }
        }
        
        // Verificar colisão com outros jogadores
        for (const [playerId, player] of this.otherPlayers) {
            if (player.map !== this.currentMap) continue;
            
            const distance = Math.sqrt(Math.pow(x - player.x, 2) + Math.pow(y - player.y, 2));
            if (distance < 20) {
                return false;
            }
        }
        
        return true;
    }
    
    clampCamera() {
        const map = this.maps[this.currentMap];
        if (!map) return;
        
        const maxCamX = map.width * this.tileSize - this.canvas.width;
        const maxCamY = map.height * this.tileSize - this.canvas.height;
        
        this.camX = Math.max(0, Math.min(this.camX, maxCamX));
        this.camY = Math.max(0, Math.min(this.camY, maxCamY));
    }
    
    render() {
        if (!this.ctx) return;
        
        // Limpar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Renderizar mapa
        this.renderMap();
        
        // Renderizar NPCs
        this.renderNpcs();
        
        // Renderizar outros jogadores
        this.renderOtherPlayers();
        
        // Renderizar jogador
        this.renderPlayer();
        
        // Renderizar nomes
        this.renderNames();
    }
    
    renderMap() {
        const map = this.maps[this.currentMap];
        if (!map || !this.assets.tileset) return;
        
        // Calcular tiles visíveis
        const startTileX = Math.floor(this.camX / this.tileSize);
        const startTileY = Math.floor(this.camY / this.tileSize);
        const endTileX = Math.min(map.width, startTileX + this.viewportTilesX + 1);
        const endTileY = Math.min(map.height, startTileY + this.viewportTilesY + 1);
        
        // Renderizar tiles visíveis
        for (let y = startTileY; y < endTileY; y++) {
            for (let x = startTileX; x < endTileX; x++) {
                const tileId = map.tiles[y][x];
                const screenX = x * this.tileSize - this.camX;
                const screenY = y * this.tileSize - this.camY;
                
                // Desenhar tile (cada tile é 32x32 no tileset)
                this.ctx.drawImage(
                    this.assets.tileset,
                    tileId * this.tileSize, 0, this.tileSize, this.tileSize,
                    screenX, screenY, this.tileSize, this.tileSize
                );
                
                // Animar água (alternar entre dois tiles)
                if (tileId === 1) {
                    const animationFrame = Math.floor(Date.now() / 500) % 2;
                    this.ctx.drawImage(
                        this.assets.tileset,
                        (tileId + animationFrame) * this.tileSize, 0, this.tileSize, this.tileSize,
                        screenX, screenY, this.tileSize, this.tileSize
                    );
                }
            }
        }
    }
    
    renderNpcs() {
        if (!this.assets.npc) return;
        
        for (const [npcId, npc] of this.npcs) {
            if (npc.map !== this.currentMap || !npc.active) continue;
            
            const screenX = npc.x - this.camX - this.tileSize / 2;
            const screenY = npc.y - this.camY - this.tileSize / 2;
            
            // Verificar se o NPC está na tela
            if (screenX + this.tileSize < 0 || screenX > this.canvas.width ||
                screenY + this.tileSize < 0 || screenY > this.canvas.height) {
                continue;
            }
            
            // Desenhar NPC (sempre virado para baixo)
            const spriteRow = 0; // Baixo
            const spriteCol = Math.floor(Date.now() / 250) % 4; // Animação
            
            this.ctx.drawImage(
                this.assets.npc,
                spriteCol * this.tileSize, spriteRow * this.tileSize, this.tileSize, this.tileSize,
                screenX, screenY, this.tileSize, this.tileSize
            );
        }
    }
    
    renderOtherPlayers() {
        if (!this.assets.player) return;
        
        for (const [playerId, player] of this.otherPlayers) {
            if (player.map !== this.currentMap) continue;
            
            const screenX = player.x - this.camX - this.tileSize / 2;
            const screenY = player.y - this.camY - this.tileSize / 2;
            
            // Verificar se o jogador está na tela
            if (screenX + this.tileSize < 0 || screenX > this.canvas.width ||
                screenY + this.tileSize < 0 || screenY > this.canvas.height) {
                continue;
            }
            
            // Desenhar jogador (sempre virado para baixo)
            const spriteRow = 0; // Baixo
            const spriteCol = Math.floor(Date.now() / 250) % 4; // Animação
            
            this.ctx.drawImage(
                this.assets.player,
                spriteCol * this.tileSize, spriteRow * this.tileSize, this.tileSize, this.tileSize,
                screenX, screenY, this.tileSize, this.tileSize
            );
        }
    }
    
    renderPlayer() {
        if (!this.player || !this.assets.player) return;
        
        const screenX = this.player.x - this.camX - this.tileSize / 2;
        const screenY = this.player.y - this.camY - this.tileSize / 2;
        
        // Determinar linha do spritesheet baseado na direção
        let spriteRow = 0; // Baixo
        if (this.player.direction === 'left') spriteRow = 1;
        if (this.player.direction === 'right') spriteRow = 2;
        if (this.player.direction === 'up') spriteRow = 3;
        
        // Determinar coluna do spritesheet baseado na animação
        let spriteCol = 1; // Frame parado
        if (this.isMoving) {
            spriteCol = Math.floor(Date.now() / 150) % 4; // Animação mais rápida quando movendo
        }
        
        this.ctx.drawImage(
            this.assets.player,
            spriteCol * this.tileSize, spriteRow * this.tileSize, this.tileSize, this.tileSize,
            screenX, screenY, this.tileSize, this.tileSize
        );
    }
    
    renderNames() {
        if (!this.player) return;
        
        // Renderizar nome do jogador
        this.renderNameTag(this.player.x, this.player.y, this.player.name, '#3498db');
        
        // Renderizar nomes dos NPCs
        for (const [npcId, npc] of this.npcs) {
            if (npc.map !== this.currentMap || !npc.active) continue;
            this.renderNameTag(npc.x, npc.y, npc.name, '#e74c3c');
        }
        
        // Renderizar nomes de outros jogadores
        for (const [playerId, player] of this.otherPlayers) {
            if (player.map !== this.currentMap) continue;
            this.renderNameTag(player.x, player.y, player.name, '#2ecc71');
        }
    }
    
    renderNameTag(x, y, name, color) {
        const screenX = x - this.camX;
        const screenY = y - this.camY - this.tileSize / 2 - 10;
        
        // Verificar se está na tela
        if (screenX < 0 || screenX > this.canvas.width ||
            screenY < 0 || screenY > this.canvas.height) {
            return;
        }
        
        this.ctx.fillStyle = color;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(name, screenX, screenY);
    }
    
    gameLoop() {
        const now = Date.now();
        const deltaTime = now - this.lastFrameTime;
        
        this.update(deltaTime);
        this.render();
        
        this.lastFrameTime = now;
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Inicializar o jogo quando a página carregar
window.addEventListener('load', () => {
    new Game();
});