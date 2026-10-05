import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSource } from './check-boundaries.mjs';

test('domain boundaries reject framework imports including dynamic imports', () => {
  assert.equal(
    checkSource('packages/core/src/model.ts', "import { Injectable } from '@nestjs/common';")
      .length,
    1,
  );
  assert.equal(
    checkSource(
      'apps/api/src/modules/project/domain/model.ts',
      "const sql = await import('@starter/db');",
    ).length,
    1,
  );
  assert.equal(
    checkSource('packages/core/src/model.ts', "import type { Model } from './model';").length,
    0,
  );
  assert.equal(
    checkSource(
      'apps/api/src/modules/project/domain/model.ts',
      "export { ProjectService } from '@starter/core';",
    ).length,
    0,
  );
});
test('consumer packages cannot import db or backend internals', () => {
  assert.equal(checkSource('apps/web/app/page.tsx', "import { db } from '@starter/db';").length, 1);
  assert.equal(
    checkSource('packages/api-client/src/index.ts', "import { pool } from '../../db/src';").length,
    1,
  );
  assert.equal(
    checkSource('apps/desktop/src/main.tsx', "import { invoke } from '@tauri-apps/api/core';")
      .length,
    0,
  );
});
