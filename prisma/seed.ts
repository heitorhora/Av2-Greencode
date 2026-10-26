import { PrismaClient, Papel, TipoEquipamento } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// gera CNPJ valido (mesmo algoritmo de digitos verificadores da validacao)
function cnpj(base: string): string {
  const dv = (d: number[], p: number[]) => { const r = d.reduce((a, x, i) => a + x * p[i], 0) % 11; return r < 2 ? 0 : 11 - r; };
  const d = base.split("").map(Number);
  const d1 = dv(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = dv([...d, d1], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return base + d1 + d2;
}
const dias = (n: number) => new Date(Date.now() - n * 86_400_000);

async function main() {
  const senha = await bcrypt.hash(process.env.SEED_ADMIN_SENHA ?? "admin123", 10);
  const usuarios: [string, string, Papel][] = [
    ["admin", "Administrador", "ADMINISTRADOR"], ["operador", "Operador de Cadastro", "OPERADOR_CADASTRO"],
    ["gestor", "Gestor de Almoxarifado", "GESTOR_ALMOXARIFADO"], ["auditor", "Auditor", "AUDITOR"],
  ];
  for (const [username, nome, papel] of usuarios)
    await prisma.usuario.upsert({ where: { username }, update: {}, create: { username, nome, papel, hashSenha: senha } });

  await prisma.parametro.upsert({ where: { id: 1 }, update: {}, create: {} });

  const orgs = [
    { cnpj: cnpj("112223330001"), razaoSocial: "Varejo Sol Ltda", segmento: "varejo" },
    { cnpj: cnpj("459974180001"), razaoSocial: "Hospital Santa Luz", segmento: "hospitalar" },
    { cnpj: cnpj("334455660001"), razaoSocial: "Colegio Horizonte", segmento: "educacional" },
  ];
  const criadas = [];
  for (const [i, o] of orgs.entries()) {
    criadas.push(await prisma.organizacao.upsert({
      where: { cnpj: o.cnpj }, update: {},
      create: { ...o, contrato: { create: { numero: `CT-2026-00${i + 1}`, vigenciaInicio: dias(200), vigenciaFim: dias(-165) } } },
    }));
  }

  if ((await prisma.lote.count()) > 0) return console.log("Seed: lotes ja existem, mantendo.");

  const tipos: TipoEquipamento[] = ["TERMINAL_COMPUTADOR", "PERIFERICO", "EQUIPAMENTO_TELECOM"];
  const adminId = (await prisma.usuario.findUniqueOrThrow({ where: { username: "gestor" } })).id;
  let seq = 1;
  for (const [i, org] of criadas.entries()) {
    const lote = await prisma.lote.create({
      data: {
        organizacaoId: org.id, notaFiscal: `NF-${1000 + i}`, transportadora: "EcoLog", dataEntrada: dias(10 + i * 7),
        status: i === 0 ? "EM_TRIAGEM" : "RECEBIDO",
        equipamentos: { create: Array.from({ length: 4 }, (_, k) => ({ tipo: tipos[(k + i) % 3], codigoBarrasInterno: `GC${String(seq++).padStart(6, "0")}` })) },
      },
      include: { equipamentos: true },
    });
    // primeiro lote: deixa equipamentos em estados variados para exercitar regras e relatorios
    if (i === 0) {
      const [a, b, c] = lote.equipamentos;
      await prisma.equipamento.update({ where: { id: a.id }, data: { status: "TRIADO", estadoFisico: 1, versao: 2 } });
      await prisma.movimentacao.create({ data: { equipamentoId: a.id, statusAnterior: "AGUARDANDO_TRIAGEM", statusNovo: "TRIADO", usuarioId: adminId } });
      await prisma.equipamento.update({ where: { id: b.id }, data: { status: "RECICLAGEM", estadoFisico: 3, versao: 3 } });
      await prisma.equipamento.update({ where: { id: c.id }, data: { status: "DESCARTE_SEGURO", estadoFisico: 4, versao: 3 } });
    }
  }
  console.log("Seed ok. Logins: admin/operador/gestor/auditor (senha SEED_ADMIN_SENHA, padrao admin123).");
}

main().finally(() => prisma.$disconnect());
