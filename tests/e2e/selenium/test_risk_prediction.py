"""Selenium coverage for the authenticated health-risk prediction workflow."""

from selenium.webdriver.remote.webdriver import WebDriver

from pages.login_page import LoginPage
from pages.risk_prediction_page import RiskPredictionPage


def login_as_test_user(driver: WebDriver, credentials: tuple[str, str]) -> None:
    login_page = LoginPage(driver)
    login_page.open()
    login_page.login(*credentials)
    login_page.wait_for_dashboard()


def test_health_risk_prediction_requires_all_fields(driver: WebDriver, test_user_credentials: tuple[str, str]) -> None:
    login_as_test_user(driver, test_user_credentials)
    page = RiskPredictionPage(driver)
    page.open()
    page.submit()
    page.wait_for_error("Age is required.")
    page.wait_for_error("Please select a gender.")


def test_health_risk_prediction_validates_blood_pressure_relation(driver: WebDriver, test_user_credentials: tuple[str, str]) -> None:
    login_as_test_user(driver, test_user_credentials)
    page = RiskPredictionPage(driver)
    page.open()
    page.complete_valid_form()
    page.set_numeric("Systolic blood pressure (mmHg)", "120")
    page.set_numeric("Diastolic blood pressure (mmHg)", "120")
    page.submit()
    page.wait_for_error("Diastolic pressure should be lower than systolic pressure.")


def test_health_risk_prediction_displays_real_model_result(driver: WebDriver, test_user_credentials: tuple[str, str]) -> None:
    login_as_test_user(driver, test_user_credentials)
    page = RiskPredictionPage(driver)
    page.open()
    page.complete_valid_form()
    page.submit()
    assert page.wait_for_result() in {"LOWER RISK", "HIGHER RISK"}


def test_health_risk_prediction_requires_confirmation_for_outside_training_support(driver: WebDriver, test_user_credentials: tuple[str, str]) -> None:
    login_as_test_user(driver, test_user_credentials)
    page = RiskPredictionPage(driver)
    page.open()
    page.complete_valid_form()
    page.set_numeric("Systolic blood pressure (mmHg)", "65")
    page.set_numeric("Diastolic blood pressure (mmHg)", "63")
    page.submit()
    page.wait_for_error("Please verify the unusual measurement")
    page.confirm_unusual_measurements()
    page.submit()
    assert page.wait_for_result() in {"LOWER RISK", "HIGHER RISK"}
