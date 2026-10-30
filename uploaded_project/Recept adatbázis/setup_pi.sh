#!/bin/bash
# ==============================================================================
# Családi Receptkönyv - Raspberry Pi Egygombos Telepítő Szkript
# ==============================================================================

set -e

echo "🍓 Családi Receptkönyv Telepítése a Raspberry Pi-re..."
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# 1. Képek mappa létrehozása ha még nincs
mkdir -p static/kepek

# 2. Python virtuális környezet beállítása
if [ ! -d "venv" ]; then
    echo "📦 Virtuális környezet (venv) létrehozása..."
    python3 -m venv venv
fi

echo "🔄 Függőségek telepítése (Flask, Gunicorn, CORS)..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 3. Adatbázis inicializálása
echo "🗄️ Adatbázis sémák és kezdő adatok ellenőrzése..."
python3 -c "import database; database.init_db()"

# 4. Systemd szolgáltatás beállítása (opcionális, ha van sudo)
if [ -f "receptkonyv.service" ]; then
    echo ""
    read -p "Szeretnéd beállítani, hogy a szerver a Raspberry Pi bekapcsolásakor magától elinduljon a háttérben? (i/n) " valasz
    if [[ "$valasz" =~ ^[IiYy]$ ]]; then
        USER_NAME=$(whoami)
        echo "⚙️ Systemd service konfigurálása a(z) $USER_NAME felhasználóhoz..."
        sed -i "s|/home/pi/recept_adatbazis|$PROJECT_DIR|g" receptkonyv.service
        sed -i "s|User=pi|User=$USER_NAME|g" receptkonyv.service
        sudo cp receptkonyv.service /etc/systemd/system/receptkonyv.service
        sudo systemctl daemon-reload
        sudo systemctl enable receptkonyv
        sudo systemctl restart receptkonyv
        echo "✅ A háttérszolgáltatás sikeresen elindult és be lett kapcsolva!"
    fi
fi

# Helyi IP cím lekérése a felhasználónak
IP_ADDR=$(hostname -I | awk '{print $1}')

echo ""
echo "========================================================================"
echo "🎉 A Családi Receptkönyv készen áll!"
echo "A szervert a helyi hálózaton (WiFi-n) a családtagok itt érik el:"
echo "👉 http://${IP_ADDR:-raspberrypi.local}:5000"
echo "========================================================================"
