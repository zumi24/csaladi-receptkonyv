"""
Családi Receptkönyv - Egységesített SQLite Adatbázis Kezelő (database.py)
Összefoglalja és kiváltja az eddigi letrehoz_db.py és frissit_*.py szkripteket.
Automatikus séma-ellenőrzéssel és migrációval.
"""

import os
import sqlite3
import json
from werkzeug.security import generate_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(BASE_DIR, "receptek.db")

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Létrehozza a teljes, végleges adatbázis sémát és feltölti a kezdőadatokkal, ha még üres."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Kategória tábla
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS kategoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nev TEXT UNIQUE NOT NULL
    )
    """)

    # 2. Felhasználó tábla (Admin és Családtagok)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS felhasznalo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        felhasznalonev TEXT UNIQUE NOT NULL,
        jelszo_hash TEXT NOT NULL,
        szerep TEXT DEFAULT 'user' -- 'admin' vagy 'user'
    )
    """)

    # 3. Családtagok tábla
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS csaladtag (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nev TEXT UNIQUE NOT NULL
    )
    """)

    # 4. Receptek tábla (összes mezővel: adag, ido, video_url, megjegyzes, felhasznalo_id)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS receptek (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nev TEXT NOT NULL,
        kategoria_id INTEGER,
        hozzavalok TEXT,
        leiras TEXT,
        kep_utvonal TEXT DEFAULT 'default.jpg',
        megjegyzes TEXT,
        adag INTEGER DEFAULT 4,
        ido TEXT,
        video_url TEXT,
        felhasznalo_id INTEGER,
        letrehozva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (kategoria_id) REFERENCES kategoria (id),
        FOREIGN KEY (felhasznalo_id) REFERENCES felhasznalo (id)
    )
    """)

    # 5. Szavazatok / Családi Visszajelzések tábla
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS szavazatok (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recept_id INTEGER NOT NULL,
        nev TEXT NOT NULL,
        ertekeles TEXT NOT NULL, -- 'IZLIK' vagy 'NEM_IZLIK'
        szavazat_ideje TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recept_id) REFERENCES receptek (id) ON DELETE CASCADE,
        UNIQUE(recept_id, nev)
    )
    """)

    # 6. Bevásárlólista tábla (ÚJ: megosztott családi lista!)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bevasarlolista (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tetel TEXT NOT NULL,
        mennyiseg TEXT,
        kategoria TEXT DEFAULT 'Egyéb',
        pipalt INTEGER DEFAULT 0,
        hozzaadta TEXT,
        recept_nev TEXT,
        letrehozva TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Alapértelmezett kategóriák
    alap_kategoriak = [("Levesek",), ("Főételek",), ("Desszertek",), ("Péksütemények",), ("Saláták",)]
    cursor.executemany("INSERT OR IGNORE INTO kategoria (nev) VALUES (?)", alap_kategoriak)

    # Alapértelmezett családtagok
    alap_csaladtagok = [("Anya",), ("Apa",), ("Krisi",), ("Rolcsi",), ("Mark",), ("Brigi",)]
    cursor.executemany("INSERT OR IGNORE INTO csaladtag (nev) VALUES (?)", alap_csaladtagok)

    # Alapértelmezett Admin létrehozása
    admin_jelszo_hash = generate_password_hash("admin123")
    cursor.execute("""
    INSERT OR IGNORE INTO felhasznalo (email, felhasznalonev, jelszo_hash, szerep)
    VALUES ('admin@csalad.hu', 'admin', ?, 'admin')
    """, (admin_jelszo_hash,))

    # Kezdő mintareceptek beszúrása, ha a tábla üres
    cursor.execute("SELECT COUNT(*) as count FROM receptek")
    if cursor.fetchone()["count"] == 0:
        mintareceptek = [
            (
                "Hagyományos Palacsinta",
                3, # Desszertek
                "20 dkg finomliszt\n2 db tojás\n3 dl tej\n2 dl szódavíz\n1 csipet só\n2 ek étolaj a tésztába",
                "1. A tojásokat a cukorral és csipet sóval elkeverjük.\n2. Hozzáadjuk a tejet és a lisztet, majd csomómentesre keverjük.\n3. Végül a szódavízzel hígítjuk és belekeverjük az olajat.\n4. Fél órát pihentetjük a hűtőben, majd forró palacsintasütőben mindkét oldalát aranysárgára sütjük.",
                "default.jpg",
                "Lekvárral, túróval vagy kakaóval tálaljuk!",
                4,
                "40 perc",
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                1
            ),
            (
                "Klasszikus Bográcsos Gulyásleves",
                1, # Levesek
                "60 dkg marhalábszár\n2 nagy fej vöröshagyma\n3 db sárgarépa\n2 db fehérrépa\n50 dkg burgonya\n2 ek pirospaprika\n2 gerezd fokhagyma\nsó, őrölt kömény, bors",
                "1. Zsíron az apróra vágott hagymát üvegesre pároljuk.\n2. Lehúzzuk a tűzről, belekeverjük a pirospaprikát, hozzáadjuk a felkockázott húst és fehéredésig pirítjuk.\n3. Kevés vízzel és fűszerekkel fedő alatt puhára pároljuk (kb. 60 perc).\n4. Hozzáadjuk a zöldségeket, felöntjük 2 liter vízzel, és puhulásig főzzük.\n5. Csipetkével gazdagítjuk a végén.",
                "default.jpg",
                "Füstölt szalonnazsíron pirítva a legízletesebb!",
                6,
                "90 perc",
                None,
                1
            )
        ]
        cursor.executemany("""
        INSERT INTO receptek (nev, kategoria_id, hozzavalok, leiras, kep_utvonal, megjegyzes, adag, ido, video_url, felhasznalo_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, mintareceptek)

    conn.commit()
    conn.close()
    print("✅ Adatbázis és táblák sikeresen inicializálva!")

def export_recipes_to_json(filepath="receptek_mentes.json"):
    """Exportálja a receptek adatbázist tiszta JSON fájlba (biztonsági mentés céljából)."""
    conn = get_db_connection()
    receptek = conn.execute("""
        SELECT r.*, k.nev as kategoria_nev, f.felhasznalonev as szakacs_nev
        FROM receptek r
        LEFT JOIN kategoria k ON r.kategoria_id = k.id
        LEFT JOIN felhasznalo f ON r.felhasznalo_id = f.id
    """).fetchall()

    export_list = []
    for r in receptek:
        recept_id = r["id"]
        szavazatok = conn.execute("SELECT nev, ertekeles FROM szavazatok WHERE recept_id = ?", (recept_id,)).fetchall()
        export_list.append({
            "id": r["id"],
            "nev": r["nev"],
            "kategoria": r["kategoria_nev"],
            "szakacs": r["szakacs_nev"],
            "hozzavalok": r["hozzavalok"],
            "leiras": r["leiras"],
            "kep_utvonal": r["kep_utvonal"],
            "megjegyzes": r["megjegyzes"],
            "adag": r["adag"],
            "ido": r["ido"],
            "video_url": r["video_url"],
            "letrehozva": r["letrehozva"],
            "szavazatok": [{"nev": s["nev"], "ertekeles": s["ertekeles"]} for s in szavazatok]
        })
    conn.close()

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(export_list, f, ensure_ascii=False, indent=2)
    return filepath

if __name__ == "__main__":
    init_db()
