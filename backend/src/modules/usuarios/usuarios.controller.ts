import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../infra/database/db-rls';
import { UsuariosService } from './usuarios.service';

export function usuarioAtualController(req: Request, res: Response) {
  const service = new UsuariosService();
  const usuario = service.getCurrentUser(req as AuthenticatedRequest);

  return res.status(200).json(usuario);
}
