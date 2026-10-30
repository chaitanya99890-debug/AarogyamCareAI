"""Shared Selenium fixtures and failure evidence for browser tests."""

from datetime import datetime
from pathlib import Path
import os

import pytest
from pytest_html import extras
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.remote.webdriver import WebDriver


SCREENSHOT_DIR = Path(__file__).resolve().parents[1] / "screenshots"


def chrome_options() -> Options:
    """Return consistent Chrome options for every browser test."""
    options = Options()
    options.add_argument("--window-size=1440,1000")
    if os.environ.get("SELENIUM_HEADLESS", "").strip().lower() in {"1", "true", "yes"}:
        options.add_argument("--headless=new")
    return options


@pytest.fixture
def test_user_credentials() -> tuple[str, str]:
    """Read an explicitly configured synthetic account; never store it in test code."""
    email = os.environ.get("TEST_USER_EMAIL", "").strip()
    password = os.environ.get("TEST_USER_PASSWORD", "")
    if not email or not password:
        pytest.skip("Set TEST_USER_EMAIL and TEST_USER_PASSWORD for authenticated Selenium tests.")
    return email, password


@pytest.fixture
def test_admin_credentials() -> tuple[str, str]:
    """Read a dedicated administrator account without placing secrets in source."""
    email = os.environ.get("TEST_ADMIN_EMAIL", "").strip()
    password = os.environ.get("TEST_ADMIN_PASSWORD", "")
    if not email or not password:
        pytest.skip("Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD for administrator Selenium tests.")
    return email, password


@pytest.fixture
def driver() -> WebDriver:
    """Provide a fresh Chrome session for each test and close it reliably."""
    browser = webdriver.Chrome(options=chrome_options())
    yield browser
    browser.quit()


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item: pytest.Item, call: pytest.CallInfo[object]):
    """Save the current browser view only when a Selenium test fails."""
    outcome = yield
    report = outcome.get_result()
    if report.when != "call" or not report.failed:
        return

    browser = item.funcargs.get("driver")
    if not isinstance(browser, WebDriver):
        return

    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    browser.save_screenshot(str(SCREENSHOT_DIR / f"failed-{item.name}-{timestamp}.png"))

    # pytest-html embeds this evidence when the report is created with
    # --self-contained-html, so the report remains portable.
    report.extras = getattr(report, "extras", [])
    report.extras.append(
        extras.png(browser.get_screenshot_as_base64(), name="Failure screenshot")
    )
