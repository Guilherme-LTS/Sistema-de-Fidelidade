import { AuthenticatedRequest } from '../../infra/database/db-rls';
import { HttpError } from '../../shared/errors/http-error';

export class UsuariosService {
  getCurrentUser(authReq: AuthenticatedRequest) {
    if (!authReq.usuario) {
      throw new HttpError(401, 'Usuario autenticado nao encontrado.');
    }

    return authReq.usuario;
  }
}
