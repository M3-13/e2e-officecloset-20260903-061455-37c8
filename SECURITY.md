VERDICT: CHANGES_REQUESTED

## Sicherheitsprüfung des Gesamtprodukts

### Scanner-Abdeckung
- `bandit`: nicht ausgeführt (`[skipped] bandit not installed`)
- `semgrep`: nicht ausgeführt (`[skipped] semgrep not installed`)
- `pip-audit` / `npm audit`: keine Ergebnisse übermittelt

Die Abwesenheit von Scanner-Ergebnissen ist **kein** Beleg für Abwesenheit von Schwachstellen. Die folgende Bewertung stützt sich auf die sichtbare Codebasis.

### Kernbereiche im Überblick
- **Secrets:** Kein produktiv genutztes hartcodiertes Secret sichtbar. `JWT_SECRET` wird ausschließlich aus der Umgebung gelesen und muss mindestens 32 Zeichen lang sein. Die in Testdateien enthaltenen Test-Secrets sind unkritisch.
- **Injection/Inputs:** Datenbankzugriffe nutzen SQLAlchemy mit parametrisierten Queries; keine SQL-Injection erkennbar. Dateinamen werden serverseitig als UUID generiert; keine Path-Traversal-Lücke durch Benutzereingaben. Bild-Upload wird über Pillow validiert, EXIF/GPS werden durch Re-Encoding entfernt.
- **AuthN/AuthZ:** Passwort-Hashing per PBKDF2 mit 260.000 Iterationen, JWT mit Ablaufzeit, konsistente Besitzprüfungen bei Kleidungsstücken und Outfits.
- **Dependencies:** Nicht bewertbar, da die Dependency-Scanner fehlen.
- **Configuration/Transport:** CORS mit expliziten Origins und `allow_credentials=true` ohne Wildcard; Security-Header vorhanden. HSTS ist standardmäßig deaktiviert.

---

## Findings

### 1. Upload-Größenprüfung ist durch fehlenden/ungültigen `Content-Length`-Header umgehbar
- **Schweregrad:** Mittel
- **Betroffene Stelle:** `backend/app/routers/wardrobe.py`, `create_item`
- **Beschreibung:**  
  Der Endpunkt prüft das 5-MB-Limit nur, wenn der HTTP-Header `Content-Length` vorhanden ist. Fehlt er oder ist er ungültig, wird `content_length` auf `0` gesetzt bzw. `None` bleibt unbehandelt. Anschließend wird `await request.form(...)` aufgerufen, das den gesamten Multipart-Body parst und große Dateien temporär speichert, bevor die eigentliche Begrenzung durch `await image.read(MAX_UPLOAD_BYTES + 1)` greift. Ein authentifizierter Angreifer kann so per HTTP-Chunked-Transfer oder durch Weglassen des Headers beliebig große Uploads anstoßen und die Festplatte bzw. den Arbeitsspeicher belasten (DoS).
- **Fix:**  
  Vor `request.form(...)` den `Content-Length`-Header strikt prüfen:
  - Fehlt der Header oder ist er nicht als positive Ganzzahl parsebar → `411 Length Required` bzw. `400 Bad Request`.
  - Ist er größer als `MAX_UPLOAD_BYTES` → sofort `413 Content Too Large`.
  - Zusätzlich die bestehende Begrenzung durch `image.read(MAX_UPLOAD_BYTES + 1)` beibehalten.  
  Optional zusätzlich ein globales Request-Body-Limit auf ASGI-/Reverse-Proxy-Ebene (z. B. `client_max_body_size` bei nginx, `limit_concurrency`/Body-Limit bei uvicorn) erzwingen.
- **Auswirkung auf die Funktion:**  
  Browser senden bei `multipart/form-data`-Uploads regulär einen `Content-Length`-Header. Der Upload bleibt damit für normale Clients voll funktionsfähig; nur absichtlich manipulierte Anfragen ohne Header werden abgelehnt.

---

### 2. TLS/HSTS ist standardmäßig nicht aktiv
- **Schweregrad:** Mittel
- **Betroffene Stelle:** `backend/app/main.py`, `_https_enforced`
- **Beschreibung:**  
  `Strict-Transport-Security` wird nur gesetzt, wenn die Umgebungsvariable `HTTPS_ENFORCED` explizit auf `true`/`1`/`yes` steht. Standardmäßig fehlt der HSTS-Header. Da die API JWT-Tokens per Bearer-Header überträgt, sollte die Transportverschlüsselung im Produktivbetrieb verbindlich erzwungen werden. Ein reines Opt-in birgt das Risiko, dass ein Deployment ohne die Variable auskommt und sensible Daten unverschlüsselt übertragen werden.
- **Fix:**  
  Im Produktiv-Deployment `HTTPS_ENFORCED=true` verbindlich setzen und die Auslieferung nur über TLS konfigurieren. Zusätzlich auf Reverse-Proxy-Ebene einen HTTP-zu-HTTPS-Redirect einrichten. Falls ein Entwicklungsumfeld ohne TLS unterstützt werden soll, den Standard weiterhin deaktiviert lassen, aber in der Deployment-Dokumentation als Pflicht für Produktion kennzeichnen.
- **Auswirkung auf die Funktion:**  
  Keine Einschränkung für die App selbst, solange das Produktiv-Deployment TLS nutzt. Entwicklungsinstanzen bleiben ohne HSTS nutzbar.

---

### 3. Login erlaubt Benutzernamens-Enumeration über unterschiedliche Antwortzeiten
- **Schweregrad:** Niedrig
- **Betroffene Stelle:** `backend/app/routers/auth.py`, `login`
- **Beschreibung:**  
  Existiert der Benutzername nicht, antwortet der Login sofort mit `401`. Existiert er, wird zusätzlich die rechenintensive PBKDF2-Prüfung ausgeführt. Dadurch kann ein Angreifer anhand der Antwortzeit existierende Benutzernamen erkennen. Das Rate-Limiting begrenzt die Angriffsgeschwindigkeit, beseitigt aber die Schwachstelle nicht.
- **Fix:**  
  Für nicht existierende Benutzer eine konstante Dummy-PBKDF2-Verifikation durchführen, z. B. einen vorberechneten Dummy-Hash in `security.py` ablegen und bei `user is None` `verify_password(body.password, DUMMY_PASSWORD_HASH)` aufrufen. Alternativ für beide Fälle die gleiche Verifikationsroutine durchlaufen und erst danach entscheiden.
- **Auswirkung auf die Funktion:**  
  Der Login bleibt funktionsfähig; die Antwortzeit für unbekannte Benutzer verlängert sich geringfügig, was unter dem bestehenden Rate-Limiting unproblematisch ist.

---

### 4. JWT-Token werden im localStorage gespeichert
- **Schweregrad:** Niedrig
- **Betroffene Stelle:** `frontend/src/api/auth.js`, `frontend/src/api/client.js`
- **Beschreibung:**  
  Der Bearer-Token wird unter dem Schlüssel `token` im `localStorage` abgelegt. Das ist anfällig für Token-Diebstahl durch XSS. Zwar verhindern React-Escaping und die gesetzte CSP `script-src 'self'` erkennbare XSS-Vektoren, grundsätzlich gilt die Speicherung in einem für JavaScript zugänglichen Speicher jedoch als riskanter als ein `HttpOnly`-Cookie.
- **Fix:**  
  Mittelfristig auf `HttpOnly`, `Secure` und `SameSite=Strict` gesetzte Cookies oder auf eine Token-Verwaltung ausschließlich im Speicher mit Refresh-Rotation umstellen. Falls der localStorage-Ansatz beibehalten wird, den CSP strikt halten und regelmäßige XSS-Tests durchführen.
- **Auswirkung auf die Funktion:**  
  Eine Umstellung auf Cookies erfordert Backend-Änderungen und eine Anpassung der Authentifizierungslogik, kann aber schrittweise erfolgen.

---

### 5. Fehlende Längenbegrenzungen für Benutzereingaben
- **Schweregrad:** Niedrig
- **Betroffene Stelle:** `backend/app/schemas.py`, `backend/app/models.py`
- **Beschreibung:**  
  `UserCreate.username`, `UserCreate.email`, `UserCreate.password`, `OutfitCreate.name` und der Name von Kleidungsstücken besitzen keine Maximal-Längen. Sehr große Eingaben können zu übermäßigem Speicherverbrauch beim Hashing bzw. zu unverhältnismäßig großen Datenbankeinträgen führen.
- **Fix:**  
  In den Pydantic-Schemas `Field(..., max_length=...)` verwenden, z. B.:
  - `username`: max. 64 Zeichen
  - `email`: max. 254 Zeichen
  - `password`: max. 128 Zeichen
  - `name` (Kleidungsstück/Outfit): max. 200 Zeichen  
  Zusätzlich in den SQLAlchemy-Modellen `String(length=N)` setzen, um die DB-Ebene abzusichern.
- **Auswirkung auf die Funktion:**  
  Normale Nutzer bleiben von den Limits unberührt; unüblich lange Eingaben werden mit `422` zurückgewiesen.

---

### 6. CORS erlaubt pauschal alle Methoden und Header
- **Schweregrad:** Niedrig
- **Betroffene Stelle:** `backend/app/main.py`, `CORSMiddleware`
- **Beschreibung:**  
  `allow_methods=["*"]` und `allow_headers=["*"]` sind in Kombination mit `allow_credentials=True` und expliziten Origins nicht unmittelbar ausnutzbar, da die Origins geprüft werden. Dennoch ist es Sicherheits-Härtung, nur die tatsächlich benötigten Methoden und Header zuzulassen.
- **Fix:**  
  `allow_methods=["GET", "POST", "DELETE"]` und `allow_headers=["Authorization", "Content-Type"]` setzen. Die Anwendung nutzt derzeit kein `PUT`; `Content-Type` wird für JSON und `multipart/form-data` benötigt.
- **Auswirkung auf die Funktion:**  
  Die vorhandenen Frontend-Aufrufe (`GET`, `POST`, `DELETE`, JSON-/FormData-Bodies) funktionieren weiterhin.

---

## Zusammenfassung
Die Anwendung zeigt eine durchdachte Basisabsicherung: Besitzprüfungen, serverseitige Dateinamensgenerierung, EXIF-Entfernung, PBKDF2-Hashing, JWT-Ablauf, explizite CORS-Origins und grundlegende Security-Header sind vorhanden. Es wurden keine kritischen oder unmittelbar ausnutzbaren Hochrisiko-Schwachstellen sichtbar. Die aufgeführten Punkte betreffen überwiegend Härtung und Konfigurationsverbindlichkeit; insbesondere der Upload-Größencheck sollte vor einem Produktivgang korrigiert werden.