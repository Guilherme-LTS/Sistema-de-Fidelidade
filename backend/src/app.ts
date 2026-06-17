import express from 'express';
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
import authRoutes from './modules/auth/auth.routes';
import publicRoutes from './modules/public/public.routes';
import { errorHandler } from './shared/middlewares/error-handler';

dotenv.config();

const app = express();
app.set('trust proxy', 1);

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

const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3004',
  'https://sistema-fidelidade-flax.vercel.app',
  ...envOrigins
];

app.use(cors({
  origin: function (origin: any, callback: any) {
    if (!origin) {
      return callback(null, true);
    }
    
    const isAllowed = allowedOrigins.includes(origin) || 
                      /^https:\/\/sistema-fidelidade-.*\.vercel\.app$/.test(origin);
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, false); // Retorna false em vez de lançar erro para evitar crashes no Express
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());

// Registro de rotas
app.use('/auth', authRoutes);
app.use('/public', publicRoutes);
app.use('/clientes', clientesRoutes);
app.use('/transacoes', transacoesRoutes); 
app.use('/recompensas', recompensasRoutes);
app.use('/resgates', resgatesRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/admin', adminRoutes);
app.use('/dashboard', dashboardRoutes);

app.use(errorHandler);

export default app;
