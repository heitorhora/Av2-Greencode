export { Papel, StatusEquipamento, StatusLote, TipoEquipamento } from "@prisma/client";
import { Papel } from "@prisma/client";

/** 0 = melhor conservacao. Armazenado como Int no banco. */
export enum EstadoFisico {
  NOVO = 0,
  BOM = 1,
  REGULAR = 2,
  RUIM = 3,
  INSERVIVEL = 4,
}

export interface ResultadoValidacao {
  valido: boolean;
  erros: string[];
}

/** Dominios de permissao por papel (mesma matriz da AV1; "usuario" e "config" so o administrador tem). */
export const PERMISSOES: Record<Papel, string[]> = {
  ADMINISTRADOR: ["usuario", "config", "org", "lote", "equipamento", "auditoria", "relatorio"],
  OPERADOR_CADASTRO: ["org", "relatorio"],
  GESTOR_ALMOXARIFADO: ["org-leitura", "lote", "equipamento", "relatorio"],
  AUDITOR: ["auditoria", "relatorio", "org-leitura"],
};
