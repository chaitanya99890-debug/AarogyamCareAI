"""Local endpoints used by the isolated Selenium test stack."""

import os


USER_BASE_URL = os.environ.get("SELENIUM_USER_BASE_URL", "http://localhost:5175").rstrip("/")
ADMIN_BASE_URL = os.environ.get("SELENIUM_ADMIN_BASE_URL", "http://localhost:5176").rstrip("/")
