const fs = require('fs');

const appContent = `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
// @ts-ignore
import db from './infra/database/db';

import clientesRoutes from './modules/clientes/clientes.routes';
import transacoesRoutes from './modules/transacoes/transacoes.routes';
import recompensasRoutes from './modules/recompensas/recompensas.routes';       
import usuariosRoutes from './modules/usuarios/usuarios.routes';
import adminRoutes from './modules/admin/admin.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import resgatesRoutes from './modules/resgates/resgates.routes';

dotenv.config();

const app = express();

// Middlewares de Seguranca, Performance e Monitoramento
app.use(helmet());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));    

const limiter = rateLimit({
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

app.use(cors({
  origin: function (origin: any, callback: any) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

// Registro de rotas
app.use('/clientes', clientesRoutes);
app.use('/transacoes', transacoesRoutes); 
app.use('/recompensas', recompensasRoutes);
app.use('/resgates', resgatesRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/admin', adminRoutes);
app.use('/dashboard', dashboardRoutes);

export default app;
`;

fs.writeFileSync('C:\\Users\\Gui\\Documents\\GitHub\\Sistema-de-Fidelidade\\backend\\src\\app.ts', appContent, 'utf8');
