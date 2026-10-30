# 🍓 Családi Receptkönyv - Raspberry Pi Útmutató

Ez a mappa tartalmazza a meglévő Python Flask recept adatbázisod modernizált, egységesített változatát.

---

## 🌟 Újdonságok és Javítások

1. **Egységesített Adatbázis (`database.py`):**
   * Kiváltja az eddigi 6 különálló frissítő szkriptet (`frissit_db.py`, `frissit_auth.py`, `frissit_szavazas.py`, `add_uj_mezok.py` stb.).
   * Automatikusan létrehozza és migratálja a táblákat (Receptek, Kategóriák, Felhasználók, Családtagok, Szavazatok, és az új **Bevásárlólista**).
2. **REST API & CORS Támogatás (`app.py`):**
   * Az összes hagyományos HTML sablon működik (Jinja2 sablonok a `templates/` mappából).
   * Mellette elérhetők a modern `/api/recipes`, `/api/recipes/<id>/vote`, `/api/shopping-list` végpontok, így telefonról, táblagépről és a modern webalkalmazásból is használható!
3. **YouTube Beágyazás & Szavazás:**
   * A receptekhez megadott YouTube linkeket automatikusan beágyazható formátumra alakítja.
   * A családtagok (*Anya, Apa, Krisi, Rolcsi, Mark, Brigi*) szavazatai és kedvencei megmaradnak.
4. **Automatikus Indítás (Systemd Service):**
   * A `setup_pi.sh` futtatásával beállíthatod, hogy a Raspberry Pi bekapcsolásakor vagy újraindulásakor a szerver automatikusan elinduljon a háttérben.

---

## 🚀 Telepítés a Raspberry Pi-n (3 egyszerű lépés)

### 1. Másold át a fájlokat a Raspberry Pi-re
Helyezd el a projektfájlokat a Pi-n, például a `/home/pi/recept_adatbazis` mappába.

### 2. Futtasd az automatikus telepítőt
Nyiss egy terminált (SSH-n vagy közvetlenül a Pi-n), lépj be a mappába, és futtasd:

```bash
chmod +x setup_pi.sh
./setup_pi.sh
```

A szkript:
* Létrehozza a `venv` virtuális környezetet,
* Telepíti a csomagokat (`Flask`, `gunicorn`, `flask-cors`),
* Inicializálja az adatbázist (`receptek.db`),
* Ha szeretnéd, beállítja a `systemd` háttérszolgáltatást, így újraindítás után is azonnal futni fog.

### 3. Használat a családi WiFi-n
A családtagok bármilyen telefonról vagy laptopról megnyithatják a böngészőben:
👉 `http://raspberrypi.local:5000` (vagy a Pi IP címe, pl. `http://192.168.1.50:5000`)

---

## 🛠️ Hasznos Parancsok a Raspberry Pi-n

* **Szolgáltatás állapotának ellenőrzése:**
  ```bash
  sudo systemctl status receptkonyv
  ```
* **Szerver újraindítása:**
  ```bash
  sudo systemctl restart receptkonyv
  ```
* **Élő naplófájl (log) megtekintése:**
  ```bash
  sudo journalctl -u receptkonyv -f
  ```
* **Manuális indítás teszteléshez (fejlesztői mód):**
  ```bash
  source venv/bin/activate
  python3 app.py
  ```
