import { StatusLote, TipoEquipamento } from "@prisma/client";
import { prisma, Tx } from "../lib/prisma";

export const LoteRepository = {
  listar: (db: Tx = prisma) =>
    db.lote.findMany({
      orderBy: { criadoEm: "desc" },
      include: { organizacao: { select: { razaoSocial: true, cnpj: true } }, _count: { select: { equipamentos: true } } },
    }),
  porId: (id: string, db: Tx = prisma) =>
    db.lote.findUnique({ where: { id }, include: { organizacao: true, equipamentos: { orderBy: { criadoEm: "asc" } } } }),
  criarComEquipamentos: (
    d: {
      organizacaoId: string; notaFiscal: string; transportadora: string; dataEntrada: Date;
      equipamentos: { tipo: TipoEquipamento; codigoBarrasInterno: string; atributos?: object }[];
    },
    db: Tx = prisma
  ) =>
    db.lote.create({
      data: {
        organizacaoId: d.organizacaoId, notaFiscal: d.notaFiscal, transportadora: d.transportadora, dataEntrada: d.dataEntrada,
        equipamentos: { create: d.equipamentos.map((e) => ({ tipo: e.tipo, codigoBarrasInterno: e.codigoBarrasInterno, atributos: e.atributos ?? {} })) },
      },
      include: { equipamentos: true },
    }),
  atualizarComVersao: async (id: string, versao: number, data: { status?: StatusLote; notaFiscal?: string; transportadora?: string }, db: Tx = prisma) =>
    (await db.lote.updateMany({ where: { id, versao }, data: { ...data, versao: { increment: 1 } } })).count,
};
