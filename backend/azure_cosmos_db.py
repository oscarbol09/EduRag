from azure.cosmos import CosmosClient, PartitionKey
from typing import Optional, List
from datetime import datetime
import sys
sys.path.insert(0, ".")
from settings import settings


_client: Optional[CosmosClient] = None


def get_cosmos_client() -> CosmosClient:
    global _client
    if _client is None:
        if not settings.COSMOS_DB_ENDPOINT or not settings.COSMOS_DB_KEY:
            raise RuntimeError("Cosmos DB not configured. Set COSMOS_DB_ENDPOINT and COSMOS_DB_KEY in .env")
        _client = CosmosClient(settings.COSMOS_DB_ENDPOINT, settings.COSMOS_DB_KEY)
    return _client


def get_database():
    client = get_cosmos_client()
    return client.get_database_client(settings.COSMOS_DB_DATABASE)


def get_container(container_name: str):
    db = get_database()
    try:
        return db.get_container_client(container_name)
    except Exception:
        partition_keys = {
            "users": PartitionKey(path="/id"),
            "chatbots": PartitionKey(path="/owner_id"),
            "documents": PartitionKey(path="/chatbot_id"),
            "conversations": PartitionKey(path="/chatbot_id"),
        }
        pk = partition_keys.get(container_name, PartitionKey(path="/id"))
        container = db.create_container(
            id=container_name,
            partition_key=pk,
            offer_throughput=400
        )
        return container


async def create_user(user_data: dict) -> dict:
    container = get_container("users")
    container.create_item(user_data)
    return user_data


async def get_user(user_id: str) -> Optional[dict]:
    container = get_container("users")
    try:
        return container.read_item(user_id, partition_key=user_id)
    except Exception:
        return None


async def get_user_by_email(email: str) -> Optional[dict]:
    container = get_container("users")
    query = "SELECT * FROM c WHERE c.email = @email"
    parameters = [{"name": "@email", "value": email}]
    items = list(container.query_items(query=query, parameters=parameters, enable_cross_partition_query=True))
    return items[0] if items else None


async def list_users(role: Optional[str] = None) -> List[dict]:
    container = get_container("users")
    if role:
        query = "SELECT * FROM c WHERE c.role = @role"
        parameters = [{"name": "@role", "value": role}]
        return list(container.query_items(query=query, parameters=parameters, enable_cross_partition_query=True))
    return list(container.query_items("SELECT * FROM c", enable_cross_partition_query=True))


async def create_chatbot(chatbot_data: dict) -> dict:
    container = get_container("chatbots")
    container.create_item(chatbot_data)
    return chatbot_data


async def get_chatbot(chatbot_id: str) -> Optional[dict]:
    container = get_container("chatbots")
    query = "SELECT * FROM c WHERE c.id = @chatbot_id"
    parameters = [{"name": "@chatbot_id", "value": chatbot_id}]
    items = list(container.query_items(query=query, parameters=parameters, enable_cross_partition_query=True))
    return items[0] if items else None


async def get_chatbot_by_id_and_owner(chatbot_id: str, owner_id: str) -> Optional[dict]:
    container = get_container("chatbots")
    query = "SELECT * FROM c WHERE c.id = @chatbot_id AND c.owner_id = @owner_id"
    parameters = [{"name": "@chatbot_id", "value": chatbot_id}, {"name": "@owner_id", "value": owner_id}]
    items = list(container.query_items(query=query, parameters=parameters, enable_cross_partition_query=True))
    return items[0] if items else None


async def update_chatbot(chatbot_id: str, updates: dict, owner_id: str) -> Optional[dict]:
    container = get_container("chatbots")
    try:
        item = container.read_item(chatbot_id, partition_key=owner_id)
        item.update(updates)
        item["updated_at"] = datetime.utcnow().isoformat()
        container.replace_item(chatbot_id, item)
        return item
    except Exception:
        return None


async def delete_chatbot(chatbot_id: str, owner_id: str) -> bool:
    container = get_container("chatbots")
    try:
        container.delete_item(chatbot_id, partition_key=owner_id)
        return True
    except Exception:
        return False


async def list_chatbots(owner_id: Optional[str] = None, published_only: bool = False) -> List[dict]:
    container = get_container("chatbots")
    conditions = []
    if owner_id:
        conditions.append(f"c.owner_id = '{owner_id}'")
    if published_only:
        conditions.append("c.is_published = true")
    
    if conditions:
        query = "SELECT * FROM c WHERE " + " AND ".join(conditions)
    else:
        query = "SELECT * FROM c"
    
    return list(container.query_items(query, enable_cross_partition_query=True))


async def create_document(document_data: dict) -> dict:
    container = get_container("documents")
    container.create_item(document_data)
    return document_data


async def get_document(document_id: str) -> Optional[dict]:
    container = get_container("documents")
    query = "SELECT * FROM c WHERE c.id = @document_id"
    parameters = [{"name": "@document_id", "value": document_id}]
    items = list(container.query_items(query=query, parameters=parameters, enable_cross_partition_query=True))
    return items[0] if items else None


async def update_document(document_id: str, updates: dict, chatbot_id: str) -> Optional[dict]:
    container = get_container("documents")
    try:
        item = container.read_item(document_id, partition_key=chatbot_id)
        item.update(updates)
        container.replace_item(document_id, item)
        return item
    except Exception:
        return None


async def list_documents(chatbot_id: str) -> List[dict]:
    container = get_container("documents")
    query = "SELECT * FROM c WHERE c.chatbot_id = @chatbot_id"
    parameters = [{"name": "@chatbot_id", "value": chatbot_id}]
    return list(container.query_items(query=query, parameters=parameters, enable_cross_partition_query=True))


async def delete_document(document_id: str, chatbot_id: str) -> bool:
    container = get_container("documents")
    try:
        container.delete_item(document_id, partition_key=chatbot_id)
        return True
    except Exception:
        return False


async def create_conversation(conversation_data: dict) -> dict:
    container = get_container("conversations")
    container.create_item(conversation_data)
    return conversation_data


async def get_conversation(conversation_id: str) -> Optional[dict]:
    container = get_container("conversations")
    query = "SELECT * FROM c WHERE c.id = @conversation_id"
    parameters = [{"name": "@conversation_id", "value": conversation_id}]
    items = list(container.query_items(query=query, parameters=parameters, enable_cross_partition_query=True))
    return items[0] if items else None


async def save_conversation(conversation_data: dict) -> dict:
    container = get_container("conversations")
    chatbot_id = conversation_data["chatbot_id"]
    try:
        item = container.read_item(conversation_data["id"], partition_key=chatbot_id)
        item["messages"] = conversation_data.get("messages", item.get("messages", []))
        item["updated_at"] = datetime.utcnow().isoformat()
        container.replace_item(conversation_data["id"], item)
        return item
    except Exception:
        container.create_item(conversation_data)
        return conversation_data


async def list_conversations(chatbot_id: str) -> List[dict]:
    container = get_container("conversations")
    query = f"SELECT * FROM c WHERE c.chatbot_id = '{chatbot_id}'"
    return list(container.query_items(query, enable_cross_partition_query=True))
