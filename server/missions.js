class MissionSystem {
    constructor() {
        this.missionTypes = {
            'talk_npc': this.checkTalkNpcMission.bind(this),
            'correct_answers': this.checkCorrectAnswersMission.bind(this),
            'enter_portal': this.checkEnterPortalMission.bind(this)
        };
    }

    async checkTalkNpcMission(db, userId, mission, data) {
        if (data.npcId && mission.status === 'active') {
            const newProgress = mission.progress + 1;
            await db.updateMissionProgress(userId, mission.code, newProgress);
            
            if (newProgress >= mission.target) {
                await db.completeMission(userId, mission.code);
                
                // Dar recompensa
                const player = await db.getUserById(userId);
                await db.updatePlayerStats(userId, {
                    exp: player.exp + mission.reward_exp,
                    coins: player.coins + mission.reward_coins
                });
                
                return { completed: true, mission: mission.code };
            }
            
            return { progress: newProgress };
        }
        return null;
    }

    async checkCorrectAnswersMission(db, userId, mission, data) {
        // Esta missão é tratada no sistema de batalha
        return null;
    }

    async checkEnterPortalMission(db, userId, mission, data) {
        if (data.portalEntered && mission.status === 'active') {
            await db.completeMission(userId, mission.code);
            
            // Dar recompensa
            const player = await db.getUserById(userId);
            await db.updatePlayerStats(userId, {
                exp: player.exp + mission.reward_exp,
                coins: player.coins + mission.reward_coins
            });
            
            return { completed: true, mission: mission.code };
        }
        return null;
    }

    async checkMissions(db, userId, missionType, data) {
        try {
            const missions = await db.getPlayerMissions(userId);
            const relevantMissions = missions.filter(m => m.type === missionType && m.status === 'active');
            
            const results = [];
            for (const mission of relevantMissions) {
                const handler = this.missionTypes[missionType];
                if (handler) {
                    const result = await handler(db, userId, mission, data);
                    if (result) {
                        results.push(result);
                    }
                }
            }
            
            return results;
        } catch (error) {
            console.error('Erro ao verificar missões:', error);
            return [];
        }
    }

    async getMissionProgress(db, userId) {
        try {
            return await db.getPlayerMissions(userId);
        } catch (error) {
            console.error('Erro ao obter progresso das missões:', error);
            return [];
        }
    }
}

module.exports = MissionSystem;