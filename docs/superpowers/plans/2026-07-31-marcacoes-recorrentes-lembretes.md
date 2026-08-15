# Marcações Recorrentes + Lembretes por Email — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O barbeiro pode criar séries de marcações recorrentes (ex.: todos os sábados às 18h, ou de 15 em 15 dias) geradas automaticamente, com cancelamento em massa, bloqueio por conflito, e lembretes por email enviados no dia anterior a todas as marcações.

**Architecture:** Uma série (`SerieRecorrente`) com âncora de fase (`dataInicio`) gera `Agendamento` normais (agenda/slots/estatísticas intactas). Geração com janela rolante de 365 dias a partir da âncora; em conflito (slot ocupado, dia fechado/feriado) a série fica `bloqueada` e o dashboard avisa. Endpoint cron protegido por `CRON_SECRET` envia lembretes (idempotente via `lembreteEnviadoEm`) e estende séries. Lógica pura separada (`recorrencia.ts`, testada) da lógica de BD (`series.ts`).

**Tech Stack:** Prisma 7.9.1 (generator `src/generated/prisma`, `PrismaPg`), Next.js 16.2.12 (route handlers com `params` async), zod, Resend, vitest, Tailwind v4.

---

## File Structure

**Novos:**
- `src/lib/recorrencia.ts` — lógica pura: `datasOcorrencia`, `slotValido`, `JANELA_DIAS`
- `src/lib/__tests__/recorrencia.test.ts` — testes da lógica pura
- `src/lib/series.ts` — lógica BD: `gerarOcorrenciasSerie`, `estenderSeries`, `cancelarSerie`, `retomarSerie`
- `src/app/api/series/route.ts` — `POST` criar série, `GET` listar séries
- `src/app/api/series/[id]/route.ts` — `DELETE` cancelar série
- `src/app/api/series/[id]/retomar/route.ts` — `POST` retomar série
- `src/app/api/cron/route.ts` — lembretes + estender séries
- `src/app/dashboard/recorrentes/page.tsx` — página (server, padrão das outras)
- `src/components/dashboard/recorrentes-view.tsx` — view client

**Modificados:**
- `prisma/schema.prisma` — modelo `SerieRecorrente`, enum `SerieEstado`, campos em `Agendamento`/`Cliente`/`Servico`
- `src/lib/validations.ts` — `serieSchema`
- `src/lib/email.ts` — `enviarEmailLembrete`
- `src/app/api/agendamentos/route.ts` — GET inclui `serie`
- `src/components/dashboard/nova-marcacao-dialog.tsx` — secção "Repetir"
- `src/components/dashboard/agenda-view.tsx` — badge "Recorrente"
- `src/components/dashboard/sidebar-nav.tsx` — link "Recorrentes"
- `src/app/dashboard/layout.tsx` — banner de séries bloqueadas
- `.env` / `.env.example` — `CRON_SECRET`

---

### Task 1: Schema + `db push`

**Files:** Modify: `prisma/schema.prisma`

- [ ] **Step 1: Editar o schema**

Em `prisma/schema.prisma`, adicionar o enum e o modelo, e alterar `Agendamento`, `Cliente` e `Servico`.

Em `Cliente`, adicionar `series SerieRecorrente[]`; em `Servico`, idem.

Em `Agendamento`, adicionar após `propostaExpiraEm DateTime?`:

```prisma
  serieId            String?
  lembreteEnviadoEm  DateTime?
  serie              SerieRecorrente? @relation(fields: [serieId], references: [id], onDelete: SetNull)
```

E no fim do modelo, junto dos índices: `@@index([serieId])`.

Novo modelo (antes de `HorarioFuncionamento`):

```prisma
model SerieRecorrente {
  id               String       @id @default(cuid())
  clienteId        String
  servicoId        String
  diaDaSemana      Int
  hora             String
  intervaloSemanas Int          @default(1)
  dataInicio       DateTime
  estado           SerieEstado  @default(ativa)
  motivoBloqueio   String?
  bloqueadaEm      DateTime?
  canceladaEm      DateTime?
  criadaEm         DateTime     @default(now())
  cliente          Cliente      @relation(fields: [clienteId], references: [id], onDelete: Cascade)
  servico          Servico      @relation(fields: [servicoId], references: [id], onDelete: Restrict)
  agendamentos     Agendamento[]

  @@index([clienteId])
  @@index([servicoId])
  @@index([estado])
}
```

- [ ] **Step 2: Aplicar à BD**: `npm run db:push` → "The database is now in sync with the Prisma schema".
- [ ] **Step 3: Verificar e commitar**: `npm run typecheck`; commit `feat: modelo SerieRecorrente e campos de lembrete`.

---

### Task 2: Lógica pura (`recorrencia.ts`) com TDD

**Files:** Create: `src/lib/recorrencia.ts`; Test: `src/lib/__tests__/recorrencia.test.ts`

Convenções de data: `0=domingo…6=sábado`, strings `YYYY-MM-DD`, datas locais.

- [ ] **Step 1: Escrever os testes que falham** (ficheiro completo no plano original).
- [ ] **Step 2: Correr e verificar que falham**: `npm test -- src/lib/__tests__/recorrencia.test.ts`.
- [ ] **Step 3: Implementar** `datasOcorrencia` + `slotValido` + `JANELA_DIAS`.
- [ ] **Step 4: Correr e verificar que passam** (6 testes).
- [ ] **Step 5: Commitar** `feat: lógica pura das datas de recorrência`.

---

### Task 3: Camada de BD (`series.ts`)

**Files:** Create: `src/lib/series.ts`

Implementar `gerarOcorrenciasSerie`, `estenderSeries`, `cancelarSerie`, `retomarSerie` (código completo no plano original). Verificar typecheck/lint. Commit `feat: geração, extensão, bloqueio e cancelamento de séries`.

---

### Task 4: Validação + API de séries

**Files:** Modify: `src/lib/validations.ts`; Create: `src/app/api/series/route.ts`, `src/app/api/series/[id]/route.ts`, `src/app/api/series/[id]/retomar/route.ts`

Adicionar `serieSchema`/`SerieInput`; rotas `POST`+`GET`, `DELETE`, `POST /retomar`. Verificar typecheck/lint. Commit `feat: API de criação, listagem, cancelamento e retoma de séries`.

---

### Task 5: Lembrete por email + cron + env

**Files:** Modify: `src/lib/email.ts`, `.env`, `.env.example`; Create: `src/app/api/cron/route.ts`

Adicionar `enviarEmailLembrete`; endpoint cron protegido por `x-cron-secret` (lembretes de amanhã idempotentes + `estenderSeries`); `CRON_SECRET` no `.env` (openssl rand) e `.env.example`. Verificar. Commit `feat: lembretes por email e endpoint cron protegido`.

---

### Task 6: Diálogo "Nova marcação" — secção "Repetir"

**Files:** Modify: `src/components/dashboard/nova-marcacao-dialog.tsx`

Estado `repetir`/`intervaloSemanas`/`diaSerie`; `criar` usa `/api/series` quando repetir; UI checkbox + selects (DIAS_SEMANA). Verificar. Commit `feat: opção de recorrência no diálogo de nova marcação`.

---

### Task 7: Página "Recorrentes" + navegação

**Files:** Create: `src/app/dashboard/recorrentes/page.tsx`, `src/components/dashboard/recorrentes-view.tsx`; Modify: `src/components/dashboard/sidebar-nav.tsx`

Página server + view client (listar, retomar, cancelar) + link na sidebar (Repeat, entre Agenda e Clientes). Verificar. Commit `feat: página de séries recorrentes com cancelar e retomar`.

---

### Task 8: Badge na agenda + banner de bloqueio no layout

**Files:** Modify: `src/app/api/agendamentos/route.ts`, `src/components/dashboard/agenda-view.tsx`, `src/app/dashboard/layout.tsx`

GET inclui `serie`; badge "Recorrente"; banner de séries bloqueadas no layout. Verificar. Commit `feat: badge de recorrente na agenda e aviso de série bloqueada`.

---

### Task 9: Verificação completa

- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` → verdes (17 testes).
- [ ] Teste manual no browser (dev + túnel SSH): criar série, ver ocorrências, badge, bloquear/retomar, cancelar.
- [ ] Testar cron local: `curl -s -X POST http://localhost:3000/api/cron -H "x-cron-secret: <CRON_SECRET>"` → `{"lembretes":N,"estendidas":M}`; sem header → 401.

---

### Task 10: Agendar o cron na VPS (passo do utilizador)

Na VPS: `crontab -e` → `0 8 * * * curl -s -X POST https://barber.webfusionlab.pt/api/cron -H "x-cron-secret: <CRON_SECRET>"`. Pré-requisito: `CRON_SECRET` no `.env` de produção.

---

## Self-Review

**Cobertura:** reserva garantida por dia/hora; intervalo flexível (15 em 15 dias); série sem fim (janela rolante + cron); conflito → bloquear + avisar; cancelar futuras + edição individual; lembrete a todas as marcações.

**Placeholders:** nenhum.

**Consistência:** `datasOcorrencia` (strings), `gerarOcorrenciasSerie` usa `combineDateAndTime`; `serieSchema`/`SerieInput`; nomes iguais em `series.ts` e rotas.
