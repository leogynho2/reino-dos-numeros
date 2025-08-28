const BattleSystem = require('./battle');
const MissionSystem = require('./missions');
const MathQuestionGenerator = require('./math');

class SocketHandler {
    constructor(io, db) {
        this.io = io;
        this.db = db;
        this.players = new Map();
        this.battleSystem = new BattleSystem();
        this.missionSystem = new MissionSystem();
        this.mathGenerator = new MathQuestionGenerator();
        
        this.setupEventHandlers();
        this.startRespawnInterval();
    }

    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log('Usuário conectado:', socket.id);

            // Evento de entrada do jogador
            socket.on('player:join', async (data) => {
                try {
                    let user = await this.db.getUserByName(data.name);
                    
                    if (!user) {
                        const userId = await this.db.createUser(data.name);
                        user = await this.db.getUserByName(data.name);
                    }
                    
                    // Adicionar jogador à lista de jogadores online
                    this.players.set(socket.id, {
                        id: user.id,
                        name: user.name,
                        socket: socket,
                        map: user.last_map,
                        x: user.x,
                        y: user.y
                    });
                    
                    // Enviar dados iniciais para o jogador
                    const npcs = await this.db.getNpcsByMap(user.last_map);
                    const missions = await this.missionSystem.getMissionProgress(this.db, user.id);
                    
                    socket.emit('player:joined', {
                        player: {
                            id: user.id,
                            name: user.name,
                            level: user.level,
                            exp: user.exp,
                            hp: user.hp,
                            max_hp: user.max_hp,
                            coins: user.coins,
                            wins: user.wins,
                            losses: user.losses,
                            map: user.last_map,
                            x: user.x,
                            y: user.y
                        },
                        npcs: npcs,
                        missions: missions,
                        otherPlayers: Array.from(this.players.values())
                            .filter(p => p.socket.id !== socket.id && p.map === user.last_map)
                            .map(p => ({ id: p.id, name: p.name, x: p.x, y: p.y }))
                    });
                    
                    // Notificar outros jogadores sobre o novo jogador
                    socket.broadcast.emit('player:entered', {
                        id: user.id,
                        name: user.name,
                        map: user.last_map,
                        x: user.x,
                        y: user.y
                    });
                } catch (error) {
                    console.error('Erro no player:join:', error);
                    socket.emit('error', { message: 'Erro ao entrar no jogo' });
                }
            });

            // Evento de movimento do jogador
            socket.on('player:move', async (data) => {
                try {
                    const player = this.players.get(socket.id);
                    if (!player) return;
                    
                    // Atualizar posição localmente
                    player.x = data.x;
                    player.y = data.y;
                    player.map = data.map;
                    
                    // Atualizar no banco de dados (com debounce)
                    if (!this.moveUpdateTimeout) {
                        this.moveUpdateTimeout = setTimeout(async () => {
                            await this.db.updatePlayerPosition(player.id, player.x, player.y, player.map);
                            this.moveUpdateTimeout = null;
                        }, 1000);
                    }
                    
                    // Transmitir movimento para outros jogadores no mesmo mapa
                    socket.broadcast.emit('player:moved', {
                        id: player.id,
                        x: player.x,
                        y: player.y,
                        map: player.map
                    });
                } catch (error) {
                    console.error('Erro no player:move:', error);
                }
            });

            // Evento de interação com NPC
            socket.on('player:interact', async (data) => {
                try {
                    const player = this.players.get(socket.id);
                    if (!player) return;
                    
                    const npc = await this.db.getNpcById(data.npcId);
                    if (!npc || !npc.active) {
                        socket.emit('interaction:error', { message: 'NPC não disponível' });
                        return;
                    }
                    
                    // Verificar se o jogador está perto o suficiente do NPC
                    const distance = Math.sqrt(Math.pow(player.x - npc.x, 2) + Math.pow(player.y - npc.y, 2));
                    if (distance > 100) {
                        socket.emit('interaction:error', { message: 'Muito longe para interagir' });
                        return;
                    }
                    
                    // Gerar pergunta matemática baseada no nível do jogador
                    let difficulty = "normal";
                    if (player.level < 3) difficulty = "easy";
                    else if (player.level > 7) difficulty = "hard";
                    
                    const question = this.mathGenerator.getQuestion(difficulty);
                    
                    // Iniciar batalha
                    const battleId = await this.battleSystem.createBattle(player.id, npc.id, player.hp, 100);
                    
                    // Enviar pergunta para o jogador
                    socket.emit('battle:start', {
                        battleId: battleId,
                        npcId: npc.id,
                        npcName: npc.name,
                        question: question.prompt,
                        explanation: question.explanation
                    });
                    
                    // Atualizar missão de falar com NPC
                    await this.missionSystem.checkMissions(this.db, player.id, 'talk_npc', { npcId: npc.id });
                    
                } catch (error) {
                    console.error('Erro no player:interact:', error);
                    socket.emit('interaction:error', { message: 'Erro ao interagir com NPC' });
                }
            });

            // Evento de resposta à pergunta
            socket.on('battle:answer', async (data) => {
                try {
                    const player = this.players.get(socket.id);
                    if (!player) return;
                    
                    const question = {
                        prompt: data.question,
                        solution: data.correctAnswer,
                        explanation: data.explanation
                    };
                    
                    const result = await this.battleSystem.processBattle(
                        this.db, 
                        player.id, 
                        data.npcId, 
                        data.answer, 
                        question, 
                        data.battleId
                    );
                    
                    // Enviar resultado para o jogador
                    socket.emit('battle:result', result);
                    
                    // Se o NPC foi derrotado, notificar todos no mapa
                    if (result.npcDefeated) {
                        this.io.emit('npc:defeated', {
                            npcId: data.npcId,
                            map: player.map
                        });
                    }
                    
                } catch (error) {
                    console.error('Erro no battle:answer:', error);
                    socket.emit('battle:error', { message: 'Erro ao processar batalha' });
                }
            });

            // Evento de solicitação de missões
            socket.on('missions:get', async () => {
                try {
                    const player = this.players.get(socket.id);
                    if (!player) return;
                    
                    const missions = await this.missionSystem.getMissionProgress(this.db, player.id);
                    socket.emit('missions:update', missions);
                } catch (error) {
                    console.error('Erro no missions:get:', error);
                }
            });

            // Evento de desconexão
            socket.on('disconnect', () => {
                const player = this.players.get(socket.id);
                if (player) {
                    // Notificar outros jogadores sobre a saída
                    socket.broadcast.emit('player:left', { id: player.id });
                    
                    // Remover jogador da lista
                    this.players.delete(socket.id);
                }
                console.log('Usuário desconectado:', socket.id);
            });
        });
    }

    startRespawnInterval() {
        // Verificar respawn de NPCs a cada 30 segundos
        setInterval(async () => {
            try {
                await this.db.respawnNpcs();
                
                // Obter NPCs que respawnaram
                const respawnedNpcs = await this.db.getRecentlyRespawnedNpcs();
                
                // Notificar jogadores sobre NPCs que respawnaram
                for (const npc of respawnedNpcs) {
                    this.io.emit('npc:respawned', {
                        npcId: npc.id,
                        map: npc.map
                    });
                }
            } catch (error) {
                console.error('Erro no respawn de NPCs:', error);
            }
        }, 30000);
    }
}

module.exports = SocketHandler;