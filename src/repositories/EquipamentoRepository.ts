import { StatusEquipamento } from "@prisma/client";
import { prisma, Tx } from "../lib/prisma";

export const EquipamentoRepository = {
  listar: (filtro: { loteId?: string; status?: StatusEquipamento }, db: Tx = prisma) =>
    db.equipamento.findMany({ where: filtro, orderBy: { criadoEm: "desc" } }),
  porId: (id: string, db: Tx = prisma) => db.equipamento.findUnique({ where: { id } }),
  rastro: (id: string, db: Tx = prisma) =>
    db.equipamento.findUnique({
      where: { id },
      include: { movimentacoes: { orderBy: { criadoEm: "asc" } }, historico: { orderBy: { criadoEm: "asc" } }, lote: { include: { organizacao: true } } },
    }),
  atualizarComVersao: async (id: string, versao: number, data: Record<string, unknown>, db: Tx = prisma) =>
    (await db.equipamento.updateMany({ where: { id, versao }, data: { ...data, versao: { increment: 1 } } })).count,
  registrarMovimentacao: (
    d: { equipamentoId: string; statusAnterior: StatusEquipamento; statusNovo: StatusEquipamento; usuarioId: string; observacao?: string },
    db: Tx = prisma
  ) => db.movimentacao.create({ data: d }),
  registrarHistorico: (
    d: { equipamentoId: string; estadoAnterior: number; estadoNovo: number; justificativa?: string; usuarioId: string },
    db: Tx = prisma
  ) => db.historicoEstado.create({ data: d }),
  todosParaRelatorio: (db: Tx = prisma) => db.equipamento.findMany({ select: { id: true, tipo: true, estadoFisico: true, status: true, codigoBarrasInterno: true } }),
  contagem: (db: Tx = prisma) => db.equipamento.groupBy({ by: ["status"], _count: { _all: true } }),
};
