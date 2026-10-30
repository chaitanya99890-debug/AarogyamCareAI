# AarogyamCareAI — Documentation Phase 1 Evidence Inventory

**Inspection date:** 19 October 2026  
**Repository inspected:** `C:\Users\athar\AarogyamCareAI`  
**Status:** Phase 1 complete; this is an evidence inventory, not the final project report.

## 1. Authority and inspection boundary

The supplied master prompt requires the college's **MCA Mini Project Index.pdf** to be the primary authority for the report structure and formatting. That PDF was not present in the repository or among the files supplied for this task. The chapter plan below therefore follows the chapter/subsection order reproduced in the supplied prompt, pending comparison with the actual PDF.

No real environment values, patient data, database contents, or credentials were read into this inventory. No browser screenshots were created or represented as genuine.

## 2. Actual implementation overview

AarogyamCareAI is a local multi-service web application:

```text
React + Vite browser clients (user port 5173; admin port 5174)
        | HTTP / Bearer session token
Node.js + Express API (port 3000)
        |-- MySQL 8.x through mysql2/promise
        |-- Google Gemini through @google/genai (chat and report analysis)
        |-- Twilio (optional SMS reminders)
        |
React ML service calls ------------> FastAPI ML API (port 8000)
                                      |-- saved scikit-learn disease model
                                      `-- saved scikit-learn cardiovascular-risk model
```

The client calls the FastAPI service directly for disease and risk predictions, then persists the returned result through the authenticated Node API. It does **not** route those prediction requests through Express.

## 3. Verified technology stack

| Area | Verified technology/version or configuration | Evidence |
|---|---|---|
| User interface | React 19.2.8, TypeScript ~6.0.2, Vite 8.2.2 | `package.json` |
| UI libraries | Tailwind CSS 4.3.3, React Router DOM 7.18.3, Zustand 5.0.15, Axios 1.20.0, Lucide, React Three Fiber/Drei/Three | `package.json` |
| Node API | Node running TypeScript with experimental type stripping; Express 5.2.1; CORS; dotenv | `package.json`, `backend/node-api/src/server.ts` |
| Database | MySQL 8.x; `mysql2` 3.24.4; bounded promise pool (10 connections), parameterized `execute()` queries | `README.md`, `database/connection/mysql.ts`, `package.json` |
| ML API | Python FastAPI and Uvicorn; pandas, NumPy, scikit-learn, joblib | `backend/ml-backend/requirements.txt`, `backend/ml-backend/app.py` |
| Generative AI | Google Gemini through `@google/genai` 2.21.0; server-only key | `package.json`, `backend/node-api/src/server.ts`, `.env.example` |
| SMS | Twilio 6.1.1; server-only credentials | `package.json`, `backend/twilioSmsService.ts`, `.env.example` |
| Browser tests | pytest, Selenium, webdriver-manager listed in `tests/requirements-test.txt` | `tests/requirements-test.txt` |
| Static checking | Oxc lint (`oxlint`) | `package.json`, `.oxlintrc.json` |

Unverified: operating-system version, physical development hardware, installed MySQL server version, Python interpreter version, live Gemini configuration, live Twilio configuration, and any production deployment.

## 4. Implemented modules

| Module | Verified behaviour | Main evidence |
|---|---|---|
| Authentication and authorization | Registration, user login, admin login, hashed passwords using Node `scrypt`, SHA-256 hashed bearer-session tokens, 30-day expiry, role checks from MySQL | `backend/auth.ts`, `server.ts` |
| User dashboard and navigation | Authenticated user pages for dashboard, health profile, chatbot/history, predictions, reports, appointments, notifications and settings | `src/App.tsx`, `src/pages/`, `src/layouts/DashboardLayout.tsx` |
| Gemini healthcare chatbot | Authenticated request is sent to Gemini server-side; a safety-oriented system instruction is used; user/assistant exchanges are persisted | `server.ts`, `backend/persistenceStore.ts`, `src/pages/ChatPage.tsx` |
| Chat history | List, retrieve and delete only the authenticated user's conversations | `server.ts`, `backend/persistenceStore.ts`, `src/pages/ChatHistoryPage.tsx` |
| Disease prediction | Direct React-to-FastAPI request using selected model-supported symptoms; result later stored by Node API | `src/services/diseasePredictionService.ts`, `ml_backend/app.py`, `ml_backend/disease_prediction/` |
| Cardiovascular health-risk prediction | Direct React-to-FastAPI request; validates inputs and computes BMI; result later stored by Node API | `src/services/riskPredictionService.ts`, `ml_backend/app.py`, `ml_backend/risk_prediction/` |
| Medical report management | Authenticated report metadata list/create; file content is not stored by the Node API | `server.ts`, `backend/persistenceStore.ts`, `src/pages/ReportsPage.tsx` |
| Gemini report analysis | Accepts PDF/PNG/JPEG client content subject to a 10 MB maximum, invokes Gemini with a structured response schema, and persists analysis metadata/results | `server.ts`, `src/pages/ReportAnalysisPage.tsx` |
| Appointment management | Per-user create/read/update/delete with validation, SMS consent/status fields and persistence | `server.ts`, `backend/appointmentStore.ts`, `src/pages/AppointmentsPage.tsx` |
| SMS reminders | 30-second scheduler finds due appointments; sends through Twilio only with consent and a valid E.164 number; delivery events logged | `backend/reminderScheduler.ts`, `backend/twilioSmsService.ts` |
| Admin panel | Role-protected dashboard, user list, appointment list, report/analysis access, prediction monitoring, SMS status/test, and audit log writes | `server.ts`, `backend/adminStore.ts`, `src/pages/admin/AdminPages.tsx` |
| Support/informational UI | Emergency, nearby-care, image-analysis, notifications, settings and landing pages exist in the UI | `src/pages/` |

Important boundary: the presence of an interface page is not proof that every page has a persisted backend feature. The documentation will distinguish interface-only functions from verified server functionality.

## 5. Verified database schema

The `database/schema.sql` source defines twelve tables:

1. `users`
2. `admin_audit_logs`
3. `auth_sessions`
4. `health_profiles`
5. `chat_conversations`
6. `chat_messages`
7. `disease_predictions`
8. `risk_assessments`
9. `medical_reports`
10. `report_analyses`
11. `appointments`
12. `appointment_sms_logs`

The following verified relationships will form the ERD:

- `users` 1—many `auth_sessions`, `admin_audit_logs`, `chat_conversations`, `disease_predictions`, `risk_assessments`, `medical_reports`, and `appointments`.
- `users` 1—0/1 `health_profiles` (enforced by unique `user_id`).
- `chat_conversations` 1—many `chat_messages`.
- `medical_reports` 1—0/1 `report_analyses` (enforced by unique `report_id`).
- `appointments` 1—many/0 `appointment_sms_logs`; the log foreign key uses `ON DELETE SET NULL`.

The schema uses InnoDB, primary keys, uniqueness constraints, composite/query indexes, foreign keys, defaults, JSON fields for selected structured values, and cascading deletion for user-owned content where defined. The full column-level table structure must be transcribed from `database/schema.sql`; it will not be inferred from TypeScript types.

## 6. Verified APIs

### Express/Node API

- Health: `GET /api/health`
- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/admin/login`, `POST /api/auth/forgot-password`
- Appointments: `GET|POST /api/appointments`, `PUT|DELETE /api/appointments/:id`
- SMS: `GET /api/sms/status`, `POST /api/admin/sms/test`, `POST /api/sms/test`
- Admin: `GET /api/admin/dashboard`, `/users`, `/appointments`, `/reports`, `/reports/:id/analysis`, `/predictions`, `/sms/status`
- Health profile: `GET|PUT /api/health-profile`
- Reports: `GET|POST /api/reports`, `POST /api/reports/analyze`
- Prediction persistence: `GET|POST /api/disease-predictions`, `GET|POST /api/risk-assessments`
- Chat history: `GET /api/chat/conversations`, `GET|DELETE /api/chat/conversations/:id`, `POST /api/chat`

### FastAPI ML API

- `GET /health`
- `GET /symptoms`
- `POST /predict-disease`
- `POST /predict-risk`

## 7. AI/ML evidence

### Disease prediction

- Dataset stored locally: `disease_prediction/dataset/disease_dataset.csv`.
- Training script processes 4,920 rows, 132 binary symptom features and 41 labelled condition classes.
- 80/20 stratified train/test split using `random_state=42`.
- Candidate models: `DecisionTreeClassifier` and `RandomForestClassifier` (300 estimators).
- Selection rule: macro F1, then accuracy; selected artifact: Random Forest.
- Saved evaluation output records accuracy, macro precision, macro recall and macro F1 of 1.0 for both candidates on this split. This must be reported with dataset/reproducibility limitations; it is **not** evidence of clinical diagnostic accuracy.

### Cardiovascular health-risk prediction

- Dataset named in evaluation output: OpenML dataset 45547, `Cardiovascular-Disease-dataset`.
- The training code cleans invalid records, removes duplicates/missing values, derives age in years and BMI, and uses twelve features.
- 80/20 stratified train/test split using `random_state=42`.
- Candidate pipelines: Logistic Regression (median imputation, scaling, categorical imputation/one-hot encoding) and Random Forest (200 estimators, max depth 12, minimum leaf 10, balanced class weight).
- Selection rule: highest positive-class recall, then F1 and ROC-AUC; selected artifact: Random Forest Classifier.
- The API explicitly describes `predict_proba` output as a model score, not a calibrated medical probability or treatment direction.

The exact risk metrics, train/test row counts, cleaning totals and confusion matrices remain preserved in `ml_backend/risk_prediction/evaluation_results.json` and should be inserted verbatim only after a dedicated result-table review in the later documentation phase.

## 8. Available test evidence

| Evidence | Status | Use in report |
|---|---|---|
| Manual functional suite | Present; explicitly says no cases have been executed | Use as test plan only; actual result/status must remain `NOT EXECUTED` |
| Selenium smoke/login/chat tests and page objects | Present | Test source evidence only; no test-run report, screenshots, or result log was found |
| ML evaluation JSON files | Present | May report recorded training/evaluation results, with methodology and limitations |
| Frontend/unit API test framework | No Vitest/Jest setup found | Do not claim unit-test execution |
| JMeter plan/results | Not found | Do not claim performance testing |
| pytest HTML/JUnit report | Not found | Do not claim executed Selenium results |
| Genuine documentation screenshots | Not found | Capture later from an executing local stack with synthetic data |

## 9. Required diagrams and authoritative source inputs

| Required diagram | Primary source inputs | Current evidence status |
|---|---|---|
| ERD | `database/schema.sql` | Ready to create |
| Use case diagrams | Routes, roles, UI pages, external services | Ready to create after scope review |
| Conceptual class/component diagram | TypeScript services/stores/types, FastAPI request/response models, persistence modules | Ready; label as conceptual where implementation is functional rather than class-based |
| Activity diagrams | Authentication, chatbot, disease/risk prediction, report analysis, appointments, admin authorization | Ready |
| Sequence diagrams | `server.ts`, FastAPI app, React service clients, Twilio service | Ready |
| Deployment diagram | `package.json`, `.env.example`, README, service source | Ready for local development; production deployment is unverified |
| Module hierarchy | `src/`, `backend/`, `database/`, `ml_backend/` | Ready |
| WBS, schedule, Gantt, milestones | Project dates and development history | Blocked pending dates; use only an explicitly labelled illustrative plan if approved |
| Testing architecture | test suite, Selenium configuration, service arrangement | Ready; execution claims blocked pending results |

## 10. Missing information and evidence requested before final documentation

1. **MCA Mini Project Index.pdf** — mandatory for exact institution-required ordering, preliminary pages, margins, cover/binding rules and any subsections not reproduced in the prompt.
2. **Project dates/milestones** — start date, major completion dates and submission date; otherwise schedule/Gantt must be labelled illustrative.
3. **Development hardware and software facts** — OS, processor, RAM, storage, MySQL server version and Python version, or approval to state recommended requirements only.
4. **Live environment evidence** — confirmation that MySQL, Gemini and (if to be documented as operational) Twilio are configured in a safe test environment.
5. **Genuine screenshots** — authenticated user/admin flows with at least five synthetic records where a list/report is shown; no real patient information.
6. **Test executions** — Selenium/manual/API/database test output and any performance results. Without these, all unexecuted results will remain clearly marked.
7. **Institution details** — student name, enrolment number, guide, department/college, academic year and certificate/declaration wording, if required by the official index.
8. **Clarification on non-core UI pages** — whether image analysis, nearby care, notifications and settings have their required external services/persistence implemented, or must be documented as interface-only/currently limited.

## 11. Documentation plan (pending Index PDF validation)

1. **Chapter 1 — Introduction:** verified abstract, existing-system comparison, scope boundaries and technology/environment tables.
2. **Chapter 2 — Analysis and Design:** module specifications; methodology; labelled illustrative schedule if dates remain unavailable; all editable and rendered diagrams; actual schema-derived ERD/table structures; screenshot catalogue only from genuine captures.
3. **Chapter 3 — Coding:** document one complete, substantial verified module—provisionally disease prediction—using actual source only, excluding secrets and generated artifacts.
4. **Chapter 4 — Testing:** test strategy, manual and Selenium test plans, explicit distinction between source plans and executed results, API/database evidence, and an execution summary.
5. **Chapter 5 — Limitations:** evidence-supported ML/generalization, external-service, connectivity, report-analysis, privacy, scalability and clinical-use constraints.
6. **Chapter 6 — Proposed Enhancements:** clearly future-facing improvements only.
7. **Chapter 7 — Conclusion:** verified implementation and appropriately qualified outcomes.
8. **Chapter 8 — Bibliography:** IEEE-style references validated against official documentation and primary academic/dataset sources.
9. **Quality control:** compliance matrix against the supplied Index PDF; source-to-claim mapping; diagram/readability review; document/PDF visual inspection.

## 12. Phase 1 conclusion

The codebase supports a substantial academic report, but the final report must not claim production deployment, clinical validity, executed functional/browser/performance tests, real screenshots, or configured external services without additional evidence. The next phase should create the chapter-evidence matrix only after the official PDF and the missing project facts above are supplied or explicitly waived.
