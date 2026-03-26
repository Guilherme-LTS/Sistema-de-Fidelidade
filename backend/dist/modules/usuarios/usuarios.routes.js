"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const autenticacao_1 = __importDefault(require("../../shared/middlewares/autenticacao"));
const router = (0, express_1.Router)();
// GET /usuarios/me - Retorna dados atuais do usuario autenticado
router.get('/me', autenticacao_1.default, (req, res) => {
    res.status(200).json(req.usuario);
});
exports.default = router;
