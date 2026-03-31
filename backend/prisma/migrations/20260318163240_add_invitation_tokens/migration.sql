-- CreateTable
CREATE TABLE "invitation_tokens" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "invitado_por" INTEGER NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "expira_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitation_tokens_token_key" ON "invitation_tokens"("token");

-- AddForeignKey
ALTER TABLE "invitation_tokens" ADD CONSTRAINT "invitation_tokens_invitado_por_fkey" FOREIGN KEY ("invitado_por") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
