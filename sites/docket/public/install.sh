#!/usr/bin/env bash
#
# docket installer — downloads the latest release binary for the current
# platform from GitHub Releases and drops it in $DOCKET_INSTALL_DIR
# (default: ~/.local/bin).
#
# Usage:
#   curl -LsSf https://raw.githubusercontent.com/parzival1l/docket/main/install.sh | bash
#   curl -LsSf .../install.sh | bash -s -- --version v0.0.1
#
# Environment:
#   DOCKET_INSTALL_DIR   override install directory (default: $HOME/.local/bin)
#   DOCKET_REPO          override source repo (default: parzival1l/docket)

set -euo pipefail

REPO="${DOCKET_REPO:-parzival1l/docket}"
INSTALL_DIR="${DOCKET_INSTALL_DIR:-$HOME/.local/bin}"
VERSION=""

while [ $# -gt 0 ]; do
  case "$1" in
    --version) VERSION="$2"; shift 2 ;;
    --version=*) VERSION="${1#*=}"; shift ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "unknown flag: $1" >&2; exit 1 ;;
  esac
done

# --- detect platform ---------------------------------------------------------

uname_s=$(uname -s)
uname_m=$(uname -m)

case "$uname_s" in
  Darwin) os="apple-darwin" ;;
  Linux)  os="unknown-linux-gnu" ;;
  *) echo "error: unsupported OS: $uname_s" >&2; exit 1 ;;
esac

case "$uname_m" in
  arm64|aarch64) arch="aarch64" ;;
  x86_64|amd64)  arch="x86_64" ;;
  *) echo "error: unsupported architecture: $uname_m" >&2; exit 1 ;;
esac

target="${arch}-${os}"

# --- resolve version ---------------------------------------------------------

if [ -z "$VERSION" ]; then
  echo "==> resolving latest release of $REPO..."
  VERSION=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
    | grep '"tag_name"' \
    | head -n1 \
    | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')
  if [ -z "$VERSION" ]; then
    echo "error: could not resolve latest release. Set --version explicitly." >&2
    exit 1
  fi
fi

echo "==> installing docket $VERSION for $target"

# --- download + verify -------------------------------------------------------

asset="docket-${VERSION}-${target}.tar.gz"
url="https://github.com/$REPO/releases/download/$VERSION/$asset"
sha_url="${url}.sha256"

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

curl -fsSL --output "$tmpdir/$asset" "$url"
if curl -fsSL --output "$tmpdir/$asset.sha256" "$sha_url" 2>/dev/null; then
  echo "==> verifying checksum"
  expected=$(awk '{print $1}' "$tmpdir/$asset.sha256")
  if command -v shasum >/dev/null 2>&1; then
    actual=$(shasum -a 256 "$tmpdir/$asset" | awk '{print $1}')
  else
    actual=$(sha256sum "$tmpdir/$asset" | awk '{print $1}')
  fi
  if [ "$expected" != "$actual" ]; then
    echo "error: checksum mismatch (expected $expected, got $actual)" >&2
    exit 1
  fi
else
  echo "warn: no .sha256 file found alongside $asset — skipping verification" >&2
fi

# --- extract + install -------------------------------------------------------

tar -xzf "$tmpdir/$asset" -C "$tmpdir"

if [ ! -f "$tmpdir/docket" ]; then
  echo "error: extracted archive does not contain a 'docket' binary" >&2
  exit 1
fi

mkdir -p "$INSTALL_DIR"
mv "$tmpdir/docket" "$INSTALL_DIR/docket"
chmod +x "$INSTALL_DIR/docket"

echo "==> installed: $INSTALL_DIR/docket"

# --- PATH hint ---------------------------------------------------------------

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    cat <<EOF

note: $INSTALL_DIR is not on your \$PATH. Add this to your shell profile:

  export PATH="$INSTALL_DIR:\$PATH"

EOF
    ;;
esac

"$INSTALL_DIR/docket" --version || true
