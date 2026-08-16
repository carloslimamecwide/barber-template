# Barbearia

Aplicação Next.js 16 para reservas públicas e gestão funcional de uma barbearia com vários profissionais, horários individuais, recorrências, notificações e perfis de acesso.

## Desenvolvimento

1. Copia `.env.example` para `.env` e preenche PostgreSQL, sessão, administrador, Resend, URL pública e cron.
2. Aplica a base com `npx prisma migrate deploy`.
3. Cria/atualiza o administrador e o horário inicial com `npm run db:seed`.
4. Inicia em `http://localhost:3001` com `npm run dev`.

O seed não cria clientes, profissionais, serviços ou marcações fictícias. O dashboard apresenta uma checklist para criar profissional, serviço e horário antes de ativar as reservas públicas.

Não existe script `db:push`: todas as alterações de base de dados devem ser migrations versionadas.

## Produção

- Executa `npx prisma migrate deploy` antes de iniciar uma nova versão; nunca uses `db push` em produção.
- Agenda `POST /api/cron` pelo menos a cada 15 minutos com o header `x-cron-secret`. O job estende recorrências, cria lembretes e processa a fila de emails.
- Usa `EMAIL_FROM` com um domínio validado na Resend e mantém `NEXT_PUBLIC_APP_URL` com a origem pública HTTPS.
- Faz backups PostgreSQL antes de migrations e testa regularmente a recuperação.
- Usa `GET /api/health` como liveness e `GET /api/ready` como readiness com verificação à base de dados.
- A página de notificações mostra o último cron, filas e falhas; a auditoria regista alterações administrativas.
- Define políticas de antecedência, horizonte, cancelamento, slots e lembretes em **Configuração**.

## Verificação

```bash
npm test
npm run test:integration # requer TEST_DATABASE_URL igual à DATABASE_URL de uma base isolada
npm run test:e2e        # requer Chromium do Playwright e credenciais E2E
npm run typecheck
npm run lint
npm run build
```

O CI cria uma base PostgreSQL descartável, aplica migrations, executa seed, testes unitários, integração, E2E, lint, typecheck e build. O `Dockerfile` usa credenciais sintáticas apenas no estágio de build; as credenciais reais continuam obrigatórias no container de runtime.
