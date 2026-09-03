import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken } from "../api/client.js";
import { deleteAccount } from "../api/account.js";

function decodeUserId(token) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

const styles = `
.account-section { display: flex; flex-direction: column; gap: var(--space-4); }
.account-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}
.account-card h2 {
  font-size: var(--size-lg);
  margin: 0 0 var(--space-2);
}
.account-row { margin: 0 0 var(--space-1); }
.account-row .muted { font-size: var(--size-sm); }
.account-danger-zone {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.account-error {
  color: var(--color-danger);
  background: rgba(194, 74, 74, 0.12);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
}
.account-empty {
  text-align: center;
  color: var(--color-muted);
  padding: var(--space-6) var(--space-4);
}
.account-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3);
  z-index: 100;
}
.account-modal {
  width: 100%;
  max-width: 520px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}
.account-modal h2 {
  color: var(--color-accent);
  font-size: var(--size-lg);
  margin: 0 0 var(--space-2);
}
.account-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
`;

export default function AccountPage() {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const signedIn = Boolean(getToken());
  const userId = decodeUserId(getToken());

  async function handleConfirmDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      navigate("/login");
    } catch (err) {
      setError(err?.message ?? "Das Konto konnte nicht gelöscht werden.");
      setDeleting(false);
    }
  }

  return (
    <section className="page">
      <style>{styles}</style>
      <h1>Konto</h1>
      <p className="muted">Verwalten Sie hier Ihre Kontodaten.</p>

      {!signedIn ? (
        <div className="account-empty">
          <p>Bitte melden Sie sich an, um Ihr Konto zu verwalten.</p>
          <Link to="/login" className="btn btn-primary">
            Anmelden
          </Link>
        </div>
      ) : (
        <div className="account-section">
          {error && (
            <div className="account-error" role="alert">
              {error}
            </div>
          )}

          <div className="account-card">
            <h2>Angemeldet</h2>
            <p className="account-row">
              <span className="muted">
                {userId ? `Benutzer-ID: ${userId}` : "Sie sind angemeldet."}
              </span>
            </p>
          </div>

          <div className="account-card">
            <h2>Konto löschen</h2>
            <p className="muted">
              Das Löschen Ihres Kontos entfernt unwiderruflich alle
              Garderoben-, Kleidungsstück- und Outfit-Daten sowie Ihre Bilder.
            </p>
            <div className="account-danger-zone">
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setConfirmOpen(true)}
              >
                Konto löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen ? (
        <div
          className="account-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          onClick={() => {
            if (!deleting) setConfirmOpen(false);
          }}
        >
          <div
            className="account-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-account-title">Konto wirklich löschen?</h2>
            <p className="muted">
              Diese Aktion kann nicht rückgängig gemacht werden. Alle Ihre
              Daten werden dauerhaft entfernt.
            </p>
            <div className="account-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={deleting}
                onClick={() => setConfirmOpen(false)}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleting}
                onClick={handleConfirmDelete}
              >
                {deleting ? "Löschen …" : "Endgültig löschen"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
