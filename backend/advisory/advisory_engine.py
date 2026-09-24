"""
Rule-based farmer advisory engine.

This is NOT a machine-learning model. It generates practical recommendations
based on the predicted groundwater level, depletion rate, risk level, and
seasonal/agricultural context using deterministic rules.

Advisories are educational and decision-support only — they do not guarantee
any agricultural outcome.

Notice on Architecture:
Groundwater forecasting is performed locally by the validated ML pipeline trained
on CGWB observations. Agricultural statistics from PAU / Dept of Agriculture are
provided as an educational and advisory context layer only; they are NOT causal
model inputs.
"""

from __future__ import annotations

from typing import Any, Optional

try:
    from agriculture.agriculture_service import get_latest_district_agriculture
except ImportError:
    try:
        from backend.agriculture.agriculture_service import get_latest_district_agriculture
    except ImportError:
        get_latest_district_agriculture = None

SEASON_TIPS = {
    "Kharif": [
        "Kharif is the primary rice (paddy) cultivation season in Ludhiana — monitor tube-well water levels frequently.",
        "Implement Alternate Wetting and Drying (AWD) to reduce paddy water consumption by 15–25% without sacrificing yield.",
        "Adopt Direct Seeded Rice (DSR) or short-duration varieties (e.g., PR-126) recommended by PAU to shorten the flooding window.",
    ],
    "Rabi": [
        "Rabi wheat requires significantly less water than paddy (~4–5 irrigations) — schedule water applications based on critical growth stages (crown root initiation, booting, grain filling).",
        "Use happy seeders / surface mulching to conserve residual soil moisture and reduce early-season irrigation requirements.",
    ],
    "Pre-Monsoon": [
        "Pre-monsoon (May–June) is the period of greatest aquifer drawdown in Ludhiana — avoid unnecessary pumping.",
        "Clean, desilt, and inspect rainwater recharge shafts and farm ponds prior to onset of the monsoon.",
    ],
    "Post-Monsoon": [
        "Post-monsoon water table reflects seasonal aquifer replenishment — record station levels to calibrate Rabi water planning.",
        "Budget winter irrigation carefully if post-monsoon recharge was below historical norms.",
    ],
}


def classify_risk(predicted_level: float, depletion_from_baseline: float) -> str:
    """
    Classify Groundwater Depletion Risk based on predicted depth and depletion from baseline.

    NOTICE:
    These are PROJECT-DEFINED RISK THRESHOLDS established as heuristic decision-support
    benchmarks for Ludhiana district aquifers. They are NOT official statutory CGWB thresholds.
    """
    if predicted_level >= 25 or depletion_from_baseline >= 1.5:
        return "Critical"
    elif predicted_level >= 18 or depletion_from_baseline >= 1.0:
        return "High"
    elif predicted_level >= 12 or depletion_from_baseline >= 0.5:
        return "Moderate"
    else:
        return "Low"


def generate_advisory(
    predicted_level: float,
    depletion_rate: float,
    risk_level: str,
    season: str,
    rainfall: float,
    rice_area: float,
    wheat_area: float,
    irrigation_intensity: float,
) -> list[str]:
    """Generate an actionable list of advisory guidelines based on deterministic rules."""
    advisories: list[str] = []

    # --- 1. Risk-based aquifer advisories ---
    if risk_level == "Critical":
        advisories.append(
            "CRITICAL WATER TABLE: Aquifer depth exceeds critical thresholds (>25 mbgl or severe drawdown). Urgent water conservation measures are advised."
        )
        advisories.append(
            "Diversification: Replace a portion of paddy area with lower water-demand crops such as maize, basmati, moong (summer pulses), or oilseeds."
        )
        advisories.append(
            "Laser Land Levelling: Ensure precision field levelling to reduce irrigation runoff and improve water application efficiency by up to 20%."
        )
        advisories.append(
            "Recharge Infrastructure: Prioritise rooftop and farm-level rainwater harvesting to facilitate aquifer recharge during heavy rain events."
        )
    elif risk_level == "High":
        advisories.append(
            "HIGH DEPLETION STRESS: Water table is deep (>18 mbgl). Mitigate pump runtime through high-efficiency irrigation."
        )
        advisories.append(
            "Adopt Alternate Wetting and Drying (AWD) in paddy fields using tensiometers or perforated pipes to avoid continuous ponding."
        )
        advisories.append(
            "Avoid deep tube-well suction lowering; shift to underground pipeline systems to eliminate distribution losses."
        )
    elif risk_level == "Moderate":
        advisories.append(
            "MODERATE DEPLETION: Manage water applications prudently to prevent aquifer transition to high risk."
        )
        advisories.append(
            "Adhere strictly to PAU notification dates for paddy transplanting to utilise monsoon rains and minimize pre-monsoon pumping."
        )
        advisories.append(
            "Maintain rainwater harvesting and farm infiltration trenches."
        )
    else:
        advisories.append(
            "STABLE AQUIFER ZONE: Water depth is relatively stable. Maintain conservation practices to preserve local groundwater reserves."
        )
        advisories.append(
            "Regularly monitor well levels at the start and conclusion of each crop cycle."
        )

    # --- 2. Depletion rate advisories ---
    if depletion_rate > 1.0:
        advisories.append(
            f"Accelerated Depletion Detected ({depletion_rate:.2f} m/year increase in depth). Immediate community-level demand management recommended."
        )

    # --- 3. Seasonal agricultural guidance ---
    season_key = season if season in SEASON_TIPS else None
    if season_key:
        for tip in SEASON_TIPS[season_key]:
            advisories.append(tip)

    # --- 4. Crop area & irrigation intensity rules ---
    if rice_area > 30000:
        advisories.append(
            "High Paddy Footprint: Extensive paddy cultivation in this zone creates heavy seasonal withdrawal. Crop rotation with legumes is recommended."
        )
    if wheat_area > 30000 and season == "Rabi":
        advisories.append(
            "Wheat Management: Avoid excess irrigation during flowering and grain development; 4 to 5 timed waterings are typically optimal."
        )
    if irrigation_intensity > 200:
        advisories.append(
            "High Cropping/Irrigation Intensity: Intensive multi-cropping increases annual draft. Consider soil moisture sensing to avoid overwatering."
        )

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for a in advisories:
        if a not in seen:
            seen.add(a)
            unique.append(a)

    return unique


def build_advisory_response(
    predicted_level: float,
    depletion_rate: float,
    season: str,
    rainfall: float,
    rice_area: float,
    wheat_area: float,
    irrigation_intensity: float,
) -> dict[str, Any]:
    """Build the complete advisory response dict including agricultural benchmark context."""
    risk_level = classify_risk(predicted_level, depletion_rate)
    advisories = generate_advisory(
        predicted_level,
        depletion_rate,
        risk_level,
        season,
        rainfall,
        rice_area,
        wheat_area,
        irrigation_intensity,
    )

    # Retrieve official district agricultural benchmark
    agri_context: dict[str, Any] | None = None
    if get_latest_district_agriculture is not None:
        try:
            latest = get_latest_district_agriculture()
            if latest:
                agri_context = {
                    "crop_year": latest.crop_year,
                    "district": latest.district,
                    "rice_area_ha": latest.rice_area_ha,
                    "rice_production_t": latest.rice_production_t,
                    "rice_yield_kg_ha": latest.rice_yield_kg_ha,
                    "wheat_area_ha": latest.wheat_area_ha,
                    "wheat_production_t": latest.wheat_production_t,
                    "wheat_yield_kg_ha": latest.wheat_yield_kg_ha,
                    "source": latest.source,
                    "relationship_notice": (
                        "Official district agricultural statistics provide regional agronomic context. "
                        "They are NOT model input regressors; groundwater level is predicted directly "
                        "from CGWB hydrogeological observations."
                    ),
                }
        except Exception:
            agri_context = None

    return {
        "risk_level": risk_level,
        "depletion_rate": round(depletion_rate, 2),
        "advisory": advisories,
        "risk_classification_type": "Project-Defined Groundwater Depletion Risk Thresholds",
        "agricultural_context": agri_context,
    }
