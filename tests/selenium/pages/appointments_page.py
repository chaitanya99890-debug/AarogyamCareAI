"""Page Object for appointment lifecycle tests with SMS intentionally disabled."""

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from test_config import USER_BASE_URL


class AppointmentsPage:
    URL = f"{USER_BASE_URL}/appointments"
    _TITLE = (By.XPATH, "//h1[normalize-space()='Appointments']")
    _SUBMIT = (By.XPATH, "//button[normalize-space()='Add appointment' or normalize-space()='Save changes']")
    _ERROR = (By.CSS_SELECTOR, "[role='alert']")

    def __init__(self, driver: WebDriver, timeout: int = 20) -> None:
        self.driver = driver
        self.wait = WebDriverWait(driver, timeout)

    def open(self) -> None:
        self.driver.get(self.URL)
        self.wait.until(EC.visibility_of_element_located(self._TITLE))

    def _input_for_label(self, label: str):
        # The label contains an apostrophe ("Doctor's name"), so use double
        # quotes for the XPath string literal rather than constructing an
        # invalid single-quoted XPath expression.
        return self.driver.find_element(
            By.XPATH,
            f'//label[.//span[normalize-space()="{label}"]]//input',
        )

    def set_input(self, label: str, value: str) -> None:
        element = self._input_for_label(label)
        self.driver.execute_script(
            "const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;"
            "set.call(arguments[0], arguments[1]);"
            "arguments[0].dispatchEvent(new Event('input', {bubbles: true}));"
            "arguments[0].dispatchEvent(new Event('change', {bubbles: true}));",
            element,
            value,
        )

    def set_doctor(self, value: str) -> None:
        self.set_input("Doctor's name", value)

    def submit(self) -> None:
        self.driver.find_element(*self._SUBMIT).click()

    def wait_for_error(self, expected_text: str) -> None:
        self.wait.until(lambda browser: any(expected_text in item.text for item in browser.find_elements(*self._ERROR)))

    def _card(self, doctor: str):
        return self.driver.find_element(
            By.XPATH,
            f'//p[normalize-space()="{doctor}"]/ancestor::div[.//button[normalize-space()="Edit"]][1]',
        )

    def wait_for_appointment(self, doctor: str) -> None:
        self.wait.until(lambda browser: any(doctor in item.text for item in browser.find_elements(By.XPATH, "//p")))

    def edit(self, doctor: str) -> None:
        self._card(doctor).find_element(By.XPATH, ".//button[normalize-space()='Edit']").click()
        self.wait.until(EC.visibility_of_element_located((By.XPATH, "//h2[normalize-space()='Edit appointment']")))

    def delete(self, doctor: str) -> None:
        self._card(doctor).find_element(By.XPATH, ".//button[normalize-space()='Delete']").click()

    def wait_until_absent(self, doctor: str) -> None:
        self.wait.until(lambda browser: not any(doctor in item.text for item in browser.find_elements(By.XPATH, "//p")))
