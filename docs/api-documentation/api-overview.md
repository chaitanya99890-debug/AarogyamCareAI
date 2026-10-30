# API Overview

Local base URLs: Node API `http://localhost:3000/api`; ML API `http://127.0.0.1:8000`.

| Group | Representative endpoints |
| --- | --- |
| Health | `GET /api/health` |
| Authentication | `POST /api/auth/register`, `/login`, `/admin/login`, `/forgot-password` |
| Profile | `GET`, `PUT /api/health-profile` |
| Chat | `GET /api/chat/conversations`, `GET /api/chat/conversations/:id/messages`, `DELETE /api/chat/conversations/:id`, `POST /api/chat` |
| Predictions | `POST`, `GET /api/disease-predictions`; `POST`, `GET /api/risk-assessments` |
| Reports | `GET`, `POST /api/reports`; `POST /api/reports/analyze` |
| Appointments | `GET`, `POST /api/appointments`; `PUT`, `DELETE /api/appointments/:id` |
| Administration | `GET /api/admin/dashboard`, `/users`, `/appointments`, `/reports`, `/predictions`, `/sms/status`; `POST /api/admin/sms/test` |
| ML service | `GET /health`, `GET /symptoms`, `POST /predict-disease`, `POST /predict-risk` |

Authenticated Node routes use the existing bearer-token mechanism. Administrative routes require a valid administrator session. The local Postman collection is located at `tests/api/AarogyamCareAI.postman_collection.json`; never export a collection environment containing credentials.
