import { StatusEquipamento } from "@prisma/client";
import { EquipamentoRepository as Repo } from "../repositories/EquipamentoRepository";
import { ValidadorMudancaEstadoFisico, ValidadorTransicaoStatus } from "../domain/ValidadorEquipamento";
import { EquipamentoFactory } from "../domain/Equipamento";
import { AppError } from "../lib/erros";
import { prisma } from "../lib/prisma";
import { auditar } from "../lib/auditoria";
import { exigirUmaLinha } from "../lib/versao";

export const EquipamentoService = {
  listar: (f: { loteId?: string; status?: StatusEquipamento }) => Repo.listar(f),

  async rastrear(id: string) {
    const e = await Repo.rastro(id);
    if (!e) throw AppError.naoEncontrado("Equipamento");
    const o = EquipamentoFactory.criar(e);
    return { ...e, potencialRecuperacao: o.calcularPotencialRecuperacao(), componentesRecuperaveis: o.descreverComponentesRecuperaveis() };
  },

  /** Triagem: estado fisico + status TRIADO + historico + movimentacao + auditoria, tudo atomico. */
  async triar(atorId: string, id: string, d: { versao: number; estadoFisico: number; justificativa?: string }) {
    return prisma.$transaction(async (tx) => {
      const e = await Repo.porId(id, tx);
      if (!e) throw AppError.naoEncontrado("Equipamento");

      const estado = new ValidadorMudancaEstadoFisico().validar({ estadoAnterior: e.estadoFisico, estadoNovo: d.estadoFisico, justificativa: d.justificativa });
      const transicao = new ValidadorTransicaoStatus().validar({ statusAtual: e.status, statusDesejado: "TRIADO" });
      const erros = [...estado.erros, ...transicao.erros];
      if (erros.length) throw AppError.invalido(...erros);

      exigirUmaLinha(await Repo.atualizarComVersao(id, d.versao, { estadoFisico: d.estadoFisico, status: "TRIADO" }, tx), "Equipamento");
      await Repo.registrarHistorico({ equipamentoId: id, estadoAnterior: e.estadoFisico, estadoNovo: d.estadoFisico, justificativa: d.justificativa, usuarioId: atorId }, tx);
      await Repo.registrarMovimentacao({ equipamentoId: id, statusAnterior: e.status, statusNovo: "TRIADO", usuarioId: atorId, observacao: d.justificativa }, tx);
      await auditar(tx, atorId, "TRIAGEM", "Equipamento", id, { estado: d.estadoFisico });
      return (await Repo.porId(id, tx))!;
    });
  },

  async moverStatus(atorId: string, id: string, d: { versao: number; status: StatusEquipamento; observacao?: string }) {
    return prisma.$transaction(async (tx) => {
      const e = await Repo.porId(id, tx);
      if (!e) throw AppError.naoEncontrado("Equipamento");
      const r = new ValidadorTransicaoStatus().validar({ statusAtual: e.status, statusDesejado: d.status });
      if (!r.valido) throw AppError.invalido(...r.erros);

      exigirUmaLinha(await Repo.atualizarComVersao(id, d.versao, { status: d.status }, tx), "Equipamento");
      await Repo.registrarMovimentacao({ equipamentoId: id, statusAnterior: e.status, statusNovo: d.status, usuarioId: atorId, observacao: d.observacao }, tx);
      await auditar(tx, atorId, "MOVIMENTAR", "Equipamento", id, { de: e.status, para: d.status });
      return (await Repo.porId(id, tx))!;
    });
  },

  /** Corrige dados cadastrais (codigo de barras, atributos). Status e estado fisico so mudam por triagem/movimentacao. */
  async editar(atorId: string, id: string, d: { versao: number; codigoBarrasInterno?: string; atributos?: object }) {
    const { versao, ...campos } = d;
    return prisma.$transaction(async (tx) => {
      exigirUmaLinha(await Repo.atualizarComVersao(id, versao, campos, tx), "Equipamento");
      await auditar(tx, atorId, "EDITAR", "Equipamento", id, { campos: Object.keys(campos) });
      return (await Repo.porId(id, tx))!;
    });
  },
};
