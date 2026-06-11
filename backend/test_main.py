import pytest
import uuid
import asyncio
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from main import app, _persist_chat_turn, get_client_ip
from security_utils import encrypt_api_key, decrypt_api_key
from context_builder import build_context, MAX_CONTEXT_CHARS
from supabase_db import create_user
from password import hash_password
from jwt_token import create_jwt_token, create_refresh_token, verify_jwt_token
from document_uploader import extract_text_from_file

client = TestClient(app)
app.state.limiter.enabled = False

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _register_and_login(email: str, password: str) -> tuple[dict, str]:
    """Registers a user and logs in, returning (user_data, token)."""
    register_resp = client.post("/auth/register", json={"email": email, "password": password})
    assert register_resp.status_code in (200, 400), register_resp.text
    resp = client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    return data["user"], data["token"]


def _create_chatbot(token: str, name: str, auto_publish: bool = True) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post("/chatbots", json={
        "name": name,
        "subject_area": "Testing",
        "education_level": "secondary",
        "tone": "friendly",
        "restriction_level": "guided",
    }, headers=headers)
    assert resp.status_code == 200, resp.text
    bot = resp.json()
    if auto_publish:
        client.post(f"/chatbots/{bot['id']}/publish", headers=headers)
    return bot


# ─── Existentes ───────────────────────────────────────────────────────────────

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
    assert data.get("id") is None


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


# ─── Seguridad y aislamiento multi-tenant ─────────────────────────────────────

def test_chatbot_ownership_isolation():
    """Un usuario NO puede acceder a un chatbot no publicado de otro usuario."""
    uid_a = str(uuid.uuid4())[:8]
    uid_b = str(uuid.uuid4())[:8]

    _user_a, token_a = _register_and_login(f"user_a_{uid_a}@example.com", "Password123!")
    _user_b, token_b = _register_and_login(f"user_b_{uid_b}@example.com", "Password123!")

    # A crea un chatbot (no publicado)
    bot = _create_chatbot(token_a, f"Bot privado {uid_a}", auto_publish=False)
    bot_id = bot["id"]

    # B no debería poder acceder al chatbot no publicado de A
    headers_b = {"Authorization": f"Bearer {token_b}"}
    resp = client.get(f"/chatbots/{bot_id}", headers=headers_b)
    assert resp.status_code == 403


def test_document_upload_rejects_wrong_owner():
    """Un usuario NO puede subir documentos a un chatbot que no le pertenece."""
    uid_a = str(uuid.uuid4())[:8]
    uid_b = str(uuid.uuid4())[:8]

    _user_a, token_a = _register_and_login(f"owner_a_{uid_a}@example.com", "Password123!")
    _user_b, token_b = _register_and_login(f"owner_b_{uid_b}@example.com", "Password123!")

    bot = _create_chatbot(token_a, f"Bot de A {uid_a}")
    bot_id = bot["id"]

    # B intenta subir un documento al chatbot de A
    headers_b = {"Authorization": f"Bearer {token_b}"}
    resp = client.post(
        "/documents/upload",
        data={"chatbot_id": bot_id},
        files={"file": ("test.txt", b"contenido de prueba", "text/plain")},
        headers=headers_b,
    )
    assert resp.status_code == 403


def test_chat_message_too_long_rejected():
    """El backend debe rechazar mensajes demasiado largos aunque el frontend los limite."""
    uid = str(uuid.uuid4())[:8]
    _user, token = _register_and_login(f"long_msg_{uid}@example.com", "Password123!")
    bot = _create_chatbot(token, f"Bot long msg {uid}")

    resp = client.post(f"/chat/{bot['id']}", json={"message": "x" * 4001})
    assert resp.status_code == 422


def test_persist_rejects_cross_chatbot_conversation_id():
    """Un conversation_id de otro chatbot no debe poder contaminar memoria/historial."""
    uid = str(uuid.uuid4())[:8]
    _user, token = _register_and_login(f"cross_conv_{uid}@example.com", "Password123!")
    chatbot_a = _create_chatbot(token, f"Bot A {uid}")["id"]
    chatbot_b = _create_chatbot(token, f"Bot B {uid}")["id"]

    conv_id = asyncio.run(_persist_chat_turn(chatbot_a, None, "hola", "respuesta"))

    with pytest.raises(Exception):
        asyncio.run(_persist_chat_turn(chatbot_b, conv_id, "ataque", "respuesta"))


def test_chat_history_requires_auth():
    """El historial no debe exponerse sin autenticación."""
    resp = client.get(f"/chat/{uuid.uuid4()}/history?conversation_id={uuid.uuid4()}")
    assert resp.status_code == 401


def test_register_forces_student_role():
    """El auto-registro siempre asigna el rol student, ignorando el campo role del body."""
    uid = str(uuid.uuid4())[:8]
    resp = client.post("/auth/register", json={
        "email": f"admin_attempt_{uid}@example.com",
        "password": "Password123!",
        "role": "admin",
    })
    assert resp.status_code == 200
    assert resp.json()["user"]["role"] == "student"


def test_password_hash_not_exposed_in_login():
    """El hash de contraseña nunca debe aparecer en la respuesta de login."""
    uid = str(uuid.uuid4())[:8]
    email = f"pw_test_{uid}@example.com"
    client.post("/auth/register", json={"email": email, "password": "Password123!"})
    resp = client.post("/auth/login", json={"email": email, "password": "Password123!"})
    assert resp.status_code == 200
    assert "password" not in resp.json()["user"]


def test_login_wrong_password_returns_401():
    """Credenciales incorrectas deben devolver 401."""
    uid = str(uuid.uuid4())[:8]
    email = f"wrong_pw_{uid}@example.com"
    client.post("/auth/register", json={"email": email, "password": "CorrectPass123!"})
    resp = client.post("/auth/login", json={"email": email, "password": "WrongPassword!"})
    assert resp.status_code == 401


# ─── Validación de system_prompt ──────────────────────────────────────────────

def test_system_prompt_override_too_long_rejected():
    """Un system_prompt_override que supere MAX_SYSTEM_PROMPT_LENGTH debe rechazarse con 400."""
    uid = str(uuid.uuid4())[:8]
    _user, token = _register_and_login(f"prompt_test_{uid}@example.com", "Password123!")
    headers = {"Authorization": f"Bearer {token}"}

    long_prompt = "x" * 2001  # settings.MAX_SYSTEM_PROMPT_LENGTH = 2000
    resp = client.post("/chatbots", json={
        "name": f"Bot {uid}",
        "subject_area": "Testing",
        "education_level": "secondary",
        "tone": "friendly",
        "restriction_level": "guided",
        "system_prompt_override": long_prompt,
    }, headers=headers)
    assert resp.status_code == 400
    assert "2000" in resp.json()["detail"]


def test_system_prompt_override_at_limit_accepted():
    """Un system_prompt_override exactamente en el límite debe ser aceptado."""
    uid = str(uuid.uuid4())[:8]
    _user, token = _register_and_login(f"prompt_ok_{uid}@example.com", "Password123!")
    headers = {"Authorization": f"Bearer {token}"}

    exact_prompt = "x" * 2000
    resp = client.post("/chatbots", json={
        "name": f"Bot {uid}",
        "subject_area": "Testing",
        "education_level": "secondary",
        "tone": "friendly",
        "restriction_level": "guided",
        "system_prompt_override": exact_prompt,
    }, headers=headers)
    assert resp.status_code == 200


# ─── Paginación de listados ───────────────────────────────────────────────────

def test_chatbots_listing_with_limit():
    """GET /chatbots?limit=1 debe devolver como máximo 1 resultado."""
    uid = str(uuid.uuid4())[:8]
    _user, token = _register_and_login(f"page_test_{uid}@example.com", "Password123!")
    _create_chatbot(token, f"Bot 1 {uid}")
    _create_chatbot(token, f"Bot 2 {uid}")

    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/chatbots?limit=1", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) <= 1


# ─── security_utils — cifrado/descifrado ──────────────────────────────────────

def test_encrypt_decrypt_roundtrip():
    """encrypt_api_key → decrypt_api_key debe devolver el valor original."""
    original_key = "sk-or-v1-test-key-12345"
    encrypted = encrypt_api_key(original_key)
    assert encrypted != original_key  # Debe estar cifrado
    decrypted = decrypt_api_key(encrypted)
    assert decrypted == original_key


def test_encrypt_empty_key_returns_empty():
    """Cifrar un string vacío debe devolver string vacío sin error."""
    assert encrypt_api_key("") == ""


def test_decrypt_empty_key_returns_empty():
    """Descifrar un string vacío debe devolver string vacío sin error."""
    assert decrypt_api_key("") == ""


# ─── context_builder ──────────────────────────────────────────────────────────

def test_context_builder_respects_budget():
    """build_context no debe exceder MAX_CONTEXT_CHARS."""
    large_doc = [{"filename": f"doc{i}.txt", "content": "a" * 10_000} for i in range(20)]
    result = build_context(large_doc, "pregunta de prueba")
    assert len(result) <= MAX_CONTEXT_CHARS + 200


def test_context_builder_no_docs_returns_message():
    """Sin documentos, build_context debe devolver un mensaje informativo."""
    result = build_context([], "alguna pregunta")
    assert "No hay documentos" in result


def test_context_builder_scores_relevant_chunks_first():
    """Los chunks con términos de la query deben aparecer antes que los irrelevantes."""
    docs = [
        {"filename": "relevante.txt", "content": "La economía circular es sostenible y reutilizable."},
        {"filename": "irrelevante.txt", "content": "El cielo es azul y el agua es transparente."},
    ]
    result = build_context(docs, "economía circular reutilizable")
    # El chunk relevante debe aparecer primero
    assert result.index("relevante.txt") < result.index("irrelevante.txt")


# ─── Chat — endpoint síncrono y streaming ───────────────────────────────────────

def test_chat_returns_response_for_published_chatbot():
    """POST /chat/{id} devuelve una respuesta válida para un chatbot publicado."""
    uid = str(uuid.uuid4())[:8]
    _user, token = _register_and_login(f"chat_{uid}@example.com", "Password123!")
    bot = _create_chatbot(token, f"Chat Bot {uid}")
    bot_id = bot["id"]

    # Publicar el chatbot
    headers = {"Authorization": f"Bearer {token}"}
    client.post(f"/chatbots/{bot_id}/publish", headers=headers)

    # El LLM no está disponible en tests — esperamos respuesta de error controlada, no 500
    with patch("main.get_llm_client") as mock_llm:
        mock_instance = mock_llm.return_value
        mock_instance.generate = AsyncMock(return_value="Respuesta de prueba del tutor.")

        resp = client.post(f"/chat/{bot_id}", json={"message": "¿Qué es la fotosíntesis?"})
        assert resp.status_code == 200
        data = resp.json()
        assert "response" in data
        assert "conversation_id" in data
        assert isinstance(data["sources"], list)


def test_chat_unknown_chatbot_returns_404():
    """POST /chat/{id} con un chatbot inexistente devuelve 404."""
    resp = client.post(f"/chat/{uuid.uuid4()}", json={"message": "hola"})
    assert resp.status_code == 404


def test_chat_preserves_conversation_id_across_turns():
    """El conversation_id devuelto en el primer turno debe poder usarse en el siguiente."""
    uid = str(uuid.uuid4())[:8]
    _user, token = _register_and_login(f"conv_{uid}@example.com", "Password123!")
    bot = _create_chatbot(token, f"Conv Bot {uid}")
    bot_id = bot["id"]

    with patch("main.get_llm_client") as mock_llm:
        mock_instance = mock_llm.return_value
        mock_instance.generate = AsyncMock(return_value="Primera respuesta.")

        r1 = client.post(f"/chat/{bot_id}", json={"message": "Primera pregunta"})
        assert r1.status_code == 200
        conv_id = r1.json()["conversation_id"]
        assert conv_id

        mock_instance.generate = AsyncMock(return_value="Segunda respuesta.")
        r2 = client.post(f"/chat/{bot_id}", json={"message": "Segunda pregunta", "conversation_id": conv_id})
        assert r2.status_code == 200
        assert r2.json()["conversation_id"] == conv_id


def test_chat_rejects_cross_chatbot_conversation():
    """Usar un conversation_id de otro chatbot en /chat debe devolver 403."""
    uid = str(uuid.uuid4())[:8]
    _user, token = _register_and_login(f"xchat_{uid}@example.com", "Password123!")
    bot_a = _create_chatbot(token, f"Bot A {uid}")["id"]
    bot_b = _create_chatbot(token, f"Bot B {uid}")["id"]

    with patch("main.get_llm_client") as mock_llm:
        mock_instance = mock_llm.return_value
        mock_instance.generate = AsyncMock(return_value="ok")

        r1 = client.post(f"/chat/{bot_a}", json={"message": "hola"})
        assert r1.status_code == 200
        conv_id_a = r1.json()["conversation_id"]

        r2 = client.post(f"/chat/{bot_b}", json={"message": "ataque", "conversation_id": conv_id_a})
        assert r2.status_code == 403


def test_chat_history_returns_messages():
    """GET /chat/{id}/history devuelve los mensajes guardados de la conversación."""
    uid = str(uuid.uuid4())[:8]
    user, token = _register_and_login(f"hist_{uid}@example.com", "Password123!")
    bot = _create_chatbot(token, f"Hist Bot {uid}")
    bot_id = bot["id"]
    headers = {"Authorization": f"Bearer {token}"}

    with patch("main.get_llm_client") as mock_llm:
        mock_instance = mock_llm.return_value
        mock_instance.generate = AsyncMock(return_value="respuesta guardada")

        r = client.post(f"/chat/{bot_id}", json={"message": "pregunta guardada"}, headers=headers)
        assert r.status_code == 200
        conv_id = r.json()["conversation_id"]

    hist = client.get(f"/chat/{bot_id}/history?conversation_id={conv_id}", headers=headers)
    assert hist.status_code == 200
    messages = hist.json().get("messages", [])
    assert any(m["role"] == "user" for m in messages)
    assert any(m["role"] == "assistant" for m in messages)


def test_chat_stream_returns_sse_events():
    """POST /chat/{id}/stream devuelve eventos SSE con token y done."""
    uid = str(uuid.uuid4())[:8]
    _user, token = _register_and_login(f"stream_{uid}@example.com", "Password123!")
    bot = _create_chatbot(token, f"Stream Bot {uid}")
    bot_id = bot["id"]

    async def fake_stream(*args, **kwargs):
        for chunk in ["Hola ", "mundo ", "desde ", "el stream."]:
            yield chunk

    with patch("main.get_llm_client") as mock_llm:
        mock_instance = mock_llm.return_value
        mock_instance.generate_stream = fake_stream

        resp = client.post(
            f"/chat/{bot_id}/stream",
            json={"message": "hola"},
            headers={"Accept": "text/event-stream"},
        )
        assert resp.status_code == 200
        body = resp.text
        assert "event: token" in body
        assert "event: done" in body
        assert "conversation_id" in body


# ─── Admin — CRUD de docentes ────────────────────────────────────────────────────

def _create_admin_and_token() -> str:
    """Crea un usuario admin directamente en la base de datos y retorna su token."""
    admin_id = str(uuid.uuid4())
    email = f"admin_{admin_id[:8]}@edurag.com"
    asyncio.run(create_user({
        "id": admin_id,
        "email": email,
        "password": hash_password("Admin1234!"),
        "role": "admin",
        "auth_method": "email_password",
        "is_active": True,
    }))
    return create_jwt_token(user_id=admin_id, email=email, role="admin")


def test_admin_create_teacher():
    """Un admin puede crear un docente vía POST /admin/teachers."""
    token = _create_admin_and_token()
    uid = str(uuid.uuid4())[:8]
    resp = client.post("/admin/teachers", json={
        "email": f"teacher_{uid}@school.com",
        "password": "Teacher123!",
        "firstName": "Ana",
        "lastName": "García",
        "institution": "Colegio San José",
        "country": "CO",
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["role"] == "teacher"
    assert "password" not in data


def test_admin_create_teacher_rejects_duplicate_email():
    """No se puede crear dos docentes con el mismo email."""
    token = _create_admin_and_token()
    uid = str(uuid.uuid4())[:8]
    email = f"dup_{uid}@school.com"
    payload = {"email": email, "password": "Teacher123!", "firstName": "A", "lastName": "B"}
    client.post("/admin/teachers", json=payload, headers={"Authorization": f"Bearer {token}"})
    resp = client.post("/admin/teachers", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 400


def test_admin_list_teachers():
    """GET /admin/teachers devuelve una lista y no expone passwords."""
    token = _create_admin_and_token()
    resp = client.get("/admin/teachers", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    teachers = resp.json()
    assert isinstance(teachers, list)
    for t in teachers:
        assert "password" not in t


def test_admin_update_teacher():
    """PUT /admin/teachers/{id} actualiza los datos del docente."""
    token = _create_admin_and_token()
    uid = str(uuid.uuid4())[:8]
    create_resp = client.post("/admin/teachers", json={
        "email": f"upd_{uid}@school.com",
        "password": "Teacher123!",
        "firstName": "Luis",
        "lastName": "Martínez",
    }, headers={"Authorization": f"Bearer {token}"})
    assert create_resp.status_code == 200
    teacher_id = create_resp.json()["id"]

    resp = client.put(f"/admin/teachers/{teacher_id}", json={
        "firstName": "Carlos",
        "institution": "Nueva Universidad",
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["firstName"] == "Carlos" or updated.get("first_name") == "Carlos"


def test_admin_delete_teacher():
    """DELETE /admin/teachers/{id} elimina al docente correctamente."""
    token = _create_admin_and_token()
    uid = str(uuid.uuid4())[:8]
    create_resp = client.post("/admin/teachers", json={
        "email": f"del_{uid}@school.com",
        "password": "Teacher123!",
        "firstName": "Pedro",
        "lastName": "Ruiz",
    }, headers={"Authorization": f"Bearer {token}"})
    assert create_resp.status_code == 200
    teacher_id = create_resp.json()["id"]

    del_resp = client.delete(f"/admin/teachers/{teacher_id}", headers={"Authorization": f"Bearer {token}"})
    assert del_resp.status_code == 200

    # Verificar que ya no está en la lista
    list_resp = client.get("/admin/teachers", headers={"Authorization": f"Bearer {token}"})
    ids = [t["id"] for t in list_resp.json()]
    assert teacher_id not in ids


def test_non_admin_cannot_access_admin_endpoints():
    """Un docente o estudiante NO puede acceder a los endpoints de admin."""
    uid = str(uuid.uuid4())[:8]
    _user, token = _register_and_login(f"notadmin_{uid}@example.com", "Password123!")
    headers = {"Authorization": f"Bearer {token}"}

    assert client.get("/admin/teachers", headers=headers).status_code == 403
    assert client.post("/admin/teachers", json={"email": "teacher_test@test.com", "password": "Password123!"}, headers=headers).status_code == 403
    assert client.delete(f"/admin/teachers/{uuid.uuid4()}", headers=headers).status_code == 403


def test_admin_cannot_delete_nonexistent_teacher():
    """Intentar eliminar un ID inexistente retorna 404."""
    token = _create_admin_and_token()
    resp = client.delete(f"/admin/teachers/{uuid.uuid4()}", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 404


# ─── Get Client IP ─────────────────────────────────────────────────────────

def test_get_client_ip_forwarded_for():
    """get_client_ip debe extraer la IP real de X-Forwarded-For."""
    from fastapi import Request
    scope = {
        "type": "http",
        "headers": [
            (b"x-forwarded-for", b"203.0.113.42, 10.0.0.1"),
        ],
    }
    request = Request(scope)
    assert get_client_ip(request) == "203.0.113.42"


def test_get_client_ip_fallback_to_host():
    """Sin X-Forwarded-For, debe usar request.client.host."""
    from fastapi import Request
    scope = {
        "type": "http",
        "client": ("192.168.1.100", 50000),
        "headers": [],
    }
    request = Request(scope)
    assert get_client_ip(request) == "192.168.1.100"


# ─── Refresh Token / JWT ────────────────────────────────────────────────────

def test_create_and_verify_refresh_token():
    """create_refresh_token debe generar tokens válidos con jti único."""
    token, jti, expires = create_refresh_token("user-1", "test@test.com", "teacher")
    assert token
    assert jti
    assert expires > datetime.utcnow()

    payload = verify_jwt_token(token)
    assert payload is not None
    assert payload["sub"] == "user-1"
    assert payload["jti"] == jti


def test_access_token_has_jti():
    """create_jwt_token debe incluir un jti único."""
    token = create_jwt_token("user-1", "test@test.com", "teacher")
    payload = verify_jwt_token(token)
    assert payload is not None
    assert payload["jti"] is not None
    assert len(payload["jti"]) > 0


def test_refresh_login_response_includes_refresh_token():
    """POST /auth/login debe devolver refresh_token."""
    uid = str(uuid.uuid4())[:8]
    email = f"refresh_test_{uid}@example.com"
    client.post("/auth/register", json={"email": email, "password": "Password123!"})
    resp = client.post("/auth/login", json={"email": email, "password": "Password123!"})
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert "refresh_token" in data
    assert data["refresh_token"] != data["token"]


# ─── document_uploader — extract_text_from_file ─────────────────────────────

def test_extract_text_from_md():
    """MD debe extraerse como texto plano."""
    content = "# T\u00edtulo\n\nEsto es un *test*.".encode("utf-8")
    result = extract_text_from_file(content, "test.md", "text/markdown")
    assert "T\u00edtulo" in result
    assert "test" in result


def test_extract_text_from_txt():
    """TXT debe extraerse como texto plano."""
    content = b"Hola mundo"
    result = extract_text_from_file(content, "test.txt", "text/plain")
    assert result == "Hola mundo"


def test_extract_text_unknown_extension():
    """Extensiones desconocidas deben tratarse como UTF-8."""
    content = b"Texto arbitrario"
    result = extract_text_from_file(content, "test.unknown", None)
    assert result == "Texto arbitrario"


def test_extract_text_pdf_invalid_raises():
    """PDF inválido debe lanzar ValueError."""
    with pytest.raises(ValueError, match="Error al extraer texto del PDF"):
        extract_text_from_file(b"not a pdf", "test.pdf", "application/pdf")


def test_extract_text_docx_invalid_raises():
    """DOCX inválido debe lanzar ValueError."""
    with pytest.raises(ValueError, match="Error al extraer texto del archivo DOCX"):
        extract_text_from_file(b"not a docx", "test.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
