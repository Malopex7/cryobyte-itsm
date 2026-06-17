---
name: Component Engineering (Tailwind CSS v4 & shadcn/ui)
description: Engineering standards, responsive design practices, and versioning guidelines for Tailwind CSS v4 and shadcn/ui.
---

# Skill: Component Engineering (Tailwind CSS v4 & shadcn/ui)

## Context & Versioning
- CSS Engine: Tailwind CSS v4.x (CSS-first configuration)
- Component Base: shadcn/ui (React 19 compatible modules)

## Engineering Standards

### 1. Tailwind v4 CSS-First Configuration
Tailwind v4 drops `tailwind.config.js` in favour of native `@theme` directives directly in your main CSS file (`globals.css`). 
- Do not generate javascript utility extensions unless explicitly instructed.
- Theme keys utilize CSS custom variables natively.

```css
@import "tailwindcss";

@theme {
  --color-brand-primary: #0f172a;
  --color-brand-accent: #38bdf8;
}
```

### 2. shadcn/ui Component Consumption
- Components are co-located in `@/components/ui`.
- When updating or modifying shadcn/ui primitives, strictly preserve the `cn()` utility integration for merging `clsx` and `tailwind-merge`.
- Align with React 19 prop updates (e.g., direct use of `ref` as a standard prop instead of wrapping primitives in legacy `forwardRef`).

### 3. Responsive Web Design
- Enforce standard mobile-first utility prefixes (`sm:`, `md:`, `lg:`, `xl:`).
- Utilize Tailwind v4 container queries for standalone component responsive behaviors.
