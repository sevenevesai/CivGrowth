import { defineConfig } from '@playwright/test';

export default defineConfig({
  testMatch: 'tests/**/*.pw.ts',
});
