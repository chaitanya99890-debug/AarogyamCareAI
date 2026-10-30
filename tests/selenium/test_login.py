"""Selenium coverage for user login validation and logout."""

import secrets
import uuid

from selenium.webdriver.remote.webdriver import WebDriver

from pages.login_page import LoginPage
from test_config import USER_BASE_URL


def test_login_rejects_empty_credentials(driver: WebDriver) -> None:
    page = LoginPage(driver)
    page.open()
    driver.find_element(*page._LOGIN).click()

    errors = page.validation_messages()
    assert "Please enter a valid email address." in errors
    assert "Password is required." in errors


def test_login_rejects_invalid_credentials(driver: WebDriver) -> None:
    page = LoginPage(driver)
    page.open()

    # Generated at runtime: no password value is stored in source control.
    page.login(f"invalid-{uuid.uuid4().hex}@example.test", secrets.token_urlsafe(24))

    assert page.error_message() == "Incorrect email or password. Please try again."


def test_login_accepts_dedicated_synthetic_user(
    driver: WebDriver, test_user_credentials: tuple[str, str]
) -> None:
    page = LoginPage(driver)
    page.open()
    page.login(*test_user_credentials)

    page.wait_for_dashboard()


def test_logout_ends_browser_session(
    driver: WebDriver, test_user_credentials: tuple[str, str]
) -> None:
    page = LoginPage(driver)
    page.open()
    page.login(*test_user_credentials)
    page.wait_for_dashboard()

    page.logout()
    driver.get(f"{USER_BASE_URL}/dashboard")
    assert "/login" in driver.current_url
