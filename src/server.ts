try { process.loadEnvFile(); } catch { /* sem .env: usa variaveis do ambiente */ }
import { buildApp } from "./app";
import { prisma } from "./lib/prisma";

async function main() {
  const app = await buildApp();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: "0.0.0.0" });

  // Graceful shutdown: para de aceitar conexoes, espera as ativas e fecha o pool do banco.
  let encerrando = false;
  const encerrar = async (sinal: string) => {
    if (encerrando) return;
    encerrando = true;
    app.log.info(`${sinal} recebido, encerrando...`);
    const forcar = setTimeout(() => process.exit(1), 10_000); // trava de seguranca
    forcar.unref();
    try {
      await app.close();
      await prisma.$disconnect();
      process.exit(0);
    } catch (e) {
      app.log.error(e);
      process.exit(1);
    }
  };
  process.on("SIGINT", () => encerrar("SIGINT"));
  process.on("SIGTERM", () => encerrar("SIGTERM"));
}

main().catch((e) => { console.error(e); process.exit(1); });
