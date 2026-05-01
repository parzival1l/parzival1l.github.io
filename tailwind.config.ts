import type { Config } from 'tailwindcss'

// Tailwind v4 prefers CSS-first config — theme tokens and plugins are declared
// in app/globals.css via @theme and @plugin. This file pins content sources for
// editor tooling and leaves a hook for any future JS-side configuration.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx,md,mdx}',
    './components/**/*.{ts,tsx,md,mdx}',
    './content/**/*.{md,mdx}',
  ],
}

export default config
