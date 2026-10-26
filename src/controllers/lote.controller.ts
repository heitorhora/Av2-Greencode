import { FastifyInstance } from "fastify";
import { LoteService } from "../services/LoteService";
import { EquipamentoService } from "../services/EquipamentoService";
import { exigir } from "../plugins/auth";
import { id, versao, STATUS_EQ, STATUS_LOTE, TIPOS } from "./schemas";

export default async function (app: FastifyInstance) {
  const leitura = [exigir("lote", "auditoria")];
  const escrita = [exigir("lote")];

  app.get("/lotes", { preHandler: leitura }, async () => LoteService.listar());
  app.get("/lotes/:id", { preHandler: leitura, schema: { params: id } }, async (req) => LoteService.buscar((req.params as any).id));

  app.post("/lotes", {
    preHandler: escrita,
    schema: { body: { type: "object", required: ["organizacaoId", "notaFiscal", "transportadora", "dataEntrada"], additionalProperties: false, properties: {
      organizacaoId: { type: "string" }, notaFiscal: { type: "string", minLength: 1 }, transportadora: { type: "string", minLength: 2 }, dataEntrada: { type: "string" },
      equipamentos: { type: "array", maxItems: 500, items: { type: "object", required: ["tipo", "codigoBarrasInterno"], additionalProperties: false,
        properties: { tipo: { enum: TIPOS }, codigoBarrasInterno: { type: "string", minLength: 3 } } } },
    } } },
  }, async (req, rep) => rep.code(201).send(await LoteService.criar(req.usuario.id, req.body as any)));

  app.patch("/lotes/:id", {
    preHandler: escrita,
    schema: { params: id, body: { type: "object", required: ["versao"], additionalProperties: false, properties: {
      versao, notaFiscal: { type: "string", minLength: 1 }, transportadora: { type: "string", minLength: 2 }, status: { enum: STATUS_LOTE },
    } } },
  }, async (req) => LoteService.editar(req.usuario.id, (req.params as any).id, req.body as any));

  // ---- equipamentos ----
  app.get("/equipamentos", {
    preHandler: leitura,
    schema: { querystring: { type: "object", properties: { loteId: { type: "string" }, status: { enum: STATUS_EQ } } } },
  }, async (req) => EquipamentoService.listar(req.query as any));

  app.get("/equipamentos/:id", { preHandler: leitura, schema: { params: id } }, async (req) => EquipamentoService.rastrear((req.params as any).id));

  app.post("/equipamentos/:id/triagem", {
    preHandler: escrita,
    schema: { params: id, body: { type: "object", required: ["versao", "estadoFisico"], additionalProperties: false, properties: {
      versao, estadoFisico: { type: "integer", minimum: 0, maximum: 4 }, justificativa: { type: "string" },
    } } },
  }, async (req) => EquipamentoService.triar(req.usuario.id, (req.params as any).id, req.body as any));

  app.post("/equipamentos/:id/movimentacao", {
    preHandler: escrita,
    schema: { params: id, body: { type: "object", required: ["versao", "status"], additionalProperties: false, properties: {
      versao, status: { enum: STATUS_EQ }, observacao: { type: "string" },
    } } },
  }, async (req) => EquipamentoService.moverStatus(req.usuario.id, (req.params as any).id, req.body as any));

  app.patch("/equipamentos/:id", {
    preHandler: escrita,
    schema: { params: id, body: { type: "object", required: ["versao"], additionalProperties: false, properties: {
      versao, codigoBarrasInterno: { type: "string", minLength: 3 }, atributos: { type: "object" },
    } } },
  }, async (req) => EquipamentoService.editar(req.usuario.id, (req.params as any).id, req.body as any));
}
