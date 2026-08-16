# Barbearia

Aplicação Next.js 16 para reservas públicas e gestão de uma barbearia com vários profissionais.

## Desenvolvimento

1. Copia `.env.example` para `.env` e preenche PostgreSQL, sessão, administrador, Resend, URL pública e cron.
2. Aplica a base com `npx prisma migrate deploy`.
3. Cria/atualiza o administrador e o horário inicial com `npm run db:seed`.
4. Inicia em `http://localhost:3001` com `npm run dev`.

O seed não cria clientes, profissionais, serviços ou marcações fictícias. Depois do primeiro login, cria pelo menos um profissional e um serviço para ativar as reservas públicas.

## Produção

- Executa `npx prisma migrate deploy` antes de iniciar uma nova versão; nunca uses `db push` em produção.
- Agenda `POST /api/cron` pelo menos a cada 15 minutos com o header `x-cron-secret`. O job estende recorrências, cria lembretes e processa a fila de emails.
- Usa `EMAIL_FROM` com um domínio validado na Resend e mantém `NEXT_PUBLIC_APP_URL` com a origem pública HTTPS.
- Faz backups PostgreSQL antes de migrations e testa regularmente a recuperação.

## Verificação

```bash
npm test
npm run typecheck
npm run lint
npm run build
```
