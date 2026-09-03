from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str


class Token(BaseModel):
    access_token: str
    token_type: str


class ClothingItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
    image_url: str
    created_at: str


class ClothingItemList(BaseModel):
    items: list[ClothingItemOut]


class OutfitCreate(BaseModel):
    name: str
    item_ids: list[int]


class OutfitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    item_ids: list[int]
    created_at: str


class OutfitList(BaseModel):
    outfits: list[OutfitOut]
