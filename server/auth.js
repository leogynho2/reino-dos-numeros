const jwt = require('jsonwebtoken');
require('dotenv').config();

class AuthSystem {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
    }

    generateToken(userId, username) {
        return jwt.sign(
            { userId, username },
            this.jwtSecret,
            { expiresIn: '24h' }
        );
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            return null;
        }
    }

    middleware(req, res, next) {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token de acesso necessário' });
        }
        
        const token = authHeader.substring(7);
        const decoded = this.verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        
        req.user = decoded;
        next();
    }
}

module.exports = AuthSystem;