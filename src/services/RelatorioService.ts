import { prisma } from "../lib/prisma";
import { EquipamentoRepository } from "../repositories/EquipamentoRepository";
import { EquipamentoFactory } from "../domain/Equipamento";
import { AppError } from "../lib/erros";
import { auditar } from "../lib/auditoria";

export const RelatorioService = {
  async potencialRecuperacao() {
    const itens = (await EquipamentoRepository.todosParaRelatorio()).map((e) => {
      const o = EquipamentoFactory.criar(e);
      return { id: e.id, codigoBarrasInterno: e.codigoBarrasInterno, tipo: e.tipo, status: e.status, potencial: o.calcularPotencialRecuperacao(), componentes: o.descreverComponentesRecuperaveis() };
    });
    const media = itens.length ? Number((itens.reduce((s, i) => s + i.potencial, 0) / itens.length).toFixed(2)) : 0;
    return { total: itens.length, potencialMedio: media, itens };
  },

  /** Numeros da tela inicial: um round-trip por consulta, todas em paralelo. */
  async painel() {
    const [porStatus, organizacoes, lotes, usuarios, recentes] = await Promise.all([
      EquipamentoRepository.contagem(),
      prisma.organizacao.count(),
      prisma.lote.count(),
      prisma.usuario.count({ where: { ativo: true } }),
      prisma.movimentacao.findMany({ orderBy: { criadoEm: "desc" }, take: 8 }),
    ]);
    const equipamentosPorStatus = Object.fromEntries(porStatus.map((g) => [g.status, g._count._all]));
    const total = porStatus.reduce((s, g) => s + g._count._all, 0);
    const potencial = await this.potencialRecuperacao();
    return { organizacoes, lotes, usuarios, equipamentos: total, equipamentosPorStatus, potencialMedio: potencial.potencialMedio, movimentacoesRecentes: recentes };
  },

  auditoria: (f: { entidade?: string; usuarioId?: string; limite: number }) =>
    prisma.auditoria.findMany({
      where: { entidade: f.entidade, usuarioId: f.usuarioId },
      orderBy: { criadoEm: "desc" },
      take: f.limite,
      include: { usuario: { select: { username: true } } },
    }),

  async parametros() {
    return prisma.parametro.upsert({ where: { id: 1 }, create: {}, update: {} });
  },

  async atualizarParametros(atorId: string, d: { aliquotaImpostos?: number; coeficienteDepreciacao?: number }) {
    for (const [k, v] of Object.entries(d)) if (v! < 0 || v! > 100) throw AppError.invalido(`${k} deve estar entre 0 e 100.`);
    return prisma.$transaction(async (tx) => {
      const p = await tx.parametro.upsert({ where: { id: 1 }, create: d, update: d });
      await auditar(tx, atorId, "EDITAR", "Parametro", "1", d);
      return p;
    });
  },
};
