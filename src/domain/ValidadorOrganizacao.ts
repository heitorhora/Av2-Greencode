import { Validador } from "./Validador";
import { validarCNPJ } from "./cnpj";

export interface EntradaValidacaoOrganizacao {
  cnpj: string;
  razaoSocial: string;
}

/** Unicidade do CNPJ fica no banco (UNIQUE); aqui so formato e digitos verificadores. */
export class ValidadorOrganizacao extends Validador<EntradaValidacaoOrganizacao> {
  protected executar({ cnpj, razaoSocial }: EntradaValidacaoOrganizacao): void {
    if (!razaoSocial || razaoSocial.trim().length < 2) {
      this.adicionarErro("Razao social e obrigatoria e deve ter ao menos 2 caracteres.");
    }
    if (!validarCNPJ(cnpj)) {
      this.adicionarErro("CNPJ invalido: os digitos verificadores nao conferem.");
    }
  }
}
