"""Page Object for the AarogyamCareAI user login screen."""

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from test_config import USER_BASE_URL


class LoginPage:
    URL = f"{USER_BASE_URL}/login"
    _EMAIL = (By.CSS_SELECTOR, "input[type='email']")
    _PASSWORD = (By.CSS_SELECTOR, "input[type='password']")
    _LOGIN = (By.XPATH, "//button[normalize-space()='Login']")
    _FORM_ALERT = (By.CSS_SELECTOR, "[role='alert']")
    _DASHBOARD_HEADING = (
        By.XPATH,
        "//h1[normalize-space()='How can AarogyamCare AI help you today?']",
    )
    _LOGOUT = (By.XPATH, "//button[normalize-space()='Logout']")

    def __init__(self, driver: WebDriver, timeout: int = 15) -> None:
        self.driver = driver
        self.wait = WebDriverWait(driver, timeout)

    def open(self) -> None:
        self.driver.get(self.URL)
        self.wait.until(EC.visibility_of_element_located(self._EMAIL))

    def login(self, email: str, password: str) -> None:
        self.driver.find_element(*self._EMAIL).send_keys(email)
        self.driver.find_element(*self._PASSWORD).send_keys(password)
        self.driver.find_element(*self._LOGIN).click()

    def error_message(self) -> str:
        return self.wait.until(EC.visibility_of_element_located(self._FORM_ALERT)).text

    def validation_messages(self) -> list[str]:
        """Wait until React has rendered both client-side empty-form messages."""
        return self.wait.until(
            lambda browser: [
                element.text
                for element in browser.find_elements(*self._FORM_ALERT)
                if element.text
            ]
            if len(browser.find_elements(*self._FORM_ALERT)) >= 2
            else False
        )

    def wait_for_dashboard(self) -> None:
        self.wait.until(EC.url_contains("/dashboard"))
        self.wait.until(EC.visibility_of_element_located(self._DASHBOARD_HEADING))

    def logout(self) -> None:
        self.wait.until(EC.element_to_be_clickable(self._LOGOUT)).click()
        self.wait.until(EC.url_contains("/login"))
