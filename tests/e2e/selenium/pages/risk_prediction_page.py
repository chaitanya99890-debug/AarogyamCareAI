"""Page Object for the AarogyamCareAI health-risk prediction workflow."""

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from test_config import USER_BASE_URL


class RiskPredictionPage:
    URL = f"{USER_BASE_URL}/risk-prediction"
    _TITLE = (By.XPATH, "//h1[normalize-space()='Health Risk Prediction']")
    _SUBMIT = (By.XPATH, "//button[normalize-space()='Check Health Risk']")
    _ERRORS = (By.CSS_SELECTOR, "[role='alert'], span.text-rose-600")
    _RESULT_HEADING = (By.CSS_SELECTOR, "[data-testid='risk-classification']")

    def __init__(self, driver: WebDriver, timeout: int = 20) -> None:
        self.driver = driver
        self.wait = WebDriverWait(driver, timeout)

    def open(self) -> None:
        self.driver.get(self.URL)
        self.wait.until(EC.visibility_of_element_located(self._TITLE))

    def _input_for_label(self, label: str):
        return self.driver.find_element(
            By.XPATH, f"//label[.//span[normalize-space()='{label}']]//input"
        )

    def _select_for_label(self, label: str):
        return self.driver.find_element(
            By.XPATH, f"//label[.//span[normalize-space()='{label}']]//select"
        )

    def set_numeric(self, label: str, value: str) -> None:
        element = self._input_for_label(label)
        element.clear()
        element.send_keys(value)

    def select(self, label: str, value: str) -> None:
        self.driver.execute_script(
            "arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('change', {bubbles: true}));",
            self._select_for_label(label),
            value,
        )

    def submit(self) -> None:
        self.driver.find_element(*self._SUBMIT).click()

    def confirm_unusual_measurements(self) -> None:
        self.driver.find_element(By.CSS_SELECTOR, "input[type='checkbox']").click()

    def wait_for_error(self, expected_text: str) -> None:
        self.wait.until(lambda browser: any(expected_text in item.text for item in browser.find_elements(*self._ERRORS)))

    def complete_valid_form(self) -> None:
        for label, value in {
            "Age (years)": "35",
            "Height (cm)": "165",
            "Weight (kg)": "62",
            "Systolic blood pressure (mmHg)": "120",
            "Diastolic blood pressure (mmHg)": "80",
        }.items():
            self.set_numeric(label, value)
        for label, value in {
            "Gender": "female",
            "Cholesterol category": "1",
            "Glucose category": "1",
            "Smoking": "false",
            "Alcohol consumption": "false",
            "Physical activity": "true",
        }.items():
            self.select(label, value)

    def wait_for_result(self) -> str:
        return self.wait.until(EC.visibility_of_element_located(self._RESULT_HEADING)).text
