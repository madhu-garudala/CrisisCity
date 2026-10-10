export type Provider = "openai" | "jev";

export type IncidentType =
  | "fire"
  | "medical"
  | "police"
  | "traffic"
  | "utility"
  | "false_alarm";

export type ResponseAction =
  | "dispatch_fire"
  | "dispatch_ambulance"
  | "dispatch_police"
  | "dispatch_utility"
  | "dispatch_multi"
  | "monitor";

export type Incident = {
  id: string;
  code: string;
  title: string;
  report: string;
  district: string;
  caller: string;
  time: string;
  weather: string;
  units: string[];
  coordinates: { x: number; y: number };
  difficulty: "clear" | "noisy" | "ambiguous";
  truth: {
    incidentType: IncidentType;
    severity: number;
    immediateDispatch: boolean;
    responseAction: ResponseAction;
  };
};

export type Probability = {
  value: string | number;
  label?: string;
  probability: number;
};

export type NormalizedAnswer = {
  type: "choice" | "score" | "predicate" | "refusal";
  value: string | number | boolean | null;
  confidence: number;
  probabilities: Probability[];
};

export type DecisionResult = {
  provider: Provider;
  model: string;
  latencyMs: number;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  estimatedCost: number;
  answers: Record<string, NormalizedAnswer>;
  error?: string;
};

export type RunRecord = {
  incident: Incident;
  result: DecisionResult;
  accuracy: number;
  operationalScore: number;
  correctProbability: number;
  timestamp: number;
};
