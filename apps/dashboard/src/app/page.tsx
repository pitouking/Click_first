"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/lib/api";
import type { DashboardPageRow } from "@click-first/shared-types";

export default function DashboardPage() {
  const [siteId, setSiteId] = useState("");
  const [pages, setPages] = useState<DashboardPageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const draftIds = useMemo(
    () => pages.filter((p) => p.status === "draft" || p.status === "a_completer").map((p) => p.id),
    [pages],
  );

  const loadPages = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/sites/${id}/pages`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = (await res.json()) as { pages: DashboardPageRow[] };
      setPages(data.pages || []);
      setMessage(`${data.pages?.length || 0} page(s) chargée(s)`);
    } catch (err) {
      setError(String(err));
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("site_id");
    const stored = window.localStorage.getItem("click_first_site_id");
    const initial = fromQuery || stored || "";
    if (initial) {
      setSiteId(initial);
      void loadPages(initial);
    }
  }, [loadPages]);

  async function onPublish() {
    if (!siteId || !draftIds.length) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/publish-site`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          page_ids: draftIds,
          cloudflare_target: "internal",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `publish failed ${res.status}`);
      setMessage(`Publié: ${data.pages_published?.length || 0} page(s) → ${data.deployed_url}`);
      window.localStorage.setItem("click_first_site_id", siteId);
      await loadPages(siteId);
    } catch (err) {
      setError(String(err));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <main>
      <div className="panel">
        <h1>Click_first — pages</h1>
        <p className="muted">
          Auth dashboard : Cloudflare Access (pas d&apos;auth applicative). Aucune clé API ici —
          tout passe par le Worker.
        </p>

        <div className="row">
          <input
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            placeholder="site_id"
            aria-label="site_id"
          />
          <button
            type="button"
            onClick={() => {
              window.localStorage.setItem("click_first_site_id", siteId);
              void loadPages(siteId);
            }}
            disabled={!siteId || loading}
          >
            {loading ? "Chargement…" : "Charger"}
          </button>
          <button type="button" onClick={() => void onPublish()} disabled={!draftIds.length || publishing}>
            {publishing ? "Publication…" : `Publier (${draftIds.length})`}
          </button>
        </div>

        {message && <p className="ok">{message}</p>}
        {error && <p className="error">{error}</p>}

        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Slug</th>
              <th>Title</th>
              <th>Statut</th>
              <th>MAJ</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Aucune page — lancez le seed démo puis rechargez le site_id.
                </td>
              </tr>
            ) : (
              pages.map((p) => (
                <tr key={p.id}>
                  <td>{p.page_type}</td>
                  <td>{p.slug || "/"}</td>
                  <td>{p.title_tag}</td>
                  <td>
                    <span className={`badge ${p.status}`}>{p.status}</span>
                  </td>
                  <td className="muted">{p.updated_at}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
