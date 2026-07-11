from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.client import Client


class ClientRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, client_id: int) -> Client | None:
        return self.db.query(Client).filter(Client.id == client_id).first()

    def get_by_document(self, document_number: str) -> Client | None:
        return self.db.query(Client).filter(
            Client.document_number == document_number,
            Client.is_active == True,
        ).first()

    def search(self, query: str) -> list[Client]:
        term = f"%{query}%"
        return self.db.query(Client).filter(
            Client.is_active == True,
            or_(
                Client.name.ilike(term),
                Client.document_number.ilike(term),
                Client.email.ilike(term),
                Client.phone.ilike(term),
            ),
        ).order_by(Client.name).limit(50).all()

    def list_all(self, active_only: bool = True) -> list[Client]:
        q = self.db.query(Client)
        if active_only:
            q = q.filter(Client.is_active == True)
        return q.order_by(Client.name).all()

    def count_all(self, active_only: bool = True) -> int:
        q = self.db.query(Client)
        if active_only:
            q = q.filter(Client.is_active == True)
        return q.count()

    def list_paginated(self, page: int = 1, page_size: int = 10) -> tuple[list[Client], int]:
        q = self.db.query(Client).filter(Client.is_active == True)
        total = q.count()
        items = q.order_by(Client.name).offset((page - 1) * page_size).limit(page_size).all()
        return items, total

    def search_paginated(self, query: str, page: int = 1, page_size: int = 10) -> tuple[list[Client], int]:
        term = f"%{query}%"
        q = self.db.query(Client).filter(
            Client.is_active == True,
            or_(
                Client.name.ilike(term),
                Client.document_number.ilike(term),
                Client.email.ilike(term),
                Client.phone.ilike(term),
            ),
        )
        total = q.count()
        items = q.order_by(Client.name).offset((page - 1) * page_size).limit(page_size).all()
        return items, total

    def create(self, **kwargs) -> Client:
        client = Client(**kwargs)
        self.db.add(client)
        self.db.commit()
        self.db.refresh(client)
        return client

    def update(self, client_id: int, **kwargs) -> Client | None:
        client = self.get_by_id(client_id)
        if not client:
            return None
        for key, value in kwargs.items():
            if value is not None:
                setattr(client, key, value)
        self.db.commit()
        self.db.refresh(client)
        return client

    def soft_delete(self, client_id: int) -> bool:
        client = self.get_by_id(client_id)
        if not client:
            return False
        client.is_active = False
        self.db.commit()
        return True
