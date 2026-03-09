import { Request, Response, NextFunction } from 'express';

/**
 * requiereRol — corta con 403 si el rol del usuario autenticado
 * no está en la lista de roles permitidos.
 *
 * Siempre debe usarse después de `autenticar`.
 *
 * @example
 * router.delete('/productos/:id', autenticar, requiereRol('Admin'), eliminarProducto)
 * router.patch('/productos/:id', autenticar, requiereRol('Admin', 'Operador'), editarProducto)
 */
export const requiereRol = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ mensaje: 'No autenticado' });
      return;
    }

    if (!roles.includes(req.usuario.rol)) {
      res.status(403).json({
        mensaje: 'No tenés permisos para realizar esta acción',
      });
      return;
    }

    next();
  };
};

/**
 * esOwnerOAdmin — permite acceso si el recurso pertenece al usuario
 * autenticado (el id en req.params coincide con req.usuario.id)
 * O si el usuario tiene rol Admin u Operador.
 *
 * Siempre debe usarse después de `autenticar`.
 *
 * @example
 * router.get('/ventas/:id', autenticar, esOwnerOAdmin, verVenta)
 */
export const esOwnerOAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.usuario) {
    res.status(401).json({ mensaje: 'No autenticado' });
    return;
  }

  const rolesConAccesoTotal = ['Admin', 'Operador'];
  const esAdmin = rolesConAccesoTotal.includes(req.usuario.rol);
  const esOwner = req.usuario.id === Number(req.params.id);

  if (!esAdmin && !esOwner) {
    res.status(403).json({
      mensaje: 'No tenés permisos para acceder a este recurso',
    });
    return;
  }

  next();
};

/**
 * requiereMayorista — permite acceso solo a usuarios con cuenta mayorista aprobada,
 * Admin u Operador.
 */
export const requiereMayorista = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.usuario) {
    res.status(401).json({ mensaje: 'No autenticado' });
    return;
  }

  const rolesPrivilegiados = ['Admin', 'Operador'];
  const esMayoristaAprobado =
    req.usuario.rol === 'Cliente Mayorista' && req.usuario.aprobado;

  if (!rolesPrivilegiados.includes(req.usuario.rol) && !esMayoristaAprobado) {
    res.status(403).json({
      mensaje: 'Esta acción requiere una cuenta mayorista aprobada',
    });
    return;
  }

  next();
};
