import { OrganizacaoRepository as Repo } from "../repositories/OrganizacaoRepository";
import { ValidadorOrganizacao } from "../domain/ValidadorOrganizacao";
import { normalizarCNPJ } from "../domain/cnpj";
import { AppError } from "../lib/erros";
import { prisma } from "../lib/prisma";
import { auditar } from "../lib/auditoria";
import { exigirUmaLinha } from "../lib/versao";

export interface ContratoEntrada { numero: string; vigenciaInicio: string; vigenciaFim: string }

function contrato(c: ContratoEntrada) {
  const ini = new Date(c.vigenciaInicio), fim = new Date(c.vigenciaFim);
  if (Number.isNaN(ini.getTime()) || Number.isNaN(fim.getTime())) throw AppError.invalido("Datas do contrato invalidas.");
  if (fim <= ini) throw AppError.invalido("Fim da vigencia deve ser posterior ao inicio.");
  return { numero: c.numero.trim(), vigenciaInicio: ini, vigenciaFim: fim };
}

export const OrganizacaoService = {
  listar: () => Repo.listar(),

  async buscar(id: string) {
    const o = await Repo.porId(id);
    if (!o) throw AppError.naoEncontrado("Organizacao");
    return o;
  },

  async criar(atorId: string, d: { cnpj: string; razaoSocial: string; segmento: string; contrato?: ContratoEntrada }) {
    const r = new ValidadorOrganizacao().validar(d);
    if (!r.valido) throw AppError.invalido(...r.erros);
    return prisma.$transaction(async (tx) => {
      const o = await Repo.criar(
        { cnpj: normalizarCNPJ(d.cnpj), razaoSocial: d.razaoSocial.trim(), segmento: d.segmento.trim(), contrato: d.contrato && contrato(d.contrato) },
        tx
      );
      await auditar(tx, atorId, "CRIAR", "Organizacao", o.id, { cnpj: o.cnpj });
      return o;
    });
  },

  /** Edita razao social/segmento; contrato: objeto = cria ou troca, null = remove, ausente = mantem. */
  async editar(atorId: string, id: string, d: { versao: number; razaoSocial?: string; segmento?: string; contrato?: ContratoEntrada | null }) {
    if (d.razaoSocial !== undefined && d.razaoSocial.trim().length < 2) throw AppError.invalido("Razao social deve ter ao menos 2 caracteres.");
    return prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = {};
      if (d.razaoSocial !== undefined) data.razaoSocial = d.razaoSocial.trim();
      if (d.segmento !== undefined) data.segmento = d.segmento.trim();
      exigirUmaLinha(await Repo.atualizarComVersao(id, d.versao, data, tx), "Organizacao");
      if (d.contrato) await Repo.upsertContrato(id, contrato(d.contrato), tx);
      else if (d.contrato === null) await Repo.removerContrato(id, tx);
      await auditar(tx, atorId, "EDITAR", "Organizacao", id, { campos: [...Object.keys(data), ...(d.contrato !== undefined ? ["contrato"] : [])] });
      return (await Repo.porId(id, tx))!;
    });
  },

  async remover(atorId: string, id: string) {
    const o = await this.buscar(id);
    if (o._count.lotes > 0) throw AppError.conflito("Organizacao possui lotes e nao pode ser removida.");
    await prisma.$transaction(async (tx) => {
      await Repo.remover(id, tx);
      await auditar(tx, atorId, "REMOVER", "Organizacao", id, { cnpj: o.cnpj });
    });
  },
};
