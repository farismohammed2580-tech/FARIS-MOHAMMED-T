import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { PWAInstallButton } from '../components/common/PWAInstallButton';
import fs from 'fs';
import path from 'path';

test('Rules of Hooks verification: PWAInstallButton declares all hooks before any early returns', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/common/PWAInstallButton.tsx');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let firstReturnIndex = -1;
  const hookIndices: { name: string; line: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (firstReturnIndex === -1 && /^\s*return\b/.test(line) && !line.includes('=>')) {
      firstReturnIndex = i;
    }
    if (/\b(useState|useEffect|useMemo|useCallback|usePWAInstall)\s*\(/.test(line)) {
      hookIndices.push({ name: line.trim(), line: i });
    }
  }

  assert.ok(firstReturnIndex > 0, 'Component must have return statements');
  assert.ok(hookIndices.length >= 3, 'Component has hooks declared');

  for (const hook of hookIndices) {
    assert.ok(
      hook.line < firstReturnIndex,
      `Hook "${hook.name}" at line ${hook.line + 1} must be declared BEFORE first return at line ${firstReturnIndex + 1}`
    );
  }
});

test('PWAInstallButton renders without crashing across initial server-side render', () => {
  const html = renderToString(React.createElement(PWAInstallButton));
  assert.ok(typeof html === 'string', 'Should return rendered string');
  assert.ok(html.length > 0, 'Rendered HTML must not be empty');
});
