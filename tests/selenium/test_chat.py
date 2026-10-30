"""Deterministic Selenium coverage for the authenticated chat workflow."""

from selenium.webdriver.remote.webdriver import WebDriver

from pages.chat_page import ChatPage
from pages.login_page import LoginPage


MOCK_REPLY = "Mocked health guidance: This deterministic response is for automated testing only."
QUESTION = "How can I support healthy sleep?"


def login_as_test_user(driver: WebDriver, credentials: tuple[str, str]) -> None:
    login_page = LoginPage(driver)
    login_page.open()
    login_page.login(*credentials)
    login_page.wait_for_dashboard()


def test_chat_send_button_is_disabled_for_empty_message(driver: WebDriver, test_user_credentials: tuple[str, str]) -> None:
    login_as_test_user(driver, test_user_credentials)
    page = ChatPage(driver)
    page.open()
    assert page.driver.find_element(*page._SEND).is_enabled() is False


def test_chat_renders_user_and_mocked_assistant_messages(driver: WebDriver, test_user_credentials: tuple[str, str]) -> None:
    login_as_test_user(driver, test_user_credentials)
    page = ChatPage(driver)
    page.open()
    page.send(QUESTION)
    page.wait_for_user_message(QUESTION)
    page.wait_for_assistant_message(MOCK_REPLY)


def test_chat_persists_mocked_conversation_in_history(driver: WebDriver, test_user_credentials: tuple[str, str]) -> None:
    login_as_test_user(driver, test_user_credentials)
    page = ChatPage(driver)
    page.open()
    page.send(QUESTION)
    page.wait_for_assistant_message(MOCK_REPLY)
    page.open_history()
    page.wait_for_conversation(QUESTION)
