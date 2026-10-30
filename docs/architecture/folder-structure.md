# Folder Structure

```text
frontend/                 React application source, static assets, Vite configuration
backend/node-api/src/     Express entry point, auth, admin and service modules
backend/ml-backend/       FastAPI app, ML artifacts, datasets and training modules
database/                 MySQL connection, schema and migrations
tests/api/                Local Postman collection
tests/e2e/selenium/       Browser test suite and page objects
tests/integration/server/ Node integration-level scripts
tests/ml/                 Model-serving tests
tests/performance/jmeter/ JMeter plans and local tool artifacts
scripts/                  Startup, database, development, documentation and maintenance utilities
docs/                     Architecture, API, diagrams, project-report and testing documentation
output/                   Generated presentations and test evidence
logs/                     Local runtime logs ignored by Git
```

Generated folders such as `node_modules/`, Python virtual environments, `.python-runtime/`, `dist/`, caches and logs remain outside source control.
