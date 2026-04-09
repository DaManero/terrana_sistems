-- CreateTable
CREATE TABLE "lotes_envio" (
    "id" SERIAL NOT NULL,
    "numero" VARCHAR(30) NOT NULL,
    "metodo_envio_id" INTEGER NOT NULL,
    "generado_por" INTEGER,
    "total_ventas" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lotes_envio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lotes_envio_numero_key" ON "lotes_envio" ("numero");

-- AlterTable
ALTER TABLE "ventas" ADD COLUMN "lote_envio_id" INTEGER;

-- CreateIndex
CREATE INDEX "ventas_lote_envio_id_idx" ON "ventas" ("lote_envio_id");

-- AddForeignKey
ALTER TABLE "lotes_envio"
ADD CONSTRAINT "lotes_envio_metodo_envio_id_fkey" FOREIGN KEY ("metodo_envio_id") REFERENCES "metodos_envio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes_envio"
ADD CONSTRAINT "lotes_envio_generado_por_fkey" FOREIGN KEY ("generado_por") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"
ADD CONSTRAINT "ventas_lote_envio_id_fkey" FOREIGN KEY ("lote_envio_id") REFERENCES "lotes_envio" ("id") ON DELETE SET NULL ON UPDATE CASCADE;