# Selenium Test Execution Report

**Project:** AarogyamCareAI  
**Execution date:** 20 October 2026  
**Result:** PASS

## Environment and command

The controlled local stack was started with `npm run dev:test`. It runs the user UI on port 5173, administrator UI on port 5174, Node API on port 3000, and FastAPI ML service on port 8000. Gemini chat and report analysis used deterministic local mock responses for repeatable automation.

```powershell
.\tests\.venv\Scripts\python.exe -m pytest tests\e2e\selenium -v --html="output\testing\reports\selenium-report-20261020-164529.html" --self-contained-html
```

## Actual result

| Metric | Result |
| --- | ---: |
| Collected tests | 20 |
| Passed | 20 |
| Failed | 0 |
| Skipped | 0 |
| Duration | 372.31 seconds (6 minutes 12 seconds) |

## Coverage achieved

| Module | Tests | Verified behavior |
| --- | ---: | --- |
| Landing-page smoke | 1 | Application-specific landing content renders |
| Authentication | 4 | Empty/invalid login validation, valid synthetic login, logout route protection |
| Chatbot | 3 | Empty-message prevention, mocked message exchange, conversation-history persistence |
| Disease prediction | 2 | Symptom validation and real local ML result rendering |
| Health-risk prediction | 3 | Required fields, blood-pressure rule, real local ML result rendering |
| Report analysis | 2 | File-required validation and mocked structured analysis rendering |
| Appointments | 2 | Validation, create, refresh persistence, edit, deletion, deletion persistence |
| Administration | 3 | User restriction, role-specific login rejection, administrator navigation, SMS-control visibility, logout |

## Evidence

The self-contained report is available at:

- [selenium-report-20261020-164529.html](../reports/selenium-report-20261020-164529.html)

Failure screenshots are configured to be captured automatically during future runs. This execution had no failures, so no failure screenshot was generated.

## Limitations

The chat and report-analysis assertions intentionally use local deterministic mock responses. They do not certify live Gemini availability or behavior. No real SMS message was sent.
