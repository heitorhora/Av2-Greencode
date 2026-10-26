import { StatusLote, TipoEquipamento } from "@prisma/client";
import { LoteRepository as Repo } from "../repositories/LoteRepository";
import { ValidadorLote } from "../domain/ValidadorLote";
import { AppError } from "../lib/erros";
import { prisma } from "../lib/prisma";
import { auditar } from "../lib/auditoria";
import { exigirUmaLinha } from "../lib/versao";

export const LoteService = {
  listar: () => Repo.listar(),

  async buscar(id: string) {
    const l = await Repo.porId(id);
    if (!l) throw AppError.naoEncontrado("Lote");
    return l;
  },

  /** Lote + equipamentos em uma transacao: se um codigo de barras duplicar, nada e gravado. */
  async criar(
    atorId: string,
    d: { organizacaoId: string; notaFiscal: string; transportadora: string; dataEntrada: string; equipamentos?: { tipo: TipoEquipamento; codigoBarrasInterno: string }[] }
  ) {
    const r = new ValidadorLote().validar({ dataEntrada: d.dataEntrada });
    if (!r.valido) throw AppError.invalido(...r.erros);
    return prisma.$transaction(async (tx) => {
      const l = await Repo.criarComEquipamentos(
        { ...d, dataEntrada: new Date(d.dataEntrada), equipamentos: d.equipamentos ?? [] },
        tx
      );
      await auditar(tx, atorId, "CRIAR", "Lote", l.id, { notaFiscal: l.notaFiscal, equipamentos: l.equipamentos.length });
      return l;
    });
  },

  async editar(atorId: string, id: string, d: { versao: number; notaFiscal?: string; transportadora?: string; status?: StatusLote }) {
    const { versao, ...campos } = d;
    return prisma.$transaction(async (tx) => {
      exigirUmaLinha(await Repo.atualizarComVersao(id, versao, campos, tx), "Lote");
      await auditar(tx, atorId, "EDITAR", "Lote", id, campos);
      return (await Repo.porId(id, tx))!;
    });
  },
};
