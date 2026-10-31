import os
import re
import sqlite3
import json
from flask import Flask, redirect, render_template, request, session, url_for, jsonify, send_file
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename
try:
    from flask_cors import CORS
except ImportError:
    CORS = None

import database

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
import base64
import io
import tarfile

EMBEDDED_TEMPLATES = b"""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"""

def ensure_templates():
    tpl_dir = os.path.join(BASE_DIR, 'templates')
    if not os.path.exists(os.path.join(tpl_dir, 'bejelentkezes.html')):
        try:
            print('📦 Hiányzó HTML sablonok automatikus helyreállítása...')
            with tarfile.open(fileobj=io.BytesIO(base64.b64decode(EMBEDDED_TEMPLATES)), mode='r:gz') as tar:
                tar.extractall(BASE_DIR)
            print('✅ HTML sablonok (templates/) sikeresen helyreállítva!')
        except Exception as e:
            print('Hiba a sablonok kicsomagolásakor:', e)

ensure_templates()


app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static")
)
app.secret_key = "csaladi_titkos_receptkonyv_kulcs_123"

if CORS:
    CORS(app)

UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "kepek")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Adatbázis inicializálása indításkor
database.init_db()


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[-1].lower() in ALLOWED_EXTENSIONS
    )


def get_db_connection():
    return database.get_db_connection()


def get_youtube_embed(url):
    if not url:
        return None
    pattern = r"(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^\"&?\/\s]{11})"
    match = re.search(pattern, url)
    if match:
        return f"https://www.youtube.com/embed/{match.group(1)}"
    return None


# ==============================================================================
# ADMIN VEZÉRLŐPULT
# ==============================================================================

@app.route("/admin/felhasznalok")
def admin_dashboard():
    if "user_id" not in session or session.get("szerep") != "admin":
        return "Hiba: Ehhez a felülethez nincs jogosultságod! 🛑", 403

    conn = get_db_connection()
    felhasznalok = conn.execute(
        "SELECT id, email, felhasznalonev, szerep FROM felhasznalo ORDER BY felhasznalonev ASC"
    ).fetchall()
    conn.close()
    return render_template("admin_dashboard.html", felhasznalok=felhasznalok)


@app.route("/admin/felhasznalo/<int:user_id>/szerkeszt", methods=["GET", "POST"])
def admin_user_szerkeszt(user_id):
    if "user_id" not in session or session.get("szerep") != "admin":
        return "Hiba: Nincs jogosultságod! 🛑", 403

    conn = get_db_connection()
    user = conn.execute(
        "SELECT * FROM felhasznalo WHERE id = ?", (user_id,)
    ).fetchone()

    if request.method == "POST":
        uj_nev = request.form["felhasznalonev"].strip()
        uj_email = request.form["email"].strip()
        uj_jelszo = request.form["jelszo"]
        uj_szerep = request.form["szerep"]

        if uj_jelszo:
            hash_jelszo = generate_password_hash(uj_jelszo)
            conn.execute(
                "UPDATE felhasznalo SET felhasznalonev = ?, email = ?, jelszo_hash = ?, szerep = ? WHERE id = ?",
                (uj_nev, uj_email, hash_jelszo, uj_szerep, user_id),
            )
        else:
            conn.execute(
                "UPDATE felhasznalo SET felhasznalonev = ?, email = ?, szerep = ? WHERE id = ?",
                (uj_nev, uj_email, uj_szerep, user_id),
            )
        conn.commit()
        conn.close()
        return redirect(url_for("admin_dashboard"))

    conn.close()
    return render_template("admin_user_szerkeszt.html", user=user)


@app.route("/admin/felhasznalo/<int:user_id>/torol", methods=["POST"])
def admin_user_torol(user_id):
    if "user_id" not in session or session.get("szerep") != "admin":
        return "Hiba: Nincs jogosultságod! 🛑", 403

    if user_id == session.get("user_id"):
        return "Hiba: Önmagadat nem törölheted ki! ❌", 400

    conn = get_db_connection()
    conn.execute(
        "DELETE FROM szavazatok WHERE nev = (SELECT felhasznalonev FROM felhasznalo WHERE id = ?)",
        (user_id,),
    )
    conn.execute("DELETE FROM felhasznalo WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return redirect(url_for("admin_dashboard"))


# ==============================================================================
# HITELESÍTÉS (AUTH)
# ==============================================================================

@app.route("/regisztracio", methods=["GET", "POST"])
def regisztracio():
    if request.method == "POST":
        email = request.form["email"].strip()
        felhasznalonev = request.form["felhasznalonev"].strip()
        jelszo = request.form["jelszo"]
        jelszo_hash = generate_password_hash(jelszo)

        conn = get_db_connection()
        try:
            conn.execute(
                "INSERT INTO felhasznalo (email, felhasznalonev, jelszo_hash) VALUES (?, ?, ?)",
                (email, felhasznalonev, jelszo_hash),
            )
            # Családtag listába is felvesszük ha még nincs benne
            conn.execute("INSERT OR IGNORE INTO csaladtag (nev) VALUES (?)", (felhasznalonev,))
            conn.commit()
            conn.close()
            return redirect(url_for("bejelentkezes"))
        except sqlite3.IntegrityError:
            conn.close()
            return render_template(
                "regisztracio.html",
                hiba="Ez az e-mail cím vagy felhasználónév már foglalt! 😕",
            )
    return render_template("regisztracio.html")


@app.route("/bejelentkezes", methods=["GET", "POST"])
def bejelentkezes():
    if request.method == "POST":
        felhasznalonev = request.form["felhasznalonev"].strip()
        jelszo = request.form["jelszo"]

        conn = get_db_connection()
        user = conn.execute(
            "SELECT * FROM felhasznalo WHERE felhasznalonev = ?",
            (felhasznalonev,),
        ).fetchone()
        conn.close()

        if user and check_password_hash(user["jelszo_hash"], jelszo):
            session["user_id"] = user["id"]
            session["felhasznalonev"] = user["felhasznalonev"]
            session["szerep"] = user["szerep"]
            return redirect(url_for("index"))
        else:
            return render_template(
                "bejelentkezes.html", hiba="Hibás felhasználónév vagy jelszó! ❌"
            )
    return render_template("bejelentkezes.html")


@app.route("/kijelentkezes")
def kijelentkezes():
    session.clear()
    return redirect(url_for("bejelentkezes"))


# ==============================================================================
# FŐOLDAL & RECEPTEK MEGJELENÍTÉSE
# ==============================================================================

@app.route("/")
def index():
    if "user_id" not in session:
        return redirect(url_for("bejelentkezes"))

    conn = get_db_connection()
    kategoriak = conn.execute("SELECT * FROM kategoria").fetchall()
    szakacsok = conn.execute(
        "SELECT id, felhasznalonev FROM felhasznalo ORDER BY felhasznalonev ASC"
    ).fetchall()

    keresoszo = request.args.get("q", "").strip()
    kat_szuro = request.args.get("kat", "").strip()
    rendezes = request.args.get("rend", "").strip()
    szakacs_szuro = request.args.get("szakacs", "").strip()

    query = """
        SELECT r.id, r.nev, r.kep_utvonal, r.adag, r.ido, k.nev AS kategoria_nev, f.felhasznalonev AS szakacs_nev,
               COUNT(CASE WHEN sz.ertekeles = 'IZLIK' THEN 1 END) as lajkok
        FROM receptek r
        LEFT JOIN kategoria k ON r.kategoria_id = k.id
        LEFT JOIN felhasznalo f ON r.felhasznalo_id = f.id
        LEFT JOIN szavazatok sz ON r.id = sz.recept_id
        WHERE 1=1
    """
    params = []
    if keresoszo:
        query += " AND (r.nev LIKE ? OR r.hozzavalok LIKE ?)"
        szoveg = f"%{keresoszo}%"
        params.extend([szoveg, szoveg])
    if kat_szuro:
        query += " AND k.nev = ?"
        params.append(kat_szuro)
    if szakacs_szuro:
        query += " AND r.felhasznalo_id = ?"
        params.append(szakacs_szuro)

    query += " GROUP BY r.id"
    if rendezes == "top":
        query += " ORDER BY lajkok DESC, r.nev ASC"
    else:
        query += " ORDER BY r.nev ASC"

    receptek_lista = conn.execute(query, params).fetchall()
    conn.close()

    return render_template(
        "index.html",
        receptek=receptek_lista,
        kategoriak=kategoriak,
        szakacsok=szakacsok,
        keresoszo=keresoszo,
        aktiv_kategoria=kat_szuro,
        aktiv_rendezes=rendezes,
        aktiv_szakacs=szakacs_szuro,
    )


@app.route("/recept/<int:recept_id>")
def recept_reszletek(recept_id):
    if "user_id" not in session:
        return redirect(url_for("bejelentkezes"))

    conn = get_db_connection()
    recept = conn.execute(
        """
        SELECT r.*, k.nev AS kategoria_nev, f.felhasznalonev AS szakacs_nev
        FROM receptek r
        LEFT JOIN kategoria k ON r.kategoria_id = k.id
        LEFT JOIN felhasznalo f ON r.felhasznalo_id = f.id
        WHERE r.id = ?
    """,
        (recept_id,),
    ).fetchone()

    if recept is None:
        conn.close()
        return "A recept nem található. 😕", 404

    izlik_lista = conn.execute(
        "SELECT nev FROM szavazatok WHERE recept_id = ? AND ertekeles = 'IZLIK'",
        (recept_id,),
    ).fetchall()
    nem_izlik_lista = conn.execute(
        "SELECT nev FROM szavazatok WHERE recept_id = ? AND ertekeles = 'NEM_IZLIK'",
        (recept_id,),
    ).fetchall()
    conn.close()

    embed_url = get_youtube_embed(recept["video_url"])
    recept_dict = dict(recept)

    if recept_dict["hozzavalok"]:
        recept_dict["hozzavalok"] = re.sub(
            r"[\r\n]+", "\n", recept_dict["hozzavalok"]
        ).strip()
    if recept_dict["leiras"]:
        recept_dict["leiras"] = re.sub(
            r"[\r\n]+", "\n", recept_dict["leiras"]
        ).strip()
    if recept_dict["megjegyzes"]:
        recept_dict["megjegyzes"] = re.sub(
            r"[\r\n]+", "\n", recept_dict["megjegyzes"]
        ).strip()

    return render_template(
        "recept.html",
        recept=recept_dict,
        embed_url=embed_url,
        izlik=[r["nev"] for r in izlik_lista],
        nem_izlik=[r["nev"] for r in nem_izlik_lista],
    )


@app.route("/recept/<int:recept_id>/szavazz", methods=["POST"])
def szavazz(recept_id):
    if "user_id" not in session:
        return redirect(url_for("bejelentkezes"))

    csaladtag_nev = session.get("felhasznalonev", "Ismeretlen")
    visszajelzes = request.form.get("visszajelzes", "IZLIK")

    conn = get_db_connection()
    conn.execute(
        "INSERT OR REPLACE INTO szavazatok (recept_id, nev, ertekeles) VALUES (?, ?, ?)",
        (recept_id, csaladtag_nev, visszajelzes),
    )
    conn.commit()
    conn.close()

    return redirect(url_for("recept_reszletek", recept_id=recept_id))


@app.route("/hozzaad", methods=["GET", "POST"])
def hozzaad():
    if "user_id" not in session:
        return redirect(url_for("bejelentkezes"))

    conn = get_db_connection()
    if request.method == "POST":
        nev = request.form["nev"].strip()
        hozzavalok = request.form["hozzavalok"].strip()
        leiras = request.form["leiras"].strip()
        kategoria_id = request.form["kategoria_id"]
        uj_kategoria = request.form["uj_kategoria"].strip()
        megjegyzes = request.form.get("megjegyzes", "").strip()
        adag = request.form.get("adag") if request.form.get("adag") else 4
        ido = request.form.get("ido", "").strip()
        video_url = request.form.get("video_url", "").strip()

        if uj_kategoria:
            try:
                cursor = conn.execute(
                    "INSERT INTO kategoria (nev) VALUES (?)", (uj_kategoria,)
                )
                kategoria_id = cursor.lastrowid
            except sqlite3.IntegrityError:
                row = conn.execute(
                    "SELECT id FROM kategoria WHERE nev = ?", (uj_kategoria,)
                ).fetchone()
                kategoria_id = row["id"]

        filename = "default.jpg"
        if "kep" in request.files:
            file = request.files["kep"]
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config["UPLOAD_FOLDER"], filename))

        conn.execute(
            """
            INSERT INTO receptek (nev, kategoria_id, hozzavalok, leiras, kep_utvonal, megjegyzes, adag, ido, video_url, felhasznalo_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                nev,
                kategoria_id,
                hozzavalok,
                leiras,
                filename,
                megjegyzes,
                adag,
                ido,
                video_url,
                session["user_id"],
            ),
        )
        conn.commit()
        conn.close()
        return redirect(url_for("index"))

    kategoriak = conn.execute("SELECT * FROM kategoria").fetchall()
    conn.close()
    return render_template("hozzaad.html", kategoriak=kategoriak)


@app.route("/recept/<int:recept_id>/szerkeszt", methods=["GET", "POST"])
def szerkeszt(recept_id):
    if "user_id" not in session:
        return redirect(url_for("bejelentkezes"))

    conn = get_db_connection()
    recept = conn.execute(
        "SELECT * FROM receptek WHERE id = ?", (recept_id,)
    ).fetchone()

    if recept is None:
        conn.close()
        return "A recept nem található. 😕", 404

    if (
        session.get("szerep") != "admin"
        and recept["felhasznalo_id"] != session.get("user_id")
    ):
        conn.close()
        return "Hiba: Nincs jogosultságod a recept szerkesztéséhez! 🛑", 403

    if request.method == "POST":
        nev = request.form["nev"].strip()
        hozzavalok = request.form["hozzavalok"].strip()
        leiras = request.form["leiras"].strip()
        kategoria_id = request.form["kategoria_id"]
        uj_kategoria = request.form["uj_kategoria"].strip()
        megjegyzes = request.form.get("megjegyzes", "").strip()
        adag = request.form.get("adag") if request.form.get("adag") else 4
        ido = request.form.get("ido", "").strip()
        video_url = request.form.get("video_url", "").strip()

        if uj_kategoria:
            try:
                cursor = conn.execute(
                    "INSERT INTO kategoria (nev) VALUES (?)", (uj_kategoria,)
                )
                kategoria_id = cursor.lastrowid
            except sqlite3.IntegrityError:
                row = conn.execute(
                    "SELECT id FROM kategoria WHERE nev = ?", (uj_kategoria,)
                ).fetchone()
                kategoria_id = row["id"]

        filename = recept["kep_utvonal"]
        if "kep" in request.files:
            file = request.files["kep"]
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config["UPLOAD_FOLDER"], filename))

        conn.execute(
            """
            UPDATE receptek 
            SET nev = ?, kategoria_id = ?, hozzavalok = ?, leiras = ?, kep_utvonal = ?, megjegyzes = ?, adag = ?, ido = ?, video_url = ?
            WHERE id = ?
        """,
            (
                nev,
                kategoria_id,
                hozzavalok,
                leiras,
                filename,
                megjegyzes,
                adag,
                ido,
                video_url,
                recept_id,
            ),
        )
        conn.commit()
        conn.close()
        return redirect(url_for("recept_reszletek", recept_id=recept_id))

    kategoriak = conn.execute("SELECT * FROM kategoria").fetchall()
    conn.close()
    return render_template(
        "szerkeszt.html", recept=recept, kategoriak=kategoriak
    )


@app.route("/recept/<int:recept_id>/torol", methods=["POST"])
def torol(recept_id):
    if "user_id" not in session:
        return redirect(url_for("bejelentkezes"))

    conn = get_db_connection()
    recept = conn.execute(
        "SELECT * FROM receptek WHERE id = ?", (recept_id,)
    ).fetchone()

    if recept is None:
        conn.close()
        return "A recept nem található. 😕", 404

    if (
        session.get("szerep") != "admin"
        and recept["felhasznalo_id"] != session.get("user_id")
    ):
        conn.close()
        return "Hiba: Nincs jogosultságod a recept törléséhez! 🛑", 403

    conn.execute("DELETE FROM szavazatok WHERE recept_id = ?", (recept_id,))
    conn.execute("DELETE FROM receptek WHERE id = ?", (recept_id,))
    conn.commit()
    conn.close()
    return redirect(url_for("index"))


# ==============================================================================
# ÚJ: REST API VÉGPONTOK (Modern Webes Felülethez és Mobilos Klienshez)
# ==============================================================================

@app.route("/api/recipes", methods=["GET"])
def api_get_recipes():
    conn = get_db_connection()
    rows = conn.execute("""
        SELECT r.*, k.nev AS kategoria_nev, f.felhasznalonev AS szakacs_nev,
               COUNT(CASE WHEN sz.ertekeles = 'IZLIK' THEN 1 END) as lajkok
        FROM receptek r
        LEFT JOIN kategoria k ON r.kategoria_id = k.id
        LEFT JOIN felhasznalo f ON r.felhasznalo_id = f.id
        LEFT JOIN szavazatok sz ON r.id = sz.recept_id
        GROUP BY r.id
        ORDER BY r.nev ASC
    """).fetchall()

    recipes = []
    for row in rows:
        r_dict = dict(row)
        # Fetch likes and dislikes
        szavazatok = conn.execute("SELECT nev, ertekeles FROM szavazatok WHERE recept_id = ?", (row["id"],)).fetchall()
        r_dict["izlik"] = [s["nev"] for s in szavazatok if s["ertekeles"] == "IZLIK"]
        r_dict["nem_izlik"] = [s["nev"] for s in szavazatok if s["ertekeles"] == "NEM_IZLIK"]
        recipes.append(r_dict)

    conn.close()
    return jsonify(recipes)


@app.route("/api/recipes/<int:recept_id>", methods=["GET"])
def api_get_recipe(recept_id):
    conn = get_db_connection()
    recept = conn.execute("""
        SELECT r.*, k.nev AS kategoria_nev, f.felhasznalonev AS szakacs_nev
        FROM receptek r
        LEFT JOIN kategoria k ON r.kategoria_id = k.id
        LEFT JOIN felhasznalo f ON r.felhasznalo_id = f.id
        WHERE r.id = ?
    """, (recept_id,)).fetchone()

    if not recept:
        conn.close()
        return jsonify({"error": "Recept nem található"}), 404

    r_dict = dict(recept)
    szavazatok = conn.execute("SELECT nev, ertekeles FROM szavazatok WHERE recept_id = ?", (recept_id,)).fetchall()
    r_dict["izlik"] = [s["nev"] for s in szavazatok if s["ertekeles"] == "IZLIK"]
    r_dict["nem_izlik"] = [s["nev"] for s in szavazatok if s["ertekeles"] == "NEM_IZLIK"]
    r_dict["embed_url"] = get_youtube_embed(recept["video_url"])
    conn.close()
    return jsonify(r_dict)


@app.route("/api/recipes/<int:recept_id>/vote", methods=["POST"])
def api_vote(recept_id):
    data = request.get_json() or {}
    csaladtag_nev = data.get("nev") or session.get("felhasznalonev") or "Vendég"
    ertekeles = data.get("ertekeles") or "IZLIK"

    conn = get_db_connection()
    conn.execute(
        "INSERT OR REPLACE INTO szavazatok (recept_id, nev, ertekeles) VALUES (?, ?, ?)",
        (recept_id, csaladtag_nev, ertekeles),
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True, "recept_id": recept_id, "nev": csaladtag_nev, "ertekeles": ertekeles})


# ÚJ: Megosztott Családi Bevásárlólista API
@app.route("/api/shopping-list", methods=["GET", "POST", "DELETE"])
def api_shopping_list():
    conn = get_db_connection()
    if request.method == "GET":
        items = conn.execute("SELECT * FROM bevasarlolista ORDER BY pipalt ASC, id DESC").fetchall()
        conn.close()
        return jsonify([dict(i) for i in items])

    if request.method == "POST":
        data = request.get_json() or {}
        tetel = data.get("tetel", "").strip()
        mennyiseg = data.get("mennyiseg", "").strip()
        kategoria = data.get("kategoria", "Egyéb").strip()
        recept_nev = data.get("recept_nev", "").strip()
        hozzaadta = session.get("felhasznalonev", data.get("hozzaadta", "Családtag"))

        if not tetel:
            conn.close()
            return jsonify({"error": "A tétel megnevezése kötelező!"}), 400

        cursor = conn.execute("""
            INSERT INTO bevasarlolista (tetel, mennyiseg, kategoria, recept_nev, hozzaadta)
            VALUES (?, ?, ?, ?, ?)
        """, (tetel, mennyiseg, kategoria, recept_nev, hozzaadta))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        return jsonify({"success": True, "id": new_id})

    if request.method == "DELETE":
        item_id = request.args.get("id")
        if item_id:
            conn.execute("DELETE FROM bevasarlolista WHERE id = ?", (item_id,))
        else:
            conn.execute("DELETE FROM bevasarlolista WHERE pipalt = 1")
        conn.commit()
        conn.close()
        return jsonify({"success": True})


@app.route("/api/export", methods=["GET"])
def api_export_json():
    filepath = database.export_recipes_to_json("receptek_mentes.json")
    return send_file(filepath, as_attachment=True, download_name="receptek_mentes.json")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
