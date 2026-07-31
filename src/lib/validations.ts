import { z } from "zod";

const erro = (msg: string) => ({ error: msg });

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
});

export const agendamentoPublicoSchema = z.object({
  servicoId: z.string().min(1, erro("Escolhe um serviço")),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, erro("Data inválida")),
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
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, erro("Data inválida")),
  hora: z.string().regex(/^\d{2}:\d{2}$/, erro("Hora inválida")),
  notas: z.string().optional().transform((v) => (v ? v : null)),
});

export const statusSchema = z.object({
  status: z.enum(["agendado", "concluido", "cancelado", "faltou"]),
});

export const novaHoraSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, erro("Data inválida")),
  hora: z.string().regex(/^\d{2}:\d{2}$/, erro("Hora inválida")),
});

export const horarioSchema = z.object({
  diaDaSemana: z.coerce.number().int().min(0).max(6),
  aberto: z.boolean(),
  abertura: z.string().regex(/^\d{2}:\d{2}$/, erro("Abertura inválida")).nullable().optional(),
  fecho: z.string().regex(/^\d{2}:\d{2}$/, erro("Fecho inválido")).nullable().optional(),
});

export const diaFechadoSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, erro("Data inválida")),
  motivo: z.string().optional().transform((v) => (v ? v : null)),
});

export const serieSchema = z.object({
  clienteId: z.string().min(1, erro("Cliente obrigatório")),
  servicoId: z.string().min(1, erro("Serviço obrigatório")),
  diaDaSemana: z.coerce.number().int().min(0).max(6),
  hora: z.string().regex(/^\d{2}:\d{2}$/, erro("Hora inválida")),
  intervaloSemanas: z.coerce.number().int().min(1).max(4).default(1),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, erro("Data inválida")),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ClienteInput = z.infer<typeof clienteSchema>;
export type ServicoInput = z.infer<typeof servicoSchema>;
export type AgendamentoPublicoInput = z.infer<typeof agendamentoPublicoSchema>;
export type AgendamentoManualInput = z.infer<typeof agendamentoManualSchema>;
export type StatusInput = z.infer<typeof statusSchema>;
export type NovaHoraInput = z.infer<typeof novaHoraSchema>;
export type HorarioInput = z.infer<typeof horarioSchema>;
export type DiaFechadoInput = z.infer<typeof diaFechadoSchema>;
export type SerieInput = z.infer<typeof serieSchema>;
