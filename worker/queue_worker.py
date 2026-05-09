import asyncio
import json
from settings import settings
from document_processor import process_document


class QueueWorker:
    def __init__(self):
        self.is_running = False

    async def process_message(self, message: dict):
        doc_id = message.get("document_id")
        chatbot_id = message.get("chatbot_id")
        blob_url = message.get("blob_url")
        filename = message.get("filename")
        mime_type = message.get("mime_type")

        print(f"Processing document: {doc_id}")

        try:
            result = await process_document(doc_id, chatbot_id, blob_url, filename, mime_type)
            print(f"Document {doc_id} processed. Chunks: {result['chunk_count']}")
            return True
        except Exception as e:
            print(f"Error processing {doc_id}: {str(e)}")
            return False

    async def run(self):
        if not settings.AZURE_QUEUE_CONNECTION_STRING:
            print("Queue not configured. Running in demo mode.")
            await self.demo_mode()
            return

        from azure.storage.queue import QueueClient

        queue_client = QueueClient.from_connection_string(
            settings.AZURE_QUEUE_CONNECTION_STRING,
            settings.AZURE_QUEUE_NAME
        )

        print(f"Worker started. Listening to: {settings.AZURE_QUEUE_NAME}")
        self.is_running = True

        while self.is_running:
            try:
                messages = queue_client.receive_messages(max_messages=1, visibility_timeout=30)

                for message in messages:
                    try:
                        content = json.loads(message.content)
                        success = await self.process_message(content)
                        if success:
                            queue_client.delete_message(message.id, message.pop_receipt)
                        else:
                            queue_client.update_message(
                                message.id, message.pop_receipt, visibility_timeout=300
                            )
                    except Exception as e:
                        print(f"Error: {str(e)}")
                        try:
                            queue_client.update_message(
                                message.id, message.pop_receipt, visibility_timeout=60
                            )
                        except Exception:
                            pass

                await asyncio.sleep(1)
            except Exception as e:
                print(f"Queue error: {str(e)}")
                await asyncio.sleep(5)

    async def demo_mode(self):
        print("Demo mode: Simulating document processing...")
        print(f"Messages would be processed from: {settings.AZURE_QUEUE_NAME}")
        print("Press Ctrl+C to exit")
        while True:
            await asyncio.sleep(10)


if __name__ == "__main__":
    worker = QueueWorker()
    asyncio.run(worker.run())