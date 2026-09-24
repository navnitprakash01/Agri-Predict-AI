"""
Synthetic Demo Data Generator (For Development & Testing Only)
Ludhiana District Groundwater Depletion & Agricultural Dataset.

NOTICE:
This script generates SYNTHETIC DEMO DATA for development, testing, and UI preview.
It does NOT contain actual measured Central Ground Water Board (CGWB) observations.
Do NOT present this synthetic demo data as real CGWB data.
For production use, place the official CGWB observation dataset at:
    backend/data/cgwb_data.csv

Columns produced:
    year, season, block, groundwater_level_m, rainfall_mm,
    rice_area_hectares, wheat_area_hectares, agricultural_area_hectares,
    irrigation_intensity_pct, groundwater_extraction_mcm,
    previous_groundwater_level_m
"""

import os
import numpy as np
import pandas as pd

BLOCKS = [
    "Ludhiana-1", "Ludhiana-2", "Samrala", "Khanna", "Machhiwara",
    "Doraha", "Jagraon", "Raikot", "Sidhwan Bet", "Pakhowal",
    "Dehlon", "Malaud", "Kila Raipur", "Ludhiana East", "Ludhiana West",
]

SEASONS = ["Kharif", "Rabi", "Pre-Monsoon", "Post-Monsoon"]

YEAR_START = 2000
YEAR_END = 2023


def generate():
    rng = np.random.default_rng(seed=42)
    rows = []

    for block in BLOCKS:
        # Base groundwater depth (mbgl) varies by block
        base_level = rng.uniform(8.0, 14.0)
        # Long-term depletion trend per year (m/year) — Ludhiana is declining
        trend = rng.uniform(0.3, 0.8)

        for year in range(YEAR_START, YEAR_END + 1):
            for season in SEASONS:
                # Seasonal rainfall (mm)
                if season == "Kharif":
                    rainfall = rng.normal(550, 120)
                elif season == "Rabi":
                    rainfall = rng.normal(80, 30)
                elif season == "Pre-Monsoon":
                    rainfall = rng.normal(40, 15)
                else:
                    rainfall = rng.normal(350, 90)
                rainfall = max(0, rainfall)

                # Rice is primarily Kharif; wheat is Rabi
                rice_area = (
                    rng.normal(42000, 4000) if season == "Kharif" else rng.normal(5000, 800)
                )
                wheat_area = (
                    rng.normal(38000, 3500) if season == "Rabi" else rng.normal(3000, 500)
                )
                rice_area = max(0, rice_area)
                wheat_area = max(0, wheat_area)

                agricultural_area = rng.normal(75000, 5000)
                irrigation_intensity = rng.normal(180, 20)

                # Groundwater extraction (million cubic meters) scales with area
                extraction = (rice_area + wheat_area) / 1000 * rng.uniform(0.8, 1.2)

                # Groundwater level model:
                # depth increases (depletion) with trend, extraction
                # decreases (recharge) with rainfall
                years_elapsed = year - YEAR_START
                seasonal_offset = {
                    "Pre-Monsoon": 1.5,
                    "Kharif": 0.8,
                    "Post-Monsoon": -1.0,
                    "Rabi": 0.3,
                }[season]

                gw_level = (
                    base_level
                    + trend * years_elapsed
                    + seasonal_offset
                    + extraction * 0.0003
                    - rainfall * 0.002
                    + rng.normal(0, 0.6)
                )
                gw_level = max(2.0, gw_level)

                rows.append(
                    {
                        "year": year,
                        "season": season,
                        "block": block,
                        "groundwater_level_m": round(gw_level, 2),
                        "rainfall_mm": round(rainfall, 1),
                        "rice_area_hectares": round(rice_area, 0),
                        "wheat_area_hectares": round(wheat_area, 0),
                        "agricultural_area_hectares": round(agricultural_area, 0),
                        "irrigation_intensity_pct": round(irrigation_intensity, 1),
                        "groundwater_extraction_mcm": round(extraction, 2),
                    }
                )

    df = pd.DataFrame(rows)

    # Build previous groundwater level (lag by block, ordered by year+season)
    season_order = {"Pre-Monsoon": 0, "Kharif": 1, "Post-Monsoon": 2, "Rabi": 3}
    df["_season_idx"] = df["season"].map(season_order)
    df = df.sort_values(["block", "year", "_season_idx"]).reset_index(drop=True)
    df["previous_groundwater_level_m"] = (
        df.groupby("block")["groundwater_level_m"].shift(1).fillna(df["groundwater_level_m"])
    )
    df = df.drop(columns=["_season_idx"])

    # Inject ~3% missing values for realism
    for col in ["groundwater_level_m", "rainfall_mm", "groundwater_extraction_mcm"]:
        mask = rng.random(len(df)) < 0.03
        df.loc[mask, col] = np.nan

    # SAFETY: Write strictly to synthetic_demo_data_legacy.csv.
    # NEVER overwrite the official CGWB observation file (cgwb_data.csv).
    out = os.path.join(os.path.dirname(__file__), "synthetic_demo_data_legacy.csv")
    if os.path.basename(out) == "cgwb_data.csv":
        raise RuntimeError("FATAL SAFETY HALT: generate_data.py must NEVER overwrite cgwb_data.csv!")

    df.to_csv(out, index=False)
    print(f"WARNING: Generated legacy synthetic demo data -> {out}")
    print("DO NOT USE THIS SYNTHETIC FILE FOR RESEARCH EVALUATION OR REAL PREDICTIONS.")
    print(df.head())
    print(f"\nYear range: {df['year'].min()}-{df['year'].max()}")
    print(f"Blocks: {df['block'].nunique()}")
    print(f"Missing values:\n{df.isnull().sum()}")


if __name__ == "__main__":
    generate()
