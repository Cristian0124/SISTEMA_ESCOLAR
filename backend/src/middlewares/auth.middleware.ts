import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { JWT_ACCESS_SECRET } from "../config/env";
import type { RolUsuario } from "../repositorios/usuarios.repository";

export interface UsuarioAutenticado {
  id: number;
  nombre: string;
  rol: RolUsuario;
}

function rechazar(res: Parameters<RequestHandler>[1], codigo: string, mensaje: string) {
  return res.status(401).json({ codigo, mensaje });
}

export const autenticar: RequestHandler = (req, res, next) => {
  const cabecera = req.header("authorization");
  const coincidencia = cabecera?.match(/^Bearer\s+(.+)$/i);
  if (!coincidencia) return rechazar(res, "TOKEN_REQUERIDO", "Se requiere un token Bearer valido");

  try {
    const contenido = jwt.verify(coincidencia[1], JWT_ACCESS_SECRET);
    if (typeof contenido === "string") return rechazar(res, "TOKEN_INVALIDO", "El token no es valido");

    const { id, nombre, rol } = contenido;
    if (typeof id !== "number" || typeof nombre !== "string" || (rol !== "admin" && rol !== "estudiante")) {
      return rechazar(res, "TOKEN_INVALIDO", "El token no es valido");
    }
    res.locals.usuario = { id, nombre, rol } satisfies UsuarioAutenticado;
    return next();
  } catch {
    return rechazar(res, "TOKEN_INVALIDO", "El token no es valido o ha expirado");
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