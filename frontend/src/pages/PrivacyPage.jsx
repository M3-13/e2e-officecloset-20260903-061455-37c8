export default function PrivacyPage() {
  return (
    <section className="page">
      <h1>Datenschutzerklärung</h1>
      <p className="muted">Stand: September 2026</p>

      <h2>1. Verantwortlicher</h2>
      <p>
        Verantwortlich für die Verarbeitung Ihrer personenbezogenen Daten im
        Sinne der Datenschutz-Grundverordnung (DSGVO) ist der Anbieter dieses
        Dienstes. Die vollständigen Kontaktdaten entnehmen Sie bitte dem{" "}
        Impressum.
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <p>
        Bei der Nutzung von Glamour Closet verarbeiten wir die folgenden
        personenbezogenen Daten:
      </p>
      <ul>
        <li>
          <strong>Kontodaten:</strong> Benutzername und E-Mail-Adresse, die Sie
          bei der Registrierung angeben, sowie Ihr Passwort in Form eines
          kryptografischen Hashs (das Klartext-Passwort wird nicht gespeichert).
        </li>
        <li>
          <strong>Garderobendaten:</strong> die von Ihnen angelegten
          Kleidungsstücke mit Name, Kategorie, Bild und Erstellungszeitpunkt.
        </li>
        <li>
          <strong>Outfit-Daten:</strong> die von Ihnen erstellten Outfits mit
          Name, zugeordneten Kleidungsstücken und Erstellungszeitpunkt.
        </li>
        <li>
          <strong>Technische Daten:</strong> bei jedem Zugriff übertragene,
          technisch notwendige Verbindungsdaten (z. B. IP-Adresse, Zeitpunkt
          des Zugriffs).
        </li>
        <li>
          <strong>Zugriffstoken:</strong> Nach der Anmeldung wird ein
          Zugriffstoken (JWT) im localStorage Ihres Browsers gespeichert, um
          Sie bei nachfolgenden Anfragen zu identifizieren.
        </li>
        <li>
          <strong>IP-Adresse:</strong> Zum Schutz vor Missbrauch wird Ihre
          IP-Adresse für das Rate-Limiting der Anmelde- und
          Registrierungs-Endpunkte für 60 Sekunden im Arbeitsspeicher des
          Servers gehalten.
        </li>
      </ul>

      <h2>3. Bild-Upload</h2>
      <p>
        Beim Hochladen eines Bildes für ein Kleidungsstück wird die Datei auf
        unserem Server gespeichert und mit Ihrem Benutzerkonto verknüpft. Wir
        akzeptieren ausschließlich Bilder in den Formaten JPEG, PNG und WebP
        mit einer maximalen Dateigröße von 5 MB.
      </p>
      <p>
        Vor der Speicherung werden in den Bilddateien eingebettete
        Metadaten – insbesondere EXIF- und GPS-Informationen – entfernt, damit
        keine Standort- oder Aufnahmedaten unbeabsichtigt gespeichert werden.
      </p>
      <p>
        Die von Ihnen hochgeladenen Bilder dienen ausschließlich der
        Darstellung Ihrer Garderobe innerhalb der Anwendung und werden nicht an
        Dritte weitergegeben. Mit der Löschung eines Kleidungsstücks oder Ihres
        Kontos werden auch die zugehörigen Bilddateien gelöscht.
      </p>

      <h2>4. Zwecke und Rechtsgrundlagen</h2>
      <p>Die Verarbeitung Ihrer Daten erfolgt zu folgenden Zwecken:</p>
      <ul>
        <li>
          Bereitstellung der Anwendung und Verwaltung Ihres Benutzerkontos
          (Art. 6 Abs. 1 lit. b DSGVO – Vertragserfüllung),
        </li>
        <li>
          Verwaltung Ihrer Garderobe und Ihrer Outfits einschließlich der
          Bildanzeige (Art. 6 Abs. 1 lit. b DSGVO),
        </li>
        <li>
          Gewährleistung der Sicherheit und Funktionsfähigkeit des Dienstes
          (Art. 6 Abs. 1 lit. f DSGVO – berechtigtes Interesse).
        </li>
      </ul>

      <h2>5. Speicherdauer</h2>
      <p>
        Ihre personenbezogenen Daten werden gespeichert, solange Ihr
        Benutzerkonto besteht. Bei Löschung Ihres Kontos werden Ihr
        Benutzerkonto, Ihre Kleidungsstücke, Ihre Outfits sowie die zugehörigen
        Bilddateien unwiderruflich gelöscht, sofern keine gesetzlichen
        Aufbewahrungspflichten entgegenstehen.
      </p>

      <h2>6. Weitergabe an Dritte</h2>
      <p>
        Eine Übermittlung Ihrer personenbezogenen Daten an Dritte erfolgt nur,
        wenn dies zur Erfüllung unserer vertraglichen oder gesetzlichen
        Pflichten erforderlich ist oder Sie ausdrücklich eingewilligt haben.
        Eine Weitergabe zu Werbezwecken findet nicht statt.
      </p>

      <h2>7. Ihre Rechte</h2>
      <p>
        Sie haben nach der DSGVO das Recht auf Auskunft (Art. 15), Berichtigung
        (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
        Datenübertragbarkeit (Art. 20) sowie Widerspruch (Art. 21). Außerdem
        steht Ihnen ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde
        zu.
      </p>
      <p>
        Ihr Konto können Sie jederzeit selbst über die Kontoseite der Anwendung
        löschen; dabei werden Ihre Daten und Bilddateien entfernt.
      </p>

      <h2>8. Datensicherheit</h2>
      <p>
        Wir setzen technische und organisatorische Maßnahmen ein, um Ihre Daten
        gegen Verlust, Manipulation und unbefugten Zugriff zu schützen. Dazu
        gehört die Speicherung von Passwörtern ausschließlich in gehashter
        Form.
      </p>
      <p>
        Eine verschlüsselte Übertragung (TLS) wird im produktiven Betrieb durch
        einen vorgeschalteten Reverse-Proxy am Deployment realisiert; der
        Anwendungsserver selbst erzwingt keine Transportverschlüsselung.
      </p>

      <h2>9. Kontakt</h2>
      <p>
        Bei Fragen zur Verarbeitung Ihrer personenbezogenen Daten oder zur
        Ausübung Ihrer Rechte wenden Sie sich bitte an die im Impressum
        genannte Kontaktadresse.
      </p>
    </section>
  );
}
