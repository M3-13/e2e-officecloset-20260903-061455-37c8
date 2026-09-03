VERDICT: BUGS_FOUND

Ich kann die beigefügten Screenshots nicht sehen und beurteile daher ausschließlich die textuellen Ergebnisse des Testberichts.

### Fehler 1

- **Titel:** Playwright-E2E-Tests laufen in das Rate-Limit (429) und scheitern beim Warten auf die Navigation zu `/wardrobe`
- **Symptom:** Drei E2E-Tests (`auth.spec.cjs` – Login, `outfits.spec.cjs` und `wardrobe.spec.cjs` – jeweils nach Registrierung) überschreiten die Zeitüberschreitung von 12 Sekunden, weil nach Klick auf „Anmelden“ bzw. „Registrieren“ keine Navigation zu `/wardrobe` erfolgt. Für den Benutzer des Test-CI ist die Kernfunktion „Registrieren/Anmelden und zur Garderobe gelangen“ in diesen Tests nicht verifiziert; visuell funktioniert die Anwendung laut Smoke zwar, aber die Playwright-Suite ist rot.
- **Repro:** Playwright-Tests ausführen; die Tests `auth.spec.cjs:34`, `outfits.spec.cjs:11` und `wardrobe.spec.cjs:11` senden mehr als fünf Auth-Anfragen aus demselben Client (127.0.0.1) innerhalb des Rate-Limit-Fensters und erhalten anschließend 429.
- **Evidence:**
  - Playwright-Ausgabe:
    ```
    1) e2e\auth.spec.cjs:34:1 › an existing user can log in and reach the wardrobe ───────────────────
       Test timeout of 12000ms exceeded.
       Error: page.waitForURL: Test timeout of 12000ms exceeded.
       waiting for navigation to "**/wardrobe" until "load"
       at C:\Users\Anwender\.cache\office-crew\worktrees\tester-gate\frontend\e2e\auth.spec.cjs:46:14
    ```
  - Companion-Backend-Log zeigt die Ursache:
    ```
    INFO:     127.0.0.1:60194 - "POST /api/auth/login HTTP/1.1" 429 Too Many Requests
    INFO:     127.0.0.1:60828 - "POST /api/auth/register HTTP/1.1" 429 Too Many Requests
    INFO:     127.0.0.1:57968 - "POST /api/auth/register HTTP/1.1" 429 Too Many Requests
    INFO:     127.0.0.1:64403 - "POST /api/auth/register HTTP/1.1" 429 Too Many Requests
    ```
- **Suspected file(s):** Gemeinsame Ursache: Die E2E-Tests verwenden denselben Client und können das Rate-Limit nicht zurücksetzen. Betroffen sind die Testfälle in `frontend/e2e/auth.spec.cjs`, `frontend/e2e/outfits.spec.cjs`, `frontend/e2e/wardrobe.spec.cjs` sowie der Helfer `frontend/e2e/helpers.cjs` (`registerViaUi`). Produktsseitig ist das Rate-Limit in `backend/app/routers/auth.py` zentral „schuld“, weil es für die E2E-Läufe nicht deaktivierbar/konfigurierbar ist. Kein einzelner Endpunktfehler: Die drei Fehlschläge teilen dieselbe Limitierungsursache.
- **Severity:** medium

Hinweis: Der einzelne `[net-fail] GET /api/wardrobe/items -> 401` im Smoke-Teil ist **kein** Produktfehler — er zeigt den erwarteten unauthentifizierten Zugriff vor der Session-Einrichtung und ist durch die anschließende Session-Etablierung (`[account-probe] session after sign-up + sign-in: ESTABLISHED`) aufgelöst.