VERDICT: BLOCKED

# Konformitätsprüfung „Glamouröser Kleiderschrank-Manager“ (gemergter Sprint-Stand)

Ich bewerte ausschließlich den hier sichtbaren Code bzw. die sichtbaren Inhalte. Nicht angezeigte Dateien wie `README.md`, `DESIGN.md` oder `RUN.json` behandle ich als „nicht nachgewiesen“, nicht als vorhanden konform.

**Zentraler Befund:** Hochgeladene Bilddateien werden über `backend/app/main.py` als öffentlicher statischer Mount ausgeliefert. Jede Person, die eine `image_url` kennt oder erlangt, kann fremde Garderobenfotos ohne Authentifizierung abrufen. Das ist ein klarer Datenschutzverstoß (Verstoß gegen Vertraulichkeit nach Art. 5 Abs. 1 lit. f DSGVO) und konterkariert AC-07. Daher ist der Sprint nicht releasefähig.

---

## 1. DSGVO / Datenschutz

### Kritisch: Ungeschützte, nicht authentifizierte Bildauslieferung
- **Datei:** `backend/app/main.py`
  ```python
  app.mount("/uploads", StaticFiles(directory=str(settings.upload_dir)), name="uploads")
  ```
- **Problem:** Die hochgeladenen Bilder werden über `/uploads/<uuid>` ohne Authentifizierung und ohne Prüfung der Eigentümerschaft öffentlich ausgeliefert. Die Dateinamen sind UUIDs, aber Sicherheit durch Unvorhersagbarkeit genügt nicht. Bilddateien sind hier personenbezogen (Stil, Besitz, möglicherweise abgebildete Personen). Der Zugriff erfolgt unkontrolliert; AC-07 wird für Bildinhalte gebrochen.
- **Abhilfe (zwingend vor Release):** Den statischen Mount entfernen. Stattdessen einen authentifizierten Endpunkt schaffen, z. B. `GET /api/wardrobe/items/{item_id}/image` oder `GET /uploads/{filename}` mit `Depends(get_current_user)`. In der Route den Dateinamen per `Path(...).name` extrahieren, den zugehörigen `ClothingItem` laden, `item.owner_id == user.id` prüfen (sonst 403/404) und dann `FileResponse` zurückgeben. Das Frontend muss die Bild-URLs entsprechend anpassen. Erst danach ist die Auslieferung DSGVO-konform.

### Hoch: Behauptung verschlüsselter Übertragung ohne erzwingende Maßnahmen
- **Datei:** `frontend/src/pages/PrivacyPage.jsx`
- **Problem:** Die Datenschutzerklärung erklärt: „Dazu gehören die verschlüsselte Übertragung …“. Im sichtbaren Code ist jedoch keine TLS-/HSTS-Erzwingung vorhanden. Läuft uvicorn ohne TLS und ohne Reverse-Proxy-TLS, ist die Angabe unzutreffend.
- **Abhilfe:** In `backend/app/main.py` eine Security-Header-Middleware ergänzen, die `Strict-Transport-Security`, `X-Content-Type-Options`, `Content-Security-Policy`, `X-Frame-Options` und `Referrer-Policy` setzt. Im Deployment TLS-Terminierung am Reverse Proxy verpflichtend dokumentieren. Alternativ den Datenschutztext an die tatsächliche Bereitstellung anpassen. Konkreter Middleware-Vorschlag:
  ```python
  @app.middleware("http")
  async def security_headers(request, call_next):
      response = await call_next(request)
      response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
      response.headers["X-Content-Type-Options"] = "nosniff"
      response.headers["X-Frame-Options"] = "DENY"
      response.headers["Referrer-Policy"] = "no-referrer"
      response.headers["Content-Security-Policy"] = (
          "default-src 'self'; "
          "script-src 'self'; "
          "style-src 'self' 'unsafe-inline'; "
          "img-src 'self' data: blob:; "
          "connect-src 'self'; "
          "frame-ancestors 'none'; "
          "base-uri 'self'; "
          "form-action 'self'"
      )
      return response
  ```

### Hoch: JWT im `localStorage` ohne CSP-Absicherung
- **Dateien:** `frontend/src/api/client.js`, `frontend/src/api/auth.js`, `frontend/src/api/account.js`
- **Problem:** Das Zugriffstoken wird im `window.localStorage` gespeichert. Jede XSS-Lücke kann den Token lesen und an Dritte senden. Ein CSP fehlt, wodurch die Auswirkung eines möglichen XSS nicht begrenzt wird.
- **Abhilfe:** Token idealerweise in ein `HttpOnly`-, `Secure`-, `SameSite=Strict`-Cookie verschieben, das das Backend setzt; dann CSRF-Schutz implementieren. Als Mindestmaßnahme bis dahin: strikte CSP (siehe oben) und ein gründliches XSS-Review. Die Datenschutzerklärung muss die tatsächliche Token-Speicherung beschreiben.

### Mittel: Keine Self-Service-Wege für Auskunft, Berichtigung und Datenübertragbarkeit
- **Dateien:** `backend/app/routers/account.py`, `frontend/src/pages/AccountPage.jsx`
- **Problem:** Die Datenschutzerklärung listet Betroffenenrechte (Art. 15, 16, 17, 18, 20, 21 DSGVO). Die Anwendung bietet ausschließlich die Konto-Löschung. Für Auskunft und Datenexport existiert kein Endpunkt; ein Betroffener müsste den Anbieter kontaktieren.
- **Abhilfe:** Mindestens `GET /api/account` (eigene Profildaten) und `GET /api/account/data` (JSON/CSV-Export aller Kleidungsstücke und Outfits) implementieren. Optional Berichtigungs-Endpunkt für E-Mail/Passwort. Die Kontaktwege im Impressum/Datenschutz sind weiterhin erforderlich, aber die Funktionalität sollte im Produkt verankert sein.

### Mittel: Löschung von Bilddateien ist nicht verlässlich
- **Dateien:** `backend/app/routers/account.py`, `backend/app/routers/wardrobe.py`, `backend/app/upload.py`
- **Problem:** `_delete_image_file()` in `account.py` fängt `OSError` und loggt nur. `delete_image_file()` in `upload.py` schluckt `OSError` ebenfalls. Der Nutzer sieht 204 und geht davon aus, dass alle Daten gelöscht wurden, obwohl Dateireste verbleiben können.
- **Abhilfe:** `delete_image_file()` soll einen Rückgabewert (`bool`) oder eine Exception liefern. Die Routen müssen den Fehler behandeln, z. B. mit `HTTPException(500, ...)` oder einem Warnhinweis. Bei der Konto-Löschung die Bilder vor dem `db.commit()` löschen bzw. bei Fehlern die DB-Operation nicht als vollständig erfolgreich melden.

### Mittel: Upload-Limit ist bei fehlendem/gefälschtem Content-Length nicht robust
- **Dateien:** `backend/app/routers/wardrobe.py`, `backend/app/upload.py`
- **Problem:** Nach `form = await request.form()` wird `data = await image.read()` ausgeführt und erst danach die Größe geprüft. Ist der `Content-Length`-Header falsch, fehlend oder Chunked Transfer im Spiel, wird der gesamte Body in den Speicher gelesen; dies ermöglicht Speicher-DoS und unterläuft AC-10.
- **Abhilfe:** Nicht die gesamte Datei mit `read()` laden. Stattdessen in Blöcken lesen und früh abbrechen, z. B.:
  ```python
  data = await image.read(MAX_UPLOAD_BYTES + 1)
  if len(data) > MAX_UPLOAD_BYTES: ...
  ```
  Zusätzlich `request.form(max_files=1, max_fields=3)` begrenzen und eine harte Body-Grenze im Deployment (Reverse Proxy) dokumentieren.

### Niedrig: Rate-Limit-Buckets speichern leere IP-Einträge dauerhaft
- **Datei:** `backend/app/routers/auth.py`
- **Problem:** `_rate_buckets` behält nach Ablauf des 60-Sekunden-Fensters leere `deque`-Einträge pro IP. Das ist ein gewisser, wenn auch kleiner, unnötiger Datenspeicher.
- **Abhilfe:** Nach dem Bereinigen:
  ```python
  if not window:
      del _rate_buckets[key]
  ```
  In der Datenschutzerklärung die IP-Aufbewahrung präzisieren (z. B. „IP-Adresse wird für 60 Sekunden im Arbeitsspeicher gehalten“).

### Niedrig: Keine Mindestlänge für `JWT_SECRET`
- **Datei:** `backend/app/config.py`
- **Problem:** Das Secret kann ein kurzer, schwacher Wert sein. Das schwächt die JWT-Signatur.
- **Abhilfe:** Im Property `jwt_secret` zusätzlich prüfen:
  ```python
  if len(secret) < 32:
      raise RuntimeError("JWT_SECRET muss mindestens 32 Zeichen lang sein.")
  ```

---

## 2. EU Cyber Resilience Act (CRA)

### Hoch/Mittel: Keine nachgewiesene SBOM und kein Schwachstellen-Scan
- **Datei:** `backend/requirements.txt`, `frontend/package.json`, `frontend/package-lock.json`
- **Problem:** Für ein Produkt mit digitalen Elementen ist eine SBOM erforderlich. Die Abhängigkeiten sind vorhanden, aber es ist kein SBOM-Artefakt sichtbar und keine Schwachstellenprüfung/Update-Policy nachgewiesen.
- **Abhilfe:** In der CI-Pipeline `pip-audit` und `npm audit --audit-level=high` ausführen. Eine `sbom.json` (z. B. CycloneDX/SPDX) aus beiden Abhängigkeitsquellen erzeugen und im Repo versionieren. Die Aktualisierungsfähigkeit und Schwachstellenmeldung in `SECURITY.md` bzw. `README.md` beschreiben.

### Mittel: Fehlende Sicherheitsdokumentation
- **Dateien:** `README.md`, `DESIGN.md`, `SECURITY.md` (noch nicht sichtbar)
- **Problem:** Sicherheitsannahmen, Update-/Patch-Verfahren und Meldeweg für Schwachstellen sind nicht nachgewiesen.
- **Abhilfe:** Eine `SECURITY.md` mit Meldekanal und unterstützter Support-Frist anlegen. In `README.md` einen Abschnitt „Sicherheit“ ergänzen: Authentifizierungsmodell, Datenfluss, TLS-Anforderung, Patch-Prozess.

### Mittel: Security by default nicht vollständig
- **Datei:** `backend/app/main.py`
- **Problem:** Es fehlen die Security-Header (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy). Das widerspricht der CRA-Anforderung „Sicherheit durch Entwurf und Standard“.
- **Abhilfe:** Siehe DSGVO-Maßnahme zu Security-Header. Die vorgeschlagene CSP‑Middleware muss `img-src 'self' data: blob:` und `connect-src 'self'` enthalten, damit die Garderobenfotos und API-Aufrufe der eigenen App weiterhin funktionieren.

### Niedrig: Decompression-Bomb-DoS bei Bildverarbeitung
- **Datei:** `backend/app/upload.py`
- **Problem:** `Image.open(io.BytesIO(data))` erfolgt ohne Begrenzung auf `Image.MAX_IMAGE_PIXELS`. Trotz 5-MB-Dateigröße kann ein kleines, hochkomprimiertes Bild extreme Pixelanzahlen beanspruchen.
- **Abhilfe:** Vor dem Öffnen `Image.MAX_IMAGE_PIXELS = 25_000_000` setzen oder die Pixelanzahl nach dem Öffnen prüfen. Zusätzlich verarbeitete Bildmodi/Formate weiter kontrollieren.

### Niedrig: Unbegrenzte Rate-Limit-Datenstruktur
- **Datei:** `backend/app/routers/auth.py`
- **Problem:** `_rate_buckets` hat keine Maximalgröße. Viele unterschiedliche IPs können die Struktur unbegrenzt wachsen lassen.
- **Abhilfe:** Eine Maximalgröße einführen (z. B. LRU-Dictionary) oder inaktive Einträge regelmäßig entfernen. Die Datenminimierung nach DSGVO wird dadurch ebenfalls verbessert.

---

## 3. EU AI Act

- **Befund:** Keine KI-Funktion sichtbar. Es handelt sich um eine klassische CRUD-/Auth-Anwendung.
- **Konsequenz:** Der EU AI Act ist nicht einschlägig. Keine Maßnahmen erforderlich.

---

## 4. Pflichttexte und UI

### Hoch/Mittel: Impressum enthält offensichtliche Platzhalterdaten
- **Datei:** `frontend/src/pages/ImprintPage.jsx`
- **Problem:** „Musterstraße 1“, „12345 Musterstadt“, „kontakt@glamour-closet.example“ sind offenkundig unzureichend und erfüllen die Anforderungen an ein Impressum nach § 5 DDG nicht. Das ist vor Marktstart ein klarer Verstoß.
- **Abhilfe:** Echte ladungsfähige Anschrift, Rechtsform und erreichbare Kontaktdaten eintragen. Keine Demo-Daten im finalen Produkt verwenden.

### Niedrig: Keine Nutzungsbedingungen/AGB
- **Datei:** `frontend/src/App.jsx`, `frontend/src/components/Navbar.jsx`
- **Problem:** Für einen registrierungspflichtigen Online-Dienst sind AGB dringend zu empfehlen, auch wenn nicht in allen Fällen gesetzlich zwingend.
- **Abhilfe:** Eine `/terms`-Seite mit Nutzungsbedingungen ergänzen, in Footer und Navigation verlinken.

### Niedrig: Datenschutzerklärung beschreibt Token-Speicherung nicht
- **Datei:** `frontend/src/pages/PrivacyPage.jsx`
- **Problem:** Das Zugriffstoken wird im `localStorage` gespeichert; die Datenschutzerklärung erwähnt dies nicht ausdrücklich.
- **Abhilfe:** Im Abschnitt „Welche Daten wir verarbeiten“ einen Punkt zur lokalen Speicherung des Zugriffstokens im Browser (`localStorage`) ergänzen, bis auf die Cookie-Variante umgestellt wird. Die Beschreibung muss sich automatisch mit der technischen Umsetzung decken.

### Niedrig: Datenschutzerklärung erwähnt „verschlüsselte Übertragung“
- **Datei:** `frontend/src/pages/PrivacyPage.jsx`
- **Problem:** Der Text behauptet TLS-Verschlüsselung, doch der sichtbare Backend-Code erzwingt kein HTTPS.
- **Abhilfe:** Entweder TLS im Deployment verpflichtend umsetzen und dokumentieren oder den Text präzisieren.

---

## 5. Barrierefreiheit (WCAG/BITV/EAA)

### Mittel: AccountPage-Modal ohne Fokusmanagement
- **Datei:** `frontend/src/pages/AccountPage.jsx`
- **Problem:** Dialog hat zwar `role="dialog"`, `aria-modal="true"` und `aria-labelledby`, aber keinen initialen Fokus, keinen Fokus-Trap, keine Escape-Bedienung und keine Fokus-Rückkehr zum auslösenden Button.
- **Abhilfe:** Mit `useRef` den Abbrechen-Button fokussieren, einen `useEffect`-Escape-Listener (`Escape` schließt), Fokus einfangen und beim Schließen auf den Auslöser zurücksetzen. Beispiel:
  ```jsx
  const cancelRef = useRef(null);
  useEffect(() => {
    if (confirmOpen) cancelRef.current?.focus();
  }, [confirmOpen]);
  ```

### Mittel: Navbar-Toggle-`aria-label` ist statisch
- **Datei:** `frontend/src/components/Navbar.jsx`
- **Problem:** `aria-label="Menü öffnen"` bleibt auch bei geöffnetem Menü bestehen.
- **Abhilfe:** `aria-label={open ? "Menü schließen" : "Menü öffnen"}`.

### Niedrig: Filter-Buttons ohne Zustands-Semantik
- **Datei:** `frontend/src/pages/WardrobePage.jsx`
- **Problem:** Die aktiven Filter werden nur farblich markiert. Screenreader können den aktiven Zustand nicht erkennen.
- **Abhilfe:** `aria-pressed` ergänzen:
  ```jsx
  aria-pressed={filter === c}
  ```
  für die Kategorie-Buttons und `aria-pressed={filter === ""}` für „Alle“.

### Niedrig: Bild-Fallback entfernt Ersatztext für Screenreader
- **Datei:** `frontend/src/pages/WardrobePage.jsx`
- **Problem:** Der Fallback `CardImage` hat `aria-hidden="true"`. Sobald ein Bild nicht lädt, erhalten Screenreader keine Ersatzbeschreibung.
- **Abhilfe:** Das Fallback-Element mit `role="img"` und `aria-label={item.name}` versehen oder `aria-hidden` entfernen, damit der Kategorie-Text zugänglich bleibt.

### Niedrig: Overlay-Klick nur per Maus
- **Datei:** `frontend/src/pages/AccountPage.jsx`
- **Problem:** Schließen durch Klick auf das Overlay ist nicht tastaturzugänglich. Da ein Abbrechen-Button existiert, ist das nur ein niedriges Risiko.
- **Abhilfe:** Optional `onKeyDown` auf dem Overlay ergänzen oder die Schließfunktion ausschließlich über die sichtbaren Buttons anbieten.

---

## Abstimmung von Schutzmaßnahmen mit dem Produktbetrieb

- Die empfohlene CSP erlaubt `img-src 'self' data: blob:` und `connect-src 'self'`. Damit bleiben Bildladen über die eigene API, Blob-/Daten-URLs und alle API-Aufrufe der SPA möglich.
- Eine authentifizierte Bildroute ersetzt den statischen `/uploads`-Mount. Das Frontend muss die `image_url`-Werte von `/uploads/...` auf die neue, geschützte API-URL umstellen. Der Vite-Proxy in `frontend/vite.config.js` kann `/uploads` weiterhin auf den Backend-Server zeigen, bis die Umstellung vollzogen ist; die Auslieferung selbst muss serverseitig geschützt werden.
- Die empfohlenen Sicherheits-Header schränken keine legitime eigene Ressource ein; `style-src 'unsafe-inline'` bleibt erhalten, da die SPA inline `<style>`-Blöcke verwendet. Sollte auf Inline-Styles verzichtet werden, kann `unsafe-inline` später entfernt werden.

---

## Ergebnis

**Mindestens der öffentliche, ungeschützte Bildzugriff ist ein klarer Verstoß gegen die DSGVO und verhindert Approval.** Erst nach Umsetzung des authentifizierten Bildabrufs und der beschriebenen Sicherheitsmaßnahmen kann der Sprint erneut bewertet werden.