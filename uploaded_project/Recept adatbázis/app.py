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
