#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npx prisma db seed || echo "Seeding skipped or already applied"

echo "Starting AuraSpear Backend..."
exec node dist/main.js
