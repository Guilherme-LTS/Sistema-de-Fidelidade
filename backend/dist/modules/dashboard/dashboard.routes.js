"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../../infra/database/db"));
const autenticacao_1 = __importDefault(require("../../shared/middlewares/autenticacao"));
const router = (0, express_1.Router)();
// GET /dashboard/stats - Estatísticas do dashboard
router.get('/stats', autenticacao_1.default, async (req, res) => {
    try {
        const metricasQuery = `SELECT 
      (SELECT COUNT(*) FROM clientes) as total_clientes, 
      (SELECT COALESCE(SUM(pontos_restantes), 0) FROM transacoes WHERE data_liberacao > NOW()) as pontos_pendentes,
      (SELECT COALESCE(SUM(pontos_restantes), 0) FROM transacoes WHERE data_liberacao <= NOW() AND data_vencimento > NOW()) as pontos_disponiveis,
      (SELECT COALESCE(SUM(pontos_gastos), 0) FROM resgates) as pontos_resgatados;`;
        const resMetricas = await db_1.default.query(metricasQuery);
        const topClientesQuery = `
      SELECT
        c.nome,
        c.cpf,
        (SELECT COALESCE(SUM(t.pontos_restantes), 0) FROM transacoes t WHERE t.cliente_id = c.id AND t.data_liberacao <= NOW() AND t.data_vencimento > NOW()) as saldo_pontos
      FROM
        clientes c
      WHERE
        (SELECT COALESCE(SUM(t.pontos_restantes), 0) FROM transacoes t WHERE t.cliente_id = c.id AND t.data_liberacao <= NOW() AND t.data_vencimento > NOW()) > 0
      ORDER BY
        saldo_pontos DESC
      LIMIT 5;
    `;
        const resTopClientes = await db_1.default.query(topClientesQuery);
        // Gerar gráfico dos últimos 7 dias dinamicamente
        const dataGrafico = [];
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const startOfDay = new Date(d.setHours(0, 0, 0, 0)).toISOString();
            const endOfDay = new Date(d.setHours(23, 59, 59, 999)).toISOString();
            const resPontosDia = await db_1.default.query(`SELECT COALESCE(SUM(pontos_ganhos), 0) as total FROM transacoes WHERE data_transacao >= $1 AND data_transacao <= $2`, [startOfDay, endOfDay]);
            const resResgatesDia = await db_1.default.query(`SELECT COALESCE(SUM(pontos_gastos), 0) as total FROM resgates WHERE data_resgate >= $1 AND data_resgate <= $2`, [startOfDay, endOfDay]);
            dataGrafico.push({
                name: diasSemana[d.getDay()],
                pontos: parseInt(resPontosDia.rows[0].total),
                resgates: parseInt(resResgatesDia.rows[0].total)
            });
        }
        const row = resMetricas.rows[0];
        const stats = {
            totalClientes: parseInt(row.total_clientes || 0),
            pontosPendentes: parseInt(row.pontos_pendentes || 0),
            pontosDisponiveis: parseInt(row.pontos_disponiveis || 0),
            pontosResgatados: parseInt(row.pontos_resgatados || 0),
            recentes: resTopClientes.rows,
            chartData: dataGrafico
        };
        res.status(200).json(stats);
    }
    catch (error) {
        console.error('Erro ao buscar estatísticas do dashboard:', error);
        res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
    }
});
exports.default = router;
