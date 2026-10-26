import { FastifyInstance } from "fastify";
import { UsuarioService } from "../services/UsuarioService";
import { exigir } from "../plugins/auth";
import { id, versao, PAPEIS } from "./schemas";

export default async function (app: FastifyInstance) {
  const pre = [exigir("usuario")];

  app.get("/usuarios", { preHandler: pre }, async () => UsuarioService.listar());
  app.get("/usuarios/:id", { preHandler: pre, schema: { params: id } }, async (req) => UsuarioService.buscar((req.params as any).id));

  app.post("/usuarios", {
    preHandler: pre,
    schema: { body: { type: "object", required: ["username", "nome", "senha", "papel"], additionalProperties: false, properties: {
      username: { type: "string", minLength: 3, pattern: "^[A-Za-z0-9._-]+$" }, nome: { type: "string", minLength: 2 },
      email: { type: ["string", "null"], format: "email" }, senha: { type: "string" }, papel: { enum: PAPEIS },
    } } },
  }, async (req, rep) => rep.code(201).send(await UsuarioService.criar(req.usuario.id, req.body as any)));

  // edicao completa pelo administrador (nome, email, papel, ativo, reset de senha)
  app.patch("/usuarios/:id", {
    preHandler: pre,
    schema: { params: id, body: { type: "object", required: ["versao"], additionalProperties: false, properties: {
      versao, nome: { type: "string", minLength: 2 }, email: { type: ["string", "null"], format: "email" },
      papel: { enum: PAPEIS }, ativo: { type: "boolean" }, senha: { type: "string" },
    } } },
  }, async (req) => UsuarioService.editar(req.usuario.id, (req.params as any).id, req.body as any));
}
