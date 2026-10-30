"""Page Object for authenticated AarogyamCareAI chat interactions."""

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from test_config import USER_BASE_URL


class ChatPage:
    URL = f"{USER_BASE_URL}/chat"
    _INPUT = (By.ID, "chat-input")
    _SEND = (By.CSS_SELECTOR, "button[aria-label='Send message']")
    _USER_MESSAGES = (By.CSS_SELECTOR, "article[aria-label='Your message']")
    _ASSISTANT_MESSAGES = (By.CSS_SELECTOR, "article[aria-label='AarogyamCare AI message']")
    _HISTORY_TITLE = (By.XPATH, "//h1[normalize-space()='Chat History']")

    def __init__(self, driver: WebDriver, timeout: int = 15) -> None:
        self.driver = driver
        self.wait = WebDriverWait(driver, timeout)

    def open(self) -> None:
        self.driver.get(self.URL)
        self.wait.until(EC.visibility_of_element_located(self._INPUT))

    def send(self, message: str) -> None:
        self.driver.find_element(*self._INPUT).send_keys(message)
        self.wait.until(EC.element_to_be_clickable(self._SEND)).click()

    def wait_for_user_message(self, message: str) -> None:
        self.wait.until(lambda browser: any(message in item.text for item in browser.find_elements(*self._USER_MESSAGES)))

    def wait_for_assistant_message(self, expected_text: str) -> None:
        self.wait.until(lambda browser: any(expected_text in item.text for item in browser.find_elements(*self._ASSISTANT_MESSAGES)))

    def open_history(self) -> None:
        self.driver.get(f"{USER_BASE_URL}/chat-history")
        self.wait.until(EC.visibility_of_element_located(self._HISTORY_TITLE))

    def wait_for_conversation(self, title: str) -> None:
        self.wait.until(EC.visibility_of_element_located((By.XPATH, f"//*[contains(normalize-space(), '{title}') ]")))
