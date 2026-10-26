import { AppError } from "./erros";

/** Concorrencia otimista: o update so vale se `versao` ainda e a que o cliente leu. */
export function exigirUmaLinha(count: number, oQue: string): void {
  if (count === 0) {
    throw AppError.conflito(`${oQue} foi alterado(a) por outra pessoa (ou nao existe). Recarregue e tente de novo.`);
  }
}
