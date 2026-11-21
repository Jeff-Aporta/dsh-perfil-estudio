#!/usr/bin/env bash
# Instala el binario de codebase-memory-mcp (el GRAFO DEL CODIGO) y verifica su checksum.
#
# POR QUE ESTE SCRIPT
#   Los perfiles de DSH montan el servidor MCP "codebase" con la entrada mcp-codebase
#   (perfiles/*/cordis.patch.yml): el comando es "codebase-memory-mcp", en el PATH.
#   Si el binario no esta, el perfil arranca igual (failOnStartupError: false) pero el
#   bot se queda SIN GRAFO: los agentes vuelven a buscar a ciegas por los ficheros.
#
# USO
#   bash tools/instalar-codebase-memory.sh            # instala (si ya esta, comprueba)
#   bash tools/instalar-codebase-memory.sh --verificar # solo comprueba
set -uo pipefail

VERSION="${CBM_VERSION:-v0.12.1}"
REPO="DeusData/codebase-memory-mcp"
DEST_DIR="${CBM_DIR:-$HOME/.local/bin}"
SOLO_VERIFICAR=0
[ "${1:-}" = "--verificar" ] && SOLO_VERIFICAR=1

echo "== codebase-memory-mcp (el grafo del codigo) =="
echo "version:   $VERSION"
echo "destino:   $DEST_DIR"

if command -v codebase-memory-mcp >/dev/null 2>&1; then
  echo "-- ya esta en el PATH: $(command -v codebase-memory-mcp)"
  codebase-memory-mcp --version
  echo "listo."
  exit 0
fi

if [ $SOLO_VERIFICAR -eq 1 ]; then
  echo "-- no esta en el PATH (el perfil arranca sin grafo)"
  exit 1
fi

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64)  ASSET="codebase-memory-mcp-linux-amd64.tar.gz" ;;
  Linux-aarch64) ASSET="codebase-memory-mcp-linux-arm64.tar.gz" ;;
  Darwin-x86_64) ASSET="codebase-memory-mcp-darwin-amd64.tar.gz" ;;
  Darwin-arm64)  ASSET="codebase-memory-mcp-darwin-arm64.tar.gz" ;;
  *) echo "PLATAFORMA NO SOPORTADA: $(uname -s)-$(uname -m)" >&2; exit 2 ;;
esac
echo "-- asset: $ASSET"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
BASE="https://github.com/$REPO/releases/download/$VERSION"

echo "-- bajando"
curl -fsSL -o "$TMP/$ASSET" "$BASE/$ASSET"
curl -fsSL -o "$TMP/checksums.txt" "$BASE/checksums.txt"

NUESTRO="$(sha256sum "$TMP/$ASSET" | cut -d" " -f1)"
OFICIAL="$(grep " $ASSET$" "$TMP/checksums.txt" | cut -d" " -f1)"
if [ -z "$OFICIAL" ]; then
  echo "no encuentro el checksum de $ASSET en checksums.txt" >&2
  exit 3
fi
if [ "$NUESTRO" != "$OFICIAL" ]; then
  echo "CHECKSUM DISTINTO: no se instala" >&2
  echo "  bajamos: $NUESTRO" >&2
  echo "  oficial: $OFICIAL" >&2
  exit 4
fi
echo "-- checksum ok ($NUESTRO)"

tar -xzf "$TMP/$ASSET" -C "$TMP"
BIN="$(find "$TMP" -maxdepth 2 -name 'codebase-memory-mcp' -type f | head -1)"
if [ -z "$BIN" ]; then echo "no encuentro el binario dentro del tar" >&2; exit 5; fi
mkdir -p "$DEST_DIR"
chmod +x "$BIN"
cp "$BIN" "$DEST_DIR/codebase-memory-mcp"

echo "-- instalado: $DEST_DIR/codebase-memory-mcp"
"$DEST_DIR/codebase-memory-mcp" --version

case ":$PATH:" in
  *":$DEST_DIR:"*) ;;
  *) echo "AVISO: $DEST_DIR no esta en el PATH. Anadelo (para el servicio, al entorno del servicio)." ;;
esac

echo ""
echo "listo. el perfil ya monta el servidor MCP (mcp-codebase)."
