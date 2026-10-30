"""Input-domain checks shared by the risk API and its tests.

These are *model support* limits derived from the rows retained by
``train.py``.  They are deliberately not clinical reference ranges and never
modify a measurement.  They prevent the UI from presenting an unsupported
extrapolation as a routine model result.
"""

from __future__ import annotations

from typing import Mapping


# Matches the explicit cleaning rules in train.py.  Keeping this information
# close to the serving code makes a training-serving contract auditable.
MODEL_SUPPORT_RANGES: dict[str, tuple[float, float, str]] = {
    "age": (18, 120, "years"),
    "height": (100, 230, "cm"),
    "weight": (30, 200, "kg"),
    "systolic_bp": (70, 250, "mmHg"),
    "diastolic_bp": (40, 180, "mmHg"),
}


def model_support_warnings(values: Mapping[str, float | int]) -> list[str]:
    """Return transparent warnings for inputs excluded from model training."""
    warnings: list[str] = []
    for field, (minimum, maximum, unit) in MODEL_SUPPORT_RANGES.items():
        value = float(values[field])
        if not minimum <= value <= maximum:
            label = field.replace("_", " ")
            warnings.append(
                f"{label.capitalize()} ({value:g} {unit}) is outside the range "
                f"used to train this model ({minimum:g}–{maximum:g} {unit}). "
                "Verify the measurement before requesting an educational estimate."
            )
    return warnings


def reported_input_context(values: Mapping[str, float | int]) -> list[str]:
    """Describe reported inputs without inventing a separate medical score."""
    context: list[str] = []
    if int(values["cholesterol"]) == 3:
        context.append("Cholesterol category was selected as High.")
    if int(values["glucose"]) == 3:
        context.append("Glucose category was selected as High.")
    if int(values["smoking"]):
        context.append("Smoking was reported.")
    if int(values["alcohol"]):
        context.append("Alcohol consumption was reported.")
    if not int(values["physical_activity"]):
        context.append("No physical activity was reported.")
    return context
