import { test, expect } from '@playwright/test';

test('golden 1000 agents', async ({ page }) => {
  await page.goto('http://localhost:5173');
  // assume initCount overridden to 1000 in test env
  const canvas = await page.$('canvas');
  expect(canvas).not.toBeNull();
  const img = await page.screenshot();
  expect(img).toMatchSnapshot('1000_agents.png', {
    threshold: 0.1
  });
});
