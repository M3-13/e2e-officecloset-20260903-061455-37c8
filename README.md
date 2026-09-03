# Glamouröser Kleiderschrank-Manager

Ein Web-GUI im Hollywood-Stil, mit dem Benutzer sich registrieren und anmelden,
Kleidungsstücke mit Bildern und Kategorien anlegen, ihre Garderobe durchstöbern und
im Outfit-Creator Einzelteile zu gespeicherten Outfits kombinieren können.

## Tech-Stack

- **Backend**: Python 3, FastAPI, SQLAlchemy, SQLite, Uvicorn
- **Auth**: JWT (Bearer) via PyJWT, Passwort-Hashing via PBKDF2
- **Frontend**: React + Vite (separates Modul)

## Installation

```bash
cd backend
pip install -r requirements.txt
```

## Start (Dev)

Zuerst `JWT_SECRET` setzen — die Variable hat keinen Default. Werte aus
`.env.example` übernehmen und einen zufälligen Schlüssel eintragen (oder
direkt im Shell exportieren):

```bash
cd backend
export JWT_SECRET=$(python -c "import secrets; print(secrets.token_hex(32))")
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Windows PowerShell:

```powershell
cd backend
$env:JWT_SECRET = (python -c "import secrets; print(secrets.token_hex(32))")
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Beim ersten Start wird das SQLite-Schema automatisch angelegt
(`create_all` im Lifespan-Hook). Ein Neustart behält alle Daten (AC-08).

## Env-Variablen

| Variable       | Pflicht | Default                | Beschreibung                                  |
| -------------- | ------- | ---------------------- | --------------------------------------------- |
| `JWT_SECRET`   | ja      | –                      | Signaturschlüssel für JWT (kein Literal im Repo, RUN.json-Klasse `generate`) |
| `DATABASE_URL` | nein    | `sqlite:///./wardrobe.db` | SQLAlchemy-URL                               |
| `UPLOAD_DIR`   | nein    | `uploads`              | Verzeichnis für hochgeladene Bilder (relativ zu `backend/`) |
| `FRONTEND_ORIGIN` | nein  | `http://localhost:5173` | Erlaubte CORS-Origin (kommagetrennt)         |

## API

Alle Antworten (auch Fehler) als JSON. Fehlerformat: `{"detail":{"code":str,"message":str}}`.
Authentifizierung über `Authorization: Bearer <token>`.

| Methode | Pfad                          | Beschreibung                          |
| ------- | ----------------------------- | ------------------------------------- |
| POST    | `/api/auth/register`          | Registrieren `{username,email,password}` |
| POST    | `/api/auth/login`             | Anmelden `{username,password}`         |
| DELETE  | `/api/auth/account`           | Konto (mit allen Daten) löschen        |
| POST    | `/api/wardrobe/items`         | Kleidungsstück anlegen (multipart)     |
| GET     | `/api/wardrobe/items`         | Garderobe auflisten (`?category=`)     |
| DELETE  | `/api/wardrobe/items/{id}`    | Kleidungsstück löschen                 |
| POST    | `/api/outfits`                | Outfit anlegen `{name,item_ids}`       |
| GET     | `/api/outfits`                | Outfits auflisten                      |
| DELETE  | `/api/outfits/{id}`           | Outfit löschen                         |
| GET     | `/api/health`                 | Health-Check → `{"status":"ok"}`       |
| GET     | `/uploads/<dateiname>`        | Hochgeladenes Bild (statisch)          |

## Features

- Registrierung & Login mit JWT
- Garderobe mit Bild-Upload (JPEG/PNG/WebP, max 5 MB, EXIF/GPS wird entfernt)
- Outfit-Creator zur Kombination von Kleidungsstücken
- Eigene Daten je Benutzer (Ownership-Prüfung → 403/404)
- Kontolöschung inkl. aller Daten und Bilder
