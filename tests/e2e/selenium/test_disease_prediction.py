"""Selenium coverage for the authenticated disease-prediction workflow."""

from selenium.webdriver.remote.webdriver import WebDriver

from pages.disease_prediction_page import DiseasePredictionPage
from pages.login_page import LoginPage


def login_as_test_user(driver: WebDriver, credentials: tuple[str, str]) -> None:
    login_page = LoginPage(driver)
    login_page.open()
    login_page.login(*credentials)
    login_page.wait_for_dashboard()


def test_disease_prediction_requires_at_least_one_symptom(driver: WebDriver, test_user_credentials: tuple[str, str]) -> None:
    login_as_test_user(driver, test_user_credentials)
    page = DiseasePredictionPage(driver)
    page.open()
    page.predict_without_symptoms()
    page.wait_for_error("Please select at least one symptom before predicting.")


def test_disease_prediction_displays_real_model_result(driver: WebDriver, test_user_credentials: tuple[str, str]) -> None:
    login_as_test_user(driver, test_user_credentials)
    page = DiseasePredictionPage(driver)
    page.open()
    page.select_first_symptoms()
    page.predict()

    assert page.wait_for_result().strip()
