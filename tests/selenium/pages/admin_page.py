"""Page Object for the AarogyamCareAI administrator interface."""

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from test_config import ADMIN_BASE_URL


class AdminPage:
    LOGIN_URL = f"{ADMIN_BASE_URL}/admin/login"
    DASHBOARD_URL = f"{ADMIN_BASE_URL}/admin"
    _EMAIL = (By.CSS_SELECTOR, "input[type='email']")
    _PASSWORD = (By.CSS_SELECTOR, "input[type='password']")
    _LOGIN = (By.XPATH, "//button[normalize-space()='Login']")
    _FORM_ALERT = (By.CSS_SELECTOR, "[role='alert']")
    _DASHBOARD_TITLE = (By.XPATH, "//h1[normalize-space()='Admin Dashboard']")
    _LOGOUT = (By.XPATH, "//button[normalize-space()='Logout']")
    _SMS_TEST_BUTTON = (By.XPATH, "//button[normalize-space()='Send test SMS']")

    def __init__(self, driver: WebDriver, timeout: int = 15) -> None:
        self.driver = driver
        self.wait = WebDriverWait(driver, timeout)

    def open_login(self) -> None:
        self.driver.get(self.LOGIN_URL)
        self.wait.until(EC.visibility_of_element_located(self._EMAIL))

    def login(self, email: str, password: str) -> None:
        self.driver.find_element(*self._EMAIL).send_keys(email)
        self.driver.find_element(*self._PASSWORD).send_keys(password)
        self.driver.find_element(*self._LOGIN).click()

    def wait_for_dashboard(self) -> None:
        self.wait.until(EC.url_to_be(self.DASHBOARD_URL))
        self.wait.until(EC.visibility_of_element_located(self._DASHBOARD_TITLE))

    def error_message(self) -> str:
        return self.wait.until(EC.visibility_of_element_located(self._FORM_ALERT)).text

    def open_section(self, path: str, title: str) -> None:
        self.driver.find_element(By.CSS_SELECTOR, f"a[href='{path}']").click()
        self.wait.until(EC.url_contains(path))
        self.wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, f"//h1[normalize-space()='{title}']"),
            )
        )

    def sms_test_control_is_visible(self) -> bool:
        return self.wait.until(EC.visibility_of_element_located(self._SMS_TEST_BUTTON)).is_displayed()

    def logout(self) -> None:
        self.wait.until(EC.element_to_be_clickable(self._LOGOUT)).click()
        self.wait.until(EC.url_contains("/admin/login"))
