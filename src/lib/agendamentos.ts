import { DisponibilidadeError, validarSlot } from "@/lib/disponibilidade";
import { criarToken } from "@/lib/tokens";
import { enfileirarNotificacao } from "@/lib/notificacoes";
import { transacaoSerializavel } from "@/lib/transactions";

export type ClienteReserva = { nome: string; telefone: string; email: string };

export async function criarAgendamento(input: {
  clienteId?: string;
  cliente?: ClienteReserva;
  servicoId: string;
  profissionalId?: string;
  data: string;
  hora: string;
  notas?: string | null;
  permitirExcecao?: boolean;
  motivoExcecao?: string | null;
  notificar?: boolean;
  serieId?: string;
}) {
  return transacaoSerializavel(async (tx) => {
    const servico = await tx.servico.findUnique({ where: { id: input.servicoId } });
    if (!servico?.ativo) throw new Error("SERVICO_INATIVO");
    const profissionais = await tx.profissional.findMany({
      where: { ativo: true, ...(input.profissionalId ? { id: input.profissionalId } : {}) },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    });
    if (!profissionais.length) throw new Error("SEM_PROFISSIONAIS");

    let escolhido: (typeof profissionais)[number] | undefined;
    let dataHora: Date | undefined;
    let ultimoErro: unknown;
    for (const candidato of profissionais) {
      try {
        dataHora = await validarSlot({
          data: input.data,
          hora: input.hora,
          duracaoMin: servico.duracaoMin,
          profissionalId: candidato.id,
          permitirExcecao: input.permitirExcecao,
          db: tx,
        });
        escolhido = candidato;
        break;
      } catch (error) {
        ultimoErro = error;
      }
    }
    if (!escolhido || !dataHora) {
      throw ultimoErro instanceof Error ? ultimoErro : new DisponibilidadeError("OCUPADO", "Horário indisponível");
    }

    let clienteId = input.clienteId;
    let email: string | null = null;
    let nome = "";
    if (input.cliente) {
      const emailNormalizado = input.cliente.email.trim().toLowerCase();
      const cliente = await tx.cliente.upsert({
        where: { emailNormalizado },
        update: {
          nome: input.cliente.nome,
          telefone: input.cliente.telefone,
          email: emailNormalizado,
          ativo: true,
        },
        create: {
          ...input.cliente,
          email: emailNormalizado,
          emailNormalizado,
        },
      });
      clienteId = cliente.id;
      email = cliente.email;
      nome = cliente.nome;
    } else if (clienteId) {
      const cliente = await tx.cliente.findUnique({ where: { id: clienteId } });
      if (!cliente?.ativo) throw new Error("CLIENTE_INATIVO");
      email = cliente.email;
      nome = cliente.nome;
    }
    if (!clienteId) throw new Error("CLIENTE_INVALIDO");

    const gestao = input.serieId ? null : criarToken();
    const agendamento = await tx.agendamento.create({
      data: {
        clienteId,
        servicoId: servico.id,
        profissionalId: escolhido.id,
        dataHora,
        precoCobrado: servico.precoCents,
        duracaoAgendadaMin: servico.duracaoMin,
        notas: input.notas,
        tokenGestaoHash: gestao?.hash,
        tokenGestaoExpiraEm: gestao ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : null,
        excecaoManual: Boolean(input.permitirExcecao),
        motivoExcecao: input.permitirExcecao ? input.motivoExcecao : null,
        serieId: input.serieId,
      },
      include: { cliente: true, servico: true, profissional: true },
    });

    let notificacao = null;
    if (input.notificar !== false && email && gestao) {
      notificacao = await enfileirarNotificacao(tx, {
        agendamentoId: agendamento.id,
        tipo: "confirmacao",
        destinatario: email,
        payload: {
          email,
          nome,
          servico: servico.nome,
          dataHora: dataHora.toISOString(),
          precoCents: servico.precoCents,
          tokenGestao: gestao.token,
        },
      });
    }
    return { agendamento, notificacao };
  });
}

export async function moverAgendamento(input: {
  id: string;
  data: string;
  hora: string;
  permitirExcecao?: boolean;
  motivoExcecao?: string | null;
}) {
  return transacaoSerializavel(async (tx) => {
    const atual = await tx.agendamento.findUnique({ where: { id: input.id } });
    if (!atual) throw new Error("AGENDAMENTO_INEXISTENTE");
    const dataHora = await validarSlot({
      data: input.data,
      hora: input.hora,
      duracaoMin: atual.duracaoAgendadaMin,
      profissionalId: atual.profissionalId,
      excluirId: atual.id,
      permitirExcecao: input.permitirExcecao,
      db: tx,
    });
    await tx.propostaReagendamento.updateMany({
      where: { agendamentoId: atual.id, status: "pendente" },
      data: { status: "expirada", respondidaEm: new Date() },
    });
    return tx.agendamento.update({
      where: { id: atual.id },
      data: {
        dataHora,
        excecaoManual: Boolean(input.permitirExcecao),
        motivoExcecao: input.permitirExcecao ? input.motivoExcecao : null,
      },
    });
  });
}
