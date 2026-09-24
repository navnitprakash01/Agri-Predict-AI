"""
Agriculture Data Service for Ludhiana District.

Provides access to real, source-backed agricultural statistics:
1. District-level decadal/benchmark time series (1970–71 to 2023–24) from PAU / Dept of Agriculture.
2. Block-level reported production (2016–17) from Ludhiana Chief Agriculture Office.

STRICT PRINCIPLES:
- Never generate synthetic agricultural data.
- Never interpolate missing years (missing years return explicit 'Data Not Available' response).
- Never feed agricultural variables into the groundwater regression model.
- Provide clear provenance and citations for all data.
"""

from __future__ import annotations

import os
import pandas as pd
from typing import Optional

from schemas.agriculture_schema import (
    AgricultureSummary,
    BlockAgricultureResponse,
    BlockProductionRecord,
    CropYearQueryResponse,
    CropYearRecord,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DISTRICT_AGRI_PATH = os.path.join(
    BASE_DIR, "data", "ludhiana_rice_wheat_agriculture_expanded.csv"
)
BLOCK_AGRI_PATH = os.path.join(
    BASE_DIR, "data", "ludhiana_block_rice_wheat_2016_17.csv"
)

_district_cache: list[CropYearRecord] | None = None
_block_cache: list[BlockProductionRecord] | None = None


def load_district_agriculture() -> list[CropYearRecord]:
    """Load and validate district-level benchmark agricultural data."""
    global _district_cache
    if _district_cache is not None:
        return _district_cache

    if not os.path.exists(DISTRICT_AGRI_PATH):
        raise FileNotFoundError(
            f"District agriculture dataset not found at {DISTRICT_AGRI_PATH}"
        )

    df = pd.read_csv(DISTRICT_AGRI_PATH)
    required_cols = [
        "crop_year",
        "district",
        "rice_area_ha",
        "rice_production_t",
        "rice_yield_kg_ha",
        "wheat_area_ha",
        "wheat_production_t",
        "wheat_yield_kg_ha",
        "source",
        "data_status",
    ]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(
                f"Missing expected column '{col}' in {DISTRICT_AGRI_PATH}"
            )

    records: list[CropYearRecord] = []
    for _, row in df.iterrows():
        rec = CropYearRecord(
            crop_year=str(row["crop_year"]).strip(),
            district=str(row["district"]).strip(),
            rice_area_ha=float(row["rice_area_ha"]) if pd.notna(row["rice_area_ha"]) else None,
            rice_production_t=float(row["rice_production_t"]) if pd.notna(row["rice_production_t"]) else None,
            rice_yield_kg_ha=float(row["rice_yield_kg_ha"]) if pd.notna(row["rice_yield_kg_ha"]) else None,
            wheat_area_ha=float(row["wheat_area_ha"]) if pd.notna(row["wheat_area_ha"]) else None,
            wheat_production_t=float(row["wheat_production_t"]) if pd.notna(row["wheat_production_t"]) else None,
            wheat_yield_kg_ha=float(row["wheat_yield_kg_ha"]) if pd.notna(row["wheat_yield_kg_ha"]) else None,
            source=str(row["source"]).strip(),
            data_status=str(row["data_status"]).strip(),
        )
        records.append(rec)

    _district_cache = records
    return _district_cache


def load_block_agriculture() -> list[BlockProductionRecord]:
    """Load and validate block-level agricultural production data (2016-17)."""
    global _block_cache
    if _block_cache is not None:
        return _block_cache

    if not os.path.exists(BLOCK_AGRI_PATH):
        raise FileNotFoundError(
            f"Block agriculture dataset not found at {BLOCK_AGRI_PATH}"
        )

    df = pd.read_csv(BLOCK_AGRI_PATH)
    required_cols = [
        "crop_year",
        "district",
        "block",
        "paddy_production_reported",
        "wheat_production_reported",
        "source",
        "note",
    ]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing expected column '{col}' in {BLOCK_AGRI_PATH}")

    records: list[BlockProductionRecord] = []
    for _, row in df.iterrows():
        rec = BlockProductionRecord(
            crop_year=str(row["crop_year"]).strip(),
            district=str(row["district"]).strip(),
            block=str(row["block"]).strip(),
            paddy_production_reported=(
                float(row["paddy_production_reported"])
                if pd.notna(row["paddy_production_reported"])
                else None
            ),
            wheat_production_reported=(
                float(row["wheat_production_reported"])
                if pd.notna(row["wheat_production_reported"])
                else None
            ),
            source=str(row["source"]).strip(),
            note=str(row["note"]).strip() if pd.notna(row["note"]) else None,
        )
        records.append(rec)

    _block_cache = records
    return _block_cache


def get_available_years() -> list[str]:
    """Return the exact list of officially observed crop years."""
    records = load_district_agriculture()
    return [r.crop_year for r in records]


def get_crop_records() -> list[CropYearRecord]:
    """Return all observed district benchmark records (non-interpolated)."""
    return load_district_agriculture()


def get_agriculture_summary() -> AgricultureSummary:
    """Return summary metadata and the latest benchmark record."""
    records = load_district_agriculture()
    years = [r.crop_year for r in records]
    latest = records[-1] if records else None
    earliest = years[0] if years else ""
    latest_yr = years[-1] if years else ""

    return AgricultureSummary(
        district="Ludhiana",
        available_years=years,
        earliest_year=earliest,
        latest_year=latest_yr,
        total_benchmark_records=len(records),
        latest_record=latest,
        data_notice=(
            "Official benchmark statistics from PAU and Department of Agriculture. "
            "Intermediate unobserved years are intentionally not interpolated."
        ),
        block_data_years=["2016-17"],
    )


def get_crop_by_year(year_query: str | int) -> CropYearQueryResponse:
    """
    Look up agricultural statistics for a specific crop year.
    Matches exact strings (e.g. '2023-24') or prefix/suffix years (e.g. '2023' or 2024).
    If unobserved, returns available=False with an informative non-interpolation notice.
    """
    records = load_district_agriculture()
    q = str(year_query).strip().lower()

    for r in records:
        cy = r.crop_year.lower()
        if q == cy or q in cy.split("-"):
            return CropYearQueryResponse(
                available=True,
                crop_year=r.crop_year,
                record=r,
                message=f"Official benchmark record found for {r.crop_year}",
            )

    return CropYearQueryResponse(
        available=False,
        crop_year=str(year_query),
        record=None,
        message=(
            f"No official agricultural survey benchmark recorded for crop year '{year_query}'. "
            f"Available benchmark years are: {', '.join(get_available_years())}. "
            "Missing years are not interpolated to preserve scientific authenticity."
        ),
    )


def get_block_data() -> BlockAgricultureResponse:
    """Return 2016-17 block-level reported production across Ludhiana blocks."""
    records = load_block_agriculture()
    source = records[0].source if records else "Ludhiana District Administration"
    note = records[0].note or "" if records else ""

    return BlockAgricultureResponse(
        crop_year="2016-17",
        district="Ludhiana",
        total_blocks=len(records),
        records=records,
        source=source,
        note=note,
    )


def get_latest_district_agriculture() -> CropYearRecord | None:
    """Return the most recent observed district agricultural record."""
    records = load_district_agriculture()
    return records[-1] if records else None
