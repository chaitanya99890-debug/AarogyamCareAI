# AarogyamCareAI ML backend

This small FastAPI service powers Module 2: educational disease/condition prediction from selected symptoms. It is separate from the existing Node/Express Gemini chatbot backend and does not replace or call it.

## Dataset

`disease_prediction/dataset/disease_dataset.csv` is the public **Disease Prediction Using Machine Learning** symptom dataset. It has 4,920 rows, 132 binary symptom columns, and a `prognosis` target with 41 condition classes.

- Original public dataset: [Kaggle — kaushil268/disease-prediction-using-machine-learning](https://www.kaggle.com/datasets/kaushil268/disease-prediction-using-machine-learning)
- Downloaded CSV mirror: [anujdutt9/Disease-Prediction-from-Symptoms](https://github.com/anujdutt9/Disease-Prediction-from-Symptoms/tree/master/dataset)

The dataset is intended here solely for an academic demonstration. Its labels and model output are **not** medical diagnoses.

## Run locally

From the project root, create and install the local Python environment once:

```powershell
py -m venv backend\ml-backend\.python-runtime
backend\ml-backend\.python-runtime\Scripts\python.exe -m pip install -r backend\ml-backend\requirements.txt
```

Then train or run the API from the project root:

```powershell
npm run ml:train
npm run ml:server
```

The trainer uses a stratified 80/20 train/test split with `random_state=42`, trains a Decision Tree and Random Forest, prints accuracy/precision/recall/macro F1 and confusion matrices, then saves the chosen model and its label encoder. It also writes the precise results to `disease_prediction/evaluation_results.json`.

## API

- `GET /health` — returns `{"status":"ok"}`
- `GET /symptoms` — returns the symptom labels supported by the saved model
- `POST /predict-disease` — accepts `{"symptoms":["fever", "cough"]}`

The API returns an HTTP 503 until the training artifacts exist. It loads those artifacts once, rather than retraining on predictions.
