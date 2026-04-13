import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    'react',
    'react-i18next',
    'i18next',
    '@tanstack/react-start',
    '@tanstack/react-router',
  ],
})
