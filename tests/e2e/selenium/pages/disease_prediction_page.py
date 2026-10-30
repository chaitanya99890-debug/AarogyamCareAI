"""Page Object for the AarogyamCareAI disease-prediction workflow."""

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from test_config import USER_BASE_URL


class DiseasePredictionPage:
    URL = f"{USER_BASE_URL}/disease-prediction"
    _TITLE = (By.XPATH, "//h1[normalize-space()='Disease Prediction']")
    _CHECKBOXES = (By.CSS_SELECTOR, "input[type='checkbox']")
    _PREDICT = (By.XPATH, "//button[normalize-space()='Predict possible condition']")
    _ERROR = (By.CSS_SELECTOR, "[role='alert']")
    _RESULT_LABEL = (By.XPATH, "//*[normalize-space()='Possible condition']")
    _RESULT_HEADING = (By.XPATH, "//*[normalize-space()='Possible condition']/following-sibling::h2")

    def __init__(self, driver: WebDriver, timeout: int = 20) -> None:
        self.driver = driver
        self.wait = WebDriverWait(driver, timeout)

    def open(self) -> None:
        self.driver.get(self.URL)
        self.wait.until(EC.visibility_of_element_located(self._TITLE))
        self.wait.until(lambda browser: len(browser.find_elements(*self._CHECKBOXES)) > 0)

    def predict_without_symptoms(self) -> None:
        self.driver.find_element(*self._PREDICT).click()

    def select_first_symptoms(self, count: int = 2) -> None:
        checkboxes = self.driver.find_elements(*self._CHECKBOXES)
        for checkbox in checkboxes[:count]:
            if not checkbox.is_selected():
                self.driver.execute_script("arguments[0].click();", checkbox)

    def wait_for_error(self, expected_text: str) -> None:
        self.wait.until(lambda browser: any(expected_text in element.text for element in browser.find_elements(*self._ERROR)))

    def predict(self) -> None:
        self.driver.find_element(*self._PREDICT).click()

    def wait_for_result(self) -> str:
        self.wait.until(EC.visibility_of_element_located(self._RESULT_LABEL))
        return self.wait.until(EC.visibility_of_element_located(self._RESULT_HEADING)).text
