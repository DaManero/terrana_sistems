-- DropIndex
DROP INDEX "ventas_lote_envio_id_idx";

-- AlterTable
ALTER TABLE "ventas" ADD COLUMN     "fecha_entrega" TIMESTAMP(3);
