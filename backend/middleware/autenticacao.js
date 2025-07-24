// backend/middleware/autenticacao.js
const jwt = require('jsonwebtoken');

const verificaToken = (req, res, next) => {
  // O token vem no cabeçalho 'Authorization' no formato 'Bearer TOKEN'
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Pega só o token

  if (!token) {
    return res.sendStatus(401); // Unauthorized
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
    if (err) {
      return res.sendStatus(403); // Forbidden
    }
    // Se o token for válido, guardamos os dados do usuário na requisição
    req.usuario = usuario;
    next(); // Continua para a rota principal
  });
};

module.exports = verificaToken;