"""Selenium coverage for appointment validation and a no-SMS lifecycle."""

import uuid

from selenium.webdriver.remote.webdriver import WebDriver

from pages.appointments_page import AppointmentsPage
from pages.login_page import LoginPage


def login_as_test_user(driver: WebDriver, credentials: tuple[str, str]) -> None:
    login_page = LoginPage(driver)
    login_page.open()
    login_page.login(*credentials)
    login_page.wait_for_dashboard()


def test_appointment_requires_doctor_name(driver: WebDriver, test_user_credentials: tuple[str, str]) -> None:
    login_as_test_user(driver, test_user_credentials)
    page = AppointmentsPage(driver)
    page.open()
    page.set_doctor("")
    page.submit()
    page.wait_for_error("Doctor name, date, and time are required.")


def test_appointment_can_be_created_edited_persisted_and_deleted(driver: WebDriver, test_user_credentials: tuple[str, str]) -> None:
    login_as_test_user(driver, test_user_credentials)
    page = AppointmentsPage(driver)
    page.open()

    original = f"Dr Selenium {uuid.uuid4().hex[:8]}"
    updated = f"{original} Updated"
    page.set_doctor(original)
    page.set_input("Date", "2031-01-15")
    page.set_input("Time", "10:00")
    page.submit()
    page.wait_for_appointment(original)

    # Refresh proves that the appointment was persisted, not merely rendered locally.
    driver.refresh()
    page.wait_for_appointment(original)
    page.edit(original)
    page.set_doctor(updated)
    page.submit()
    page.wait_for_appointment(updated)

    page.delete(updated)
    page.wait_until_absent(updated)
    driver.refresh()
    page.wait_until_absent(updated)
