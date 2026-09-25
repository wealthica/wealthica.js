import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// dist/ is no longer committed, so GitHub Pages (served from master) has no dist/ to load
it('example.html loads the library from npm, not from GitHub Pages', () => {
  const html = readFileSync('example.html', 'utf8');
  expect(html).not.toMatch(/github\.io\/wealthica\.js\/dist\//);
  expect(html).toMatch(/src="https:\/\/unpkg\.com\/@wealthica\/wealthica\.js@[\d.]+\/dist\/addon\.min\.js"/);
});
