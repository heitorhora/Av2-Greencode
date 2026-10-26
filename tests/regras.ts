// Testes das regras de dominio (sem banco): npm test  (precisa de `prisma generate` antes)
import assert from "node:assert/strict";
import { validarCNPJ } from "../src/domain/cnpj";
import { ValidadorLote } from "../src/domain/ValidadorLote";
import { ValidadorMudancaEstadoFisico, ValidadorTransicaoStatus } from "../src/domain/ValidadorEquipamento";
import { EquipamentoFactory } from "../src/domain/Equipamento";

assert.equal(validarCNPJ("11.222.333/0001-81"), true);
assert.equal(validarCNPJ("11.222.333/0001-82"), false);
assert.equal(validarCNPJ("11111111111111"), false);

const hoje = new Date().toISOString().slice(0, 10);
assert.equal(new ValidadorLote().validar({ dataEntrada: hoje }).valido, true);
assert.equal(new ValidadorLote().validar({ dataEntrada: "2999-01-01" }).valido, false);
assert.equal(new ValidadorLote().validar({ dataEntrada: "2000-01-01" }).valido, false);

assert.equal(new ValidadorTransicaoStatus().validar({ statusAtual: "AGUARDANDO_TRIAGEM", statusDesejado: "DESMONTE" }).valido, false);
assert.equal(new ValidadorTransicaoStatus().validar({ statusAtual: "TRIADO", statusDesejado: "DESMONTE" }).valido, true);
assert.equal(new ValidadorTransicaoStatus().validar({ statusAtual: "RECICLAGEM", statusDesejado: "TRIADO" }).valido, false);

assert.equal(new ValidadorMudancaEstadoFisico().validar({ estadoAnterior: 0, estadoNovo: 3 }).valido, false);
assert.equal(new ValidadorMudancaEstadoFisico().validar({ estadoAnterior: 0, estadoNovo: 3, justificativa: "caiu da bancada, tela trincada" }).valido, true);

const t = EquipamentoFactory.criar({ id: "1", tipo: "TERMINAL_COMPUTADOR", estadoFisico: 0, status: "TRIADO" });
const p = EquipamentoFactory.criar({ id: "2", tipo: "PERIFERICO", estadoFisico: 4, status: "TRIADO" });
assert.equal(t.calcularPotencialRecuperacao(), 0.7);
assert.equal(p.calcularPotencialRecuperacao(), 0);
assert.ok(t.descreverComponentesRecuperaveis().includes("placa-mae"));

console.log("regras de dominio: OK");
