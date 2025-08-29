const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

class Database {
    constructor() {
        this.db = null;
    }

    connect(dbPath) {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Erro ao conectar ao banco de dados:', err);
                    reject(err);
                } else {
                    console.log('Conectado ao banco de dados SQLite');
                    this.init()
                        .then(() => resolve())
                        .catch(reject);
                }
            });
        });
    }

    init() {
        return new Promise((resolve, reject) => {
            // Executar schema.sql
            const fs = require('fs');
            const schemaPath = path.join(__dirname, 'schema.sql');
            
            fs.readFile(schemaPath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }

                this.db.exec(data, (err) => {
                    if (err) {
                        console.error('Erro ao executar schema:', err);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }

    // Métodos para operações com usuários
    createUser(name) {
        return new Promise((resolve, reject) => {
            const sql = 'INSERT INTO users (name) VALUES (?)';
            this.db.run(sql, [name], function(err) {
                if (err) {
                    reject(err);
                } else {
                    // Criar registro do jogador
                    const playerSql = `INSERT INTO players (user_id, level, exp, hp, max_hp, coins, wins, losses, last_map, x, y) 
                                       VALUES (?, 1, 0, 100, 100, 0, 0, 0, 'map-city', 400, 300)`;
                    this.db.run(playerSql, [this.lastID], function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            // Adicionar missões iniciais
                            const missionsSql = `INSERT INTO player_missions (user_id, mission_id) 
                                                SELECT ?, id FROM missions`;
                            this.db.run(missionsSql, [this.lastID], function(err) {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(this.lastID);
                                }
                            });
                        }
                    });
                }
            });
        });
    }

    getUserByName(name) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT u.*, p.level, p.exp, p.hp, p.max_hp, p.coins, p.wins, p.losses, p.last_map, p.x, p.y 
                         FROM users u JOIN players p ON u.id = p.user_id WHERE u.name = ?`;
            this.db.get(sql, [name], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    updatePlayerPosition(userId, x, y, map) {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE players SET x = ?, y = ?, last_map = ? WHERE user_id = ?';
            this.db.run(sql, [x, y, map, userId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    updatePlayerStats(userId, updates) {
        return new Promise((resolve, reject) => {
            let sql = 'UPDATE players SET ';
            const params = [];
            const setClauses = [];
            
            for (const [key, value] of Object.entries(updates)) {
                setClauses.push(`${key} = ?`);
                params.push(value);
            }
            
            sql += setClauses.join(', ') + ' WHERE user_id = ?';
            params.push(userId);
            
            this.db.run(sql, params, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Métodos para NPCs
    getNpcsByMap(map) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM npcs WHERE map = ? AND active = 1';
            this.db.all(sql, [map], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getNpcById(id) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM npcs WHERE id = ?';
            this.db.get(sql, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    defeatNpc(id) {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE npcs SET active = 0, last_defeated_at = CURRENT_TIMESTAMP WHERE id = ?';
            this.db.run(sql, [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    respawnNpcs() {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE npcs SET active = 1, last_defeated_at = NULL
                        WHERE active = 0 AND datetime(last_defeated_at, '+' || respawn_sec || ' seconds') <= datetime('now')
                        RETURNING id, map`;
            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Métodos para missões
    getPlayerMissions(userId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT m.*, pm.progress, pm.status 
                         FROM missions m 
                         JOIN player_missions pm ON m.id = pm.mission_id 
                         WHERE pm.user_id = ?`;
            this.db.all(sql, [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    updateMissionProgress(userId, missionCode, progress) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE player_missions 
                         SET progress = ?, updated_at = CURRENT_TIMESTAMP 
                         WHERE user_id = ? AND mission_id = (SELECT id FROM missions WHERE code = ?)`;
            this.db.run(sql, [progress, userId, missionCode], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    completeMission(userId, missionCode) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE player_missions 
                         SET status = 'completed', updated_at = CURRENT_TIMESTAMP 
                         WHERE user_id = ? AND mission_id = (SELECT id FROM missions WHERE code = ?)`;
            this.db.run(sql, [userId, missionCode], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Métodos para batalhas
    createBattle(userId, npcId, playerHp, npcHp) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO battles (user_id, npc_id, player_hp, npc_hp) 
                         VALUES (?, ?, ?, ?)`;
            this.db.run(sql, [userId, npcId, playerHp, npcHp], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    updateBattle(battleId, updates) {
        return new Promise((resolve, reject) => {
            let sql = 'UPDATE battles SET ';
            const params = [];
            const setClauses = [];
            
            for (const [key, value] of Object.entries(updates)) {
                setClauses.push(`${key} = ?`);
                params.push(value);
            }
            
            sql += setClauses.join(', ') + ' WHERE id = ?';
            params.push(battleId);
            
            this.db.run(sql, params, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Métodos para log de respostas
    logAnswer(userId, npcId, question, correct, deltaHp, expGain) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO answers_log (user_id, npc_id, question_snapshot_json, correct, delta_hp, exp_gain) 
                         VALUES (?, ?, ?, ?, ?, ?)`;
            this.db.run(sql, [userId, npcId, JSON.stringify(question), correct, deltaHp, expGain], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Métodos para professor
    verifyProfessor(username, password) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM professors WHERE username = ?';
            this.db.get(sql, [username], async (err, row) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    resolve(false);
                } else {
                    const isValid = await bcrypt.compare(password, row.password_hash);
                    resolve(isValid ? row : false);
                }
            });
        });
    }

    getRanking() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT u.name, p.level, p.exp, p.wins, p.losses, p.coins 
                         FROM users u JOIN players p ON u.id = p.user_id 
                         ORDER BY p.exp DESC LIMIT 10`;
            this.db.all(sql, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getStudentProgress() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT u.name, u.created_at, p.level, p.exp, p.wins, p.losses, p.coins,
                         (SELECT COUNT(*) FROM player_missions pm WHERE pm.user_id = u.id AND pm.status = 'completed') as completed_missions,
                         (SELECT COUNT(*) FROM answers_log al WHERE al.user_id = u.id AND al.correct = 1) as correct_answers,
                         (SELECT COUNT(*) FROM answers_log al WHERE al.user_id = u.id AND al.correct = 0) as wrong_answers
                         FROM users u JOIN players p ON u.id = p.user_id 
                         ORDER BY u.name`;
            this.db.all(sql, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = Database;