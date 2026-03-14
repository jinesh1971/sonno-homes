#!/usr/bin/env bash
set -e

echo "=== Building frontend ==="
npm install
npm run build
# Move built frontend into server/client so Express can serve it
rm -rf server/client
mv dist server/client

echo "=== Building backend ==="
cd server
npm install
npx prisma generate
npm run build

echo "=== Running database migrations ==="
npx prisma db push --accept-data-loss

echo "=== Seeding database ==="
npx tsx prisma/seed.ts || echo "Seed skipped (may already exist)"

echo "=== Build complete ==="
