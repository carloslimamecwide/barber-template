import { z } from "zod";

const erro = (msg: string) => ({ error: msg });

export const dataStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, erro("Data inválida")).refine((value) => {
  const [ano, mes, dia] = value.split("-").map(Number);
  const date = new Date(Date.UTC(ano, mes - 1, dia));
  return date.getUTCFullYear() === ano && date.getUTCMonth() === mes - 1 && date.getUTCDate() === dia;
}, erro("Data inválida"));

const overrideSchema = {
  override: z.boolean().optional().default(false),
  overrideReason: z.string().trim().min(3, erro("Indica o motivo da exceção")).optional(),
};

export const loginSchema = z.object({
  email: z.email(erro("Email inválido")),
  password: z.string().min(1, erro("Palavra-passe obrigatória")),
});

export const clienteSchema = z.object({
  nome: z.string().min(2, erro("Nome muito curto")).trim(),
  telefone: z.string().min(6, erro("Telefone inválido")).trim(),
  email: z.union([z.email(erro("Email inválido")), z.literal("")]).optional().transform((v) => (v ? v : null)),
  notas: z.string().optional().transform((v) => (v ? v : null)),
});

export const servicoSchema = z.object({
  nome: z.string().min(2, erro("Nome muito curto")).trim(),
  precoCents: z.coerce.number().int().positive(erro("Preço inválido")),
  duracaoMin: z.coerce.number().int().positive(erro("Duração inválida")),
  ativo: z.boolean().optional(),
  profissionalIds: z.array(z.string().min(1)).optional(),
});

export const profissionalSchema = z.object({
  nome: z.string().min(2, erro("Nome muito curto")).trim(),
  telefone: z.string().min(6, erro("Telefone inválido")).trim().optional().or(z.literal("")),
  email: z.union([z.email(erro("Email inválido")), z.literal("")]).optional(),
  ativo: z.boolean().optional(),
});

export const agendamentoPublicoSchema = z.object({
  servicoId: z.string().min(1, erro("Escolhe um serviço")),
  profissionalId: z.string().min(1).optional(),
  data: dataStringSchema,
  hora: z.string().regex(/^\d{2}:\d{2}$/, erro("Hora inválida")),
  cliente: z.object({
    nome: z.string().min(2, erro("Nome muito curto")).trim(),
    telefone: z.string().min(6, erro("Telefone inválido")).trim(),
    email: z.email(erro("Email inválido")),
  }),
});

export const agendamentoManualSchema = z.object({
  clienteId: z.string().min(1, erro("Cliente obrigatório")),
  servicoId: z.string().min(1, erro("Serviço obrigatório")),
  profissionalId: z.string().min(1).optional(),
  data: dataStringSchema,
  hora: z.string().regex(/^\d{2}:\d{2}$/, erro("Hora inválida")),
  notas: z.string().optional().transform((v) => (v ? v : null)),
  ...overrideSchema,
}).superRefine((value, ctx) => {
  if (value.override && !value.overrideReason) ctx.addIssue({ code: "custom", path: ["overrideReason"], message: "Indica o motivo da exceção" });
});

export const statusSchema = z.object({
  status: z.enum(["agendado", "concluido", "cancelado", "faltou"]),
  motivoStatus: z.string().trim().min(3, erro("Indica o motivo")).optional(),
  versao: z.coerce.number().int().positive().optional(),
}).superRefine((value, ctx) => {
  if (["cancelado", "faltou"].includes(value.status) && !value.motivoStatus) ctx.addIssue({ code: "custom", path: ["motivoStatus"], message: "Indica o motivo" });
});

export const novaHoraSchema = z.object({
  data: dataStringSchema,
  hora: z.string().regex(/^\d{2}:\d{2}$/, erro("Hora inválida")),
  ...overrideSchema,
}).superRefine((value, ctx) => {
  if (value.override && !value.overrideReason) ctx.addIssue({ code: "custom", path: ["overrideReason"], message: "Indica o motivo da exceção" });
});

export const horarioSchema = z.object({
  diaDaSemana: z.coerce.number().int().min(0).max(6),
  aberto: z.boolean(),
  abertura: z.string().regex(/^\d{2}:\d{2}$/, erro("Abertura inválida")).nullable().optional(),
  fecho: z.string().regex(/^\d{2}:\d{2}$/, erro("Fecho inválido")).nullable().optional(),
  pausaInicio: z.string().regex(/^\d{2}:\d{2}$/, erro("Pausa inválida")).nullable().optional(),
  pausaFim: z.string().regex(/^\d{2}:\d{2}$/, erro("Pausa inválida")).nullable().optional(),
}).superRefine((value, ctx) => {
  if (!value.aberto) return;
  if (!value.abertura || !value.fecho || value.abertura >= value.fecho) {
    ctx.addIssue({ code: "custom", message: "Abertura e fecho inválidos" });
  }
  const temPausaInicio = Boolean(value.pausaInicio);
  const temPausaFim = Boolean(value.pausaFim);
  if (temPausaInicio !== temPausaFim) ctx.addIssue({ code: "custom", message: "A pausa precisa de início e fim" });
  if (value.pausaInicio && value.pausaFim && (
    value.pausaInicio >= value.pausaFim ||
    value.pausaInicio < (value.abertura ?? "") ||
    value.pausaFim > (value.fecho ?? "")
  )) ctx.addIssue({ code: "custom", message: "Pausa fora do horário" });
});

export const diaFechadoSchema = z.object({
  data: dataStringSchema,
  motivo: z.string().optional().transform((v) => (v ? v : null)),
});

export const serieSchema = z.object({
  clienteId: z.string().min(1, erro("Cliente obrigatório")),
  servicoId: z.string().min(1, erro("Serviço obrigatório")),
  profissionalId: z.string().min(1).optional(),
  diaDaSemana: z.coerce.number().int().min(0).max(6),
  hora: z.string().regex(/^\d{2}:\d{2}$/, erro("Hora inválida")),
  intervaloSemanas: z.coerce.number().int().min(1).max(4).default(1),
  dataInicio: dataStringSchema,
});

export const configuracaoSchema = z.object({
  nome: z.string().trim().min(2, erro("Nome muito curto")).max(100),
  timezone: z.literal("Europe/Lisbon"),
  intervaloSlotsMin: z.coerce.number().int().min(5).max(60),
  antecedenciaMinHoras: z.coerce.number().int().min(0).max(168),
  horizonteDias: z.coerce.number().int().min(7).max(730),
  cancelamentoMinHoras: z.coerce.number().int().min(0).max(168),
  lembreteHoras: z.coerce.number().int().min(1).max(168),
});

export const horarioProfissionalSchema = z.object({
  diaDaSemana: z.coerce.number().int().min(0).max(6),
  ativo: z.boolean(),
  abertura: z.string().regex(/^\d{2}:\d{2}$/, erro("Abertura inválida")),
  fecho: z.string().regex(/^\d{2}:\d{2}$/, erro("Fecho inválido")),
  pausaInicio: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  pausaFim: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.abertura >= value.fecho) ctx.addIssue({ code: "custom", message: "Abertura e fecho inválidos" });
  if (Boolean(value.pausaInicio) !== Boolean(value.pausaFim)) ctx.addIssue({ code: "custom", message: "A pausa precisa de início e fim" });
  if (value.pausaInicio && value.pausaFim && (value.pausaInicio >= value.pausaFim || value.pausaInicio < value.abertura || value.pausaFim > value.fecho)) {
    ctx.addIssue({ code: "custom", message: "Pausa fora do horário" });
  }
});

export const ausenciaSchema = z.object({
  inicio: z.iso.datetime({ offset: true }),
  fim: z.iso.datetime({ offset: true }),
  motivo: z.string().trim().max(200).optional().transform((value) => value || null),
}).superRefine((value, ctx) => {
  if (new Date(value.inicio) >= new Date(value.fim)) ctx.addIssue({ code: "custom", message: "O fim deve ser posterior ao início" });
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ClienteInput = z.infer<typeof clienteSchema>;
export type ServicoInput = z.infer<typeof servicoSchema>;
export type ProfissionalInput = z.infer<typeof profissionalSchema>;
export type AgendamentoPublicoInput = z.infer<typeof agendamentoPublicoSchema>;
export type AgendamentoManualInput = z.infer<typeof agendamentoManualSchema>;
export type StatusInput = z.infer<typeof statusSchema>;
export type NovaHoraInput = z.infer<typeof novaHoraSchema>;
export type HorarioInput = z.infer<typeof horarioSchema>;
export type DiaFechadoInput = z.infer<typeof diaFechadoSchema>;
export type SerieInput = z.infer<typeof serieSchema>;
export type ConfiguracaoInput = z.infer<typeof configuracaoSchema>;
