# CrisisCity

A live comparison arena for OpenAI's Decisions API and TypeSafe Jev. Both engines receive the same emergency-dispatch state and answer equivalent Choice, Score, and Predicate/Noul questions. The UI tracks accuracy against known labels, an outcome-weighted operations score, latency, confidence, token usage, and estimated cost.

**Live benchmark:** [crisis-city.vercel.app](https://crisis-city.vercel.app/)

## Deployment

The production site is deployed on Vercel at [https://crisis-city.vercel.app/](https://crisis-city.vercel.app/).

## Local development

Create `.env.local` with:

```text
OPENAI_API_KEY=...
JEV_API_KEY=...
```

Then run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Benchmark protocol

- Both providers receive identical text/JSON evidence and answer spaces.
- Each incident has hidden ground truth for type, severity, dispatch need, and response action.
- Four independent questions are batched into one provider request.
- Cost is estimated from reported input tokens using $0.10/M for OpenAI Decisions and $0.042/M for Jev.
- All run history stays in the current browser session.
