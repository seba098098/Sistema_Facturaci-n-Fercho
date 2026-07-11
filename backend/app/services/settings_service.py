from sqlalchemy.orm import Session

from app.repositories.settings_repo import SettingsRepository


class SettingsService:
    def __init__(self, db: Session):
        self.repo = SettingsRepository(db)

    def get_all(self) -> dict[str, str | None]:
        return self.repo.get_all()

    def get(self, key: str) -> str | None:
        return self.repo.get(key)

    def update(self, key: str, value: str | None) -> None:
        self.repo.set(key, value)

    def update_many(self, data: dict[str, str | None]) -> None:
        self.repo.set_many(data)

    def initialize(self) -> None:
        self.repo.initialize_defaults()
