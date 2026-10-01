#!/usr/bin/env bash
# Refresh the EC2 server to the latest main: pull, install, build, reload PM2.
#
# Runs ON the server, from the repo checkout. GitHub Actions calls it over SSH on
# every push to main (.github/workflows/deploy-ec2.yml); you can also run it by
# hand:   bash scripts/deploy-ec2.sh
#
# The server checkout is a deploy target, not a workspace: local edits to tracked
# files are discarded. .env is gitignored, so it survives.
set -euo pipefail

cd "$(dirname "$0")/.."

# Node may be installed per-user with nvm, which a non-interactive SSH session
# never loads; load it here so npm and pm2 are on PATH either way.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# One deploy at a time — two quick pushes must not build over each other.
exec 9>/tmp/ielts-deploy.lock
flock 9

if [ ! -f .env ]; then
  echo "ERROR: $(pwd)/.env is missing. Create it before deploying." >&2
  exit 1
fi

echo "==> Pulling main"
git fetch --prune origin main
git reset --hard origin/main
echo "    at $(git log -1 --format='%h %s')"

echo "==> Installing dependencies"
npm ci --no-audit --no-fund

echo "==> Building"
# next build reads .env itself; NODE_ENV=production matches what PM2 runs with.
NODE_ENV=production npm run build

echo "==> Reloading app"
mkdir -p logs
# Starts the app on the first deploy, reloads it on every one after.
pm2 startOrReload app.yaml --update-env
pm2 save

echo "==> Deployed $(git log -1 --format='%h')"
