"""Selenium coverage for the protected AarogyamCareAI administrator panel."""

from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from pages.admin_page import AdminPage
from pages.login_page import LoginPage
from test_config import USER_BASE_URL


def test_normal_user_is_restricted_from_admin_route(
    driver: WebDriver, test_user_credentials: tuple[str, str]
) -> None:
    """A user session must be redirected rather than seeing an admin page."""
    login = LoginPage(driver)
    login.open()
    login.login(*test_user_credentials)
    login.wait_for_dashboard()

    driver.get(f"{USER_BASE_URL}/admin")
    WebDriverWait(driver, 15).until(EC.url_contains("/dashboard"))
    assert "/admin" not in driver.current_url


def test_normal_user_cannot_sign_in_through_admin_login(
    driver: WebDriver, test_user_credentials: tuple[str, str]
) -> None:
    """The role-specific login API must reject a valid non-admin account."""
    page = AdminPage(driver)
    page.open_login()
    page.login(*test_user_credentials)

    assert page.error_message() == "Incorrect email or password. Please try again."
    assert "/admin/login" in driver.current_url


def test_admin_dashboard_navigation_sms_visibility_and_logout(
    driver: WebDriver, test_admin_credentials: tuple[str, str]
) -> None:
    """Verify safe administrative navigation without changing system data."""
    page = AdminPage(driver)
    page.open_login()
    page.login(*test_admin_credentials)
    page.wait_for_dashboard()

    for path, title in (
        ("/admin/users", "Users"),
        ("/admin/appointments", "Appointments"),
        ("/admin/reports", "Reports"),
        ("/admin/predictions", "ML Predictions"),
    ):
        page.open_section(path, title)

    # Deliberately do not click this control: a test run must not send real SMS.
    page.open_section("/admin/sms", "SMS & Reminders")
    assert page.sms_test_control_is_visible()
    page.open_section("/admin/system", "System")
    page.logout()
