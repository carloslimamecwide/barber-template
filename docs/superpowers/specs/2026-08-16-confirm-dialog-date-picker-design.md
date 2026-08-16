# Design: Modais de Confirmação e Seleção de Datas

## Data
2026-08-16

## Contexto
O projeto usa `window.confirm` nativo para ações destrutivas e `input type="date"` / `type="time"` nativos para seleção de datas/horas. O objetivo é alinhar estes elementos ao design dark/gold da Barbearia Nobre.

## Decisões de design

### Modais de confirmação
- **Componente customizado** usando o `Dialog` existente.
- **Título específico** da ação (ex.: "Apagar cliente?").
- **Descrição** explicando as consequências.
- **Botões**: "Cancelar" (`btn-outline`) + ação (`btn-danger` para ações destrutivas, `btn-gold` para outras).
- **Hook `useConfirm`**: devolve `confirm(options) => Promise<boolean>`, substituindo diretamente o `window.confirm`.

### Date/time pickers
- Manter inputs nativos (`type="date"` e `type="time"`).
- Estilizar via CSS global no `globals.css`.
- Ícones dourados (calendário para data, relógio para hora) via SVG inline.
- Hover/focus com borda dourada, igual aos outros inputs.

## Ficheiros afetados
- `src/components/ui/confirm-dialog.tsx` — novo componente
- `src/hooks/use-confirm.ts` — novo hook
- `src/app/globals.css` — estilos date/time
- `src/components/dashboard/clientes-view.tsx`
- `src/components/dashboard/agenda-view.tsx`
- `src/components/dashboard/servicos-view.tsx`
- `src/components/dashboard/recorrentes-view.tsx`
- `src/components/dashboard/profissionais-view.tsx`
- `src/components/reagendar/gestao-marcacao.tsx`

## API do hook
```ts
const confirm = useConfirm();

if (await confirm({
  title: "Apagar cliente?",
  description: "As marcações associadas também serão apagadas.",
  confirmText: "Apagar",
  variant: "danger",
})) {
  // executar ação
}
```

## Considerações
- O hook cria o seu próprio estado/modal por instância, sem necessidade de provider.
- O `<dialog>` nativo continua a ser usado (acessibilidade e foco geridos pelo browser).
- Inputs nativos preservam a excelente experiência em mobile.
