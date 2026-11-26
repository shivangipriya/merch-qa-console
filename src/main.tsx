import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CHECKS,
  runAllChecks,
  validateProductPayload,
  visibilityScore,
  triageScore,
  buildBrief,
  type Finding,
  type CatalogItem,
  type ApiIssue,
  type Severity,
} from './core';
import { CATALOG, API_FIXTURES, type ApiFixture } from './catalog';
import './style.css';

type TabId = 'catalog' | 'checks' | 'api' | 'triage' | 'brief';

const TABS: { id: TabId; label: string }[] = [
  { id: 'catalog', label: 'Catalog grid' },
  { id: 'checks', label: 'Content checks' },
  { id: 'api', label: 'API inspector' },
  { id: 'triage', label: 'Triage board' },
  { id: 'brief', label: 'QA brief' },
];


function sevClass(s: Severity): string {
  return `sev sev-${s}`;
}

// Tile photos are real pack/product shots from open databases (see NOTICE.md); CK-104 and CK-117 keep their seeded missing/broken references.
// CK-117's seeded bad reference is rendered as an <img> so the load failure is real and observable.
function ProductTile(props: {
  item: CatalogItem;
  flagged: boolean;
  onImgError: (id: string) => void;
  imgFailed: boolean;
}) {
  const { item, flagged } = props;
  const showImg = item.imageUrl !== null;
  return (
    <div className={`tile ${flagged ? 'tile-flagged' : ''}`} data-item-id={item.id}>
      <div className="tile-img">
        {item.imageUrl === null && <span className="tile-noimg">no image</span>}
        {showImg && !props.imgFailed && (
          <img src={item.imageUrl as string} alt="" onError={() => props.onImgError(item.id)} />
        )}
        {showImg && props.imgFailed && <span className="tile-noimg">image failed to load</span>}
        {item.badges.map((b) => (
          <span key={b.label} className={`badge badge-${b.label.toLowerCase()}`}>{b.label}</span>
        ))}
      </div>
      <div className="tile-body">
        <div className="tile-name" title={item.name}>{item.name}</div>
        <div className="tile-pack">{item.packSize}</div>
        <div className="tile-price">
          <strong>₹{item.sellingPrice}</strong>
          {item.mrp > item.sellingPrice && <s>₹{item.mrp}</s>}
          {item.discountPctShown !== null && <span className="tile-off">{item.discountPctShown}% off</span>}
        </div>
        {item.pricePerUnitShown !== null && <div className="tile-unit">₹{item.pricePerUnitShown}/{item.unitBasis === 'volume' ? 'L' : 'kg'}</div>}
        <div className="tile-cat">{item.category}</div>
      </div>
      {flagged && <div className="tile-flag-tag">flagged in QA</div>}
    </div>
  );
}

function CatalogTab(props: { failedImages: Set<string>; onImgError: (id: string) => void; flaggedIds: Set<string> }) {
  return (
    <section aria-label="Catalog grid">
      <p className="tab-intro">
        This is the grid a shopper sees, rendered from the demo catalog feed. {CATALOG.length} synthetic SKUs.
        Some defects are visible here; some only surface when the checks run. Tiles flagged by the QA pass are marked.
      </p>
      <div className="grid">
        {CATALOG.map((item) => (
          <ProductTile
            key={item.id}
            item={item}
            flagged={props.flaggedIds.has(item.id)}
            onImgError={props.onImgError}
            imgFailed={props.failedImages.has(item.id)}
          />
        ))}
      </div>
    </section>
  );
}

function ChecksTab(props: { findings: Finding[]; ran: boolean; onRun: () => void; failedImages: Set<string> }) {
  const byCheck = useMemo(() => {
    const m = new Map<string, Finding[]>();
    for (const f of props.findings) {
      const l = m.get(f.checkId) ?? [];
      l.push(f);
      m.set(f.checkId, l);
    }
    return m;
  }, [props.findings]);

  return (
    <section aria-label="Content checks">
      <p className="tab-intro">
        The daily pass: seven content-standard checks over the same feed, each with the evidence a category
        manager would need to act. Outputs are heuristics to focus a human review, not automated verdicts.
      </p>
      {!props.ran ? (
        <button className="primary" onClick={props.onRun} data-testid="run-checks">Run all checks</button>
      ) : (
        <div className="check-list" data-testid="check-results">
          {CHECKS.map((c) => {
            const found = byCheck.get(c.id) ?? [];
            return (
              <div className="check-block" key={c.id}>
                <div className="check-head">
                  <h3>{c.name}</h3>
                  <span className={found.length ? 'count count-hit' : 'count count-clear'}>
                    {found.length ? `${found.length} finding${found.length > 1 ? 's' : ''}` : 'clear'}
                  </span>
                </div>
                <p className="check-why">{c.whyItMatters}</p>
                <p className="check-note">{c.heuristicNote}</p>
                {found.map((f) => (
                  <div className="finding" key={f.id}>
                    <div className="finding-head">
                      <span className={sevClass(f.severity)}>{f.severity}</span>
                      <strong>{f.title}</strong>
                    </div>
                    <p className="finding-ev">{f.evidence}</p>
                    <p className="finding-hyp"><em>Working hypothesis:</em> {f.hypothesis}</p>
                    <p className="finding-owner">Suggested owner: {f.suggestedOwner}</p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ApiTab(props: { apiNotes: string[]; onAddNote: (note: string) => void }) {
  const [selected, setSelected] = useState<ApiFixture>(API_FIXTURES[0]);
  const [issues, setIssues] = useState<ApiIssue[] | null>(null);
  const [drafted, setDrafted] = useState(false);

  const validate = () => {
    if (selected.status !== 200) {
      setIssues([{ field: '(http)', expected: '200 OK with a JSON payload', actual: `${selected.status} ${selected.statusText}`, severity: 'critical' }]);
    } else if (Array.isArray((selected.body as { data?: unknown[] }).data)) {
      const all = ((selected.body as { data: unknown[] }).data).flatMap((rec, i) =>
        validateProductPayload(rec).map((iss) => ({ ...iss, field: `data[${i}].${iss.field}` })),
      );
      setIssues(all);
    } else {
      setIssues(validateProductPayload(selected.body));
    }
    setDrafted(false);
  };

  const draftNote = () => {
    const n = issues && issues.length > 0
      ? `${selected.request} returned ${selected.status}; contract issues: ${issues.map((i) => `${i.field} (expected ${i.expected}, got ${i.actual})`).join('; ')}.`
      : `${selected.request} returned ${selected.status}; payload validated clean against the product contract.`;
    props.onAddNote(n);
    setDrafted(true);
  };

  return (
    <section aria-label="API inspector">
      <p className="tab-intro">
        Same catalog, one layer down: the JSON the app consumes. These are simulated responses bundled with the
        demo, not a live backend or a Postman collection. The habit on show is the same one real validation needs:
        never trust a 200, check the contract, then check the business rules.
      </p>
      <div className="api-picker">
        {API_FIXTURES.map((f) => (
          <button
            key={f.id}
            className={`chip ${selected.id === f.id ? 'chip-active' : ''}`}
            onClick={() => { setSelected(f); setIssues(null); setDrafted(false); }}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="api-panel" data-testid="api-panel">
        <div className="api-req">
          <code>{selected.request}</code>
          <span className={`status status-${selected.status === 200 ? 'ok' : 'err'}`}>{selected.status} {selected.statusText}</span>
          <span className="latency">{selected.latencyMs} ms</span>
        </div>
        <pre className="api-body">{JSON.stringify(selected.body, null, 2)}</pre>
        <p className="api-note">{selected.note}</p>
        <div className="api-actions">
          <button className="primary" onClick={validate} data-testid="validate-api">Validate against product contract</button>
          {issues !== null && (
            <button className="secondary" onClick={draftNote} disabled={drafted} data-testid="draft-note">
              {drafted ? 'Note added to brief' : 'Draft issue note for the brief'}
            </button>
          )}
        </div>
        {issues !== null && (
          <div className="api-issues" data-testid="api-issues">
            {issues.length === 0 ? (
              <p className="clear">Payload validates clean: every required field present, correct types, price rules hold.</p>
            ) : (
              <table>
                <thead>
                  <tr><th>Field</th><th>Expected</th><th>Actual</th><th>Severity</th></tr>
                </thead>
                <tbody>
                  {issues.map((i, idx) => (
                    <tr key={idx}>
                      <td><code>{i.field}</code></td>
                      <td>{i.expected}</td>
                      <td>{i.actual}</td>
                      <td><span className={sevClass(i.severity)}>{i.severity}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function TriageTab(props: { findings: Finding[]; ran: boolean }) {
  const rows = useMemo(() => {
    return props.findings
      .map((f) => {
        const vis = visibilityScore(CATALOG, f.itemIds);
        return { f, vis, score: triageScore(f.severity, vis) };
      })
      .sort((a, b) => b.score - a.score);
  }, [props.findings]);

  if (!props.ran) {
    return (
      <section aria-label="Triage board">
        <p className="tab-intro">Run the content checks first; the triage board ranks whatever they find.</p>
      </section>
    );
  }
  return (
    <section aria-label="Triage board">
      <p className="tab-intro">
        Suggested order = severity x shopper visibility, normalised to a 0-100 priority. Both inputs are heuristic
        proxies (severity rules, sales rank, badges, listing recency): a starting agenda for the category team to
        reorder in review, not a measured impact or an objective truth.
      </p>
      <div className="triage-list" data-testid="triage-list">
        {rows.map(({ f, vis, score }, i) => (
          <div className="triage-row" key={f.id}>
            <div className="triage-rank">#{i + 1}</div>
            <div className="triage-main">
              <div className="finding-head">
                <span className={sevClass(f.severity)}>{f.severity}</span>
                <strong>{f.title}</strong>
              </div>
              <p className="finding-ev">{f.evidence}</p>
              <p className="finding-owner">
                Owner: {f.suggestedOwner} · Items: {f.itemIds.join(', ')} · {f.severity} severity × visibility {vis}/10 → priority {score}/100
              </p>
            </div>
            <div className="triage-score">
              <div className="score-num">{score}</div>
              <div className="score-label">priority</div>
              <div className="score-bar"><div style={{ width: `${score}%` }} /></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BriefTab(props: { findings: Finding[]; ran: boolean; apiNotes: string[] }) {
  const brief = useMemo(
    () =>
      buildBrief({
        generatedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        itemCount: CATALOG.length,
        findings: props.findings,
        items: CATALOG,
        apiNotes: props.apiNotes,
      }),
    [props.findings, props.apiNotes],
  );

  const download = () => {
    const blob = new Blob([brief], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merch-qa-brief.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!props.ran) {
    return (
      <section aria-label="QA brief">
        <p className="tab-intro">Run the content checks first; the brief summarises the whole pass for handoff.</p>
      </section>
    );
  }
  return (
    <section aria-label="QA brief">
      <p className="tab-intro">
        The handoff artifact: what was checked, what was found, in what order, and where the analysis stops being
        certain. This is what lands with the category team.
      </p>
      <button className="primary" onClick={download} data-testid="download-brief">Download brief (Markdown)</button>
      <pre className="brief" data-testid="brief-text">{brief}</pre>
    </section>
  );
}

function App() {
  const [tab, setTab] = useState<TabId>('catalog');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [ran, setRan] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [apiNotes, setApiNotes] = useState<string[]>([]);

  const onImgError = (id: string) => {
    setFailedImages((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const flaggedIds = useMemo(() => {
    const s = new Set<string>();
    for (const f of findings) for (const id of f.itemIds) s.add(id);
    return s;
  }, [findings]);

  const run = () => {
    const base = runAllChecks(CATALOG);
    // Fold real render-time load failures into the image check as a second evidence type
    // on the same issue. A SKU with both a bad reference and an observed load failure is
    // one defect, not two findings.
    const covered = new Set<string>();
    const merged = base.map((f) => {
      if (f.checkId !== 'missing-image') return f;
      const observed = f.itemIds.filter((id) => failedImages.has(id));
      if (observed.length === 0) return f;
      observed.forEach((id) => covered.add(id));
      return {
        ...f,
        evidence: `${f.evidence} Confirmed at render time: the app attempted this reference and the load failed in the browser.`,
      };
    });
    const runtime: Finding[] = [...failedImages].filter((id) => !covered.has(id)).map((id) => {
      const item = CATALOG.find((i) => i.id === id);
      return {
        id: `missing-image:runtime:${id}`,
        checkId: 'missing-image',
        itemIds: [id],
        title: 'Image failed to load in the app',
        evidence: `${id} "${item?.name ?? id}" references "${item?.imageUrl ?? ''}"; the app attempted this reference and the load failed in the browser.`,
        severity: 'high' as Severity,
        hypothesis: 'Asset was removed or renamed without updating the catalog reference.',
        suggestedOwner: 'Content' as const,
      };
    });
    setFindings([...merged, ...runtime]);
    setRan(true);
    setTab('checks');
  };

  return (
    <div className="app">
      <header className="app-head">
        <div>
          <h1>Merch QA Console</h1>
          <p className="tagline">A product-operations work sample: how I would run a merchandising and content QA pass on a grocery app, end to end.</p>
        </div>
        <div className="demo-pill">Demo data: synthetic catalog, seeded defects, simulated API</div>
      </header>

      <nav className="tabs" aria-label="Workflow">
        {TABS.map((t, i) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'tab-active' : ''}`} onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`}>
            <span className="tab-step">{i + 1}</span> {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'catalog' && <CatalogTab failedImages={failedImages} onImgError={onImgError} flaggedIds={flaggedIds} />}
        {tab === 'checks' && <ChecksTab findings={findings} ran={ran} onRun={run} failedImages={failedImages} />}
        {tab === 'api' && (
          <ApiTab apiNotes={apiNotes} onAddNote={(n) => setApiNotes((prev) => (prev.includes(n) ? prev : [...prev, n]))} />
        )}
        {tab === 'triage' && <TriageTab findings={findings} ran={ran} />}
        {tab === 'brief' && <BriefTab findings={findings} ran={ran} apiNotes={apiNotes} />}
      </main>

      <footer className="app-foot">
        <p>
          Prototype built as a role work sample. Catalog, defects and API responses are synthetic and labelled;
          priority scores and category rules are heuristics. Nothing here touches a real storefront.
        </p>
        <p>
          Maintained by <a href="https://www.linkedin.com/in/shivangii-priyaa" target="_blank" rel="noreferrer">Shivangi Priya</a>
        </p>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
