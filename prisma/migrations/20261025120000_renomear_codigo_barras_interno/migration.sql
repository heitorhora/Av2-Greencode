-- Equipamento.codigoBarras -> codigoBarrasInterno (nome pedido no enunciado da AV2); preserva dados e a unicidade.
ALTER TABLE "Equipamento" RENAME COLUMN "codigoBarras" TO "codigoBarrasInterno";
ALTER INDEX "Equipamento_codigoBarras_key" RENAME TO "Equipamento_codigoBarrasInterno_key";
