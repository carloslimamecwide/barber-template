import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const passwordHash = await bcrypt.hash(
    process.env.BARBER_PASSWORD ?? "barbeiro123",
    10,
  );

  await prisma.user.upsert({
    where: { email: process.env.BARBER_EMAIL ?? "barbeiro@exemplo.com" },
    update: { passwordHash },
    create: {
      email: process.env.BARBER_EMAIL ?? "barbeiro@exemplo.com",
      passwordHash,
    },
  });

  const servicosData = [
    { id: "seed-corte", nome: "Corte", precoCents: 1200, duracaoMin: 30 },
    { id: "seed-barba", nome: "Barba", precoCents: 800, duracaoMin: 30 },
    { id: "seed-corte-barba", nome: "Corte + Barba", precoCents: 1800, duracaoMin: 60 },
    { id: "seed-sobrancelha", nome: "Sobrancelha", precoCents: 500, duracaoMin: 15 },
  ];

  const servicos = [];
  for (const s of servicosData) {
    const { id, ...resto } = s;
    const servico = await prisma.servico.upsert({
      where: { id },
      update: resto,
      create: s,
    });
    servicos.push(servico);
  }

  const profissionais = [
    { id: "seed-profissional-1", nome: "Barbeiro principal", telefone: "913000000" },
    { id: "seed-profissional-2", nome: "Barbeiro convidado", telefone: "914000000" },
  ];
  for (const profissional of profissionais) {
    await prisma.profissional.upsert({
      where: { id: profissional.id },
      update: profissional,
      create: profissional,
    });
  }

  const horarios = [
    { diaDaSemana: 1, aberto: true, abertura: "09:00", fecho: "19:00", pausaInicio: "13:00", pausaFim: "14:00" },
    { diaDaSemana: 2, aberto: true, abertura: "09:00", fecho: "19:00", pausaInicio: "13:00", pausaFim: "14:00" },
    { diaDaSemana: 3, aberto: true, abertura: "09:00", fecho: "19:00", pausaInicio: "13:00", pausaFim: "14:00" },
    { diaDaSemana: 4, aberto: true, abertura: "09:00", fecho: "19:00", pausaInicio: "13:00", pausaFim: "14:00" },
    { diaDaSemana: 5, aberto: true, abertura: "09:00", fecho: "19:00", pausaInicio: "13:00", pausaFim: "14:00" },
    { diaDaSemana: 6, aberto: true, abertura: "09:00", fecho: "13:00", pausaInicio: null, pausaFim: null },
    { diaDaSemana: 0, aberto: false, abertura: null, fecho: null, pausaInicio: null, pausaFim: null },
  ];

  for (const h of horarios) {
    await prisma.horarioFuncionamento.upsert({
      where: { diaDaSemana: h.diaDaSemana },
      update: h,
      create: h,
    });
  }

  const cliente = await prisma.cliente.upsert({
    where: { id: "seed-cliente-1" },
    update: {},
    create: {
      id: "seed-cliente-1",
      nome: "João Silva",
      telefone: "912345678",
      email: "joao@exemplo.com",
    },
  });

  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(10, 0, 0, 0);

  await prisma.agendamento.upsert({
    where: { id: "seed-agendamento-1" },
    update: {},
    create: {
      id: "seed-agendamento-1",
      clienteId: cliente.id,
      servicoId: servicos[0].id,
      dataHora: amanha,
      status: "agendado",
      precoCobrado: servicos[0].precoCents,
    },
  });

  console.log("Seed concluído:");
  console.log(`  Barbeiro: ${process.env.BARBER_EMAIL ?? "barbeiro@exemplo.com"}`);
  console.log(`  Serviços: ${servicos.length}`);
  console.log(`  Horários: ${horarios.length}`);
  console.log("  Clientes: 1");
  console.log("  Agendamentos: 1");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
