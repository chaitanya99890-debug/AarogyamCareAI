"""Fast, artifact-level regression tests for the cardiovascular risk module."""

from __future__ import annotations

import sys
from pathlib import Path
import unittest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "backend" / "ml-backend"))

from app import RiskPredictionRequest, predict_risk  # noqa: E402
from fastapi import HTTPException  # noqa: E402
from risk_prediction.predict import RiskPredictionError, get_risk_predictor  # noqa: E402
from risk_prediction.validation import model_support_warnings  # noqa: E402


VALID_VALUES = {
    "age_years": 40.0, "height": 170.0, "weight": 90.0,
    "systolic_bp": 120.0, "diastolic_bp": 80.0,
    "bmi": 90 / 1.7**2, "gender": 2, "cholesterol": 2, "glucose": 1,
    "smoking": 1, "alcohol": 1, "physical_activity": 0,
}


class RiskPredictionRegressionTests(unittest.TestCase):
    def test_valid_feature_vector_matches_saved_model_and_predicts(self) -> None:
        predictor = get_risk_predictor()
        self.assertEqual(list(predictor.model.feature_names_in_), list(VALID_VALUES))
        prediction, score = predictor.predict(VALID_VALUES)
        self.assertIn(prediction, (0, 1))
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 1.0)

    def test_training_support_warning_requires_verification_for_65_mmhg(self) -> None:
        warnings = model_support_warnings({
            "age": 40, "height": 170, "weight": 90,
            "systolic_bp": 65, "diastolic_bp": 63,
        })
        self.assertEqual(len(warnings), 1)
        self.assertIn("outside the range used to train", warnings[0])

    def test_validations_reject_missing_and_invalid_categories(self) -> None:
        with self.assertRaises(Exception):
            RiskPredictionRequest.model_validate({})
        with self.assertRaises(Exception):
            RiskPredictionRequest.model_validate({
                "age": 40, "gender": "other", "height": 170, "weight": 90,
                "systolic_bp": 120, "diastolic_bp": 80, "cholesterol": 1,
                "glucose": 1, "smoking": False, "alcohol": False, "physical_activity": True,
            })

    def test_prediction_failure_is_safely_wrapped(self) -> None:
        predictor = get_risk_predictor()
        original_model = predictor.model
        predictor.model = object()
        try:
            with self.assertRaises(RiskPredictionError):
                predictor.predict(VALID_VALUES)
        finally:
            predictor.model = original_model

    def test_api_requires_confirmation_then_returns_structured_result(self) -> None:
        request = RiskPredictionRequest.model_validate({
            "age": 40, "gender": "male", "height": 170, "weight": 90,
            "systolic_bp": 65, "diastolic_bp": 63, "cholesterol": 2,
            "glucose": 1, "smoking": True, "alcohol": True, "physical_activity": False,
        })
        with self.assertRaises(HTTPException) as context:
            predict_risk(request)
        self.assertEqual(context.exception.status_code, 400)
        self.assertTrue(context.exception.detail["requires_confirmation"])

        response = predict_risk(request.model_copy(update={"confirm_unusual_readings": True}))
        self.assertIn(response.prediction, (0, 1))
        self.assertEqual(response.input_warnings and len(response.input_warnings), 1)
        self.assertIn("Smoking was reported.", response.reported_input_context)


if __name__ == "__main__":
    unittest.main()
