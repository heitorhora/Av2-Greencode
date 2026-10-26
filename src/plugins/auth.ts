import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { FastifyReply, FastifyRequest } from "fastify";
import { Papel } from "@prisma/client";
import { AppError } from "../lib/erros";
import { UsuarioRepository } from "../repositories/UsuarioRepository";
import { PERMISSOES } from "../domain/tipos";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; papel: Papel };
    user: { sub: string; papel: Papel };
  }
}
declare module "fastify" {
  interface FastifyRequest { usuario: { id: string; papel: Papel } }
  interface FastifyInstance { autenticar: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }
}

export default fp(async (app) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) throw new Error("JWT_SECRET ausente ou curto demais (min. 16 caracteres).");
  await app.register(jwt, { secret, sign: { expiresIn: "8h" } });

  app.decorateRequest("usuario", null as unknown as { id: string; papel: Papel });

  // O token leva id e papel (informativo para o cliente), mas quem manda e o banco: papel e
  // "ativo" sao relidos a cada request, entao desativar ou rebaixar alguem vale na hora.
  app.decorate("autenticar", async (req: FastifyRequest) => {
    try { await req.jwtVerify(); } catch { throw new AppError(401, ["Token ausente, invalido ou expirado."]); }
    const u = await UsuarioRepository.porId(req.user.sub);
    if (!u || !u.ativo) throw new AppError(401, ["Usuario inativo ou removido."]);
    req.usuario = { id: u.id, papel: u.papel };
  });

  // Hook global: toda rota /api exige token, exceto o login. Rota nova ja nasce protegida.
  app.addHook("onRequest", async (req, rep) => {
    const caminho = req.url.split("?")[0];
    if (!caminho.startsWith("/api/") || caminho === "/api/auth/login") return;
    await app.autenticar(req, rep);
  });
});

/** preHandler: passa se o papel tem QUALQUER um dos dominios listados. */
export const exigir = (...dominios: string[]) => async (req: FastifyRequest) => {
  if (!dominios.some((d) => PERMISSOES[req.usuario.papel].includes(d))) throw AppError.proibido();
};
