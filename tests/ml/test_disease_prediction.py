"""Artifact-level regression coverage for disease prediction serving."""

from __future__ import annotations

import sys
from pathlib import Path
import unittest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "backend" / "ml-backend"))

from disease_prediction.predict import PredictionError, get_predictor  # noqa: E402


class DiseasePredictionRegressionTests(unittest.TestCase):
    def test_saved_artifact_exposes_symptoms_and_predicts(self) -> None:
        predictor = get_predictor()
        self.assertGreater(len(predictor.available_symptoms), 0)
        prediction, confidence = predictor.predict([predictor.available_symptoms[0]])
        self.assertTrue(prediction)
        self.assertGreaterEqual(confidence, 0.0)
        self.assertLessEqual(confidence, 1.0)

    def test_unknown_symptom_returns_a_safe_error(self) -> None:
        with self.assertRaises(PredictionError):
            get_predictor().predict(["not a model symptom"])


if __name__ == "__main__":
    unittest.main()
