# AarogyamCareAI Manual Functional Test Suite

**Document status:** Ready for execution.  
**Execution status:** No manual case in this document has been executed yet.  
**Data policy:** Use the synthetic accounts and synthetic report files below; never enter real patient data, real telephone numbers, or production credentials.

## Test environment and data

Start the local stack from the repository root:

```powershell
npm.cmd run dev:all
```

Expected services: user UI `http://localhost:5173`, admin UI `http://localhost:5174`, Node API `http://localhost:3000`, and ML API `http://localhost:8000`. MySQL must be available for database-backed flows.

Create these dedicated accounts before testing (or record their existing non-production equivalents):

| Alias | Role | Purpose |
| --- | --- | --- |
| `TEST_USER_A` | user | Primary functional-test account |
| `TEST_USER_B` | user | Data-isolation checks |
| `TEST_ADMIN` | admin | Admin-panel checks |

Suggested synthetic input: symptoms returned by `/symptoms`; risk values age `35`, female, height `165`, weight `62`, systolic `120`, diastolic `80`, cholesterol `1`, glucose `1`, smoking `false`, alcohol `false`, physical activity `true`; appointment doctor `Dr Test`, a future date, time `10:00`, reminder `30m`.

Prepare harmless local files: a PNG, JPG, PDF, unsupported TXT, and a PDF/PNG larger than 10 MB. Do not use genuine medical reports.

## Recording rules

- Enter the observed browser/API/database evidence in **Actual result** while executing the case.
- Change **Status** only to `PASS`, `FAIL`, or `BLOCKED` after execution. Retain `NOT EXECUTED` otherwise.
- Record a defect ID beside a failed case. Severity guidance: Critical = security/data loss; High = core workflow unavailable; Medium = incorrect validation/persistence; Low = cosmetic or usability issue.

## Authentication and session handling

| ID | Module / objective | Preconditions | Steps | Test data | Expected result | Actual result | Status | Severity if failed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-01 | User login with valid credentials | Node API, MySQL, and `TEST_USER_A` available | 1. Open `/login`. 2. Enter valid email/password. 3. Select Login. | `TEST_USER_A` | Navigates to `/dashboard`; authenticated user session is active. | NOT EXECUTED | NOT EXECUTED | High |
| AUTH-02 | Reject invalid user login | Login page open | 1. Enter valid-format email with wrong password. 2. Select Login. | Wrong password | Stays on login page and shows an incorrect-credentials message; no session is created. | NOT EXECUTED | NOT EXECUTED | High |
| AUTH-03 | Validate empty login credentials | Login page open | 1. Leave fields blank. 2. Select Login. | Empty email/password | Email and password validation messages display; no API login is attempted. | NOT EXECUTED | NOT EXECUTED | Medium |
| AUTH-04 | Logout ends user session | `TEST_USER_A` is logged in | 1. Use the dashboard logout control. 2. Attempt to open `/dashboard` in the same browser. | None | Returns to user login and protected dashboard is inaccessible without signing in. | NOT EXECUTED | NOT EXECUTED | High |
| AUTH-05 | Session survives permitted refresh and protects routes | `TEST_USER_A` is logged in | 1. Refresh `/dashboard`. 2. Open a protected route in a new tab. 3. Logout and repeat. | None | Session remains available before logout; protected routes redirect after logout. | NOT EXECUTED | NOT EXECUTED | High |

## Gemini chatbot and chat history

| ID | Module / objective | Preconditions | Steps | Test data | Expected result | Actual result | Status | Severity if failed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CHAT-01 | Send valid health-information question | `TEST_USER_A` logged in; Node API and configured Gemini key available | 1. Open `/chat`. 2. Enter a question. 3. Send. | `What are common causes of a mild headache?` | User message renders, loading indicator appears, and an informational assistant reply renders with the disclaimer. | NOT EXECUTED | NOT EXECUTED | High |
| CHAT-02 | Prevent empty message | Chat open | 1. Leave chat input blank/whitespace. 2. Try to send. | Empty text | Send control remains unavailable or no request is sent; no empty message renders. | NOT EXECUTED | NOT EXECUTED | Medium |
| CHAT-03 | Handle Gemini/API failure safely | Logged in; temporarily use unavailable AI configuration only in local test environment | 1. Send a valid question while the AI service is unavailable. 2. Observe message. | Valid question | A safe, understandable error appears; no token, stack trace, or secret is shown. | NOT EXECUTED | NOT EXECUTED | High |
| CHAT-04 | Verify conversation persistence and history | Complete CHAT-01 successfully | 1. Open `/chat-history`. 2. Find the conversation. 3. Open it. 4. Refresh. | CHAT-01 conversation | Conversation title/preview appears; original messages load after reopening and refresh. | NOT EXECUTED | NOT EXECUTED | High |
| CHAT-05 | Delete only selected conversation | At least two test conversations exist | 1. Delete one history entry. 2. Refresh. 3. Open the other entry. | Two synthetic chats | Deleted conversation is absent after refresh; other conversation is intact. | NOT EXECUTED | NOT EXECUTED | Medium |

## Disease prediction

| ID | Module / objective | Preconditions | Steps | Test data | Expected result | Actual result | Status | Severity if failed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DIS-01 | Obtain symptom list and make a valid prediction | Logged in; ML API and disease model available | 1. Open `/disease-prediction`. 2. Select one or more offered symptoms. 3. Predict. | Model-provided symptoms | A possible-condition result, numeric confidence, and educational disclaimer display. | NOT EXECUTED | NOT EXECUTED | High |
| DIS-02 | Validate no symptoms selected | Disease prediction page loaded | 1. Select no symptoms. 2. Try Predict. | None | Prediction action is disabled or validation prevents a request. | NOT EXECUTED | NOT EXECUTED | Medium |
| DIS-03 | Constrain invalid symptom input | Disease prediction page loaded | 1. Inspect available choices. 2. Try to select an unsupported symptom through the UI. | A symptom not in `/symptoms` | UI permits only model-supplied symptoms; unsupported free-text input cannot be submitted. Malformed payload validation is covered in API testing. | NOT EXECUTED | NOT EXECUTED | Medium |
| DIS-04 | Handle ML service failure | Logged in; controlled local ML outage | 1. Select valid symptoms. 2. Submit while ML API is unavailable. 3. Retry after recovery. | Valid selected symptoms | Clear availability error is shown without application crash or internal traceback; retry succeeds after recovery. | NOT EXECUTED | NOT EXECUTED | High |
| DIS-05 | Persist prediction history | Complete DIS-01 with Node API/MySQL available | 1. Make prediction. 2. Confirm through later API/database test or admin Predictions page. | DIS-01 result | One history record belongs to `TEST_USER_A`, with selected symptoms, result, confidence, and model name. | NOT EXECUTED | NOT EXECUTED | High |

## Health risk prediction

| ID | Module / objective | Preconditions | Steps | Test data | Expected result | Actual result | Status | Severity if failed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RISK-01 | Submit valid cardiovascular input | Logged in; ML API and risk model available | 1. Open `/risk-prediction`. 2. Complete every field. 3. Select Check Health Risk. | Suggested synthetic risk data | Displays Lower/ Higher Risk, model name, score, and educational notice. | NOT EXECUTED | NOT EXECUTED | High |
| RISK-02 | Validate missing fields | Risk page open | 1. Leave all fields empty. 2. Select Check Health Risk. | Empty form | Field-specific required/selection errors display; no ML request is made. | NOT EXECUTED | NOT EXECUTED | Medium |
| RISK-03 | Validate invalid numeric and blood-pressure relation | Risk page open | 1. Enter age below 18 or height above 250. 2. Enter systolic less than/equal to diastolic. 3. Submit. | `age=17`; `120/120` BP | Range and blood-pressure validation messages display; no result is shown. | NOT EXECUTED | NOT EXECUTED | Medium |
| RISK-04 | Persist health-risk assessment | Complete RISK-01 with Node API/MySQL available | 1. Submit valid assessment. 2. Confirm through later API/database test or admin Predictions page. | RISK-01 result | One assessment record belongs to `TEST_USER_A`, with input snapshot, result, probability, and model name. | NOT EXECUTED | NOT EXECUTED | High |

## Health reports and report analysis

| ID | Module / objective | Preconditions | Steps | Test data | Expected result | Actual result | Status | Severity if failed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REP-01 | Upload supported PNG metadata | Logged in; Node API/MySQL available | 1. Open `/reports`. 2. Browse for PNG. 3. Upload. 4. Refresh. | Synthetic PNG | Selected filename is shown; report entry appears with upload status and persists after refresh. | NOT EXECUTED | NOT EXECUTED | High |
| REP-02 | Upload supported JPG and PDF metadata | Logged in | Repeat REP-01 once for JPG and once for PDF. | Synthetic JPG/PDF | Each file is accepted and appears as a distinct report record. | NOT EXECUTED | NOT EXECUTED | High |
| REP-03 | Reject unsupported type for analysis | Logged in | 1. Open `/report-analysis`. 2. Select TXT. 3. Analyze. | Synthetic TXT | Error states that only PDF, PNG, or JPG are accepted; no analysis starts. | NOT EXECUTED | NOT EXECUTED | Medium |
| REP-04 | Reject oversized report analysis input | Logged in | 1. Select supported file larger than 10 MB. 2. Analyze. | Synthetic >10 MB PDF/PNG | Error states the report must be smaller than 10 MB; no model request succeeds. | NOT EXECUTED | NOT EXECUTED | Medium |
| REP-05 | Analyze supported PNG/JPG/PDF | Logged in; Node API and Gemini configured | 1. Select each supported synthetic report. 2. Analyze. | Synthetic PNG, JPG, PDF | Results show Summary, Key Findings, Important Values, Possible Concerns, and Questions to Ask a Doctor, plus disclaimer. | NOT EXECUTED | NOT EXECUTED | High |
| REP-06 | Handle report-analysis API failure | Logged in; controlled local AI outage | 1. Select valid report. 2. Analyze during outage. | Valid synthetic report | Safe user-facing error displays; no raw base64 data, secret, or stack trace is exposed. | NOT EXECUTED | NOT EXECUTED | High |
| REP-07 | Verify report-analysis persistence | Complete REP-05 with MySQL available | 1. Navigate to admin Reports as `TEST_ADMIN`. 2. Locate report. 3. View analysis if provided. | REP-05 report | Metadata and analysis status/summary are present; raw uploaded file is not exposed in the admin UI. | NOT EXECUTED | NOT EXECUTED | High |

## Appointments and SMS consent

| ID | Module / objective | Preconditions | Steps | Test data | Expected result | Actual result | Status | Severity if failed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| APT-01 | Create appointment without SMS consent | Logged in | 1. Open `/appointments`. 2. Fill doctor, future date/time, reminder. 3. Keep SMS consent off. 4. Save. | Suggested synthetic appointment | Appointment appears as upcoming; SMS status is Not scheduled; record persists after refresh. | NOT EXECUTED | NOT EXECUTED | High |
| APT-02 | Validate appointment required fields | Appointments page open | 1. Clear doctor/date/time as permitted. 2. Save. | Missing required values | Required-field error appears; no invalid record is created. | NOT EXECUTED | NOT EXECUTED | Medium |
| APT-03 | Enforce SMS consent and E.164 phone validation | Appointments page open | 1. Enable SMS consent without phone. 2. Save. 3. Enter malformed phone and retry. | Empty phone; `98765` | Explains phone is required with consent and requires international E.164 format. | NOT EXECUTED | NOT EXECUTED | Medium |
| APT-04 | Create SMS-consented appointment safely | Twilio configuration status known; use a permitted synthetic/test recipient only | 1. Enter valid E.164 test number. 2. Consent to SMS. 3. Save. | Authorized test number only | Appointment is scheduled or clearly reports service unavailability; no SMS is sent without explicit consent. | NOT EXECUTED | NOT EXECUTED | High |
| APT-05 | Edit, cancel, and verify persistence | Complete APT-01 | 1. Edit doctor/time and save. 2. Refresh. 3. Delete. 4. Refresh. | APT-01 item | Edit survives refresh; delete removes the item from the current user only. | NOT EXECUTED | NOT EXECUTED | High |

## Admin panel and role restrictions

| ID | Module / objective | Preconditions | Steps | Test data | Expected result | Actual result | Status | Severity if failed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ADM-01 | Admin login and dashboard | `TEST_ADMIN` exists; Node/MySQL available | 1. Open `/admin/login`. 2. Sign in with admin account. | `TEST_ADMIN` | Opens `/admin`; dashboard displays database-backed metrics or a safe availability error. | NOT EXECUTED | NOT EXECUTED | High |
| ADM-02 | Monitor users and appointments | Admin logged in; test data exists | 1. Open Users. 2. Search/filter role and paginate if applicable. 3. Open Appointments. | Test accounts/appointments | User and appointment information renders; password hashes and patient phone numbers are not displayed. | NOT EXECUTED | NOT EXECUTED | High |
| ADM-03 | Monitor reports and ML predictions | Admin logged in; REP-05/DIS-01/RISK-01 data exists | 1. Open Reports. 2. View available analysis. 3. Open ML Predictions. | Prior synthetic records | Only metadata/analysis output and stored prediction summaries appear; raw files and model-management controls are absent. | NOT EXECUTED | NOT EXECUTED | High |
| ADM-04 | Check SMS UI and test function | Admin logged in; Twilio status known | 1. Open SMS & Reminders. 2. Confirm configuration state. 3. Use only an authorized test recipient if sending. | Authorized test recipient | SMS UI is admin-only; validation rejects invalid phone/message; result records success/failure safely. | NOT EXECUTED | NOT EXECUTED | High |
| ADM-05 | Prevent normal-user admin access | `TEST_USER_A` logged in | 1. Browse to `/admin`. 2. Try each admin navigation URL. 3. Call no admin actions. | Normal user | UI redirects to dashboard and direct protected API calls later return 403, not data. | NOT EXECUTED | NOT EXECUTED | Critical |

## Execution log

| Date/time | Tester | Test IDs run | Build/commit | Browser | Passed | Failed | Blocked | Notes / defect IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NOT EXECUTED |  |  |  |  | 0 | 0 | 0 |  |
