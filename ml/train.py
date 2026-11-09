"""
Huấn luyện mô hình gợi ý từ ml/data/catalog.json (do `npm run seed` ở server xuất ra).
    python train.py            # lưu artifacts/model.joblib
Chạy lại trên cùng catalog cho cùng kết quả (cùng modelVersion).
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib

from recommender import ContentRecommender, load_catalog

HERE = Path(__file__).resolve().parent
DEFAULT_CATALOG = HERE / "data" / "catalog.json"
DEFAULT_MODEL = HERE / "artifacts" / "model.joblib"


def train(catalog_path: Path = DEFAULT_CATALOG, model_path: Path = DEFAULT_MODEL) -> ContentRecommender:
    products = load_catalog(catalog_path)
    model = ContentRecommender().fit(products)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_path)
    info = {
        "modelVersion": model.version,
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "items": len(model.ids),
        "vocabulary": len(model.vectorizer.vocabulary_),
        "catalog": str(catalog_path.name),
        "weights": model.weights,
        "ngramRange": list(model.ngram_range),
    }
    (model_path.parent / "model-info.json").write_text(json.dumps(info, indent=2, ensure_ascii=False), encoding="utf-8")
    return model


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    ap.add_argument("--out", type=Path, default=DEFAULT_MODEL)
    args = ap.parse_args()
    m = train(args.catalog, args.out)
    print(f"Đã huấn luyện {m.version}: {len(m.ids)} sản phẩm, {len(m.vectorizer.vocabulary_)} đặc trưng")
    sample = m.ids[0]
    print("Ví dụ gợi ý cho", m.meta[0]["name"], "->", [r["slug"] for r in m.similar(sample, 5)])
    print("Từ khóa nổi bật:", m.top_terms(sample))
