"""Minimal browser smoke test for the real AarogyamCareAI landing page."""

from datetime import datetime
from pathlib import Path

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from conftest import chrome_options
from test_config import USER_BASE_URL


APP_URL = USER_BASE_URL
SCREENSHOT_DIR = Path(__file__).resolve().parents[1] / "screenshots"


def test_landing_page_renders_healthcare_companion_heading() -> None:
    """Open the app, verify its main landing heading, and capture evidence."""
    from selenium import webdriver

    driver: WebDriver = webdriver.Chrome(options=chrome_options())

    try:
        driver.get(APP_URL)

        # Explicit wait: Selenium proceeds only after the real application heading is visible.
        heading = WebDriverWait(driver, 15).until(
            EC.visibility_of_element_located(
                (By.XPATH, "//h1[normalize-space()='Your Intelligent Healthcare Companion']")
            )
        )
        assert heading.is_displayed(), "The AarogyamCareAI landing heading was not displayed."

        SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        assert driver.save_screenshot(
            str(SCREENSHOT_DIR / f"smoke-landing-page-{timestamp}.png")
        ), "Selenium could not save the smoke-test screenshot."
    finally:
        # This runs whether the assertion passes or fails, preventing orphaned Chrome sessions.
        driver.quit()
