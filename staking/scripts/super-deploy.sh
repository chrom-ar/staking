#!/bin/bash

set -x

./scripts/1-deploy-programs.sh
npx tsx ./scripts/2-init-config.ts
npx tsx ./scripts/3-create-pool-data.ts
npx tsx ./scripts/4-init-integrity.ts
./scripts/5-create-publisher-staking.sh
npx tsx ./scripts/6-create-position.ts
