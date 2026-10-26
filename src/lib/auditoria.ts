import { Prisma } from "@prisma/client";
import { Tx } from "./prisma";

/** Grava na MESMA transacao da operacao: ou muda o dado e audita, ou nenhum dos dois. */
export function auditar(
  tx: Tx, usuarioId: string | null, acao: string, entidade: string, entidadeId: string, detalhe?: Prisma.InputJsonValue
) {
  return tx.auditoria.create({ data: { usuarioId, acao, entidade, entidadeId, detalhe } });
}
