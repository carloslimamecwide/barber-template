CREATE TYPE "UserRole" AS ENUM ('admin', 'rececao', 'profissional');

ALTER TABLE "User"
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'admin',
  ADD COLUMN "profissionalId" TEXT;

ALTER TABLE "Agendamento"
  ADD COLUMN "atualizadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "motivoStatus" TEXT;

CREATE TABLE "ConfiguracaoBarbearia" (
  "id" TEXT NOT NULL DEFAULT 'principal',
  "nome" TEXT NOT NULL DEFAULT 'Barbearia Nobre',
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Lisbon',
  "intervaloSlotsMin" INTEGER NOT NULL DEFAULT 15,
  "antecedenciaMinHoras" INTEGER NOT NULL DEFAULT 2,
  "horizonteDias" INTEGER NOT NULL DEFAULT 90,
  "cancelamentoMinHoras" INTEGER NOT NULL DEFAULT 24,
  "lembreteHoras" INTEGER NOT NULL DEFAULT 24,
  "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ConfiguracaoBarbearia_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ConfiguracaoBarbearia" ("id", "atualizadoEm")
VALUES ('principal', CURRENT_TIMESTAMP);

CREATE TABLE "HorarioProfissional" (
  "id" TEXT NOT NULL,
  "profissionalId" TEXT NOT NULL,
  "diaDaSemana" INTEGER NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "abertura" TEXT NOT NULL,
  "fecho" TEXT NOT NULL,
  "pausaInicio" TEXT,
  "pausaFim" TEXT,
  CONSTRAINT "HorarioProfissional_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AusenciaProfissional" (
  "id" TEXT NOT NULL,
  "profissionalId" TEXT NOT NULL,
  "inicio" TIMESTAMPTZ(3) NOT NULL,
  "fim" TIMESTAMPTZ(3) NOT NULL,
  "motivo" TEXT,
  "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AusenciaProfissional_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServicoProfissional" (
  "profissionalId" TEXT NOT NULL,
  "servicoId" TEXT NOT NULL,
  "precoCents" INTEGER,
  "duracaoMin" INTEGER,
  CONSTRAINT "ServicoProfissional_pkey" PRIMARY KEY ("profissionalId", "servicoId")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "acao" TEXT NOT NULL,
  "entidade" TEXT NOT NULL,
  "entidadeId" TEXT,
  "dados" JSONB,
  "ip" TEXT,
  "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Idempotencia" (
  "chave" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "agendamentoId" TEXT,
  "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiraEm" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Idempotencia_pkey" PRIMARY KEY ("chave")
);

CREATE TABLE "LimiteAcesso" (
  "chave" TEXT NOT NULL,
  "tentativas" INTEGER NOT NULL DEFAULT 0,
  "janelaInicio" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiraEm" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "LimiteAcesso_pkey" PRIMARY KEY ("chave")
);

CREATE TABLE "ExecucaoCron" (
  "id" TEXT NOT NULL,
  "inicio" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fim" TIMESTAMPTZ(3),
  "sucesso" BOOLEAN,
  "resultado" JSONB,
  "erro" TEXT,
  CONSTRAINT "ExecucaoCron_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_profissionalId_key" ON "User"("profissionalId");
CREATE UNIQUE INDEX "HorarioProfissional_profissionalId_diaDaSemana_key" ON "HorarioProfissional"("profissionalId", "diaDaSemana");
CREATE INDEX "HorarioProfissional_profissionalId_ativo_idx" ON "HorarioProfissional"("profissionalId", "ativo");
CREATE INDEX "AusenciaProfissional_profissionalId_inicio_fim_idx" ON "AusenciaProfissional"("profissionalId", "inicio", "fim");
CREATE INDEX "ServicoProfissional_servicoId_idx" ON "ServicoProfissional"("servicoId");
CREATE INDEX "AuditLog_entidade_entidadeId_idx" ON "AuditLog"("entidade", "entidadeId");
CREATE INDEX "AuditLog_criadoEm_idx" ON "AuditLog"("criadoEm");
CREATE INDEX "AuditLog_userId_criadoEm_idx" ON "AuditLog"("userId", "criadoEm");
CREATE UNIQUE INDEX "Idempotencia_agendamentoId_key" ON "Idempotencia"("agendamentoId");
CREATE INDEX "Idempotencia_expiraEm_idx" ON "Idempotencia"("expiraEm");
CREATE INDEX "LimiteAcesso_expiraEm_idx" ON "LimiteAcesso"("expiraEm");
CREATE INDEX "ExecucaoCron_inicio_idx" ON "ExecucaoCron"("inicio");

ALTER TABLE "User" ADD CONSTRAINT "User_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HorarioProfissional" ADD CONSTRAINT "HorarioProfissional_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AusenciaProfissional" ADD CONSTRAINT "AusenciaProfissional_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServicoProfissional" ADD CONSTRAINT "ServicoProfissional_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServicoProfissional" ADD CONSTRAINT "ServicoProfissional_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Idempotencia" ADD CONSTRAINT "Idempotencia_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve any legacy blocked series by making them active before removing the obsolete value.
UPDATE "SerieRecorrente" SET "estado" = 'ativa' WHERE "estado" = 'bloqueada';
CREATE TYPE "SerieEstado_new" AS ENUM ('ativa', 'cancelada');
ALTER TABLE "SerieRecorrente" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "SerieRecorrente" ALTER COLUMN "estado" TYPE "SerieEstado_new" USING ("estado"::text::"SerieEstado_new");
ALTER TYPE "SerieEstado" RENAME TO "SerieEstado_old";
ALTER TYPE "SerieEstado_new" RENAME TO "SerieEstado";
DROP TYPE "SerieEstado_old";
ALTER TABLE "SerieRecorrente" ALTER COLUMN "estado" SET DEFAULT 'ativa';
ALTER TABLE "SerieRecorrente" DROP COLUMN "motivoBloqueio", DROP COLUMN "bloqueadaEm";
