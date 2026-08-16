CREATE TYPE "StatusAgendamento" AS ENUM ('agendado', 'concluido', 'cancelado', 'faltou');
CREATE TYPE "StatusProposta" AS ENUM ('pendente', 'confirmada', 'recusada', 'expirada');
CREATE TYPE "SerieEstado" AS ENUM ('ativa', 'bloqueada', 'cancelada');
CREATE TYPE "TipoNotificacao" AS ENUM ('confirmacao', 'proposta', 'lembrete');
CREATE TYPE "EstadoNotificacao" AS ENUM ('pendente', 'processando', 'enviada', 'falhada');

CREATE TABLE "User" (
  "id" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true, "tentativasFalhas" INTEGER NOT NULL DEFAULT 0,
  "bloqueadoAte" TIMESTAMPTZ(3), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Profissional" (
  "id" TEXT NOT NULL, "nome" TEXT NOT NULL, "telefone" TEXT, "email" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true, "ordem" INTEGER NOT NULL DEFAULT 0,
  "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Profissional_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Cliente" (
  "id" TEXT NOT NULL, "nome" TEXT NOT NULL, "telefone" TEXT NOT NULL, "email" TEXT,
  "emailNormalizado" TEXT, "notas" TEXT, "ativo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Servico" (
  "id" TEXT NOT NULL, "nome" TEXT NOT NULL, "precoCents" INTEGER NOT NULL,
  "duracaoMin" INTEGER NOT NULL, "ativo" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SerieRecorrente" (
  "id" TEXT NOT NULL, "clienteId" TEXT NOT NULL, "servicoId" TEXT NOT NULL,
  "profissionalId" TEXT, "diaDaSemana" INTEGER NOT NULL, "hora" TEXT NOT NULL,
  "intervaloSemanas" INTEGER NOT NULL DEFAULT 1, "dataInicio" DATE NOT NULL,
  "estado" "SerieEstado" NOT NULL DEFAULT 'ativa', "motivoBloqueio" TEXT,
  "bloqueadaEm" TIMESTAMPTZ(3), "canceladaEm" TIMESTAMPTZ(3),
  "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SerieRecorrente_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Agendamento" (
  "id" TEXT NOT NULL, "clienteId" TEXT NOT NULL, "servicoId" TEXT NOT NULL,
  "profissionalId" TEXT NOT NULL, "dataHora" TIMESTAMPTZ(3) NOT NULL,
  "status" "StatusAgendamento" NOT NULL DEFAULT 'agendado', "precoCobrado" INTEGER NOT NULL,
  "duracaoAgendadaMin" INTEGER NOT NULL, "notas" TEXT,
  "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tokenGestaoHash" TEXT, "tokenGestaoExpiraEm" TIMESTAMPTZ(3), "serieId" TEXT,
  "lembreteEnviadoEm" TIMESTAMPTZ(3), "excecaoManual" BOOLEAN NOT NULL DEFAULT false,
  "motivoExcecao" TEXT, "arquivadoEm" TIMESTAMPTZ(3),
  CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PropostaReagendamento" (
  "id" TEXT NOT NULL, "agendamentoId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL,
  "dataHoraAtual" TIMESTAMPTZ(3) NOT NULL, "novaDataHora" TIMESTAMPTZ(3) NOT NULL,
  "status" "StatusProposta" NOT NULL DEFAULT 'pendente', "expiraEm" TIMESTAMPTZ(3) NOT NULL,
  "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "respondidaEm" TIMESTAMPTZ(3),
  CONSTRAINT "PropostaReagendamento_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ExcecaoSerie" (
  "id" TEXT NOT NULL, "serieId" TEXT NOT NULL, "dataHora" TIMESTAMPTZ(3) NOT NULL,
  "motivo" TEXT NOT NULL, "resolvidaEm" TIMESTAMPTZ(3),
  "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExcecaoSerie_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Notificacao" (
  "id" TEXT NOT NULL, "agendamentoId" TEXT, "tipo" "TipoNotificacao" NOT NULL,
  "estado" "EstadoNotificacao" NOT NULL DEFAULT 'pendente', "destinatario" TEXT NOT NULL,
  "payload" JSONB NOT NULL, "tentativas" INTEGER NOT NULL DEFAULT 0,
  "proximaTentativaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ultimoErro" TEXT, "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "enviadaEm" TIMESTAMPTZ(3), CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "HorarioFuncionamento" (
  "id" TEXT NOT NULL, "diaDaSemana" INTEGER NOT NULL, "aberto" BOOLEAN NOT NULL DEFAULT false,
  "abertura" TEXT, "fecho" TEXT, "pausaInicio" TEXT, "pausaFim" TEXT,
  CONSTRAINT "HorarioFuncionamento_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DiaFechado" (
  "id" TEXT NOT NULL, "data" DATE NOT NULL, "motivo" TEXT,
  CONSTRAINT "DiaFechado_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Profissional_ativo_ordem_idx" ON "Profissional"("ativo", "ordem");
CREATE UNIQUE INDEX "Cliente_emailNormalizado_key" ON "Cliente"("emailNormalizado");
CREATE INDEX "Cliente_ativo_nome_idx" ON "Cliente"("ativo", "nome");
CREATE INDEX "Servico_ativo_nome_idx" ON "Servico"("ativo", "nome");
CREATE UNIQUE INDEX "Agendamento_tokenGestaoHash_key" ON "Agendamento"("tokenGestaoHash");
CREATE INDEX "Agendamento_dataHora_idx" ON "Agendamento"("dataHora");
CREATE INDEX "Agendamento_clienteId_idx" ON "Agendamento"("clienteId");
CREATE INDEX "Agendamento_servicoId_idx" ON "Agendamento"("servicoId");
CREATE INDEX "Agendamento_profissionalId_dataHora_idx" ON "Agendamento"("profissionalId", "dataHora");
CREATE INDEX "Agendamento_serieId_idx" ON "Agendamento"("serieId");
CREATE INDEX "Agendamento_status_dataHora_idx" ON "Agendamento"("status", "dataHora");
CREATE UNIQUE INDEX "Agendamento_serieId_dataHora_key" ON "Agendamento"("serieId", "dataHora");
CREATE UNIQUE INDEX "PropostaReagendamento_tokenHash_key" ON "PropostaReagendamento"("tokenHash");
CREATE INDEX "PropostaReagendamento_agendamentoId_status_idx" ON "PropostaReagendamento"("agendamentoId", "status");
CREATE INDEX "PropostaReagendamento_expiraEm_status_idx" ON "PropostaReagendamento"("expiraEm", "status");
CREATE INDEX "SerieRecorrente_clienteId_idx" ON "SerieRecorrente"("clienteId");
CREATE INDEX "SerieRecorrente_servicoId_idx" ON "SerieRecorrente"("servicoId");
CREATE INDEX "SerieRecorrente_profissionalId_idx" ON "SerieRecorrente"("profissionalId");
CREATE INDEX "SerieRecorrente_estado_idx" ON "SerieRecorrente"("estado");
CREATE INDEX "ExcecaoSerie_resolvidaEm_idx" ON "ExcecaoSerie"("resolvidaEm");
CREATE UNIQUE INDEX "ExcecaoSerie_serieId_dataHora_key" ON "ExcecaoSerie"("serieId", "dataHora");
CREATE INDEX "Notificacao_estado_proximaTentativaEm_idx" ON "Notificacao"("estado", "proximaTentativaEm");
CREATE INDEX "Notificacao_agendamentoId_tipo_idx" ON "Notificacao"("agendamentoId", "tipo");
CREATE UNIQUE INDEX "HorarioFuncionamento_diaDaSemana_key" ON "HorarioFuncionamento"("diaDaSemana");
CREATE UNIQUE INDEX "DiaFechado_data_key" ON "DiaFechado"("data");

ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_serieId_fkey" FOREIGN KEY ("serieId") REFERENCES "SerieRecorrente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PropostaReagendamento" ADD CONSTRAINT "PropostaReagendamento_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SerieRecorrente" ADD CONSTRAINT "SerieRecorrente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SerieRecorrente" ADD CONSTRAINT "SerieRecorrente_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SerieRecorrente" ADD CONSTRAINT "SerieRecorrente_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExcecaoSerie" ADD CONSTRAINT "ExcecaoSerie_serieId_fkey" FOREIGN KEY ("serieId") REFERENCES "SerieRecorrente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
