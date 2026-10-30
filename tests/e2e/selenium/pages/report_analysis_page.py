"""Page Object for deterministic report-analysis browser tests."""

from pathlib import Path

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from test_config import USER_BASE_URL


class ReportAnalysisPage:
    URL = f"{USER_BASE_URL}/report-analysis"
    _TITLE = (By.XPATH, "//h1[normalize-space()='Report Analysis']")
    _FILE_INPUT = (By.CSS_SELECTOR, "input[type='file']")
    _ANALYZE = (By.XPATH, "//button[normalize-space()='Analyze']")
    _ERROR = (By.CSS_SELECTOR, "[role='alert']")
    _SUMMARY_HEADING = (By.XPATH, "//h2[normalize-space()='Summary']")

    def __init__(self, driver: WebDriver, timeout: int = 20) -> None:
        self.driver = driver
        self.wait = WebDriverWait(driver, timeout)

    def open(self) -> None:
        self.driver.get(self.URL)
        self.wait.until(EC.visibility_of_element_located(self._TITLE))

    def select_file(self, path: Path) -> None:
        self.driver.find_element(*self._FILE_INPUT).send_keys(str(path.resolve()))

    def analyze(self) -> None:
        self.driver.find_element(*self._ANALYZE).click()

    def wait_for_error(self, expected_text: str) -> None:
        self.wait.until(lambda browser: any(expected_text in item.text for item in browser.find_elements(*self._ERROR)))

    def wait_for_mock_result(self) -> None:
        self.wait.until(EC.visibility_of_element_located(self._SUMMARY_HEADING))
        self.wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(normalize-space(), 'Mock report summary for automated testing only.') ]")))
