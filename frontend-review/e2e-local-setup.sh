#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> Creating Docker network ls-network..."
docker network create ls-network 2>/dev/null || echo "Network ls-network already exists, skipping."

echo "==> Starting LocalStack..."
docker rm -f localstack 2>/dev/null || true
docker run -d --name localstack --network ls-network -p 4566:4566 localstack/localstack:4.10.0

echo "==> Waiting for LocalStack to be ready..."
until docker logs localstack 2>&1 | grep -q "Ready."; do
  sleep 2
done
echo "LocalStack is ready."

echo "==> Running Terraform..."
cd "$REPO_ROOT/terraform"
terraform init
terraform apply -var-file=local.tfvars -auto-approve

echo "==> Running E2E tests..."
cd "$SCRIPT_DIR"
npm run test:e2e:all-logs

echo "==> Cleaning up..."
docker stop localstack && docker rm localstack
docker network rm ls-network
rm "$REPO_ROOT/terraform/terraform.tfstate"