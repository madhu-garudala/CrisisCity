"use client";

import { useMemo, useState } from "react";
import { actionLabels, incidentTypeLabels, incidents, severityLabels } from "@/lib/scenarios";
import type { DecisionResult, Incident, Provider, RunRecord } from "@/lib/types";

const providerMeta: Record<Provider, { label: string; short: string; color: string }> = {
  openai: { label: "OpenAI Decisions", short: "LUNA", color: "#62e5ff" },
  jev: { label: "TypeSafe Jev", short: "JEV", color: "#ffb35c" },
};

function formatMoney(value: number) {
  if (!value) return "$0.000000";
  return `$${value.toFixed(6)}`;
}

function probabilityFor(result: DecisionResult, name: string, truth: string | number | boolean) {
  const answer = result.answers[name];
  if (!answer) return 0;
  const key = String(truth);
  return answer.probabilities.find((item) => String(item.value) === key)?.probability ?? 0;
}

function scoreResult(incident: Incident, result: DecisionResult) {
  const typeCorrect = result.answers.incident_type?.value === incident.truth.incidentType;
  const severityValue = Number(result.answers.severity?.value ?? -10);
  const severityCorrect = Math.round(severityValue) === incident.truth.severity;
  const dispatchCorrect = result.answers.immediate_dispatch?.value === incident.truth.immediateDispatch;
  const actionCorrect = result.answers.response_action?.value === incident.truth.responseAction;
  const correctCount = [typeCorrect, severityCorrect, dispatchCorrect, actionCorrect].filter(Boolean).length;
  const operationalScore =
    (typeCorrect ? 20 : 0) +
    Math.max(0, 20 - Math.abs(severityValue - incident.truth.severity) * 10) +
    (dispatchCorrect ? 20 : 0) +
    (actionCorrect ? 40 : 0);
  const correctProbability =
    (probabilityFor(result, "incident_type", incident.truth.incidentType) +
      probabilityFor(result, "severity", incident.truth.severity) +
      probabilityFor(result, "immediate_dispatch", incident.truth.immediateDispatch) +
      probabilityFor(result, "response_action", incident.truth.responseAction)) /
    4;
  return { accuracy: correctCount / 4, operationalScore, correctProbability };
}

function aggregate(records: RunRecord[], provider: Provider) {
  const own = records.filter((record) => record.result.provider === provider);
  if (!own.length) return { runs: 0, accuracy: 0, score: 0, latency: 0, cost: 0, calibration: 0 };
  return {
    runs: own.length,
    accuracy: own.reduce((sum, item) => sum + item.accuracy, 0) / own.length,
    score: own.reduce((sum, item) => sum + item.operationalScore, 0) / own.length,
    latency: own.reduce((sum, item) => sum + item.result.latencyMs, 0) / own.length,
    cost: own.reduce((sum, item) => sum + item.result.estimatedCost, 0),
    calibration: own.reduce((sum, item) => sum + item.correctProbability, 0) / own.length,
  };
}

function ValueBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="value-bar" aria-hidden="true">
      <span style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (!values.length) return <div className="sparkline empty-spark">NO DATA</div>;
  const max = Math.max(...values, 1);
  const points = values
    .slice(-10)
    .map((value, index, arr) => `${(index / Math.max(1, arr.length - 1)) * 100},${28 - (value / max) * 24}`)
    .join(" ");
  return (
    <svg className="sparkline" viewBox="0 0 100 32" preserveAspectRatio="none" aria-label="Recent latency trend">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function CityMap({ active, busy, latest }: { active: Incident; busy: boolean; latest: RunRecord[] }) {
  const hasResult = latest.length > 0;
  return (
    <div className="city-map">
      <div className="map-scan" />
      <div className="river" />
      <div className="road road-a" />
      <div className="road road-b" />
      <div className="road road-c" />
      <div className="road road-d" />
      {[12, 29, 44, 63, 78, 91].map((left, index) => (
        <div key={left} className={`block block-${index + 1}`} style={{ left: `${left}%` }} />
      ))}
      <span className="district-label harbor">HARBOR</span>
      <span className="district-label central">CENTRAL</span>
      <span className="district-label northbank">NORTHBANK</span>
      <div
        className={`incident-pulse ${busy ? "is-busy" : ""}`}
        style={{ left: `${active.coordinates.x}%`, top: `${active.coordinates.y}%` }}
      >
        <span className="pulse-ring" />
        <span className="pulse-core">!</span>
        <span className="pulse-label">{active.code}</span>
      </div>
      <div className={`unit unit-one ${hasResult ? "dispatched" : ""}`}>✦</div>
      <div className={`unit unit-two ${hasResult ? "dispatched" : ""}`}>✦</div>
      <div className="map-legend">
        <span><i className="legend-dot incident-dot" /> ACTIVE INCIDENT</span>
        <span><i className="legend-dot unit-dot" /> AVAILABLE UNIT</span>
      </div>
      <div className="coordinates">43.72 N&nbsp;&nbsp;·&nbsp;&nbsp;OPS GRID 07</div>
    </div>
  );
}

function ProviderCard({ provider, record, running }: { provider: Provider; record?: RunRecord; running: boolean }) {
  const meta = providerMeta[provider];
  const answers = record?.result.answers;
  const rows = [
    ["TYPE", answers?.incident_type?.value ? incidentTypeLabels[String(answers.incident_type.value)] : "—", answers?.incident_type?.confidence],
    ["SEVERITY", answers?.severity ? severityLabels[Math.max(0, Math.min(3, Math.round(Number(answers.severity.value))))] : "—", answers?.severity?.confidence],
    ["DISPATCH", answers?.immediate_dispatch ? (answers.immediate_dispatch.value ? "Immediate" : "Hold / verify") : "—", answers?.immediate_dispatch?.confidence],
    ["ACTION", answers?.response_action?.value ? actionLabels[String(answers.response_action.value)] : "—", answers?.response_action?.confidence],
  ] as const;

  return (
    <article className={`provider-card ${provider}`} style={{ "--provider": meta.color } as React.CSSProperties}>
      <div className="provider-heading">
        <div>
          <span className="eyebrow">DECISION ENGINE</span>
          <h3>{meta.label}</h3>
        </div>
        <span className="model-chip">{record?.result.model || meta.short}</span>
      </div>
      {running ? (
        <div className="thinking">
          <div className="radar-loader"><span /></div>
          <p>Evaluating shared state</p>
        </div>
      ) : record?.result.error ? (
        <div className="error-box">{record.result.error}</div>
      ) : (
        <div className="answer-list">
          {rows.map(([label, value, confidence]) => (
            <div className="answer-row" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <div className="answer-confidence">
                <i style={{ width: `${Math.round((confidence ?? 0) * 100)}%` }} />
                <b>{record ? `${Math.round((confidence ?? 0) * 100)}%` : "—"}</b>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="provider-footer">
        <span><b>{record ? `${record.result.latencyMs}ms` : "—"}</b> latency</span>
        <span><b>{record ? formatMoney(record.result.estimatedCost) : "—"}</b> estimated</span>
        <span><b>{record ? `${record.operationalScore.toFixed(0)}` : "—"}</b> ops score</span>
      </div>
    </article>
  );
}

export default function Home() {
  const [selectedId, setSelectedId] = useState(incidents[0].id);
  const [records, setRecords] = useState<RunRecord[]>([]);
  const [runningProviders, setRunningProviders] = useState<Provider[]>([]);
  const [drillRunning, setDrillRunning] = useState(false);
  const active = incidents.find((incident) => incident.id === selectedId) ?? incidents[0];
  const latest = useMemo(
    () => records.filter((record) => record.incident.id === active.id).slice(-2),
    [records, active.id],
  );
  const latestFor = (provider: Provider) => [...latest].reverse().find((record) => record.result.provider === provider);
  const openaiStats = aggregate(records, "openai");
  const jevStats = aggregate(records, "jev");

  async function runProvider(provider: Provider, incident: Incident) {
    setRunningProviders((current) => [...new Set([...current, provider])]);
    try {
      const response = await fetch("/api/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, incident }),
      });
      const payload = (await response.json()) as DecisionResult & { error?: string };
      const result: DecisionResult = response.ok
        ? payload
        : {
            provider,
            model: providerMeta[provider].short,
            latencyMs: 0,
            usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            estimatedCost: 0,
            answers: {},
            error: payload.error || "Request failed",
          };
      const scored = result.error ? { accuracy: 0, operationalScore: 0, correctProbability: 0 } : scoreResult(incident, result);
      const record = { incident, result, ...scored, timestamp: Date.now() };
      setRecords((current) => [...current, record]);
      return record;
    } catch (error) {
      const result: DecisionResult = {
        provider,
        model: providerMeta[provider].short,
        latencyMs: 0,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        estimatedCost: 0,
        answers: {},
        error: error instanceof Error ? error.message : "Request failed",
      };
      const record = { incident, result, accuracy: 0, operationalScore: 0, correctProbability: 0, timestamp: Date.now() };
      setRecords((current) => [...current, record]);
      return record;
    } finally {
      setRunningProviders((current) => current.filter((item) => item !== provider));
    }
  }

  async function runHeadToHead(incident = active) {
    await Promise.all([runProvider("openai", incident), runProvider("jev", incident)]);
  }

  async function runFullDrill() {
    setDrillRunning(true);
    for (const incident of incidents) {
      setSelectedId(incident.id);
      await runHeadToHead(incident);
    }
    setDrillRunning(false);
  }

  const openaiLatencies = records.filter((item) => item.result.provider === "openai").map((item) => item.result.latencyMs);
  const jevLatencies = records.filter((item) => item.result.provider === "jev").map((item) => item.result.latencyMs);
  const isBusy = runningProviders.length > 0 || drillRunning;

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="CrisisCity home">
          <span className="brand-mark"><i /><i /><i /></span>
          <span>CRISIS<span>CITY</span></span>
        </a>
        <div className="system-status">
          <span className="live-dot" /> LIVE SIMULATION
          <span className="status-divider" />
          <span>TEXT PARITY MODE</span>
        </div>
        <div className="header-actions">
          <button className="ghost-button" onClick={() => setRecords([])} disabled={!records.length || isBusy}>RESET DATA</button>
          <a className="method-link" href="#methodology">METHODOLOGY ↘</a>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="section-kicker">DECISION API BENCHMARK / 01</span>
          <h1>When the city calls,<br /><em>who decides better?</em></h1>
          <p>Two decision engines. One shared emergency feed. Known ground truth, live latency, and every fraction of a cent accounted for.</p>
        </div>
        <div className="hero-scoreboard">
          <div className="versus-label">CURRENT LEADER</div>
          <div className="leader-row">
            <span className="leader-name">
              {!records.length ? "AWAITING RUN" : openaiStats.score === jevStats.score ? "DEAD HEAT" : openaiStats.score > jevStats.score ? "OPENAI" : "JEV"}
            </span>
            <span className="run-count">{Math.floor(records.length / 2).toString().padStart(2, "0")} / {incidents.length.toString().padStart(2, "0")} INCIDENTS</span>
          </div>
          <div className="split-score">
            <div><span>OPENAI</span><strong>{openaiStats.score.toFixed(0)}</strong></div>
            <span className="vs">VS</span>
            <div><span>JEV</span><strong>{jevStats.score.toFixed(0)}</strong></div>
          </div>
        </div>
      </section>

      <section className="command-grid">
        <div className="map-panel panel">
          <div className="panel-header">
            <div><span className="panel-index">01</span><h2>LIVE OPERATIONS MAP</h2></div>
            <span className="timestamp">SIM CLOCK · {active.time}</span>
          </div>
          <CityMap active={active} busy={isBusy} latest={latest} />
        </div>

        <aside className="queue-panel panel">
          <div className="panel-header">
            <div><span className="panel-index">02</span><h2>INCIDENT QUEUE</h2></div>
            <span className="queue-count">{incidents.length} CASES</span>
          </div>
          <div className="incident-list">
            {incidents.map((incident) => {
              const completed = records.some((record) => record.incident.id === incident.id && !record.result.error);
              return (
                <button
                  key={incident.id}
                  className={`incident-item ${incident.id === active.id ? "active" : ""}`}
                  onClick={() => setSelectedId(incident.id)}
                  disabled={isBusy}
                >
                  <span className={`severity-signal severity-${incident.truth.severity}`} />
                  <span className="incident-copy"><b>{incident.code}</b><strong>{incident.title}</strong><small>{incident.district} · {incident.difficulty}</small></span>
                  <span className="completion">{completed ? "✓" : incident.time}</span>
                </button>
              );
            })}
          </div>
        </aside>
      </section>

      <section className="incident-brief panel">
        <div className="brief-id">
          <span>ACTIVE CALL</span>
          <strong>{active.code}</strong>
        </div>
        <blockquote>“{active.report}”</blockquote>
        <div className="brief-facts">
          <span><small>CALLER</small>{active.caller}</span>
          <span><small>CONDITIONS</small>{active.weather}</span>
          <span><small>NEAREST UNIT</small>{active.units[0]}</span>
        </div>
        <div className="dispatch-actions">
          <button className="dispatch-button" onClick={() => runHeadToHead()} disabled={isBusy}>
            <span>{isBusy ? "DISPATCHING…" : "RUN HEAD-TO-HEAD"}</span><i>↗</i>
          </button>
          <button className="drill-button" onClick={runFullDrill} disabled={isBusy}>RUN ALL {incidents.length}</button>
        </div>
      </section>

      <section className="decision-section">
        <div className="section-heading">
          <div><span className="section-kicker">LIVE VERDICTS / 02</span><h2>Same evidence.<br />Independent judgment.</h2></div>
          <p>Four atomic questions are evaluated in one request. Confidence bars show each engine’s reported certainty, while the ops score uses hidden ground truth.</p>
        </div>
        <div className="provider-grid">
          <ProviderCard provider="openai" record={latestFor("openai")} running={runningProviders.includes("openai")} />
          <ProviderCard provider="jev" record={latestFor("jev")} running={runningProviders.includes("jev")} />
        </div>
      </section>

      <section className="metrics-section panel">
        <div className="panel-header">
          <div><span className="panel-index">03</span><h2>BENCHMARK TELEMETRY</h2></div>
          <span className="timestamp">AGGREGATE · LIVE SESSION</span>
        </div>
        <div className="metric-grid">
          {([
            ["DECISION ACCURACY", openaiStats.accuracy * 100, jevStats.accuracy * 100, "%"],
            ["OPERATIONAL SCORE", openaiStats.score, jevStats.score, "/100"],
            ["CORRECT-ANSWER MASS", openaiStats.calibration * 100, jevStats.calibration * 100, "%"],
          ] as const).map(([label, openai, jev, suffix]) => (
            <div className="metric-card" key={label}>
              <span className="metric-label">{label}</span>
              <div className="metric-values"><strong>{openai.toFixed(1)}{suffix}</strong><strong>{jev.toFixed(1)}{suffix}</strong></div>
              <div className="dual-bars">
                <ValueBar value={openai} color={providerMeta.openai.color} />
                <ValueBar value={jev} color={providerMeta.jev.color} />
              </div>
              <div className="metric-legend"><span>OPENAI</span><span>JEV</span></div>
            </div>
          ))}
          <div className="metric-card latency-card">
            <span className="metric-label">MEAN LATENCY</span>
            <div className="metric-values"><strong>{openaiStats.latency.toFixed(0)}ms</strong><strong>{jevStats.latency.toFixed(0)}ms</strong></div>
            <div className="spark-pair"><MiniSparkline values={openaiLatencies} color={providerMeta.openai.color} /><MiniSparkline values={jevLatencies} color={providerMeta.jev.color} /></div>
            <div className="metric-legend"><span>OPENAI</span><span>JEV</span></div>
          </div>
          <div className="metric-card cost-card">
            <span className="metric-label">SESSION COST</span>
            <div className="cost-total">{formatMoney(openaiStats.cost + jevStats.cost)}</div>
            <div className="cost-split"><span>OPENAI {formatMoney(openaiStats.cost)}</span><span>JEV {formatMoney(jevStats.cost)}</span></div>
            <div className="cost-note">Estimated from reported input tokens</div>
          </div>
        </div>
      </section>

      <section className="log-section">
        <div className="section-heading compact">
          <div><span className="section-kicker">AUDIT TRAIL / 03</span><h2>Every call, inspectable.</h2></div>
          <p>{records.length} model responses recorded in this browser session.</p>
        </div>
        <div className="log-table-wrap panel">
          <table>
            <thead><tr><th>INCIDENT</th><th>ENGINE</th><th>TYPE</th><th>SEVERITY</th><th>ACTION</th><th>ACCURACY</th><th>LATENCY</th><th>COST</th></tr></thead>
            <tbody>
              {records.length ? [...records].reverse().map((record, index) => (
                <tr key={`${record.timestamp}-${record.result.provider}-${index}`}>
                  <td><b>{record.incident.code}</b><small>{record.incident.district}</small></td>
                  <td><span className={`engine-tag ${record.result.provider}`}>{providerMeta[record.result.provider].short}</span></td>
                  <td>{record.result.error ? "ERROR" : incidentTypeLabels[String(record.result.answers.incident_type?.value)] || "—"}</td>
                  <td>{record.result.error ? "—" : severityLabels[Math.max(0, Math.min(3, Math.round(Number(record.result.answers.severity?.value))))] || "—"}</td>
                  <td>{record.result.error ? record.result.error : actionLabels[String(record.result.answers.response_action?.value)] || "—"}</td>
                  <td>{(record.accuracy * 100).toFixed(0)}%</td>
                  <td>{record.result.latencyMs}ms</td>
                  <td>{formatMoney(record.result.estimatedCost)}</td>
                </tr>
              )) : (
                <tr className="empty-row"><td colSpan={8}>SELECT AN INCIDENT AND RUN THE FIRST HEAD-TO-HEAD</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="methodology" id="methodology">
        <div><span className="section-kicker">PROTOCOL / 04</span><h2>Built for a fair fight.</h2></div>
        <div className="method-grid">
          <article><span>01</span><h3>Identical state</h3><p>Both engines receive the same incident facts, resources, policy, and answer space. The comparison uses text because both APIs support it.</p></article>
          <article><span>02</span><h3>Known truth</h3><p>Every scenario carries hidden labels for type, severity, dispatch need, and best response. Accuracy is calculated in code.</p></article>
          <article><span>03</span><h3>Real telemetry</h3><p>Latency is measured around the provider request. Cost is estimated from each API’s returned input-token count and current rate.</p></article>
          <article><span>04</span><h3>Outcome weighted</h3><p>The operational score weights the response action most heavily and gives partial credit when a severity estimate is close.</p></article>
        </div>
      </section>

      <footer>
        <div className="brand footer-brand"><span className="brand-mark"><i /><i /><i /></span><span>CRISIS<span>CITY</span></span></div>
        <p>Decision intelligence under pressure.</p>
        <span>OPENAI DECISIONS × TYPESAFE JEV</span>
      </footer>
    </main>
  );
}
