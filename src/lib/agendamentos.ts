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
    const servico = await tx.servico.findUnique({ where: { id: input.servicoId }, include: { servicos: true } });
    if (!servico?.ativo) throw new Error("SERVICO_INATIVO");
    const habilitados = servico.servicos.map((item) => item.profissionalId);
    const filtroProfissionais = input.profissionalId
      ? (!habilitados.length || habilitados.includes(input.profissionalId) ? [input.profissionalId] : [])
      : habilitados;
    const profissionais = await tx.profissional.findMany({
      where: {
        ativo: true,
        ...(input.profissionalId || habilitados.length ? { id: { in: filtroProfissionais } } : {}),
      },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    });
    if (!profissionais.length) throw new Error("SEM_PROFISSIONAIS");

    let escolhido: (typeof profissionais)[number] | undefined;
    let dataHora: Date | undefined;
    let duracaoMin = servico.duracaoMin;
    let precoCents = servico.precoCents;
    let ultimoErro: unknown;
    for (const candidato of profissionais) {
      try {
        const personalizacao = servico.servicos.find((item) => item.profissionalId === candidato.id);
        const duracaoCandidato = personalizacao?.duracaoMin ?? servico.duracaoMin;
        dataHora = await validarSlot({
          data: input.data,
          hora: input.hora,
          duracaoMin: duracaoCandidato,
          profissionalId: candidato.id,
          permitirExcecao: input.permitirExcecao,
          db: tx,
        });
        escolhido = candidato;
        duracaoMin = duracaoCandidato;
        precoCents = personalizacao?.precoCents ?? servico.precoCents;
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
        precoCobrado: precoCents,
        duracaoAgendadaMin: duracaoMin,
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
          precoCents,
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
        versao: { increment: 1 },
        excecaoManual: Boolean(input.permitirExcecao),
        motivoExcecao: input.permitirExcecao ? input.motivoExcecao : null,
      },
    });
  });
}
