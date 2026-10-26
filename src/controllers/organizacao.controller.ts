import { FastifyInstance } from "fastify";
import { OrganizacaoService } from "../services/OrganizacaoService";
import { exigir } from "../plugins/auth";
import { id, versao, contrato } from "./schemas";

export default async function (app: FastifyInstance) {
  const leitura = [exigir("org", "org-leitura")];
  const escrita = [exigir("org")];

  app.get("/organizacoes", { preHandler: leitura }, async () => OrganizacaoService.listar());
  app.get("/organizacoes/:id", { preHandler: leitura, schema: { params: id } }, async (req) => OrganizacaoService.buscar((req.params as any).id));

  app.post("/organizacoes", {
    preHandler: escrita,
    schema: { body: { type: "object", required: ["cnpj", "razaoSocial", "segmento"], additionalProperties: false, properties: {
      cnpj: { type: "string" }, razaoSocial: { type: "string" }, segmento: { type: "string", minLength: 2 }, contrato,
    } } },
  }, async (req, rep) => rep.code(201).send(await OrganizacaoService.criar(req.usuario.id, req.body as any)));

  app.patch("/organizacoes/:id", {
    preHandler: escrita,
    schema: { params: id, body: { type: "object", required: ["versao"], additionalProperties: false, properties: {
      versao, razaoSocial: { type: "string" }, segmento: { type: "string", minLength: 2 }, contrato: { anyOf: [contrato, { type: "null" }] },
    } } },
  }, async (req) => OrganizacaoService.editar(req.usuario.id, (req.params as any).id, req.body as any));

  app.delete("/organizacoes/:id", { preHandler: escrita, schema: { params: id } }, async (req, rep) => {
    await OrganizacaoService.remover(req.usuario.id, (req.params as any).id);
    return rep.code(204).send();
  });
}
