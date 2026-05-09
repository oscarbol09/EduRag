from azure.cosmos import CosmosClient, PartitionKey
from typing import Optional
from settings import settings

_client: Optional[CosmosClient] = None


def get_cosmos_client() -> CosmosClient:
    global _client
    if _client is None:
        if not settings.COSMOS_DB_ENDPOINT or not settings.COSMOS_DB_KEY:
            raise RuntimeError("Cosmos DB not configured")
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


async def update_document(document_id: str, updates: dict, chatbot_id: str) -> Optional[dict]:
    container = get_container("documents")
    try:
        item = container.read_item(document_id, partition_key=chatbot_id)
        item.update(updates)
        container.replace_item(document_id, item)
        return item
    except Exception:
        return None