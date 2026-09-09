#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARCHIVE_PATH="${1:-}"

if [[ -z "$ARCHIVE_PATH" || ! -d "$ARCHIVE_PATH/dSYMs" ]]; then
  echo "Usage: $0 /path/to/BrickVal.xcarchive" >&2
  exit 2
fi

for variable in SENTRY_AUTH_TOKEN SENTRY_ORG SENTRY_PROJECT; do
  if [[ -z "${!variable:-}" ]]; then
    echo "Missing required environment variable: $variable" >&2
    exit 2
  fi
done

SENTRY_CLI="${SENTRY_CLI:-$SCRIPT_DIR/../node_modules/.bin/sentry-cli}"
if [[ ! -x "$SENTRY_CLI" ]]; then
  echo "sentry-cli was not found at $SENTRY_CLI" >&2
  exit 2
fi

exec "$SENTRY_CLI" debug-files upload "$ARCHIVE_PATH/dSYMs"
