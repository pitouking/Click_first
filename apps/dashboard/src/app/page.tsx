"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE, apiFetch, clearToolToken, getToolToken, setToolToken } from "@/lib/api";
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

type PageDetail = {
  id: string;
  site_id: string;
  page_type: string;
  slug: string;
  title_tag: string;
  meta_description: string;
  h1: string;
  status: "draft" | "published" | "a_completer";
  content: {
    sections?: {
      intro?: string;
      trust_building?: string;
      cta?: string;
      local_context?: string;
      story?: string;
      how_to_reach?: string;
    };
  };
};

const DEFAULT_LOCATIONS = ["Villeurbanne", "Lyon", "Caluire-et-Cuire"];
const CATALOG_CATEGORIES = Object.keys(SERVICE_CATALOG);

type SiteForm = {
  business_name: string;
  primary_category: string;
  secondary_categories: string;
  phone: string;
  streetAddress: string;
  addressLocality: string;
  postalCode: string;
  url: string;
  services: string;
  locations: string;
};

function blankForm(): SiteForm {
  return {
    business_name: "",
    primary_category: CATALOG_CATEGORIES[0] || "",
    secondary_categories: "",
    phone: "",
    streetAddress: "",
    addressLocality: "",
    postalCode: "",
    url: "",
    services: "",
    locations: "",
  };
}

function exampleForm(): SiteForm {
  return {
    business_name: "Bâti Énergie Marcel Test",
    primary_category: "Construction & Rénovation",
    secondary_categories: "Énergie & Isolation",
    phone: "+33478000000",
    streetAddress: "12 rue des Artisans",
    addressLocality: "Villeurbanne",
    postalCode: "69100",
    url: "https://bati-energie-marcel-test.pages.dev",
    services: ALL_CATALOG_SERVICES.join("\n"),
    locations: DEFAULT_LOCATIONS.join("\n"),
  };
}

export default function DashboardPage() {
  const [authed, setAuthed] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [tab, setTab] = useState<"sites" | "onboarding" | "pages">("sites");
  const [aiProvider, setAiProvider] = useState<"auto" | "openai" | "deepseek" | "anthropic">("openai");
  const [aiStatus, setAiStatus] = useState<{
    default: string;
    available: { openai: boolean; deepseek: boolean; anthropic: boolean };
    openai_model: string;
  } | null>(null);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [siteId, setSiteId] = useState("");
  const [details, setDetails] = useState<SiteDetails | null>(null);
  const [pages, setPages] = useState<DashboardPageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnose, setDiagnose] = useState<GbpDiagnoseResponse | null>(null);
  const [editing, setEditing] = useState<PageDetail | null>(null);
  const [editIntro, setEditIntro] = useState("");

  const [form, setForm] = useState<SiteForm>(() => blankForm());
  const [alsoGenerate, setAlsoGenerate] = useState(true);

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
    const res = await apiFetch(`/sites`);
    if (!res.ok) throw new Error(`list sites ${res.status}`);
    const data = (await res.json()) as { sites: SiteRow[] };
    setSites(data.sites || []);
  }, []);

  const loadSite = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/sites/${id}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = (await res.json()) as SiteDetails;
      setDetails(data);
      setPages(data.pages || []);
      setMessage(
        `${data.pages?.length || 0} page(s) · ${data.services?.length || 0} services · ${data.locations?.length || 0} zones`,
      );
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
    const saved = window.localStorage.getItem("click_first_ai_provider");
    if (saved === "openai" || saved === "deepseek" || saved === "anthropic" || saved === "auto") {
      setAiProvider(saved);
    }
  }, []);

  useEffect(() => {
    const existing = getToolToken();
    if (!existing) return;
    setTokenInput(existing);
    void apiFetch("/sites")
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        setAuthed(true);
        await loadSites();
        const statusRes = await apiFetch("/ai/status");
        if (statusRes.ok) setAiStatus(await statusRes.json());
        const params = new URLSearchParams(window.location.search);
        const initial = params.get("site_id") || window.localStorage.getItem("click_first_site_id") || "";
        if (initial) {
          setSiteId(initial);
          await loadSite(initial);
          setTab("pages");
        }
      })
      .catch(() => {
        clearToolToken();
        setAuthed(false);
      });
  }, [loadSite, loadSites]);

  async function onUnlock() {
    setError(null);
    setToolToken(tokenInput);
    try {
      const res = await apiFetch("/sites");
      if (res.status === 401) throw new Error("Jeton invalide");
      if (!res.ok) throw new Error(`API ${res.status}`);
      setAuthed(true);
      setMessage(`Connecté à ${API_BASE}`);
      await loadSites();
      const statusRes = await apiFetch("/ai/status");
      if (statusRes.ok) setAiStatus(await statusRes.json());
    } catch (err) {
      clearToolToken();
      setAuthed(false);
      setError(String(err));
    }
  }

  function startNewSite(prefillExample = false) {
    setForm(prefillExample ? exampleForm() : blankForm());
    setAlsoGenerate(true);
    setDiagnose(null);
    setError(null);
    setMessage(null);
    setTab("onboarding");
  }

  async function onCreateSite() {
    setBusy(true);
    setError(null);
    try {
      if (!form.business_name.trim()) throw new Error("Le nom de l’entreprise est obligatoire");
      const services = form.services.split("\n").map((s) => s.trim()).filter(Boolean);
      const locations = form.locations.split("\n").map((s) => s.trim()).filter(Boolean);
      const secondary = form.secondary_categories.split(",").map((s) => s.trim()).filter(Boolean);
      if (!services.length) throw new Error("Ajoutez au moins un service (1 par ligne)");
      if (!locations.length) throw new Error("Ajoutez au moins une zone / ville (1 par ligne)");

      const diagRes = await apiFetch(`/gbp/diagnose`, {
        method: "POST",
        body: JSON.stringify({
          business_name: form.business_name.trim(),
          categories: { primary: form.primary_category, secondary },
          services,
          description_length: 200,
          photos_count: 5,
          attributes_completed: false,
          hours_provided: true,
          qa_count: 1,
          ai_provider: aiProvider,
        }),
      });
      const diag = (await diagRes.json()) as GbpDiagnoseResponse;
      setDiagnose(diag);

      const res = await apiFetch(`/sites`, {
        method: "POST",
        body: JSON.stringify({
          business_profile: {
            business_name: form.business_name.trim(),
            primary_category: form.primary_category,
            secondary_categories: secondary,
            nap: {
              phone: form.phone.trim() || undefined,
              streetAddress: form.streetAddress.trim() || undefined,
              addressLocality: form.addressLocality.trim() || undefined,
              postalCode: form.postalCode.trim() || undefined,
              addressCountry: "FR",
            },
            services,
            locations,
            url: form.url.trim() || undefined,
          },
          gbp: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "create failed");
      const newId = String(data.site_id);
      setSiteId(newId);
      setMessage(`Site créé : ${data.business_name} (${newId})`);
      await loadSites();
      await loadSite(newId);

      if (alsoGenerate) {
        setMessage(`Site créé — génération des pages avec ${aiProvider}…`);
        const matrixRes = await apiFetch(`/generate-matrix`, {
          method: "POST",
          body: JSON.stringify({ site_id: newId, include_core_pages: true, ai_provider: aiProvider }),
        });
        const matrix = await matrixRes.json();
        if (!matrixRes.ok) throw new Error(matrix.error || "matrix failed after create");
        setMessage(`Site créé + ${matrix.generated_count} pages générées (${matrix.ai_provider || aiProvider})`);
        await loadSite(newId);
      }

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
      const res = await apiFetch(`/sites/${siteId}/sync-gbp`, { method: "POST" });
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
      const res = await apiFetch(`/generate-matrix`, {
        method: "POST",
        body: JSON.stringify({ site_id: siteId, include_core_pages: true, ai_provider: aiProvider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "matrix failed");
      setMessage(`Matrice: ${data.generated_count} pages · IA ${data.ai_provider || aiProvider}`);
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
      const res = await apiFetch(`/publish-site`, {
        method: "POST",
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

  async function openEditor(pageId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/pages/${pageId}`);
      const data = (await res.json()) as PageDetail;
      if (!res.ok) throw new Error((data as { error?: string }).error || "load page failed");
      setEditing(data);
      setEditIntro(data.content?.sections?.intro || "");
      setMessage(`Édition: ${data.slug || "/"}`);
      requestAnimationFrame(() => {
        document.getElementById("page-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveEditor() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/pages/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title_tag: editing.title_tag,
          meta_description: editing.meta_description,
          h1: editing.h1,
          status: editing.status === "published" ? "draft" : editing.status,
          content: {
            sections: {
              ...(editing.content?.sections || {}),
              intro: editIntro,
            },
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "save failed");
      setMessage(`Page corrigée: ${editing.slug || "/"} (repassée en draft si besoin)`);
      setEditing(null);
      if (siteId) await loadSite(siteId);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!authed) {
    return (
      <main>
        <div className="panel">
          <h1>Monsieur Click — accès outil</h1>
          <p className="muted">
            Entrez le jeton d’accès (TOOL_ACCESS_TOKEN). API: <code>{API_BASE}</code>
          </p>
          {error && <p className="error">{error}</p>}
          <label className="full">
            Jeton
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="coller le jeton"
              autoComplete="off"
            />
          </label>
          <div className="row">
            <button type="button" onClick={() => void onUnlock()} disabled={!tokenInput.trim()}>
              Déverrouiller
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="panel">
        <h1>Monsieur Click — admin</h1>
        <p className="muted">
          API {API_BASE}. Catalogue: {Object.keys(SERVICE_CATALOG).join(" · ")}.
          <button
            type="button"
            className="ghost"
            style={{ marginLeft: 8 }}
            onClick={() => {
              clearToolToken();
              setAuthed(false);
            }}
          >
            Déconnexion
          </button>
        </p>

        <div className="row" style={{ alignItems: "center", gap: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            Fournisseur IA
            <select
              value={aiProvider}
              onChange={(e) => {
                const v = e.target.value as typeof aiProvider;
                setAiProvider(v);
                window.localStorage.setItem("click_first_ai_provider", v);
              }}
              aria-label="Fournisseur IA"
            >
              <option value="openai" disabled={aiStatus ? !aiStatus.available.openai : false}>
                ChatGPT (OpenAI){aiStatus && !aiStatus.available.openai ? " — clé absente" : ""}
              </option>
              <option value="deepseek" disabled={aiStatus ? !aiStatus.available.deepseek : false}>
                DeepSeek{aiStatus && !aiStatus.available.deepseek ? " — clé absente" : ""}
              </option>
              <option value="anthropic" disabled={aiStatus ? !aiStatus.available.anthropic : false}>
                Claude (Anthropic){aiStatus && !aiStatus.available.anthropic ? " — clé absente" : ""}
              </option>
              <option value="auto">Auto</option>
            </select>
          </label>
          {aiStatus && (
            <span className="muted">
              modèle OpenAI: {aiStatus.openai_model}
            </span>
          )}
        </div>

        <div className="row">
          <button type="button" className={tab === "sites" ? "" : "ghost"} onClick={() => setTab("sites")}>
            Sites
          </button>
          <button type="button" className={tab === "onboarding" ? "" : "ghost"} onClick={() => startNewSite(false)}>
            Nouveau site
          </button>
          <button type="button" className={tab === "pages" ? "" : "ghost"} onClick={() => setTab("pages")}>
            Pages & corrections
          </button>
        </div>

        {message && <p className="ok">{message}</p>}
        {error && <p className="error">{error}</p>}

        {tab === "sites" && (
          <section>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0 }}>Sites</h2>
              <button type="button" onClick={() => startNewSite(false)}>
                + Ajouter un site
              </button>
            </div>
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
                      Aucun site — cliquez sur « Ajouter un site ».
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
            <h2>Nouveau site</h2>
            <p className="muted">
              Remplissez le profil entreprise (NAP, services, zones). Le fournisseur IA sélectionné ci-dessus sera utilisé
              si vous générez les pages juste après.
            </p>
            <div className="row">
              <button type="button" className="ghost" onClick={() => startNewSite(false)}>
                Formulaire vide
              </button>
              <button type="button" className="ghost" onClick={() => startNewSite(true)}>
                Préremplir l’exemple démo
              </button>
            </div>
            <div className="form-grid">
              <label>
                Nom de l’entreprise *
                <input
                  value={form.business_name}
                  onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                  placeholder="Ex. Dupont Rénovation"
                />
              </label>
              <label>
                Catégorie primaire
                <select
                  value={form.primary_category}
                  onChange={(e) => {
                    const primary = e.target.value;
                    const catalogServices = SERVICE_CATALOG[primary as keyof typeof SERVICE_CATALOG] || [];
                    setForm({
                      ...form,
                      primary_category: primary,
                      services: form.services.trim()
                        ? form.services
                        : catalogServices.join("\n"),
                    });
                  }}
                >
                  {CATALOG_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Catégories secondaires (virgules)
                <input
                  value={form.secondary_categories}
                  onChange={(e) => setForm({ ...form, secondary_categories: e.target.value })}
                  placeholder="Énergie & Isolation"
                />
              </label>
              <label>
                Site web (URL)
                <input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://…"
                />
              </label>
              <label>
                Téléphone
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+33…" />
              </label>
              <label>
                Rue
                <input
                  value={form.streetAddress}
                  onChange={(e) => setForm({ ...form, streetAddress: e.target.value })}
                />
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
                Services (1 par ligne) *
                <textarea
                  rows={8}
                  value={form.services}
                  onChange={(e) => setForm({ ...form, services: e.target.value })}
                  placeholder={"Photovoltaïque\nIsolation\nMaçonnerie"}
                />
              </label>
              <label className="full">
                Zones / villes (1 par ligne) *
                <textarea
                  rows={4}
                  value={form.locations}
                  onChange={(e) => setForm({ ...form, locations: e.target.value })}
                  placeholder={"Villeurbanne\nLyon"}
                />
              </label>
              <label className="full" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={alsoGenerate}
                  onChange={(e) => setAlsoGenerate(e.target.checked)}
                />
                Générer aussi la matrice de pages (services × zones) avec {aiProvider === "openai" ? "ChatGPT" : aiProvider}
              </label>
            </div>
            <div className="row">
              <button type="button" disabled={busy} onClick={() => void onCreateSite()}>
                {busy ? "Création…" : alsoGenerate ? "Créer le site + générer les pages" : "Créer le site"}
              </button>
              <button type="button" className="ghost" disabled={busy} onClick={() => setTab("sites")}>
                Annuler
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

            {editing && (
              <div id="page-editor" className="checklist" style={{ marginBottom: 16 }}>
                <h3>
                  Corriger — {editing.slug || "/"} ({editing.page_type})
                </h3>
                <div className="form-grid">
                  <label className="full">
                    Title tag
                    <input
                      value={editing.title_tag || ""}
                      onChange={(e) => setEditing({ ...editing, title_tag: e.target.value })}
                    />
                  </label>
                  <label className="full">
                    Meta description
                    <textarea
                      rows={2}
                      value={editing.meta_description || ""}
                      onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })}
                    />
                  </label>
                  <label className="full">
                    H1
                    <input value={editing.h1 || ""} onChange={(e) => setEditing({ ...editing, h1: e.target.value })} />
                  </label>
                  <label className="full">
                    Intro
                    <textarea rows={6} value={editIntro} onChange={(e) => setEditIntro(e.target.value)} />
                  </label>
                </div>
                <div className="row">
                  <button type="button" disabled={busy} onClick={() => void saveEditor()}>
                    {busy ? "Enregistrement…" : "Enregistrer les corrections"}
                  </button>
                  <button type="button" className="ghost" onClick={() => setEditing(null)}>
                    Annuler
                  </button>
                </div>
              </div>
            )}

            <h2>Pages (corriger ici)</h2>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Slug</th>
                  <th>Title</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
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
                      <td>
                        <button type="button" className="ghost" disabled={busy} onClick={() => void openEditor(p.id)}>
                          Corriger
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

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
          </section>
        )}
      </div>
    </main>
  );
}
