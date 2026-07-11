from sqlalchemy.orm import Session

from app.repositories.client_repo import ClientRepository
from app.models.client import Client


class ClientService:
    def __init__(self, db: Session):
        self.repo = ClientRepository(db)

    def get_by_id(self, client_id: int) -> Client | None:
        return self.repo.get_by_id(client_id)

    def get_by_document(self, document_number: str) -> Client | None:
        return self.repo.get_by_document(document_number)

    def search(self, query: str) -> list[Client]:
        return self.repo.search(query)

    def list_all(self) -> list[Client]:
        return self.repo.list_all()

    def list_paginated(self, page: int = 1, page_size: int = 10) -> tuple[list[Client], int]:
        return self.repo.list_paginated(page, page_size)

    def search_paginated(self, query: str, page: int = 1, page_size: int = 10) -> tuple[list[Client], int]:
        return self.repo.search_paginated(query, page, page_size)

    def create(self, **kwargs) -> Client:
        existing = self.repo.get_by_document(kwargs.get("document_number", ""))
        if existing:
            raise ValueError(f"Ya existe un cliente con documento {kwargs['document_number']}")
        return self.repo.create(**kwargs)

    def create_or_get(self, **kwargs) -> Client:
        existing = self.repo.get_by_document(kwargs.get("document_number", ""))
        if existing:
            return existing
        return self.repo.create(**kwargs)

    def update(self, client_id: int, **kwargs) -> Client:
        client = self.repo.update(client_id, **kwargs)
        if not client:
            raise ValueError("Cliente no encontrado")
        return client

    def soft_delete(self, client_id: int) -> bool:
        return self.repo.soft_delete(client_id)
