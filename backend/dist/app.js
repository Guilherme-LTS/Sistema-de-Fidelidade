"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const clientes_routes_1 = __importDefault(require("./modules/clientes/clientes.routes"));
const transacoes_routes_1 = __importDefault(require("./modules/transacoes/transacoes.routes"));
const recompensas_routes_1 = __importDefault(require("./modules/recompensas/recompensas.routes"));
const usuarios_routes_1 = __importDefault(require("./modules/usuarios/usuarios.routes"));
const admin_routes_1 = __importDefault(require("./modules/admin/admin.routes"));
const dashboard_routes_1 = __importDefault(require("./modules/dashboard/dashboard.routes"));
const resgates_routes_1 = __importDefault(require("./modules/resgates/resgates.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middlewares de Seguranca, Performance e Monitoramento
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'Muitas requisicoes originadas deste IP, por favor tente novamente mais tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
const allowedOrigins = [
    'http://localhost:3000',
    'https://sistema-fidelidade-flax.vercel.app'
];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use(express_1.default.json());
// Registro de rotas
app.use('/clientes', clientes_routes_1.default);
app.use('/transacoes', transacoes_routes_1.default);
app.use('/recompensas', recompensas_routes_1.default);
app.use('/resgates', resgates_routes_1.default);
app.use('/usuarios', usuarios_routes_1.default);
app.use('/admin', admin_routes_1.default);
app.use('/dashboard', dashboard_routes_1.default);
exports.default = app;
