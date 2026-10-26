import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { AppError } from "./lib/erros";
import authPlugin from "./plugins/auth";
import authController from "./controllers/auth.controller";
import usuarioController from "./controllers/usuario.controller";
import organizacaoController from "./controllers/organizacao.controller";
import loteController from "./controllers/lote.controller";
import relatorioController from "./controllers/relatorio.controller";

export async function buildApp() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info", redact: ["req.headers.authorization"] } });

  app.setErrorHandler((err: any, req, rep) => {
    if (err instanceof AppError) return rep.code(err.status).send({ erros: err.erros });
    if (err.validation) return rep.code(400).send({ erros: err.validation.map((v: any) => `${v.instancePath || "corpo"} ${v.message}`) });
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return rep.code(409).send({ erros: [`Valor duplicado em: ${(err.meta?.target as string[] | undefined)?.join(", ") ?? "campo unico"}.`] });
      if (err.code === "P2003") return rep.code(400).send({ erros: ["Referencia invalida: registro relacionado nao existe."] });
      if (err.code === "P2025") return rep.code(404).send({ erros: ["Registro nao encontrado."] });
    }
    req.log.error(err);
    return rep.code(500).send({ erros: ["Erro interno."] });
  });

  // agrupa as rotas /api/<recurso> por tag na documentacao
  app.addHook("onRoute", (r) => {
    if (r.url.startsWith("/api/")) r.schema = { ...(r.schema ?? {}), tags: [r.url.split("/")[2]] };
  });
  await app.register(swagger, {
    openapi: {
      info: { title: "greencode API", version: "2.0.0", description: "Logistica reversa de residuos eletroeletronicos" },
      components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } },
      security: [{ bearerAuth: [] }],
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" }); // http://localhost:3000/docs

  await app.register(authPlugin);
  app.get("/saude", async () => ({ ok: true }));
  await app.register(authController, { prefix: "/api" });
  await app.register(usuarioController, { prefix: "/api" });
  await app.register(organizacaoController, { prefix: "/api" });
  await app.register(loteController, { prefix: "/api" });
  await app.register(relatorioController, { prefix: "/api" });

  // front SPA estatico (sem build): public/index.html
  await app.register(fastifyStatic, { root: path.join(process.cwd(), "public") });
  return app;
}
