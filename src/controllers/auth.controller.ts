import { FastifyInstance } from "fastify";
import { AuthService } from "../services/AuthService";
import { UsuarioService } from "../services/UsuarioService";
import { PERMISSOES } from "../domain/tipos";
import { AppError } from "../lib/erros";
import { versao } from "./schemas";

// Freio de forca bruta em memoria: 5 falhas por (ip+usuario) bloqueiam por 60 s.
// ponytail: vale para 1 processo; com varias instancias, mover para Redis.
const falhas = new Map<string, { n: number; ate: number }>();

export default async function (app: FastifyInstance) {
  app.post("/auth/login", {
    schema: { body: { type: "object", required: ["username", "senha"], properties: { username: { type: "string" }, senha: { type: "string" } } } },
  }, async (req) => {
    const { username, senha } = req.body as { username: string; senha: string };
    const user = username.trim().toLowerCase();
    const chave = `${req.ip}|${user}`;
    const f = falhas.get(chave);
    if (f && f.n >= 5 && f.ate > Date.now()) throw new AppError(429, ["Muitas tentativas. Aguarde 1 minuto."]);
    let u;
    try {
      u = await AuthService.login(user, senha);
    } catch (e) {
      falhas.set(chave, { n: (f && f.ate > Date.now() ? f.n : 0) + 1, ate: Date.now() + 60_000 });
      throw e;
    }
    falhas.delete(chave);
    return { token: app.jwt.sign({ sub: u.id, papel: u.papel }), usuario: u, permissoes: PERMISSOES[u.papel] };
  });

  app.get("/me", async (req) => ({
    ...(await UsuarioService.buscar(req.usuario.id)),
    permissoes: PERMISSOES[req.usuario.papel],
  }));

  app.patch("/me", {
    schema: { body: { type: "object", required: ["versao"], additionalProperties: false, properties: {
      versao, nome: { type: "string", minLength: 2 }, email: { type: ["string", "null"], format: "email" },
      senhaAtual: { type: "string" }, novaSenha: { type: "string" },
    } } },
  }, async (req) => UsuarioService.editarPerfil(req.usuario.id, req.body as any));
}
