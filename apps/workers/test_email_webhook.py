import requests
import json

url = "http://localhost:8000/api/webhooks/inbound-email"

payload = {
    "from": "customer@example.com",
    "to": "supervisor@agents.tesseraos.ai",
    "raw_mime": """From: customer@example.com
To: supervisor@agents.tesseraos.ai
Subject: Urgent: Need help with my account
Content-Type: text/plain; charset="utf-8"

Hello Agent,

I am having trouble logging into my account. It says my password is no longer valid.
Can you please check the system and let me know how to reset it?

Thanks!"""
}

headers = {
    "Content-Type": "application/json",
    "X-Webhook-Secret": "tessera-os-cloud-worker-secret-key"
}

try:
    print(f"Sending mock email to {url}...")
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {json.dumps(response.json(), indent=2)}")
except requests.exceptions.ConnectionError:
    print("Error: Could not connect to the local server. Is it running on port 8000?")
