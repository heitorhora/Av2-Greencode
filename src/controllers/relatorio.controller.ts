import { FastifyInstance } from "fastify";
import { RelatorioService } from "../services/RelatorioService";
import { exigir } from "../plugins/auth";

export default async function (app: FastifyInstance) {
  app.get("/painel", async () => RelatorioService.painel());

  app.get("/relatorios/potencial-recuperacao", { preHandler: [exigir("relatorio")] }, async () => RelatorioService.potencialRecuperacao());

  app.get("/auditoria", {
    preHandler: [exigir("auditoria")],
    schema: { querystring: { type: "object", properties: { entidade: { type: "string" }, usuarioId: { type: "string" }, limite: { type: "integer", minimum: 1, maximum: 500, default: 100 } } } },
  }, async (req) => RelatorioService.auditoria(req.query as any));

  app.get("/config", { preHandler: [exigir("config")] }, async () => RelatorioService.parametros());
  app.put("/config", {
    preHandler: [exigir("config")],
    schema: { body: { type: "object", additionalProperties: false, properties: { aliquotaImpostos: { type: "number" }, coeficienteDepreciacao: { type: "number" } } } },
  }, async (req) => RelatorioService.atualizarParametros(req.usuario.id, req.body as any));
}
