import os
from pathlib import Path


class Settings:
    def __init__(self) -> None:
        self.database_url = os.environ.get("DATABASE_URL", "sqlite:///./wardrobe.db")
        self.upload_dir = Path(os.environ.get("UPLOAD_DIR", "uploads"))
        self._jwt_secret = os.environ.get("JWT_SECRET")

    @property
    def jwt_secret(self) -> str:
        secret = self._jwt_secret
        if not secret:
            raise RuntimeError(
                "JWT_SECRET is not set. Declare it in RUN.json (class 'generate') "
                "or export it before starting the server."
            )
        return secret


settings = Settings()
