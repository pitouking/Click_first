"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/lib/api";
import { ALL_CATALOG_SERVICES, SERVICE_CATALOG } from "@click-first/shared-types";
import type { DashboardPageRow, GbpDiagnoseResponse } from "@click-first/shared-types";

type SiteRow = {
  id: string;
  business_name: string;
  primary_category: string | null;
  pages_count?: number;
};

type SiteDetails = {
  site: { id: string; business_name: string; primary_category?: string };
  services: { name: string; source: string; has_gbp_equivalent: number }[];
  locations: { name: string; is_primary: number }[];
  gbp: {
    optimization_status?: string;
    gbp_action_checklist?: string[];
    services?: string[];
  } | null;
  sync: {
    missing_on_site?: string[];
    missing_on_gbp?: string[];
  } | null;
  pages: DashboardPageRow[];
};

const DEFAULT_LOCATIONS = ["Villeurbanne", "Lyon", "Caluire-et-Cuire"];

export default function DashboardPage() {
  const [tab, setTab] = useState<"sites" | "onboarding" | "pages">("sites");
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [siteId, setSiteId] = useState("");
  const [details, setDetails] = useState<SiteDetails | null>(null);
  const [pages, setPages] = useState<DashboardPageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnose, setDiagnose] = useState<GbpDiagnoseResponse | null>(null);

  const [form, setForm] = useState({
    business_name: "Bâti Énergie Marcel Test",
    primary_category: "Construction & Rénovation",
    secondary_categories: "Énergie & Isolation",
    phone: "+33478000000",
    streetAddress: "12 rue des Artisans",
    addressLocality: "Villeurbanne",
    postalCode: "69100",
    services: ALL_CATALOG_SERVICES.join("\n"),
    locations: DEFAULT_LOCATIONS.join("\n"),
  });

  const draftIds = useMemo(
    () => pages.filter((p) => p.status === "draft" || p.status === "a_completer").map((p) => p.id),
    [pages],
  );

  const matrixCells = useMemo(() => {
    if (!details) return [];
    const services = details.services.map((s) => s.name);
    const locations = details.locations.map((l) => l.name);
    return services.flatMap((service) =>
      locations.map((location) => {
        const slugPart = `${service}`.toLowerCase();
        const page = pages.find(
          (p) =>
            p.page_type === "service" &&
            (p.slug.includes("-a-") || false) &&
            p.title_tag.toLowerCase().includes(service.toLowerCase()) &&
            p.title_tag.toLowerCase().includes(location.toLowerCase()),
        );
        return { service, location, page, key: `${slugPart}|${location}` };
      }),
    );
  }, [details, pages]);

  const loadSites = useCallback(async () => {
    const res = await fetch(`${API_BASE}/sites`);
    if (!res.ok) throw new Error(`list sites ${res.status}`);
    const data = (await res.json()) as { sites: SiteRow[] };
    setSites(data.sites || []);
  }, []);

  const loadSite = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/sites/${id}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = (await res.json()) as SiteDetails;
      setDetails(data);
      setPages(data.pages || []);
      setMessage(`${data.pages?.length || 0} page(s) · ${data.services?.length || 0} services · ${data.locations?.length || 0} zones`);
      window.localStorage.setItem("click_first_site_id", id);
    } catch (err) {
      setError(String(err));
      setDetails(null);
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSites().catch((err) => setError(String(err)));
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("site_id") || window.localStorage.getItem("click_first_site_id") || "";
    if (initial) {
      setSiteId(initial);
      void loadSite(initial);
      setTab("pages");
    }
  }, [loadSite, loadSites]);

  async function onCreateSite() {
    setBusy(true);
    setError(null);
    try {
      const services = form.services.split("\n").map((s) => s.trim()).filter(Boolean);
      const locations = form.locations.split("\n").map((s) => s.trim()).filter(Boolean);
      const secondary = form.secondary_categories.split(",").map((s) => s.trim()).filter(Boolean);

      const diagRes = await fetch(`${API_BASE}/gbp/diagnose`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          business_name: form.business_name,
          categories: { primary: form.primary_category, secondary },
          services,
          description_length: 200,
          photos_count: 5,
          attributes_completed: false,
          hours_provided: true,
          qa_count: 1,
        }),
      });
      const diag = (await diagRes.json()) as GbpDiagnoseResponse;
      setDiagnose(diag);

      const res = await fetch(`${API_BASE}/sites`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          business_profile: {
            business_name: form.business_name,
            primary_category: form.primary_category,
            secondary_categories: secondary,
            nap: {
              phone: form.phone,
              streetAddress: form.streetAddress,
              addressLocality: form.addressLocality,
              postalCode: form.postalCode,
              addressCountry: "FR",
            },
            services,
            locations,
            url: "https://bati-energie-marcel-test.example",
          },
          gbp: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "create failed");
      setSiteId(data.site_id);
      setMessage(`Site créé ${data.site_id}`);
      await loadSites();
      await loadSite(data.site_id);
      setTab("pages");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSync() {
    if (!siteId) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/sites/${siteId}/sync-gbp`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "sync failed");
      setDiagnose(data);
      setMessage(`Sync GBP: ${data.optimization_status}`);
      await loadSite(siteId);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onGenerateMatrix() {
    if (!siteId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/generate-matrix`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ site_id: siteId, include_core_pages: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "matrix failed");
      setMessage(`Matrice: ${data.generated_count} pages générées`);
      await loadSite(siteId);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onPublish() {
    if (!siteId || !draftIds.length) return;
    setBusy(true);
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
      if (!res.ok) throw new Error(data.error || `publish failed`);
      setMessage(`Publié: ${data.pages_published?.length || 0} → ${data.deployed_url}`);
      await loadSite(siteId);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <div className="panel">
        <h1>Click_first — admin</h1>
        <p className="muted">
          Auth via Cloudflare Access. Aucune clé API côté navigateur. Catalogue :{" "}
          {Object.keys(SERVICE_CATALOG).join(" · ")}.
        </p>

        <div className="row">
          <button type="button" className={tab === "sites" ? "" : "ghost"} onClick={() => setTab("sites")}>
            Sites
          </button>
          <button type="button" className={tab === "onboarding" ? "" : "ghost"} onClick={() => setTab("onboarding")}>
            Onboarding
          </button>
          <button type="button" className={tab === "pages" ? "" : "ghost"} onClick={() => setTab("pages")}>
            Pages & matrice
          </button>
        </div>

        {message && <p className="ok">{message}</p>}
        {error && <p className="error">{error}</p>}

        {tab === "sites" && (
          <section>
            <h2>Sites</h2>
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Catégorie</th>
                  <th>Pages</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sites.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      Aucun site — passez par Onboarding.
                    </td>
                  </tr>
                ) : (
                  sites.map((s) => (
                    <tr key={s.id}>
                      <td>{s.business_name}</td>
                      <td className="muted">{s.primary_category}</td>
                      <td>{s.pages_count ?? "—"}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            setSiteId(s.id);
                            void loadSite(s.id);
                            setTab("pages");
                          }}
                        >
                          Ouvrir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        )}

        {tab === "onboarding" && (
          <section>
            <h2>Créer un site (intake GBP)</h2>
            <div className="form-grid">
              <label>
                Nom
                <input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
              </label>
              <label>
                Catégorie primaire
                <input
                  value={form.primary_category}
                  onChange={(e) => setForm({ ...form, primary_category: e.target.value })}
                />
              </label>
              <label>
                Catégories secondaires (virgules)
                <input
                  value={form.secondary_categories}
                  onChange={(e) => setForm({ ...form, secondary_categories: e.target.value })}
                />
              </label>
              <label>
                Téléphone
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label>
                Rue
                <input value={form.streetAddress} onChange={(e) => setForm({ ...form, streetAddress: e.target.value })} />
              </label>
              <label>
                Ville
                <input
                  value={form.addressLocality}
                  onChange={(e) => setForm({ ...form, addressLocality: e.target.value })}
                />
              </label>
              <label>
                CP
                <input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
              </label>
              <label className="full">
                Services (1 par ligne)
                <textarea
                  rows={8}
                  value={form.services}
                  onChange={(e) => setForm({ ...form, services: e.target.value })}
                />
              </label>
              <label className="full">
                Locations (1 par ligne)
                <textarea
                  rows={4}
                  value={form.locations}
                  onChange={(e) => setForm({ ...form, locations: e.target.value })}
                />
              </label>
            </div>
            <div className="row">
              <button type="button" disabled={busy} onClick={() => void onCreateSite()}>
                {busy ? "Création…" : "Diagnostiquer GBP + créer le site"}
              </button>
            </div>
            {diagnose && (
              <div className="checklist">
                <h3>Checklist GBP — {diagnose.optimization_status}</h3>
                <ul>
                  {(diagnose.gbp_action_checklist || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {tab === "pages" && (
          <section>
            <div className="row">
              <input value={siteId} onChange={(e) => setSiteId(e.target.value)} placeholder="site_id" aria-label="site_id" />
              <button type="button" disabled={!siteId || loading} onClick={() => void loadSite(siteId)}>
                {loading ? "Chargement…" : "Charger"}
              </button>
              <button type="button" disabled={!siteId || busy} onClick={() => void onSync()}>
                Sync GBP
              </button>
              <button type="button" disabled={!siteId || busy} onClick={() => void onGenerateMatrix()}>
                Générer matrice S×L
              </button>
              <button type="button" disabled={!draftIds.length || busy} onClick={() => void onPublish()}>
                Publier ({draftIds.length})
              </button>
            </div>

            {details?.gbp && (
              <div className="checklist">
                <h3>GBP — {details.gbp.optimization_status || "n/a"}</h3>
                <ul>
                  {(details.gbp.gbp_action_checklist || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {details.sync && (
                  <p className="muted">
                    Manque sur site: {(details.sync.missing_on_site || []).join(", ") || "—"} · Manque au GBP:{" "}
                    {(details.sync.missing_on_gbp || []).join(", ") || "—"}
                  </p>
                )}
              </div>
            )}

            <h2>Matrice Services × Locations</h2>
            <div className="matrix">
              {matrixCells.length === 0 ? (
                <p className="muted">Chargez un site puis générez la matrice.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Location</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixCells.map((cell) => (
                      <tr key={cell.key}>
                        <td>{cell.service}</td>
                        <td>{cell.location}</td>
                        <td>
                          {cell.page ? (
                            <span className={`badge ${cell.page.status}`}>{cell.page.status}</span>
                          ) : (
                            <span className="muted">absent</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <h2>Pages</h2>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Slug</th>
                  <th>Title</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {pages.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      Aucune page.
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  );
}
