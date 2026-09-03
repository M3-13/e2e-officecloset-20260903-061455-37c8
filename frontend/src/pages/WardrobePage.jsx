import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listItems, createItem, deleteItem } from "../api/wardrobe.js";
import { ApiError } from "../api/client.js";
import AuthImage from "../components/AuthImage.jsx";
import "./WardrobePage.css";

const CATEGORIES = ["Oberteil", "Hose", "Kleid", "Schuhe", "Accessoire"];

export default function WardrobePage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [name, setName] = useState("");
  const [uploadCategory, setUploadCategory] = useState(CATEGORIES[0]);
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  async function refresh(f) {
    setLoading(true);
    setError(null);
    try {
      const data = await listItems(f);
      setItems(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError({ unauthorized: true });
      } else {
        setError({
          message: err.message || "Die Garderobe konnte nicht geladen werden.",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh(filter);
  }, [filter]);

  async function handleUpload(event) {
    event.preventDefault();
    setUploadError(null);
    if (!name.trim()) {
      setUploadError({ message: "Bitte einen Namen angeben." });
      return;
    }
    if (!image) {
      setUploadError({ message: "Bitte ein Bild auswählen." });
      return;
    }
    setUploading(true);
    try {
      await createItem({ name: name.trim(), category: uploadCategory, image });
      setName("");
      setImage(null);
      setUploadCategory(CATEGORIES[0]);
      setFilter("");
      await refresh("");
    } catch (err) {
      setUploadError({
        message: err.message || "Das Hochladen ist fehlgeschlagen.",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(item) {
    setDeletingId(item.id);
    try {
      await deleteItem(item.id);
      await refresh(filter);
    } catch (err) {
      setError({
        message: err.message || "Das Löschen ist fehlgeschlagen.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  if (error && error.unauthorized) {
    return (
      <section className="page">
        <h1>Garderobe</h1>
        <div className="empty-state">
          <p>Bitte melden Sie sich an, um Ihre Garderobe zu sehen.</p>
          <Link to="/login" className="btn btn-primary">
            Anmelden
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <h1>Garderobe</h1>
      <p className="muted">Ihre Kleidungsstücke auf einen Blick.</p>

      <form className="upload-form" onSubmit={handleUpload}>
        <h2>Kleidungsstück hinzufügen</h2>
        <div className="upload-fields">
          <div className="field">
            <label htmlFor="item-name">Name</label>
            <input
              id="item-name"
              className="input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Schwarzes Kleid"
            />
          </div>
          <div className="field">
            <label htmlFor="item-category">Kategorie</label>
            <select
              id="item-category"
              className="input"
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="item-image">Bild</label>
            <input
              id="item-image"
              className="file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? "Wird hochgeladen …" : "Hochladen"}
          </button>
        </div>
        {uploadError && (
          <p className="form-error" role="alert">
            {uploadError.message}
          </p>
        )}
      </form>

      <div className="wardrobe-section">
        <h2>Meine Garderobe</h2>
        <div className="filter-tags" role="group" aria-label="Nach Kategorie filtern">
          <button
            type="button"
            className={filter === "" ? "tag tag-active" : "tag"}
            onClick={() => setFilter("")}
          >
            Alle
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={filter === c ? "tag tag-active" : "tag"}
              onClick={() => setFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error.message}
          </p>
        )}

        {loading ? (
          <p className="muted">Lade Garderobe …</p>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <p>
              {filter
                ? `Noch keine Kleidungsstücke in der Kategorie „${filter}“.`
                : "Noch keine Kleidungsstücke. Fügen Sie oben ein Kleidungsstück hinzu."}
            </p>
          </div>
        ) : (
          <div className="wardrobe-grid">
            {items.map((item) => (
              <article key={item.id} className="wardrobe-card">
                <AuthImage
                  item={item}
                  className="card-media"
                  alt={item.name}
                  fallback={
                    <div className="card-media card-media-fallback" aria-hidden="true">
                      <span>{item.category}</span>
                    </div>
                  }
                />
                <div className="card-body">
                  <div className="card-heading">
                    <h3 className="card-title">{item.name}</h3>
                    <span className="tag">{item.category}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger card-delete"
                    disabled={deletingId === item.id}
                    onClick={() => handleDelete(item)}
                  >
                    {deletingId === item.id ? "Wird gelöscht …" : "Löschen"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
