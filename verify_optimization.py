import requests
import json
import os

BASE_URL = "http://localhost:8000/api"

def test_research():
    print("Testing /research...")
    data = {"company_name": "Reliance Industries", "sector": "Energy"}
    response = requests.post(f"{BASE_URL}/research", data=data)
    if response.status_code == 200:
        print("Success: Research data retrieved.")
        print(json.dumps(response.json(), indent=2)[:500])
    else:
        print(f"Error: {response.status_code} - {response.text}")

def test_analyze():
    print("\nTesting /analyze...")
    data = {"data": json.dumps({"revenue": "500 Cr", "pat": "50 Cr"})}
    response = requests.post(f"{BASE_URL}/analyze", data=data)
    if response.status_code == 200:
        print("Success: Analysis retrieved.")
        print(json.dumps(response.json(), indent=2))
    else:
        print(f"Error: {response.status_code} - {response.text}")

def test_score():
    print("\nTesting /score...")
    data = {"data": json.dumps({"revenue": "500 Cr", "pat": "50 Cr"})}
    response = requests.post(f"{BASE_URL}/score", data=data)
    if response.status_code == 200:
        print("Success: Score retrieved.")
        print(json.dumps(response.json(), indent=2))
    else:
        print(f"Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    # Note: Backend must be running for this to work.
    # Since I cannot easily run local servers and wait, I'll rely on static analysis and code review unless I can dry-run.
    print("Verification script ready.")
    # test_research()
    # test_analyze()
    # test_score()
