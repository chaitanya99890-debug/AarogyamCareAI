# System Architecture

## Runtime topology

```text
React/Vite user UI (5173) ─┐
                           ├── Express Node API (3000) ── MySQL
React/Vite admin UI (5174) ┘             │
                                         ├── Gemini API (server-side only)
                                         └── Twilio API (optional SMS, server-side only)

React/Vite prediction clients ───────────── FastAPI ML API (8000)
                                               ├── disease predictor artifacts
                                               └── cardiovascular-risk predictor artifacts
```

## Responsibility boundaries

- `frontend/` owns presentation, navigation, client validation, UI state and API clients. No server secret is placed here.
- `backend/node-api/` owns REST routes, authentication, role checks, persistence orchestration, provider integrations and reminder scheduling.
- `backend/ml-backend/` owns model serving, input validation, model artifacts, datasets and model-training utilities.
- `database/` owns MySQL schema definitions, connection settings, and non-destructive migration code.

## Authentication, data flow and safety

The Express API stores password hashes and hashed bearer-session tokens in MySQL. Administrator routes additionally enforce the `admin` role. The frontend calls Express for authenticated records and FastAPI for prediction requests. Accepted records are persisted through Express with parameterized MySQL queries. Gemini and Twilio run only from Node server services when configured. The project handles health-related information as synthetic test data during development and presents informational output rather than clinical diagnosis.
