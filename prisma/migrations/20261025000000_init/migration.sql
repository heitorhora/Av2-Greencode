-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ADMINISTRADOR', 'OPERADOR_CADASTRO', 'GESTOR_ALMOXARIFADO', 'AUDITOR');
CREATE TYPE "StatusLote" AS ENUM ('RECEBIDO', 'EM_TRIAGEM', 'TRIAGEM_CONCLUIDA', 'FINALIZADO');
CREATE TYPE "StatusEquipamento" AS ENUM ('AGUARDANDO_TRIAGEM', 'TRIADO', 'DESMONTE', 'RECICLAGEM', 'DESCARTE_SEGURO');
CREATE TYPE "TipoEquipamento" AS ENUM ('TERMINAL_COMPUTADOR', 'PERIFERICO', 'EQUIPAMENTO_TELECOM');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "hashSenha" TEXT NOT NULL,
    "papel" "Papel" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Organizacao" (
    "id" TEXT NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "segmento" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organizacao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "vigenciaInicio" TIMESTAMP(3) NOT NULL,
    "vigenciaFim" TIMESTAMP(3) NOT NULL,
    "clausulas" JSONB NOT NULL DEFAULT '{}',
    "organizacaoId" TEXT NOT NULL,
    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lote" (
    "id" TEXT NOT NULL,
    "notaFiscal" TEXT NOT NULL,
    "transportadora" TEXT NOT NULL,
    "dataEntrada" TIMESTAMP(3) NOT NULL,
    "status" "StatusLote" NOT NULL DEFAULT 'RECEBIDO',
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizacaoId" TEXT NOT NULL,
    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Equipamento" (
    "id" TEXT NOT NULL,
    "codigoBarras" TEXT NOT NULL,
    "tipo" "TipoEquipamento" NOT NULL,
    "estadoFisico" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusEquipamento" NOT NULL DEFAULT 'AGUARDANDO_TRIAGEM',
    "atributos" JSONB NOT NULL DEFAULT '{}',
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loteId" TEXT NOT NULL,
    CONSTRAINT "Equipamento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Movimentacao" (
    "id" TEXT NOT NULL,
    "equipamentoId" TEXT NOT NULL,
    "statusAnterior" "StatusEquipamento" NOT NULL,
    "statusNovo" "StatusEquipamento" NOT NULL,
    "observacao" TEXT,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Movimentacao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HistoricoEstado" (
    "id" TEXT NOT NULL,
    "equipamentoId" TEXT NOT NULL,
    "estadoAnterior" INTEGER NOT NULL,
    "estadoNovo" INTEGER NOT NULL,
    "justificativa" TEXT,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistoricoEstado_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "detalhe" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Parametro" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "aliquotaImpostos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coeficienteDepreciacao" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Parametro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_username_key" ON "Usuario"("username");
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
CREATE UNIQUE INDEX "Organizacao_cnpj_key" ON "Organizacao"("cnpj");
CREATE UNIQUE INDEX "Contrato_numero_key" ON "Contrato"("numero");
CREATE UNIQUE INDEX "Contrato_organizacaoId_key" ON "Contrato"("organizacaoId");
CREATE INDEX "Lote_organizacaoId_idx" ON "Lote"("organizacaoId");
CREATE UNIQUE INDEX "Equipamento_codigoBarras_key" ON "Equipamento"("codigoBarras");
CREATE INDEX "Equipamento_loteId_idx" ON "Equipamento"("loteId");
CREATE INDEX "Equipamento_status_idx" ON "Equipamento"("status");
CREATE INDEX "Movimentacao_equipamentoId_idx" ON "Movimentacao"("equipamentoId");
CREATE INDEX "Auditoria_entidade_entidadeId_idx" ON "Auditoria"("entidade", "entidadeId");
CREATE INDEX "Auditoria_criadoEm_idx" ON "Auditoria"("criadoEm");

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Equipamento" ADD CONSTRAINT "Equipamento_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HistoricoEstado" ADD CONSTRAINT "HistoricoEstado_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Regras que o Prisma nao expressa no schema (escritas a mao)
ALTER TABLE "Equipamento" ADD CONSTRAINT "equipamento_estado_fisico_chk" CHECK ("estadoFisico" BETWEEN 0 AND 4);
ALTER TABLE "Contrato"    ADD CONSTRAINT "contrato_vigencia_chk"        CHECK ("vigenciaFim" > "vigenciaInicio");
ALTER TABLE "Usuario"     ADD CONSTRAINT "usuario_versao_chk"           CHECK ("versao" >= 1);

-- Trilha de auditoria imutavel: nem a aplicacao consegue alterar ou apagar registros.
CREATE OR REPLACE FUNCTION auditoria_imutavel() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Tabela Auditoria e somente de insercao';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auditoria_sem_update_delete
BEFORE UPDATE OR DELETE ON "Auditoria"
FOR EACH ROW EXECUTE FUNCTION auditoria_imutavel();
