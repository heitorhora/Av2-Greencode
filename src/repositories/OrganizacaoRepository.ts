import { prisma, Tx } from "../lib/prisma";

const incluir = { contrato: true, _count: { select: { lotes: true } } } as const;

export const OrganizacaoRepository = {
  listar: (db: Tx = prisma) => db.organizacao.findMany({ include: incluir, orderBy: { razaoSocial: "asc" } }),
  porId: (id: string, db: Tx = prisma) => db.organizacao.findUnique({ where: { id }, include: incluir }),
  porCnpj: (cnpj: string, db: Tx = prisma) => db.organizacao.findUnique({ where: { cnpj } }),
  criar: (
    d: { cnpj: string; razaoSocial: string; segmento: string; contrato?: { numero: string; vigenciaInicio: Date; vigenciaFim: Date } },
    db: Tx = prisma
  ) =>
    db.organizacao.create({
      data: { cnpj: d.cnpj, razaoSocial: d.razaoSocial, segmento: d.segmento, contrato: d.contrato ? { create: d.contrato } : undefined },
      include: incluir,
    }),
  atualizarComVersao: async (id: string, versao: number, data: Record<string, unknown>, db: Tx = prisma) =>
    (await db.organizacao.updateMany({ where: { id, versao }, data: { ...data, versao: { increment: 1 } } })).count,
  upsertContrato: (organizacaoId: string, c: { numero: string; vigenciaInicio: Date; vigenciaFim: Date }, db: Tx = prisma) =>
    db.contrato.upsert({ where: { organizacaoId }, create: { ...c, organizacaoId }, update: c }),
  removerContrato: (organizacaoId: string, db: Tx = prisma) => db.contrato.deleteMany({ where: { organizacaoId } }),
  remover: (id: string, db: Tx = prisma) => db.organizacao.delete({ where: { id } }),
};
