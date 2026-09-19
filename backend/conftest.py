"""
Hermetic test configuration and in-memory Supabase double for EduRAG backend.
Ensures zero network calls to remote Supabase instances during automated testing.
"""

import os
import uuid
import pytest
from datetime import datetime, timezone
from cryptography.fernet import Fernet
from unittest.mock import MagicMock

# Generar clave Fernet válida y JWT secret para pruebas
TEST_FERNET_KEY = Fernet.generate_key().decode()
TEST_JWT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMCda8Yhe3iZaWbvV5XKSTbuAn0M"

os.environ.setdefault("SUPABASE_URL", "https://mock.supabase.co")
os.environ.setdefault("SUPABASE_KEY", TEST_JWT_KEY)
os.environ.setdefault("JWT_SECRET", "supersecretjwtkeywithmorethan32characterslength!")
os.environ.setdefault("ENCRYPTION_KEY", TEST_FERNET_KEY)
os.environ.setdefault("OPENROUTER_API_KEY", "sk-or-v1-mock-test-key")
os.environ.setdefault("TEST_ACCOUNTS_WHITELIST", "admin@edurag.com,test@edurag.com")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000,https://edu-rag-red.vercel.app")


class MockResponse:
    def __init__(self, data=None, count=None):
        self.data = data
        self.count = count


class MockQueryBuilder:
    def __init__(self, db, table_name):
        self.db = db
        self.table_name = table_name
        self.filters = []
        self.in_filters = []
        self._action = "select"
        self._action_data = None
        self._is_single = False
        self._limit = None
        self._offset = None
        self._order_by = None
        self._order_desc = False
        self._count_mode = None

    def select(self, columns="*", count=None):
        self._action = "select"
        self._count_mode = count
        return self

    def insert(self, data):
        self._action = "insert"
        self._action_data = data
        return self

    def update(self, data):
        self._action = "update"
        self._action_data = data
        return self

    def delete(self):
        self._action = "delete"
        return self

    def upsert(self, data):
        self._action = "upsert"
        self._action_data = data
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def in_(self, column, values):
        self.in_filters.append((column, list(values)))
        return self

    def order(self, column, desc=False):
        self._order_by = column
        self._order_desc = desc
        return self

    def limit(self, count):
        self._limit = count
        return self

    def offset(self, count):
        self._offset = count
        return self

    def maybe_single(self):
        self._is_single = True
        return self

    def single(self):
        self._is_single = True
        return self

    def execute(self):
        table = self.db.get_table(self.table_name)

        if self._action == "insert":
            inserted = []
            items = self._action_data if isinstance(self._action_data, list) else [self._action_data]
            for item in items:
                row = dict(item)
                if "id" not in row:
                    row["id"] = str(uuid.uuid4())
                row_id = str(row["id"])
                table[row_id] = row
                inserted.append(row)
            res_data = inserted if isinstance(self._action_data, list) else inserted[0]
            return MockResponse(data=res_data, count=len(inserted))

        if self._action == "upsert":
            item = dict(self._action_data)
            row_id = str(item.get("id") or uuid.uuid4())
            item["id"] = row_id
            table[row_id] = item
            return MockResponse(data=[item], count=1)

        # Aplicar filtros a las filas existentes
        matching_rows = []
        for row in list(table.values()):
            match = True
            for col, val in self.filters:
                if row.get(col) != val:
                    match = False
                    break
            if match:
                for col, vals in self.in_filters:
                    if row.get(col) not in vals:
                        match = False
                        break
            if match:
                matching_rows.append(row)

        if self._action == "delete":
            deleted = []
            for row in matching_rows:
                row_id = str(row.get("id"))
                if row_id in table:
                    deleted.append(table.pop(row_id))
            return MockResponse(data=deleted, count=len(deleted))

        if self._action == "update":
            updated = []
            for row in matching_rows:
                row_id = str(row.get("id"))
                for k, v in self._action_data.items():
                    row[k] = v
                table[row_id] = row
                updated.append(row)
            return MockResponse(data=updated, count=len(updated))

        # Select
        if self._order_by:
            def sort_key(x):
                val = x.get(self._order_by)
                return (val is None, val if val is not None else "")
            matching_rows.sort(key=sort_key, reverse=self._order_desc)

        total_count = len(matching_rows)
        if self._offset is not None:
            matching_rows = matching_rows[self._offset:]
        if self._limit is not None:
            matching_rows = matching_rows[:self._limit]

        if self._is_single:
            single_data = matching_rows[0] if matching_rows else None
            return MockResponse(data=single_data, count=1 if single_data else 0)

        return MockResponse(data=matching_rows, count=total_count)


class MockStorageBucket:
    def __init__(self, name):
        self.name = name
        self.files = {}

    def upload(self, path, file, file_options=None):
        self.files[path] = file
        return {"Key": path}

    def download(self, path):
        return self.files.get(path, b"")

    def get_public_url(self, path):
        return f"https://mock.storage.supabase.co/{self.name}/{path}"


class MockStorageClient:
    def __init__(self):
        self._buckets = {"documents": MockStorageBucket("documents")}

    def from_(self, bucket):
        if bucket not in self._buckets:
            self._buckets[bucket] = MockStorageBucket(bucket)
        return self._buckets[bucket]

    def get_bucket(self, bucket):
        if bucket in self._buckets:
            return self._buckets[bucket]
        raise Exception("Bucket not found")

    def create_bucket(self, bucket, options=None):
        self._buckets[bucket] = MockStorageBucket(bucket)
        return self._buckets[bucket]


class MockSupabaseClient:
    def __init__(self):
        self.tables = {
            "users": {},
            "chatbots": {},
            "documents": {},
            "document_contents": {},
            "conversations": {},
            "messages": {},
            "revoked_tokens": {},
        }
        self.storage = MockStorageClient()

    def get_table(self, name):
        if name not in self.tables:
            self.tables[name] = {}
        return self.tables[name]

    def table(self, name):
        return MockQueryBuilder(self, name)

    def reset(self):
        for t in self.tables.values():
            t.clear()


@pytest.fixture(autouse=True)
def hermetic_db():
    """Configura el cliente Supabase en memoria antes de cada prueba."""
    import supabase_db
    mock_client = MockSupabaseClient()
    supabase_db._client = mock_client
    yield mock_client
    mock_client.reset()
