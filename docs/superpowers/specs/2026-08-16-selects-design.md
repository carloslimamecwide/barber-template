# Design: Melhoria dos Selects/Dropdowns

## Data
2026-08-16

## Contexto
O projeto Barbearia Nobre usa `<select>` nativos em vários formulários e filtros. O visual atual é funcional mas genérico — a seta do sistema operativo destoa do design dark/gold do resto da aplicação.

## Objetivo
Uniformizar e elevar o visual de todos os selects, mantendo a acessibilidade e o comportamento nativo (especialmente importante em mobile).

## Decisões de design

### Direção geral
- Manter o `<select>` nativo do HTML (melhor UX em mobile, acessível, leve).
- Estilização subtil e minimalista, consistente com o design system existente.
- Aplicar a **todos** os selects do projeto.

### Estilo visual
- **Seta**: `ChevronDown` dourada simples à direita, via SVG inline no CSS.
- **Estado default**: igual ao `.input` atual — fundo `bg`, borda `line`, texto `ink`, cantos `rounded-sm`.
- **Hover**: borda muda para `gold`.
- **Focus**: borda `gold`, sem outline extra.
- **Disabled**: opacidade 0.5, cursor `not-allowed`.
- **Options**: fundo `surface`, texto `ink`.
- **Option selecionado**: texto `gold` (destaque subtil).

### Arquitetura
1. **CSS global em `globals.css`**: aplica a estilização base a todos os `select` nativos automaticamente.
2. **Componente `src/components/ui/select.tsx`**: encapsula `<label>` + `<select>` para garantir markup consistente e facilitar manutenção futura.
3. **Refatoração**: substituir os selects existentes pelo componente `Select` onde fizer sentido.

### Componente `Select`
Props:
- `label?: string`
- `id?: string`
- `value: string | number`
- `onChange: (value: string) => void`
- `children: React.ReactNode`
- `className?: string`
- `disabled?: boolean`
- `required?: boolean`

### Ficheiros afetados
- `src/app/globals.css` — estilos globais do select.
- `src/components/ui/select.tsx` — novo componente.
- `src/components/landing/booking-form.tsx` — 2 selects.
- `src/components/dashboard/agenda-view.tsx` — 2 selects.
- `src/components/dashboard/nova-marcacao-dialog.tsx` — 3 selects.

### Considerações
- O `<select>` nativo continua a ser renderizado, pelo que o comportamento em leitores de ecrã e dispositivos móveis é preservado.
- A seta em SVG inline no CSS evita dependências extra.
- A opção selecionada com cor dourada é um detalhe subtil que reforça a identidade visual.
