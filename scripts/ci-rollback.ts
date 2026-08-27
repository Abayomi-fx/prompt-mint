#!/usr/bin/env npx tsx
import { runRollbackCli } from "../src/lib/ops/rollbackCli";

runRollbackCli()
  .then(({ ok, result }) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(ok ? 0 : 1);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
