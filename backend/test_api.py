from fastapi.testclient import TestClient
from main import app
import uuid

client = TestClient(app)

# Generate unique email for this test run to avoid "already registered" conflicts
unique_id = str(uuid.uuid4())[:8]
test_email = f"test_{unique_id}@example.com"
test_password = "SecurePassword123!"
auth_headers = {}

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    print("[OK] Health check passed")

def test_auth_flow():
    global auth_headers
    
    # 1. Register a test user
    print(f"Registering test user: {test_email}...")
    register_response = client.post("/auth/register", json={
        "email": test_email,
        "password": test_password,
        "role": "teacher"  # The endpoint forces 'student', let's see if we get 'student'
    })
    assert register_response.status_code == 200
    reg_data = register_response.json()
    assert reg_data["user"]["role"] == "student"  # Security verification: forced student
    assert "password" not in reg_data["user"]     # Security verification: hash removed
    print("[OK] User Registration secure and successful")
    
    # 2. Login
    print("Logging in...")
    login_response = client.post("/auth/login", json={
        "email": test_email,
        "password": test_password
    })
    assert login_response.status_code == 200
    login_data = login_response.json()
    token = login_data["token"]
    assert "password" not in login_data["user"]   # Security verification: hash removed
    print("[OK] User Login successful")
    
    # Store token in auth headers
    auth_headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Verify auth/me
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["email"] == test_email
    print(f"[OK] GET /auth/me passed: {user_data}")

def test_chatbots_crud():
    global auth_headers
    
    # 1. List chatbots (empty or existing)
    response = client.get("/chatbots", headers=auth_headers)
    assert response.status_code == 200
    print("[OK] GET /chatbots passed")
    
    # 2. Create a chatbot
    print("Creating chatbot...")
    response = client.post("/chatbots", json={
        "name": "Test Bot",
        "subject_area": "Math",
        "education_level": "university",
        "tone": "friendly",
        "restriction_level": "guided"
    }, headers=auth_headers)
    assert response.status_code == 200
    bot_id = response.json()["id"]
    print(f"[OK] POST /chatbots (created: {bot_id})")
    
    # 3. Get chatbot details
    response = client.get(f"/chatbots/{bot_id}", headers=auth_headers)
    assert response.status_code == 200
    print(f"[OK] GET /chatbots/{bot_id} passed")
    
    # 4. Update chatbot details
    response = client.put(f"/chatbots/{bot_id}", json={
        "name": "Updated Bot",
        "subject_area": "Math",
        "education_level": "university",
        "tone": "friendly",
        "restriction_level": "guided"
    }, headers=auth_headers)
    assert response.status_code == 200
    print(f"[OK] PUT /chatbots/{bot_id} passed")
    
    return bot_id

def test_chat(bot_id):
    # Chat endpoint is public (or uses slowapi limits)
    response = client.post(f"/chat/{bot_id}", json={
        "message": "What is calculus?"
    })
    assert response.status_code == 200
    data = response.json()
    print(f"[OK] POST /chat/{bot_id} passed")
    print(f"  Response: {data['response'][:100]}...")
    return data

if __name__ == "__main__":
    print("\n=== Testing EduRAG API (Supabase & Secure) ===\n")
    test_health()
    test_auth_flow()
    bot_id = test_chatbots_crud()
    test_chat(bot_id)
    print("\n=== All tests passed successfully! ===\n")