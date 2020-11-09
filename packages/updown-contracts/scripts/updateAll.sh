#!/usr/bin/env bash

set -x -e

npm run build

npx ts-node scripts/testKovanPicklesEnd.ts
npx ts-node scripts/testKovanYFIEnd.ts
