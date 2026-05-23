import pytest
from fastapi.testclient import TestClient
from main import app
import uuid

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_readiness():
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"

def test_auth_me_anonymous():
    response = client.get("/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "anonymous"
    assert data["id"] is None

def test_auth_flow_and_chatbot_creation():
    unique_id = str(uuid.uuid4())[:8]
    email = f"pytest_{unique_id}@example.com"
    password = "pytestPassword123!"

    # 1. Register Student (Forced Student Role)
    response = client.post("/auth/register", json={
        "email": email,
        "password": password,
        "role": "teacher"  # Should be forced to student
    })
    assert response.status_code == 200
    reg_data = response.json()
    assert reg_data["user"]["role"] == "student"
    assert "password" not in reg_data["user"]  # Password hash filtered out

    # 2. Login
    response = client.post("/auth/login", json={
        "email": email,
        "password": password
    })
    assert response.status_code == 200
    login_data = response.json()
    token = login_data["token"]
    assert "password" not in login_data["user"]  # Password hash filtered out

    # 3. Create Chatbot
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/chatbots", json={
        "name": f"Pytest Bot {unique_id}",
        "subject_area": "Science",
        "education_level": "secondary",
        "tone": "technical",
        "restriction_level": "strict"
    }, headers=headers)
    assert response.status_code == 200
    bot_data = response.json()
    assert bot_data["name"] == f"Pytest Bot {unique_id}"
    bot_id = bot_data["id"]

    # 4. Get Chatbot
    response = client.get(f"/chatbots/{bot_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["name"] == f"Pytest Bot {unique_id}"
