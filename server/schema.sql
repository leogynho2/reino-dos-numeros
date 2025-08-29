-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    email TEXT,
    password_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de jogadores
CREATE TABLE IF NOT EXISTS players (
    user_id INTEGER PRIMARY KEY,
    level INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    hp INTEGER DEFAULT 100,
    max_hp INTEGER DEFAULT 100,
    coins INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    last_map TEXT DEFAULT 'map-city',
    x INTEGER DEFAULT 400,
    y INTEGER DEFAULT 300,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Tabela de missões
CREATE TABLE IF NOT EXISTS missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    target INTEGER NOT NULL,
    reward_exp INTEGER NOT NULL,
    reward_coins INTEGER NOT NULL
);

-- Tabela de progresso de missões dos jogadores
CREATE TABLE IF NOT EXISTS player_missions (
    user_id INTEGER,
    mission_id INTEGER,
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, mission_id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (mission_id) REFERENCES missions (id)
);

-- Tabela de NPCs
CREATE TABLE IF NOT EXISTS npcs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    map TEXT NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    respawn_sec INTEGER DEFAULT 180,
    active BOOLEAN DEFAULT 1,
    last_defeated_at DATETIME
);

-- Tabela de batalhas
CREATE TABLE IF NOT EXISTS battles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    npc_id INTEGER,
    state TEXT DEFAULT 'active',
    player_hp INTEGER,
    npc_hp INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (npc_id) REFERENCES npcs (id)
);

-- Tabela de professores
CREATE TABLE IF NOT EXISTS professors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
);

-- Tabela de log de respostas
CREATE TABLE IF NOT EXISTS answers_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    npc_id INTEGER,
    question_snapshot_json TEXT,
    correct BOOLEAN,
    delta_hp INTEGER,
    exp_gain INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (npc_id) REFERENCES npcs (id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_players_level ON players (level);
CREATE INDEX IF NOT EXISTS idx_players_exp ON players (exp);
CREATE INDEX IF NOT EXISTS idx_npcs_map ON npcs (map);
CREATE INDEX IF NOT EXISTS idx_npcs_active ON npcs (active);
CREATE INDEX IF NOT EXISTS idx_player_missions_status ON player_missions (status);

-- Inserir missões iniciais
INSERT OR IGNORE INTO missions (code, title, description, type, target, reward_exp, reward_coins) VALUES
('M001', 'Primeiro Contato', 'Fale com 1 NPC', 'talk_npc', 1, 10, 10),
('M002', 'Aquecimento Numérico', 'Acerte 3 perguntas', 'correct_answers', 3, 25, 20),
('M003', 'Explorador', 'Entre no portal da floresta', 'enter_portal', 1, 15, 0);

-- Inserir NPCs iniciais
INSERT OR IGNORE INTO npcs (name, map, x, y, respawn_sec) VALUES
('Matemago', 'map-city', 600, 400, 180),
('Calculista', 'map-city', 700, 500, 180),
('Geometro', 'map-forest', 800, 600, 180);

-- Inserir professor padrão (senha: professor123)
INSERT OR IGNORE INTO professors (username, password_hash) VALUES
('professor', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
