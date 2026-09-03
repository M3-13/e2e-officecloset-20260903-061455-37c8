from sqlalchemy import Column, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

from .db import Base

outfit_items = Table(
    "outfit_items",
    Base.metadata,
    Column("outfit_id", Integer, ForeignKey("outfits.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "clothing_item_id",
        Integer,
        ForeignKey("clothing_items.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

    clothing_items = relationship(
        "ClothingItem", back_populates="owner", cascade="all, delete-orphan"
    )
    outfits = relationship("Outfit", back_populates="owner", cascade="all, delete-orphan")


class ClothingItem(Base):
    __tablename__ = "clothing_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    image_url = Column(String, nullable=False)
    created_at = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    owner = relationship("User", back_populates="clothing_items")
    outfits = relationship("Outfit", secondary=outfit_items, back_populates="items")


class Outfit(Base):
    __tablename__ = "outfits"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    owner = relationship("User", back_populates="outfits")
    items = relationship("ClothingItem", secondary=outfit_items, back_populates="outfits")
