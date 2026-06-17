import { NextFunction, Request, Response } from 'express';
import { isHttpError } from '../errors/http-error';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (isHttpError(error)) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  console.error('Erro nao tratado:', error);
  return res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
}
