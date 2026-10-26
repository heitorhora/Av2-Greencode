/** Erro de negocio com status HTTP; o error handler global converte em JSON padronizado. */
export class AppError extends Error {
  constructor(public readonly status: number, public readonly erros: string[]) {
    super(erros.join(" | "));
  }
  static invalido(...erros: string[]) { return new AppError(400, erros); }
  static naoEncontrado(oQue: string) { return new AppError(404, [`${oQue} nao encontrado(a).`]); }
  static proibido(msg = "Sem permissao para esta operacao.") { return new AppError(403, [msg]); }
  static conflito(...erros: string[]) { return new AppError(409, erros); }
}
