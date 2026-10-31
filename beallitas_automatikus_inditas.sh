#!/bin/bash
# ==============================================================================
# Családi Receptkönyv - Automatikus Indítás Beállító (Raspberry Pi Systemd Service)
# ==============================================================================

set -e

echo "🍓 Családi Receptkönyv automatikus háttérindítás beállítása..."

# Aktuális felhasználó és könyvtár lekérése
AKTUALIS_USER=$(whoami)
PROJEKT_MAPPA=$(pwd)

echo "👤 Felhasználó: $AKTUALIS_USER"
echo "📂 Mappa: $PROJEKT_MAPPA"

# Service fájl előkészítése az aktuális elérési úttal
TEMP_SERVICE="/tmp/receptkonyv.service"

cat <<EOF > "$TEMP_SERVICE"
[Unit]
Description=Csaladi Receptkonyv Web Alkalmazas
After=network.target

[Service]
Type=simple
User=$AKTUALIS_USER
WorkingDirectory=$PROJEKT_MAPPA
ExecStart=/bin/bash -lc "cd $PROJEKT_MAPPA && npm run preview -- --host 0.0.0.0 --port 5000"
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo "⚙️ Service másolása a /etc/systemd/system/ mappába (sudo szükséges)..."
sudo cp "$TEMP_SERVICE" /etc/systemd/system/receptkonyv.service
sudo systemctl daemon-reload
sudo systemctl enable receptkonyv.service
sudo systemctl restart receptkonyv.service

echo ""
echo "✅ Sikeresen beállítva és elindítva!"
echo "A szerver mostantól automatikusan elindul a Raspberry Pi bekapcsolásakor vagy újraindulásakor."
echo ""
echo "Hasznos parancsok:"
echo "  - Állapot ellenőrzése: sudo systemctl status receptkonyv"
echo "  - Leállítás:           sudo systemctl stop receptkonyv"
echo "  - Újraindítás:         sudo systemctl restart receptkonyv"
echo "  - Élő naplózás:        journalctl -u receptkonyv -f"
echo ""
IP_ADDR=$(hostname -I 2>/dev/null | awk '{print $1}')
echo "👉 Elérhető a böngészőben: http://${IP_ADDR:-IP_CIM}:5000"
