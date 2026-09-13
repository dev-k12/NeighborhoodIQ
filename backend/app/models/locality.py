from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from pydantic import BaseModel, Field
from app.db.database import Base


class Locality(Base):
    __tablename__ = "localities"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, index=True)
    city = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=True, index=True)
    state = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # Real raw counts extracted from OpenStreetMap
    healthcare_count = Column(Integer, default=0, nullable=False)
    education_count = Column(Integer, default=0, nullable=False)
    green_space_count = Column(Integer, default=0, nullable=False)
    transit_count = Column(Integer, default=0, nullable=False)
    amenity_count = Column(Integer, default=0, nullable=False)
    safety_proxy_count = Column(Integer, default=0, nullable=False)
    aqi = Column(Float, nullable=True)

    # Normalized component scores (0 - 100)
    healthcare_score = Column(Float, default=0.0)
    education_score = Column(Float, default=0.0)
    green_space_score = Column(Float, default=0.0)
    transit_score = Column(Float, default=0.0)
    amenity_score = Column(Float, default=0.0)
    safety_proxy_score = Column(Float, default=0.0)

    # Composite Quality Score (0 - 100)
    quality_score = Column(Float, default=0.0, index=True)

    # Clustering Archetype
    cluster_id = Column(Integer, default=0)
    cluster_label = Column(String(100), default="Balanced Suburb")
    cluster_description = Column(String(255), default="Moderate density with balanced community infrastructure")

    # Metadata
    is_seed = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "city": self.city,
            "district": self.district or self.city,
            "state": self.state,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "counts": {
                "healthcare": self.healthcare_count,
                "education": self.education_count,
                "green_space": self.green_space_count,
                "transit": self.transit_count,
                "amenity": self.amenity_count,
                "safety_proxy": self.safety_proxy_count,
                "aqi": self.aqi,
            },
            "scores": {
                "healthcare": round(self.healthcare_score or 0.0, 1),
                "education": round(self.education_score or 0.0, 1),
                "green_space": round(self.green_space_score or 0.0, 1),
                "transit": round(self.transit_score or 0.0, 1),
                "amenity": round(self.amenity_score or 0.0, 1),
                "safety_proxy": round(self.safety_proxy_score or 0.0, 1),
            },
            "quality_score": round(self.quality_score or 0.0, 1),
            "cluster": {
                "id": self.cluster_id,
                "label": self.cluster_label,
                "description": self.cluster_description,
            },
            "is_seed": self.is_seed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# Pydantic validation schemas
class WeightsUpdateRequest(BaseModel):
    weights: Dict[str, float] = Field(
        ...,
        description="Custom weights dictionary mapping category keys to numeric values",
        example={
            "healthcare": 0.25,
            "education": 0.15,
            "green_space": 0.15,
            "transit": 0.20,
            "amenity": 0.15,
            "safety_proxy": 0.10,
        }
    )


class LocalityResponse(BaseModel):
    id: int
    name: str
    city: str
    state: Optional[str] = None
    latitude: float
    longitude: float
    counts: Dict[str, Any]
    scores: Dict[str, float]
    quality_score: float
    cluster: Dict[str, Any]
    is_seed: bool
    rank: Optional[int] = None
