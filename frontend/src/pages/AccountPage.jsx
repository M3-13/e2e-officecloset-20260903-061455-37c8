import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken } from "../api/client.js";
import { deleteAccount, getAccount, getAccountData } from "../api/account.js";

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
.account-actions {
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

function focusableElements(root) {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
  return Array.from(root.querySelectorAll(selector));
}

function trapFocus(event, root) {
  if (event.key !== "Tab") return;
  const focusable = focusableElements(root);
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export default function AccountPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const signedIn = Boolean(getToken());

  const deleteTriggerRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const modalRef = useRef(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!signedIn) {
      return undefined;
    }
    let cancelled = false;
    getAccount()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setProfileError(
            err?.message ?? "Die Kontodaten konnten nicht geladen werden.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  useEffect(() => {
    if (confirmOpen) {
      wasOpenRef.current = true;
      cancelButtonRef.current?.focus();
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      deleteTriggerRef.current?.focus();
    }
  }, [confirmOpen]);

  useEffect(() => {
    if (!confirmOpen) {
      return undefined;
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!deleting) setConfirmOpen(false);
      } else {
        trapFocus(event, modalRef.current);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen, deleting]);

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

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const data = await getAccountData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "konto-daten.json";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      setExportError(err?.message ?? "Der Export konnte nicht erstellt werden.");
    } finally {
      setExporting(false);
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
            <h2>Profil</h2>
            {profileError ? (
              <p className="account-error" role="alert">
                {profileError}
              </p>
            ) : profile ? (
              <>
                <p className="account-row">
                  <span className="muted">Benutzername</span>
                  <br />
                  {profile.username}
                </p>
                <p className="account-row">
                  <span className="muted">E-Mail</span>
                  <br />
                  {profile.email}
                </p>
              </>
            ) : (
              <p className="muted">Kontodaten werden geladen …</p>
            )}
          </div>

          <div className="account-card">
            <h2>Daten exportieren</h2>
            <p className="muted">
              Laden Sie Ihr Profil samt aller Kleidungsstücke und Outfits als
              JSON-Datei herunter.
            </p>
            {exportError && (
              <div className="account-error" role="alert">
                {exportError}
              </div>
            )}
            <div className="account-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={exporting}
                onClick={handleExport}
              >
                {exporting ? "Exportiere …" : "Daten exportieren"}
              </button>
            </div>
          </div>

          <div className="account-card">
            <h2>Konto löschen</h2>
            <p className="muted">
              Das Löschen Ihres Kontos entfernt unwiderruflich alle
              Garderoben-, Kleidungsstück- und Outfit-Daten sowie Ihre Bilder.
            </p>
            <div className="account-actions">
              <button
                ref={deleteTriggerRef}
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
            ref={modalRef}
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
                ref={cancelButtonRef}
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
