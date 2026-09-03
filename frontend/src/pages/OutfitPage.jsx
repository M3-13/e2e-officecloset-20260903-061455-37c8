import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client, { getToken } from "../api/client.js";
import { listOutfits, createOutfit, deleteOutfit } from "../api/outfits.js";
import AuthImage from "../components/AuthImage.jsx";

const CATEGORY_LABELS = {
  Oberteil: "Oberteil",
  Hose: "Hose",
  Kleid: "Kleid",
  Schuhe: "Schuhe",
  Accessoire: "Accessoire",
};

const styles = `
.outfit-creator { display: flex; flex-direction: column; gap: var(--space-4); }
.outfit-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}
@media (min-width: 1024px) {
  .outfit-layout { grid-template-columns: 1fr 1fr; align-items: start; }
}
.outfit-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}
.outfit-panel h2 {
  font-size: var(--size-lg);
  margin: 0 0 var(--space-3);
}
.outfit-form { display: flex; flex-direction: column; gap: var(--space-3); }
.outfit-input {
  width: 100%;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  min-height: 44px;
  color: var(--color-fg);
  font-family: var(--font-family);
  font-size: var(--size-md);
}
.outfit-input::placeholder { color: var(--color-muted); }
.outfit-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(201, 162, 75, 0.25);
}
.outfit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-3);
}
.outfit-item {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  cursor: pointer;
  transition: border-color 150ms ease, transform 150ms ease;
}
.outfit-item:hover { border-color: var(--color-accent); transform: translateY(-2px); }
.outfit-item.selected {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(201, 162, 75, 0.35);
}
.outfit-item-thumb {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--color-surface_alt);
  display: block;
}
.outfit-item-body { padding-top: var(--space-2); }
.outfit-item-name { font-size: var(--size-sm); font-weight: 600; margin: 0; }
.outfit-item-category {
  display: inline-block;
  margin-top: var(--space-1);
  background: var(--color-surface_alt);
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  border-radius: var(--radius-pill);
  padding: 4px 12px;
  font-size: var(--size-xs);
  letter-spacing: 0.04em;
}
.outfit-item.selected .outfit-item-category {
  background: rgba(122, 31, 43, 0.35);
  border-color: var(--color-burgundy);
  color: var(--color-fg);
}
.outfit-item-check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  color: #151012;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--size-sm);
}
.outfit-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
.outfit-preview-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.outfit-preview-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-surface_alt);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-2);
}
.outfit-preview-row img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}
.outfit-preview-row span { font-size: var(--size-sm); }
.outfit-saved { display: flex; flex-direction: column; gap: var(--space-3); }
.outfit-saved h2 {
  font-size: var(--size-lg);
  margin: var(--space-4) 0 var(--space-2);
}
.outfit-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}
.outfit-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.outfit-card-head h3 { margin: 0; font-size: var(--size-md); }
.outfit-card-items { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.outfit-card-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  background: var(--color-surface_alt);
  border-radius: var(--radius-sm);
  padding: var(--space-1);
}
.outfit-card-item img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}
.outfit-card-item span { font-size: var(--size-xs); }
.outfit-empty {
  text-align: center;
  color: var(--color-muted);
  padding: var(--space-6) var(--space-4);
}
.outfit-error {
  color: var(--color-danger);
  background: rgba(194, 74, 74, 0.12);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
}
`;

export default function OutfitPage() {
  const [items, setItems] = useState([]);
  const [outfits, setOutfits] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const signedIn = Boolean(getToken());

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [itemsData, outfitsData] = await Promise.all([
          client.get("/api/wardrobe/items"),
          listOutfits(),
        ]);
        if (!active) return;
        setItems(Array.isArray(itemsData?.items) ? itemsData.items : []);
        setOutfits(outfitsData);
      } catch (err) {
        if (!active) return;
        setError(err?.message ?? "Outfits konnten nicht geladen werden.");
      } finally {
        if (active) setLoading(false);
      }
    }

    if (signedIn) {
      load();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [signedIn]);

  const itemById = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      map.set(item.id, item);
    }
    return map;
  }, [items]);

  const selectedItems = useMemo(
    () => selectedIds.map((id) => itemById.get(id)).filter(Boolean),
    [selectedIds, itemById],
  );

  function toggleItem(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!name.trim() || selectedIds.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      const created = await createOutfit(name.trim(), selectedIds);
      setOutfits((prev) => [...prev, created]);
      setName("");
      setSelectedIds([]);
    } catch (err) {
      setError(err?.message ?? "Das Outfit konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(outfitId) {
    setError(null);
    try {
      await deleteOutfit(outfitId);
      setOutfits((prev) => prev.filter((o) => o.id !== outfitId));
    } catch (err) {
      setError(err?.message ?? "Das Outfit konnte nicht gelöscht werden.");
    }
  }

  return (
    <section className="page">
      <style>{styles}</style>
      <h1>Outfit-Creator</h1>
      <p className="muted">
        Kombinieren Sie mehrere Kleidungsstücke aus Ihrer Garderobe zu einem
        benannten Outfit.
      </p>

      {!signedIn ? (
        <div className="outfit-empty">
          <p>Bitte melden Sie sich an, um Outfits zu erstellen.</p>
          <Link to="/login" className="btn btn-primary">
            Anmelden
          </Link>
        </div>
      ) : (
        <div className="outfit-creator">
          {error && <div className="outfit-error">{error}</div>}

          <div className="outfit-layout">
            <div className="outfit-panel">
              <h2>Auswahl</h2>
              <form className="outfit-form" onSubmit={handleSave}>
                <label className="muted" htmlFor="outfit-name">
                  Name des Outfits
                </label>
                <input
                  id="outfit-name"
                  className="outfit-input"
                  type="text"
                  value={name}
                  placeholder="z. B. Gala-Abend"
                  onChange={(event) => setName(event.target.value)}
                />

                {loading ? (
                  <p className="muted">Garderobe wird geladen …</p>
                ) : items.length === 0 ? (
                  <div className="outfit-empty">
                    <p>
                      Ihre Garderobe ist leer. Legen Sie zuerst Kleidungsstücke
                      an.
                    </p>
                  </div>
                ) : (
                  <div className="outfit-grid">
                    {items.map((item) => {
                      const selected = selectedIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          aria-pressed={selected}
                          className={`outfit-item${selected ? " selected" : ""}`}
                          onClick={() => toggleItem(item.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              toggleItem(item.id);
                            }
                          }}
                        >
                          {selected && (
                            <span className="outfit-item-check">✓</span>
                          )}
                          <AuthImage
                            item={item}
                            className="outfit-item-thumb"
                            alt={item.name}
                            fallback={<div className="outfit-item-thumb" />}
                          />
                          <div className="outfit-item-body">
                            <p className="outfit-item-name">{item.name}</p>
                            <span className="outfit-item-category">
                              {CATEGORY_LABELS[item.category] ?? item.category}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="outfit-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      saving || !name.trim() || selectedIds.length === 0
                    }
                  >
                    {saving ? "Speichern …" : "Outfit speichern"}
                  </button>
                </div>
              </form>
            </div>

            <div className="outfit-panel">
              <h2>Vorschau</h2>
              {selectedItems.length === 0 ? (
                <p className="muted">
                  Wählen Sie links Kleidungsstücke aus, um Ihr Outfit zu
                  sehen.
                </p>
              ) : (
                <div className="outfit-preview-list">
                  {selectedItems.map((item) => (
                    <div className="outfit-preview-row" key={item.id}>
                      <AuthImage item={item} alt={item.name} fallback={<span />} />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="outfit-saved">
            <h2>Gespeicherte Outfits</h2>
            {loading ? (
              <p className="muted">Outfits werden geladen …</p>
            ) : outfits.length === 0 ? (
              <div className="outfit-empty">
                <p>
                  Noch keine Outfits gespeichert. Erstellen Sie Ihr erstes
                  Outfit.
                </p>
              </div>
            ) : (
              outfits.map((outfit) => {
                const outfitItems = (outfit.item_ids ?? [])
                  .map((id) => itemById.get(id))
                  .filter(Boolean);
                return (
                  <div className="outfit-card" key={outfit.id}>
                    <div className="outfit-card-head">
                      <h3>{outfit.name}</h3>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleDelete(outfit.id)}
                      >
                        Löschen
                      </button>
                    </div>
                    <div className="outfit-card-items">
                      {outfitItems.length === 0 ? (
                        <span className="muted">Keine Items</span>
                      ) : (
                        outfitItems.map((item) => (
                          <div className="outfit-card-item" key={item.id}>
                            <AuthImage item={item} alt={item.name} fallback={<span />} />
                            <span>{item.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </section>
  );
}
