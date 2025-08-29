class BattleSystem {
    constructor() {
        this.config = {
            playerBaseDmg: 5,
            playerDmgScale: 1.5,
            enemyBaseDmg: 3,
            enemyDmgScale: 1.2,
            baseExpGain: 10,
            expGainRange: 5, // +0 a +5 XP aleatório
            coinReward: 5
        };
    }

    calculatePlayerDamage(level) {
        return this.config.playerBaseDmg + Math.floor(level * this.config.playerDmgScale);
    }

    calculateEnemyDamage(level) {
        return this.config.enemyBaseDmg + Math.floor(level * this.config.enemyDmgScale);
    }

    calculateExpGain() {
        return this.config.baseExpGain + Math.floor(Math.random() * (this.config.expGainRange + 1));
    }

    calculateLevel(exp) {
        return Math.floor(1 + Math.sqrt(exp) / 2);
    }

    calculateMaxHp(level) {
        return 100 + (level - 1) * 20;
    }

    async processBattle(db, userId, npcId, answer, question, battleId = null) {
        try {
            // Obter dados do jogador e NPC
            const player = await db.getUserById(userId);
            const npc = await db.getNpcById(npcId);
            
            if (!player || !npc) {
                throw new Error("Jogador ou NPC não encontrado");
            }
            
            let battleData;
            if (battleId) {
                // Buscar batalha existente
                battleData = await db.getBattleById(battleId);
            } else {
                // Criar nova batalha
                battleData = {
                    player_hp: player.hp,
                    npc_hp: 100 // HP fixo para NPCs por enquanto
                };
                battleId = await db.createBattle(userId, npcId, battleData.player_hp, battleData.npc_hp);
            }
            
            // Validar resposta
            const mathGenerator = new (require('./math'))();
            const isCorrect = mathGenerator.validateAnswer(question, answer);
            
            let result = {
                correct: isCorrect,
                playerHp: battleData.player_hp,
                npcHp: battleData.npc_hp,
                battleId: battleId,
                battleEnded: false,
                npcDefeated: false,
                playerDefeated: false,
                expGain: 0,
                coinGain: 0,
                playerDamage: 0,
                enemyDamage: 0
            };
            
            if (isCorrect) {
                // Jogador acertou - causa dano no NPC
                const damage = this.calculatePlayerDamage(player.level);
                result.npcHp = Math.max(0, battleData.npc_hp - damage);
                result.expGain = this.calculateExpGain();
                result.coinGain = this.config.coinReward;
                result.playerDamage = damage;
                
                // Atualizar experiência e moedas do jogador
                const newExp = player.exp + result.expGain;
                const newLevel = this.calculateLevel(newExp);
                const newMaxHp = this.calculateMaxHp(newLevel);
                
                const updates = {
                    exp: newExp,
                    coins: player.coins + result.coinGain
                };
                
                // Verificar se subiu de nível
                if (newLevel > player.level) {
                    updates.level = newLevel;
                    updates.max_hp = newMaxHp;
                    updates.hp = newMaxHp; // Curar completamente ao subir de nível
                }
                
                await db.updatePlayerStats(userId, updates);
                
                // Log da resposta correta
                await db.logAnswer(userId, npcId, question, true, -damage, result.expGain);
                
                // Atualizar progresso da missão de acertos
                const missions = await db.getPlayerMissions(userId);
                const correctAnswersMission = missions.find(m => m.code === 'M002');
                if (correctAnswersMission && correctAnswersMission.status === 'active') {
                    const newProgress = correctAnswersMission.progress + 1;
                    await db.updateMissionProgress(userId, 'M002', newProgress);
                    
                    if (newProgress >= correctAnswersMission.target) {
                        await db.completeMission(userId, 'M002');
                        // Dar recompensa
                        await db.updatePlayerStats(userId, {
                            exp: player.exp + result.expGain + correctAnswersMission.reward_exp,
                            coins: player.coins + result.coinGain + correctAnswersMission.reward_coins
                        });
                    }
                }
            } else {
                // Jogador errou - sofre dano
                const damage = this.calculateEnemyDamage(player.level);
                result.playerHp = Math.max(0, battleData.player_hp - damage);
                result.enemyDamage = damage;
                
                // Atualizar HP do jogador
                await db.updatePlayerStats(userId, { hp: result.playerHp });
                
                // Log da resposta errada
                await db.logAnswer(userId, npcId, question, false, -damage, 0);
            }
            
            // Atualizar estado da batalha
            await db.updateBattle(battleId, {
                player_hp: result.playerHp,
                npc_hp: result.npcHp,
                state: result.playerHp <= 0 || result.npcHp <= 0 ? 'finished' : 'active'
            });
            
            // Verificar se a batalha terminou
            if (result.playerHp <= 0) {
                result.battleEnded = true;
                result.playerDefeated = true;
                
                // Registrar derrota
                await db.updatePlayerStats(userId, {
                    losses: player.losses + 1,
                    hp: this.calculateMaxHp(player.level) // Restaurar HP ao ser derrotado
                });
            } else if (result.npcHp <= 0) {
                result.battleEnded = true;
                result.npcDefeated = true;
                
                // Registrar vitória
                await db.updatePlayerStats(userId, {
                    wins: player.wins + 1
                });
                
                // Derrotar NPC
                await db.defeatNpc(npcId);
            }
            
            return result;
        } catch (error) {
            console.error('Erro no processamento da batalha:', error);
            throw error;
        }
    }
}

module.exports = BattleSystem;