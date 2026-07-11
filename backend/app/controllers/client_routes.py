from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.services.client_service import ClientService

router = APIRouter(prefix="/api/clients", tags=["clients"])


@router.get("/", response_model=list[ClientResponse])
def list_clients(
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    service = ClientService(db)
    if search:
        return service.search(search)
    return service.list_all()


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(client_id: int, db: Session = Depends(get_db)):
    service = ClientService(db)
    client = service.get_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return client


@router.get("/document/{document_number}", response_model=ClientResponse | None)
def get_client_by_document(document_number: str, db: Session = Depends(get_db)):
    service = ClientService(db)
    return service.get_by_document(document_number)


@router.post("/", response_model=ClientResponse, status_code=201)
def create_client(data: ClientCreate, db: Session = Depends(get_db)):
    service = ClientService(db)
    try:
        return service.create(**data.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(client_id: int, data: ClientUpdate, db: Session = Depends(get_db)):
    service = ClientService(db)
    try:
        return service.update(client_id, **data.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)):
    service = ClientService(db)
    if not service.soft_delete(client_id):
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return {"message": "Cliente eliminado correctamente"}
