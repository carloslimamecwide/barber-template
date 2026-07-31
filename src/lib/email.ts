import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function enviarEmailConfirmacao(input: {
  email: string;
  nome: string;
  servico: string;
  dataHora: Date;
  precoCents: number;
}) {
  const data = new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(input.dataHora);

  await resend.emails.send({
    from: `Barbearia <onboarding@resend.dev>`,
    to: input.email,
    subject: "Marcação confirmada",
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#111;color:#f5f0e8;border-radius:12px">
      <h2 style="color:#d4af37;margin:0 0 8px">Marcação confirmada</h2>
      <p>Olá <strong>${input.nome}</strong>, a tua marcação está confirmada:</p>
      <ul style="line-height:1.8;list-style:none;padding:0">
        <li><strong>Serviço:</strong> ${input.servico}</li>
        <li><strong>Data/hora:</strong> ${data}</li>
        <li><strong>Preço:</strong> ${(input.precoCents / 100).toFixed(2).replace(".", ",")} €</li>
      </ul>
      <p style="color:#aaa;font-size:13px">Chega 5 minutos antes. Qualquer alteração, contacta-nos.</p>
    </div>`,
  });
}

export async function enviarEmailSugestao(input: {
  email: string;
  nome: string;
  servico: string;
  horaAtual: Date;
  novaHora: Date;
  token: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/reagendar/${input.token}`;
  const horaAtual = new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(input.horaAtual);
  const novaHora = new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(input.novaHora);

  await resend.emails.send({
    from: `Barbearia <onboarding@resend.dev>`,
    to: input.email,
    subject: "Sugestão de novo horário",
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#111;color:#f5f0e8;border-radius:12px">
      <h2 style="color:#d4af37;margin:0 0 8px">Sugestão de novo horário</h2>
      <p>Olá <strong>${input.nome}</strong>, temos uma sugestão de horário para o teu serviço <strong>${input.servico}</strong>:</p>
      <p>Atual: <strong>${horaAtual}</strong><br />Proposto: <strong>${novaHora}</strong></p>
      <a href="${link}" style="display:inline-block;margin-top:16px;padding:12px 20px;background:#d4af37;color:#111;text-decoration:none;border-radius:8px;font-weight:bold">Confirmar novo horário</a>
      <p style="color:#aaa;font-size:13px;margin-top:16px">Se não te der jeito, basta ignorar este email e mantemos o horário atual.</p>
    </div>`,
  });
}

export async function enviarEmailLembrete(input: {
  email: string;
  nome: string;
  servico: string;
  dataHora: Date;
}) {
  const data = new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(input.dataHora);

  await resend.emails.send({
    from: `Barbearia <onboarding@resend.dev>`,
    to: input.email,
    subject: "Lembrete: marcação amanhã",
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#111;color:#f5f0e8;border-radius:12px">
      <h2 style="color:#d4af37;margin:0 0 8px">Lembrete de marcação</h2>
      <p>Olá <strong>${input.nome}</strong>, amanhã temos a tua marcação:</p>
      <ul style="line-height:1.8;list-style:none;padding:0">
        <li><strong>Serviço:</strong> ${input.servico}</li>
        <li><strong>Data/hora:</strong> ${data}</li>
      </ul>
      <p style="color:#aaa;font-size:13px">Chega 5 minutos antes. Qualquer alteração, contacta-nos.</p>
    </div>`,
  });
}
