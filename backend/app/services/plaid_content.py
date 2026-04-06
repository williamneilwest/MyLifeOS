import os
from plaid.api import plaid_api
from plaid.configuration import Configuration
from plaid.api_client import ApiClient

PLAID_ENV = os.getenv("PLAID_ENV", "sandbox")

HOST = {
    "sandbox": "https://sandbox.plaid.com",
    "development": "https://development.plaid.com",
    "production": "https://production.plaid.com",
}.get(PLAID_ENV, "https://sandbox.plaid.com")

configuration = Configuration(
    host=HOST,
    api_key={
        "clientId": os.getenv("PLAID_CLIENT_ID"),
        "secret": os.getenv("PLAID_SECRET"),
    },
)

api_client = ApiClient(configuration)
plaid_client = plaid_api.PlaidApi(api_client)
