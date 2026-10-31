#!/bin/bash
# ==============================================================================
# Családi Receptkönyv v1.0.5 - Raspberry Pi Automata Telepítő Szkript
# ==============================================================================

set -e

echo "🍓 Családi Receptkönyv v1.0.5 Telepítése és Frissítése a Raspberry Pi-re..."
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# 1. Képek és tárolók létrehozása
mkdir -p public/kepek static/kepek

# 2. Node.js függőségek telepítése ha szükséges
if [ -f "package.json" ]; then
    echo "📦 Node.js modulok ellenőrzése és telepítése..."
    npm install --omit=dev || npm install --legacy-peer-deps || true
    if [ ! -d "dist" ]; then
        echo "🔨 Alkalmazás buildelése..."
        npm run build || true
    fi
fi

# 3. Systemd automatikus indítás beállítása ha van sudo
if [ -f "beallitas_automatikus_inditas.sh" ]; then
    chmod +x beallitas_automatikus_inditas.sh
    echo "⚙️ Automatikus indítás beállítása (systemd service)..."
    ./beallitas_automatikus_inditas.sh || true
fi

IP_ADDR=$(hostname -I 2>/dev/null | awk '{print $1}')

echo ""
echo "========================================================================"
echo "🎉 A Családi Receptkönyv v1.0.5 készen áll!"
echo "A szerver indítása:"
echo "👉 npm run preview -- --host 0.0.0.0 --port 5000"
echo "vagy a háttérszolgáltatásként automatikusan a gép indulásakor."
echo "Helyi hálózati elérés:"
echo "👉 http://${IP_ADDR:-raspberrypi.local}:5000"
echo "========================================================================"
