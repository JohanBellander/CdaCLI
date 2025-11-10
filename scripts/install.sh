#!/usr/bin/env bash
# CDA CLI Installation Script for Unix-like environments
# Optional branch selection:
#   CDACLI_BRANCH=develop curl -fsSL https://raw.githubusercontent.com/JohanBellander/CdaCLI/master/scripts/install.sh | bash
# Or pass --branch when executing the saved script locally.

set -euo pipefail

BRANCH="${CDACLI_BRANCH:-master}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -b|--branch)
      if [[ $# -lt 2 ]]; then
        echo "Error: --branch requires a value." >&2
        exit 1
      fi
      BRANCH="$2"
      shift 2
      ;;
    *)
      echo "Error: Unknown argument '$1'." >&2
      exit 1
      ;;
  esac
done

echo "Installing CDA CLI..."

command -v git >/dev/null 2>&1 || {
  echo "Error: git is required but not installed." >&2
  echo "Install Git from https://git-scm.com/downloads" >&2
  exit 1
}

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required but not installed." >&2
  echo "Install Node.js >= 18.0.0 from https://nodejs.org" >&2
  exit 1
fi

NODE_VERSION="$(node --version)"
NODE_MAJOR="${NODE_VERSION#v}"
NODE_MAJOR="${NODE_MAJOR%%.*}"
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  echo "Error: Node.js 18.0.0 or higher is required (found $NODE_VERSION)." >&2
  exit 1
fi

echo "Found Node.js $NODE_VERSION ✓"

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required but not found." >&2
  exit 1
fi

echo "Found npm $(npm --version) ✓"

PACKAGE_NAME="cdacli"
if npm list -g --depth=0 "$PACKAGE_NAME" >/dev/null 2>&1; then
  echo "Existing CDA CLI installation detected. Uninstalling..."
  npm uninstall -g "$PACKAGE_NAME" >/dev/null 2>&1 || true
fi

TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t cdacli-install)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cd "$TMP_DIR"

echo "Cloning CdaCLI repository (branch: $BRANCH)..."
git clone --branch "$BRANCH" --single-branch https://github.com/JohanBellander/CdaCLI.git >/dev/null
cd CdaCLI

echo "Installing dependencies..."
npm install --silent

echo "Building CDA CLI..."
npm run build >/dev/null

echo "Packaging CDA CLI..."
TARBALL="$(npm pack --silent)"

echo "Installing CDA CLI globally..."
npm install -g "$TARBALL" >/dev/null

echo
printf '✅ CDA CLI installed successfully!\n'
echo
printf 'Try: cda --help\n'
printf 'Plan instructions: cda run --plan\n'
