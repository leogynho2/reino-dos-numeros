const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || './database.sqlite';

// Verificar se o arquivo de banco de dados existe
const dbExists = fs.existsSync(dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        process.exit(1);
    }
    console.log('Conectado ao banco de dados SQLite');
});

// Ler e executar schema.sql
const schemaPath = path.join(__dirname, 'schema.sql');
fs.readFile(schemaPath, 'utf8', (err, data) => {
    if (err) {
        console.error('Erro ao ler schema.sql:', err);
        db.close();
        process.exit(1);
    }

    // Executar cada comando SQL separadamente
    const commands = data.split(';').filter(cmd => cmd.trim().length > 0);
    
    let executed = 0;
    const total = commands.length;
    
    commands.forEach((command, index) => {
        if (command.trim() === '') return;
        
        db.run(command + ';', function(err) {
            if (err) {
                console.error(`Erro ao executar comando ${index + 1}:`, err);
                console.error('Comando:', command);
            } else {
                executed++;
            }
            
            // Quando todos os comandos forem executados
            if (executed + (total - commands.length) === total) {
                console.log(`Banco de dados inicializado: ${executed}/${total} comandos executados com sucesso`);
                
                // Verificar se as tabelas foram criadas
                db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
                    if (err) {
                        console.error('Erro ao verificar tabelas:', err);
                    } else {
                        console.log('Tabelas criadas:');
                        tables.forEach(table => console.log(' -', table.name));
                    }
                    
                    db.close((err) => {
                        if (err) {
                            console.error('Erro ao fechar banco de dados:', err);
                        } else {
                            console.log('Banco de dados fechado');
                        }
                        process.exit(0);
                    });
                });
            }
        });
    });
});
