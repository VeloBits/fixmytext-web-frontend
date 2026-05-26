# @velobits/design-system

Shared UI primitives and Tailwind v4 design tokens for the VeloBits / FixMyText frontend.

## Usage

```ts
// Import design tokens (Tailwind v4 @theme) — do this once per app entry point
import '@velobits/design-system/theme.css';

// Import components
import { Button, Card, Input, ToolCard } from '@velobits/design-system';
```

## Components

| Component | Purpose |
|-----------|---------|
| `Button` | Primary / secondary / ghost / danger variants |
| `Card` | Surface container with optional hover shadow |
| `Input` | Labeled text input with error state |
| `ToolCard` | Tool selector button (icon + label) |

## Design tokens

`theme.css` defines Tailwind v4 `@theme` tokens sourced from the VSCode Dark+ color palette. All CSS variables (e.g. `var(--accent)`, `var(--bg)`, `var(--text)`) are set by `tokens.css` in `apps/web`.

## Tailwind usage

Both `apps/web` (Vite) and `apps/content` (Next.js) consume this package. Neither app writes design tokens — they only import `theme.css` and use Tailwind utility classes.
