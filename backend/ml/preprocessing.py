"""
Preprocessing helpers — wraps SimpleImputer and StandardScaler in a scikit-learn
Pipeline so imputation and scaling statistics are strictly fitted only on training data.
"""

from __future__ import annotations

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder, StandardScaler

from ml.feature_engineering import FEATURE_COLUMNS, NUMERIC_FEATURES


def build_preprocessing_pipeline(estimator) -> Pipeline:
    """
    Wrap an estimator in a pipeline that imputes and standardises all numeric features.
    
    Data Leakage Protection:
        Imputation medians and standard scaler parameters are strictly fitted on the
        training fold during pipeline.fit(X_train, y_train) and applied without
        leakage to test/future observations.
    """
    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, FEATURE_COLUMNS),
        ],
        remainder="drop",
    )
    return Pipeline(steps=[("preprocessor", preprocessor), ("regressor", estimator)])

