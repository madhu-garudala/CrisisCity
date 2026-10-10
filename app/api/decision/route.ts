import { NextRequest, NextResponse } from "next/server";
import type { Incident, NormalizedAnswer, Probability, Provider } from "@/lib/types";

export const runtime = "nodejs";

const OPENAI_COST_PER_TOKEN = 0.1 / 1_000_000;
const JEV_COST_PER_TOKEN = 0.042 / 1_000_000;

const incidentChoices = [
  ["fire", "Fire, smoke, combustion, or explosion requiring fire response."],
  ["medical", "Illness, injury, exposure, or person needing medical care."],
  ["police", "Crime, threat, missing person, disturbance, or security response."],
  ["traffic", "Road collision, trapped occupants, or transport hazard."],
  ["utility", "Electrical, gas, water, or infrastructure failure without active fire."],
  ["false_alarm", "Benign activity or unverified report that does not currently require field response."],
] as const;

const actionChoices = [
  ["dispatch_fire", "Send the nearest fire engine as the primary response."],
  ["dispatch_ambulance", "Send the nearest medical unit as the primary response."],
  ["dispatch_police", "Send the nearest police unit as the primary response."],
  ["dispatch_utility", "Send the relevant utility crew as the primary response."],
  ["dispatch_multi", "Send more than one agency immediately because the incident crosses disciplines."],
  ["monitor", "Do not send a field unit yet; verify or monitor the report."],
] as const;

const severityLevels = [
  "Routine: no current threat to life, safety, property, or essential services.",
  "Elevated: limited disruption or hazard, stable situation, no immediate threat to life.",
  "Urgent: credible safety threat or significant disruption requiring prompt response.",
  "Critical: immediate threat to life, rapidly escalating danger, trapped people, or mass-casualty potential.",
];

function buildState(incident: Incident) {
  return {
    city: "CrisisCity",
    dispatch_policy:
      "Protect life first. Treat credible reports as real until verified. Use multi-agency response only when multiple disciplines are immediately required. Monitor only when the report is benign or lacks a credible present hazard.",
    incident: {
      code: incident.code,
      title: incident.title,
      caller_report: incident.report,
      district: incident.district,
      caller: incident.caller,
      local_time: incident.time,
      conditions: incident.weather,
      available_units: incident.units,
    },
  };
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeProbabilities(raw: unknown): Probability[] {
  if (Array.isArray(raw)) {
    return raw.map((item, index) => {
      const entry = item as Record<string, unknown>;
      return {
        value: (entry.value as string | number) ?? index,
        label: typeof entry.label === "string" ? entry.label : undefined,
        probability: numberValue(entry.probability),
      };
    });
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).map(([value, probability]) => ({
      value,
      probability: numberValue(probability),
    }));
  }
  return [];
}

function normalizeOpenAI(raw: Record<string, unknown>) {
  const answerList = Array.isArray(raw.answers) ? raw.answers : [];
  const answers: Record<string, NormalizedAnswer> = {};
  for (const item of answerList) {
    const answer = item as Record<string, unknown>;
    const name = typeof answer.name === "string" ? answer.name : `answer_${Object.keys(answers).length}`;
    if (answer.type === "predicate") {
      const probability = numberValue(answer.probability, 0.5);
      answers[name] = {
        type: "predicate",
        value: probability >= 0.5,
        confidence: Math.abs(probability - 0.5) * 2,
        probabilities: [
          { value: "false", probability: 1 - probability },
          { value: "true", probability },
        ],
      };
    } else if (answer.type === "choice") {
      answers[name] = {
        type: "choice",
        value: (answer.choice as string | number) ?? null,
        confidence: numberValue(answer.confidence),
        probabilities: normalizeProbabilities(answer.probabilities),
      };
    } else if (answer.type === "score") {
      answers[name] = {
        type: "score",
        value: numberValue(answer.score),
        confidence: numberValue(answer.confidence),
        probabilities: normalizeProbabilities(answer.probabilities),
      };
    } else {
      answers[name] = { type: "refusal", value: null, confidence: 0, probabilities: [] };
    }
  }
  return answers;
}

function normalizeJev(raw: Record<string, unknown>) {
  const rawAnswers = (raw.answers ?? {}) as Record<string, Record<string, unknown>>;
  const answers: Record<string, NormalizedAnswer> = {};
  for (const [name, answer] of Object.entries(rawAnswers)) {
    if (answer.type === "noul") {
      const probability = numberValue(answer.noul, 0.5);
      answers[name] = {
        type: "predicate",
        value: probability >= 0.5,
        confidence: Math.abs(probability - 0.5) * 2,
        probabilities: [
          { value: "false", probability: 1 - probability },
          { value: "true", probability },
        ],
      };
    } else if (answer.type === "choice") {
      answers[name] = {
        type: "choice",
        value: (answer.choice as string | number) ?? null,
        confidence: numberValue(answer.confidence),
        probabilities: normalizeProbabilities(answer.probabilities),
      };
    } else if (answer.type === "score") {
      answers[name] = {
        type: "score",
        value: numberValue(answer.score),
        confidence: numberValue(answer.confidence),
        probabilities: normalizeProbabilities(answer.probabilities),
      };
    } else {
      answers[name] = { type: "refusal", value: null, confidence: 0, probabilities: [] };
    }
  }
  return answers;
}

async function callOpenAI(state: ReturnType<typeof buildState>) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured.");
  const response = await fetch("https://api.openai.com/v1/decisions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-6-luna",
      input: JSON.stringify(state),
      questions: [
        {
          type: "choice",
          name: "incident_type",
          instructions: "Classify the primary incident type from the reported evidence.",
          choices: incidentChoices.map(([value, description]) => ({ value, description })),
        },
        {
          type: "score",
          name: "severity",
          instructions: "Rate the incident's present operational severity using the evidence available now.",
          levels: severityLevels.map((description, index) => ({
            label: ["Routine", "Elevated", "Urgent", "Critical"][index],
            description,
          })),
        },
        {
          type: "predicate",
          name: "immediate_dispatch",
          instructions: "Does this incident justify dispatching at least one field unit immediately under the stated policy?",
        },
        {
          type: "choice",
          name: "response_action",
          instructions: "Choose the safest proportionate primary dispatch action using the available units and stated policy.",
          choices: actionChoices.map(([value, description]) => ({ value, description })),
        },
      ],
    }),
    cache: "no-store",
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const detail = data.error as Record<string, unknown> | undefined;
    throw new Error((detail?.message as string) || `OpenAI returned ${response.status}.`);
  }
  return { raw: data, answers: normalizeOpenAI(data) };
}

async function callJev(state: ReturnType<typeof buildState>) {
  const key = process.env.JEV_API_KEY;
  if (!key) throw new Error("JEV_API_KEY is not configured.");
  const response = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "jev-latest",
      state,
      questions: {
        incident_type: {
          type: "choice",
          instructions: "Classify the primary incident type from the reported evidence.",
          criteria: Object.fromEntries(incidentChoices),
        },
        severity: {
          type: "score",
          instructions: "Rate the incident's present operational severity using the evidence available now.",
          criteria: severityLevels,
        },
        immediate_dispatch: {
          type: "noul",
          instructions: "Does this incident justify dispatching at least one field unit immediately under the stated policy?",
        },
        response_action: {
          type: "choice",
          instructions: "Choose the safest proportionate primary dispatch action using the available units and stated policy.",
          criteria: Object.fromEntries(actionChoices),
        },
      },
    }),
    cache: "no-store",
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const detail = data.error as Record<string, unknown> | undefined;
    throw new Error((detail?.message as string) || (data.message as string) || `Jev returned ${response.status}.`);
  }
  return { raw: data, answers: normalizeJev(data) };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { provider?: Provider; incident?: Incident };
    if (!body.provider || !body.incident) {
      return NextResponse.json({ error: "provider and incident are required" }, { status: 400 });
    }
    if (body.provider !== "openai" && body.provider !== "jev") {
      return NextResponse.json({ error: "unknown provider" }, { status: 400 });
    }

    const state = buildState(body.incident);
    const started = performance.now();
    const response = body.provider === "openai" ? await callOpenAI(state) : await callJev(state);
    const latencyMs = Math.round(performance.now() - started);
    const usage = (response.raw.usage ?? {}) as Record<string, unknown>;
    const inputTokens = numberValue(usage.input_tokens);
    const outputTokens = numberValue(usage.output_tokens);
    const totalTokens = numberValue(usage.total_tokens, inputTokens + outputTokens);
    const estimatedCost = inputTokens * (body.provider === "openai" ? OPENAI_COST_PER_TOKEN : JEV_COST_PER_TOKEN);

    return NextResponse.json({
      provider: body.provider,
      model: String(response.raw.model ?? (body.provider === "openai" ? "gpt-6-luna" : "jev-latest")),
      latencyMs,
      usage: { inputTokens, outputTokens, totalTokens },
      estimatedCost,
      answers: response.answers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Decision request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
