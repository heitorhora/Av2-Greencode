import { Papel } from "@prisma/client";
import { prisma, Tx } from "../lib/prisma";

const publico = { id: true, username: true, nome: true, email: true, papel: true, ativo: true, versao: true, criadoEm: true, atualizadoEm: true } as const;

export const UsuarioRepository = {
  publico,
  listar: (db: Tx = prisma) => db.usuario.findMany({ select: publico, orderBy: { criadoEm: "asc" } }),
  porId: (id: string, db: Tx = prisma) => db.usuario.findUnique({ where: { id } }),
  porUsername: (username: string, db: Tx = prisma) => db.usuario.findUnique({ where: { username } }),
  criar: (data: { username: string; nome: string; email?: string | null; hashSenha: string; papel: Papel }, db: Tx = prisma) =>
    db.usuario.create({ data, select: publico }),
  contarAdminsAtivos: (db: Tx = prisma) => db.usuario.count({ where: { papel: "ADMINISTRADOR", ativo: true } }),
  /** Retorna quantas linhas casaram (0 = versao desatualizada). */
  atualizarComVersao: async (id: string, versao: number, data: Record<string, unknown>, db: Tx = prisma) =>
    (await db.usuario.updateMany({ where: { id, versao }, data: { ...data, versao: { increment: 1 } } })).count,
  selecionar: (id: string, db: Tx = prisma) => db.usuario.findUnique({ where: { id }, select: publico }),
};
