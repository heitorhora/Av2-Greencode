import { TipoEquipamento } from "./tipos";

export interface EquipamentoDados {
  id: string;
  tipo: TipoEquipamento;
  estadoFisico: number;
  status: string;
}

/**
 * Polimorfismo da AV1: cada subtipo descreve seus componentes e pondera o
 * potencial de recuperacao. Novo tipo de ativo = nova subclasse + um case na factory.
 */
export abstract class EquipamentoBase {
  constructor(protected readonly dados: EquipamentoDados) {}
  protected abstract readonly densidadeNobre: number;
  abstract descreverComponentesRecuperaveis(): string[];

  /** 0 a 1: fator do estado fisico (NOVO=1 ... INSERVIVEL=0) x densidade de materiais nobres do tipo. */
  calcularPotencialRecuperacao(): number {
    return Number(((1 - this.dados.estadoFisico / 4) * this.densidadeNobre).toFixed(2));
  }
}

class TerminalComputador extends EquipamentoBase {
  protected readonly densidadeNobre = 0.7;
  descreverComponentesRecuperaveis() {
    return ["placa-mae", "processador", "memoria RAM", "fonte de alimentacao", "HDD/SSD", "gabinete metalico"];
  }
}
class Periferico extends EquipamentoBase {
  protected readonly densidadeNobre = 0.35;
  descreverComponentesRecuperaveis() {
    return ["cabos", "plasticos ABS", "pequenas placas de circuito"];
  }
}
class EquipamentoTelecom extends EquipamentoBase {
  protected readonly densidadeNobre = 0.55;
  descreverComponentesRecuperaveis() {
    return ["antenas", "modulos de radiofrequencia", "baterias", "placas de circuito de alta densidade"];
  }
}

export class EquipamentoFactory {
  static criar(dados: EquipamentoDados): EquipamentoBase {
    switch (dados.tipo) {
      case "TERMINAL_COMPUTADOR": return new TerminalComputador(dados);
      case "PERIFERICO": return new Periferico(dados);
      case "EQUIPAMENTO_TELECOM": return new EquipamentoTelecom(dados);
      default: throw new Error(`Tipo de equipamento desconhecido: ${String(dados.tipo)}`);
    }
  }
}
