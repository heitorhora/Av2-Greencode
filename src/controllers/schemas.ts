// JSON Schema do Fastify: valida e remove campos extras antes de chegar no controller.
export const id = { type: "object", required: ["id"], properties: { id: { type: "string", minLength: 1 } } } as const;
export const versao = { type: "integer", minimum: 1 } as const;
export const PAPEIS = ["ADMINISTRADOR", "OPERADOR_CADASTRO", "GESTOR_ALMOXARIFADO", "AUDITOR"] as const;
export const STATUS_EQ = ["AGUARDANDO_TRIAGEM", "TRIADO", "DESMONTE", "RECICLAGEM", "DESCARTE_SEGURO"] as const;
export const STATUS_LOTE = ["RECEBIDO", "EM_TRIAGEM", "TRIAGEM_CONCLUIDA", "FINALIZADO"] as const;
export const TIPOS = ["TERMINAL_COMPUTADOR", "PERIFERICO", "EQUIPAMENTO_TELECOM"] as const;
export const contrato = {
  type: "object", required: ["numero", "vigenciaInicio", "vigenciaFim"], additionalProperties: false,
  properties: { numero: { type: "string", minLength: 1 }, vigenciaInicio: { type: "string" }, vigenciaFim: { type: "string" } },
} as const;
