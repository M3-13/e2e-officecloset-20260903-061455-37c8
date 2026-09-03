VERDICT: CHANGES_REQUESTED

## Scan-/Prüfhinweis
Die bereitgestellten Scanner-Ergebnisse sind ohne Befund, weil `bandit` und `semgrep` übersprungen wurden. Auch `pip-audit`/`npm audit` liegen nicht vor. Daraus leite ich keinen Befund ab; die Abhängigkeiten konnten nicht automatisiert geprüft werden.

## Sicherheitsbericht

### 1. Medium — Multipart-Body-Limit greift bei fehlendem `Content-Length` nicht durch
**Betroffene Stelle:** `backend/app/routers/wardrobe.py` (`create_item`) sowie der Multipart-Parser von Starlette/FastAPI

**Problem:**
AC-10 ist für gesetzte `Content-Length`-Header korrekt umgesetzt (413 vor `request.form()`). Wenn ein Client den Upload jedoch mit `Transfer-Encoding: chunked` sendet und keinen gültigen `Content-Length`-Header setzt, wird der gesamte Body zunächst vom Multipart-Parser gelesen und als `SpooledTemporaryFile` auf die Festplatte geschrieben. Erst danach liest `await image.read()` den Dateiinhalt und prüft die 5-MB-Grenze. Ein authentifizierter Angreifer kann so über mehrere parallele Requests den Plattenplatz des Servers erschöpfen (DoS), bevor die Anwendung das Limit bemerkt.

**Fix:**
- Setze für `/api/wardrobe/items` zusätzlich ein echtes Body-Limit auf ASGI-Ebene, z. B. eine kleine Middleware, die empfangene Body-Bytes zählt und bei mehr als `MAX_UPLOAD_BYTES + 1 MiB Overhead` sofort 413 zurückgibt, bevor `request.form()` aufgerufen wird.
- Ergänzend im Route-Handler: `data = await image.read(MAX_UPLOAD_BYTES + 1)` verwenden und bei Überschreitung 413 auslösen, statt den gesamten Upload in den Speicher zu laden.

---

### 2. Medium — Pillow-Bildverarbeitung ohne explizite Pixel-/Dekompressionsgrenze
**Betroffene Stelle:** `backend/app/upload.py` (`save_image`)

**Problem:**
`Image.open` + `prepared.save` verarbeitet Bilddateien bis 5 MB. Eine sehr kleine, hochkomprimierte Datei kann dennoch extrem große Pixelmaße deklarieren („Decompression Bomb“). Pillow hat Standardwarngrenzen, aber die Anwendung verlässt sich auf diese impliziten Grenzen. Ein authentifizierter Nutzer kann mit speziell präparierten Bildern hohen CPU-/Speicherverbrauch auslösen.

**Fix:**
- Setze explizit `Image.MAX_IMAGE_PIXELS = 25_000_000` (oder einen passenden Produktivwert).
- Fange `PIL.Image.DecompressionBombError` und `PIL.Image.DecompressionBombWarning` ab und antworte mit `400`/`413`.
- Behalte die bestehende Whitelist für JPEG/PNG/WebP bei und verifiziere nach dem Laden zusätzlich `image.width`/`image.height`.

---

### 3. Low — CORS-Origin-Umgebungsvariable erlaubt potenziell Wildcard mit `allow_credentials=True`
**Betroffene Stelle:** `backend/app/main.py` (`_origins`)

**Problem:**
`FRONTEND_ORIGIN` wird ungeprüft aus der Umgebung gelesen. Wird dort versehentlich `*` eingetragen, entsteht die in AC-12 verbotene Kombination `allow_credentials=True` + Wildcard-Origin. Der Standardwert ist sicher, aber die Konfiguration ist nicht gegen Fehlkonfiguration geschützt.

**Fix:**
- Beim Laden validieren: Falls `"*"` in `_origins` vorkommt, entweder mit `allow_credentials=False` erzwingen oder den Start mit klarer Fehlermeldung verweigern.
- Alternativ bei Wildcard automatisch `allow_credentials` deaktivieren. Die Standardkonfiguration sollte unverändert `http://localhost:5173` bleiben.

---

### 4. Low — In-Memory-Rate-Limit wächst unbegrenzt und ignoriert Proxy-Topologien
**Betroffene Stelle:** `backend/app/routers/auth.py` (`_rate_buckets`, `_client_key`)

**Problem:**
`_rate_buckets` wird für jede gesehene Client-IP angelegt, aber nie aufgeräumt. Bei vielen unterschiedlichen IPs (z. B. IPv6-Präfixen oder gespooften Quellen) kann der Speicher langsam wachsen. Zudem verwendet `request.client.host` die direkte Verbindungs-IP; hinter einem Reverse-Proxy/Lastverteiler sehen alle Clients wie derselbe Client aus, wodurch das Limit unbeabsichtigt globale 429 verursachen kann.

**Fix:**
- Regelmäßig leere Buckets entfernen (z. B. bei jeder N-ten Anfrage oder per Hintergrund-Task).
- Vertrauenswürdige `X-Forwarded-For`-Header nur nach expliziter Proxy-Konfiguration auswerten.
- Für Produktion ein persistentes Rate-Limit (z. B. Redis) in Betracht ziehen.

---

### 5. Low — Keine Längenbegrenzungen für Textfelder und JSON-Bodys
**Betroffene Stelle:** `backend/app/schemas.py`, `backend/app/routers/auth.py`, `backend/app/routers/outfits.py`, `backend/app/routers/wardrobe.py`

**Problem:**
`username`, `email`, `password`, `name` (Kleidungsstück), `name` (Outfit) und `item_ids` haben keine expliziten Maximallängen. Sehr große Werte werden von SQLite akzeptiert und können über authentifizierte Endpunkte Ressourcenverbrauch auslösen. `password` wird außerdem bei jedem Login mittels PBKDF2 gehasht; extrem lange Passwörter erhöhen die CPU-Last unnötig.

**Fix:**
- In den Pydantic-Schemas mit `Field(min_length=..., max_length=...)` arbeiten:
  - `username`: 1–64 Zeichen
  - `email`: 1–254 Zeichen
  - `password`: 8–128 Zeichen
  - `name` (Kleidungsstück/Outfit): 1–100 Zeichen
  - `item_ids`: `max_length=100` und nur positive `int`-Werte.
- Optional ein globales JSON-Body-Limit (z. B. über Middleware) für die API.

---

### 6. Low — Fehlende Security-Header
**Betroffene Stelle:** `backend/app/main.py`

**Problem:**
Die Anwendung setzt keine schützenden HTTP-Header wie `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy` oder HSTS. Das ist kein direkter Exploit, erhöht aber die Angriffsfläche (z. B. MIME-Sniffing, Clickjacking, XSS-Auswirkung).

**Fix:**
- Middleware ergänzen, die `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` setzt.
- CSP passend zur App konfigurieren, z. B. `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'`.  
  **Wichtig:** `style-src` muss `'unsafe-inline'` erlauben, weil `AccountPage` ein inline `<style>`-Element verwendet und React-Inline-Styles möglich sind. Alle legitimen App-Ressourcen bleiben dadurch erreichbar.
- `Strict-Transport-Security` nur aktivieren, wenn der Dienst garantiert ausschließlich über HTTPS ausgeliefert wird.

---

### 7. Low — JWT wird im `localStorage` des Browsers aufbewahrt
**Betroffene Stelle:** `frontend/src/api/auth.js`, `frontend/src/api/client.js`

**Problem:**
Das Bearer-Token liegt im `localStorage` und ist damit bei einem erfolgreichen XSS-Angriff direkt auslesbar. Im sichtbaren Code wurde kein XSS gefunden (React escaped Textinhalte), aber die Speicherung erhöht die Auswirkung eines künftigen XSS.

**Fix:**
- Langfristig auf ein HttpOnly- und Secure-Cookie umstellen und CSRF-Schutz ergänzen.
- Kurzfristig die Token-Laufzeit begrenzen und eine strikte CSP (siehe Befund 6) ausrollen, um XSS-Risiken zu reduzieren.
- Ggf. Token nur im Speicher halten und bei Reload eine erneute Anmeldung verlangen, wenn das Produkt dies erlaubt.

---

## Fazit
Die Kernanforderungen zu AC-10, AC-11, AC-12, AC-13, AC-14, AC-16 und AC-17 sind im sichtbaren Code grundsätzlich umgesetzt. Es wurden keine hartkodierten Produktions-Secrets, SQL-Injection, RCE, Auth-Bypässe oder bekannte ausgenutzte CVEs gefunden. Die verbleibenden Punkte betreffen vor allem Härtung und DoS-Robustheit; deshalb `CHANGES_REQUESTED`.