import { defineConfig } from '@playwright/test';
import payments from './playwright.payments.config';
// All default journeys use the isolated replica-set server and mocked external services.
export default defineConfig({ ...payments, testMatch: '**/*.spec.ts', fullyParallel: false, workers: 1 });
