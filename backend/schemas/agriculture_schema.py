"""
Pydantic schemas for Ludhiana district and block agricultural statistics.

Sources:
- District-level time benchmarks (1970–2024): AERC / PAU / Department of Agriculture & Farmers' Welfare Punjab.
- Block-level crop production (2016–17): Ludhiana District Administration, Chief Agriculture Office.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class CropYearRecord(BaseModel):
    crop_year: str = Field(..., description="Crop agricultural year, e.g. '2023-24'")
    district: str = Field("Ludhiana", description="District name")
    rice_area_ha: Optional[float] = Field(None, description="Rice/Paddy area in hectares")
    rice_production_t: Optional[float] = Field(None, description="Rice production in metric tonnes")
    rice_yield_kg_ha: Optional[float] = Field(None, description="Rice yield in kg/hectare")
    wheat_area_ha: Optional[float] = Field(None, description="Wheat area in hectares")
    wheat_production_t: Optional[float] = Field(None, description="Wheat production in metric tonnes")
    wheat_yield_kg_ha: Optional[float] = Field(None, description="Wheat yield in kg/hectare")
    source: str = Field(..., description="Official government/institutional source")
    data_status: str = Field("observed/source-reported", description="Status of record (never synthetic or interpolated)")


class BlockProductionRecord(BaseModel):
    crop_year: str = Field(..., description="Crop year, e.g. '2016-17'")
    district: str = Field("Ludhiana", description="District name")
    block: str = Field(..., description="Administrative block name in Ludhiana")
    paddy_production_reported: Optional[float] = Field(None, description="Paddy production reported by Chief Agriculture Office")
    wheat_production_reported: Optional[float] = Field(None, description="Wheat production reported by Chief Agriculture Office")
    source: str = Field(..., description="Official reporting source")
    note: Optional[str] = Field(None, description="Reporting context or unit documentation")


class AgricultureSummary(BaseModel):
    district: str = "Ludhiana"
    available_years: list[str] = Field(..., description="List of observed agricultural benchmark years")
    earliest_year: str
    latest_year: str
    total_benchmark_records: int
    latest_record: Optional[CropYearRecord] = None
    data_notice: str = Field(
        "Official benchmark statistics from PAU and Department of Agriculture. "
        "Missing intermediate years are not interpolated.",
        description="Notice on dataset authenticity and non-interpolation",
    )
    block_data_years: list[str] = Field(default_factory=lambda: ["2016-17"])


class CropYearQueryResponse(BaseModel):
    available: bool = Field(..., description="True if agricultural data is officially observed for requested year")
    crop_year: str
    record: Optional[CropYearRecord] = None
    message: Optional[str] = None


class BlockAgricultureResponse(BaseModel):
    crop_year: str = "2016-17"
    district: str = "Ludhiana"
    total_blocks: int
    records: list[BlockProductionRecord]
    source: str
    note: str
