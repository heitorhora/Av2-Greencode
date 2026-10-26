import { Validador } from "./Validador";

const JANELA_MAXIMA_DIAS = 90;
const MS_DIA = 24 * 60 * 60 * 1000;

/** Regras de data da AV1; existencia da organizacao e garantida pela chave estrangeira. */
export class ValidadorLote extends Validador<{ dataEntrada: string }> {
  protected executar({ dataEntrada }: { dataEntrada: string }): void {
    const data = new Date(dataEntrada);
    if (Number.isNaN(data.getTime())) {
      this.adicionarErro(`Data de entrada invalida: "${dataEntrada}".`);
      return;
    }
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    if (data.getTime() > hoje.getTime()) this.adicionarErro("Data de entrada nao pode ser futura.");
    if (data.getTime() < hoje.getTime() - JANELA_MAXIMA_DIAS * MS_DIA) {
      this.adicionarErro(`Data de entrada nao pode ser anterior a ${JANELA_MAXIMA_DIAS} dias.`);
    }
  }
}
