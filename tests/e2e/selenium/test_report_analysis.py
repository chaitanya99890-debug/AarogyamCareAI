"""Selenium coverage for deterministic report analysis using a local PNG asset."""

from pathlib import Path

from selenium.webdriver.remote.webdriver import WebDriver

from pages.login_page import LoginPage
from pages.report_analysis_page import ReportAnalysisPage


PROJECT_ROOT = Path(__file__).resolve().parents[3]
SYNTHETIC_PNG = PROJECT_ROOT / "frontend" / "src" / "assets" / "hero.png"


def login_as_test_user(driver: WebDriver, credentials: tuple[str, str]) -> None:
    login_page = LoginPage(driver)
    login_page.open()
    login_page.login(*credentials)
    login_page.wait_for_dashboard()


def test_report_analysis_requires_a_file(driver: WebDriver, test_user_credentials: tuple[str, str]) -> None:
    login_as_test_user(driver, test_user_credentials)
    page = ReportAnalysisPage(driver)
    page.open()
    page.analyze()
    page.wait_for_error("Please upload a report first.")


def test_report_analysis_renders_mocked_structured_result(driver: WebDriver, test_user_credentials: tuple[str, str]) -> None:
    assert SYNTHETIC_PNG.is_file(), "The local synthetic PNG fixture is missing."
    login_as_test_user(driver, test_user_credentials)
    page = ReportAnalysisPage(driver)
    page.open()
    page.select_file(SYNTHETIC_PNG)
    page.analyze()
    page.wait_for_mock_result()
