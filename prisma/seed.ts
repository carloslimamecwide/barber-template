import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const email = process.env.BARBER_EMAIL?.trim().toLowerCase();
  const password = process.env.BARBER_PASSWORD;
  if (!email || !password || password.length < 8) {
    throw new Error("BARBER_EMAIL e BARBER_PASSWORD (mínimo 8 caracteres) são obrigatórios no seed");
  }

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash: await bcrypt.hash(password, 12), ativo: true },
    create: { email, passwordHash: await bcrypt.hash(password, 12) },
  });

  const horarios = Array.from({ length: 7 }, (_, diaDaSemana) => ({
    diaDaSemana,
    aberto: diaDaSemana >= 1 && diaDaSemana <= 6,
    abertura: diaDaSemana >= 1 && diaDaSemana <= 6 ? "09:00" : null,
    fecho: diaDaSemana >= 1 && diaDaSemana <= 5 ? "19:00" : diaDaSemana === 6 ? "13:00" : null,
    pausaInicio: diaDaSemana >= 1 && diaDaSemana <= 5 ? "13:00" : null,
    pausaFim: diaDaSemana >= 1 && diaDaSemana <= 5 ? "14:00" : null,
  }));
  for (const horario of horarios) {
    await prisma.horarioFuncionamento.upsert({
      where: { diaDaSemana: horario.diaDaSemana },
      update: horario,
      create: horario,
    });
  }

  console.log(`Seed concluído: administrador ${email} e horário semanal inicial.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
