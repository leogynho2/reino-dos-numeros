// /public/net.js
// Este arquivo é responsável pela comunicação em rede
// A maior parte da lógica já está integrada no game.js

// Funções auxiliares para comunicação com a API do professor
class ProfessorAPI {
    static async login(username, password) {
        const response = await fetch('/api/prof/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            throw new Error('Falha no login');
        }
        
        return response.json();
    }
    
    static async getOverview(token) {
        const response = await fetch('/api/prof/overview', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Falha ao obter overview');
        }
        
        return response.json();
    }
    
    static async getRanking(token) {
        const response = await fetch('/api/prof/ranking', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Falha ao obter ranking');
        }
        
        return response.json();
    }
    
    static async exportCSV(token) {
        const response = await fetch('/api/prof/export.csv', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Falha ao exportar CSV');
        }
        
        return response.blob();
    }
}