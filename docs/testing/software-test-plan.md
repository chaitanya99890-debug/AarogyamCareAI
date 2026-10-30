# AarogyamCareAI Software Test Plan

**Project:** AarogyamCareAI — AI-Powered Healthcare Companion  
**Document status:** Active  
**Prepared:** 20 October 2026

## 1. Objectives and scope

This plan verifies that AarogyamCareAI provides reliable, authorized, and safe healthcare-information workflows without using real patient data. The scope covers the React/Vite user and administrator interfaces, the Node.js API, FastAPI machine-learning service, and MySQL-backed persistence.

In scope are authentication, role-based administration, chat history, disease and health-risk prediction, report analysis, appointments, and database-backed user isolation. Live Gemini and Twilio services are not load-tested; controlled mock responses are used for routine browser automation.

## 2. Test environment

| Component | Test environment |
| --- | --- |
| User UI | React/Vite, `http://localhost:5173` |
| Admin UI | React/Vite admin mode, `http://localhost:5174` |
| Node API | Node.js/Express, `http://localhost:3000` |
| ML API | FastAPI, `http://127.0.0.1:8000` |
| Persistence | Local MySQL, `aarogyamcareai` schema |
| Browser tests | Python 3.14.2, Selenium 4.51.0, pytest 9.1.1, pytest-html 4.2.0, Chrome |
| Performance tool | Apache JMeter 5.6.3 with Java 21 |

All test accounts, appointment data, questions, and report files must be synthetic. Credentials, API keys, database passwords, and real health data must never be committed or placed in reports.

## 3. Test strategy

| Category | Purpose | Primary tool | Status rule |
| --- | --- | --- | --- |
| Manual functional testing | Validate workflows and usability | Browser + manual suite | Mark only after manual execution |
| UI regression testing | Repeatable browser checks for core workflows | Selenium, pytest | Evidence from pytest result and screenshots |
| API testing | Validate status codes, schemas, authorization, and errors | Postman | Execute only against local controlled services |
| Integration testing | Verify UI, API, ML, and MySQL work together | Selenium + controlled local stack | Use synthetic data and mocks where needed |
| Database testing | Verify persistence, constraints, and relationships | MySQL Workbench | Prefer read-only verification or isolated records |
| Performance testing | Establish controlled response-time baselines | JMeter | Start with low load and increase only with approval |
| Security testing | Verify authentication, authorization, validation, and secret hygiene | Source review + safe local requests | No brute force, destructive payloads, or uncontrolled scans |
| Regression testing | Detect functional regressions after changes | Full Selenium suite | Record actual pass/fail/skip counts |

## 4. Entry and exit criteria

**Entry criteria:** local services are running; MySQL is available; dedicated user and admin test accounts exist; test credentials are supplied through environment variables rather than source code.

**Exit criteria:** planned tests are executed or explicitly marked `NOT EXECUTED`; failures have evidence and a disposition; generated reports identify their actual execution date and environment.

## 5. Risks and controls

| Risk | Control |
| --- | --- |
| Real data disclosure | Use synthetic accounts/files; avoid raw health-record output in evidence |
| External-service cost or side effects | Mock Gemini; do not send test SMS; do not load-test third-party services |
| Test data left behind | Use unique test data and delete temporary chats/appointments where supported |
| Unreliable browser timing | Use Selenium explicit waits, not arbitrary sleeps |
| Regression during testing | Keep test code separate from application logic; make minimal test-only seams only when needed |
| Misleading results | Never report unexecuted tests as passed |

## 6. Documentation index

- Detailed manual cases: [manual-functional-test-suite.md](manual-functional-test-suite.md)
- Selenium evidence: [selenium-test-execution-report.md](selenium-test-execution-report.md)
- Resolved test-automation issues: [defect-report.md](defect-report.md)
- Consolidated status: [test-summary-report.md](test-summary-report.md)
