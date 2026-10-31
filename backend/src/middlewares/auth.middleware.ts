import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { JWT_ACCESS_SECRET } from "../config/env";
import type { RolUsuario } from "../repositorios/auth.repository";
import { buscarUsuarioPorId } from "../repositorios/auth.repository";

export interface UsuarioAutenticado {
  id: number;
  nombre: string;
  rol: RolUsuario;
}

function rechazar(res: Parameters<RequestHandler>[1], codigo: string, mensaje: string) {
  return res.status(401).json({ codigo, mensaje });
}

export const autenticar: RequestHandler = async (req, res, next) => {
  const cabecera = req.header("authorization");
  const coincidencia = cabecera?.match(/^Bearer\s+(.+)$/i);
  if (!coincidencia) return rechazar(res, "TOKEN_REQUERIDO", "Se requiere un token Bearer valido");

  let contenido: jwt.JwtPayload | string;
  try {
    contenido = jwt.verify(coincidencia[1], JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
  } catch {
    return rechazar(res, "TOKEN_INVALIDO", "El token no es valido o ha expirado");
  }
  try {
    if (typeof contenido === "string") return rechazar(res, "TOKEN_INVALIDO", "El token no es valido");

    const { id, nombre, rol } = contenido;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1 || id > 2147483647 || typeof nombre !== "string" || (rol !== "admin" && rol !== "estudiante" && rol !== "profesor")) {
      return rechazar(res, "TOKEN_INVALIDO", "El token no es valido");
    }
    const actual = await buscarUsuarioPorId(id);
    if (!actual || !actual.activo) return rechazar(res, 'USUARIO_INACTIVO', 'La cuenta no existe o está desactivada');
    if (actual.rol !== rol) {
      res.status(403).json({codigo:'ROL_MODIFICADO',mensaje:'Los permisos de tu cuenta cambiaron. Inicia sesión nuevamente'});
      return;
    }
    res.locals.usuario = { id, nombre: actual.nombre, rol: actual.rol } satisfies UsuarioAutenticado;
    return next();
  } catch (error) {
    next(error);
  }
};

export function autorizar(...rolesPermitidos: RolUsuario[]): RequestHandler {
  return (_req, res, next) => {
    const usuario = res.locals.usuario as UsuarioAutenticado | undefined;
    if (!usuario || !rolesPermitidos.includes(usuario.rol)) {
      res.status(403).json({ codigo: "ACCESO_DENEGADO", mensaje: "No tienes permisos para esta operacion" });
      return;
    }
    next();
  };
}
