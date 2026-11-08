"""
Dịch vụ gợi ý FarmTable (FastAPI). Express gọi qua proxy với timeout; dịch vụ này tắt thì website vẫn chạy (fallback).
    uvicorn service:app --port 8000
"""
from __future__ import annotations

import threading
import time
from pathlib import Path

import joblib
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from train import DEFAULT_CATALOG, DEFAULT_MODEL, train

app = FastAPI(title="FarmTable Recommender", version="1.0")
_lock = threading.Lock()
_state: dict = {"model": None, "loadedAt": None}


def _load(force_train: bool = False):
    with _lock:
        need_train = force_train or not DEFAULT_MODEL.exists()
        # Catalog mới hơn model (vừa seed lại) => huấn luyện lại để id khớp database.
        if not need_train and DEFAULT_CATALOG.exists() and DEFAULT_CATALOG.stat().st_mtime > DEFAULT_MODEL.stat().st_mtime:
            need_train = True
        model = train() if need_train else joblib.load(DEFAULT_MODEL)
        _state["model"] = model
        _state["loadedAt"] = time.time()
        return model


def model():
    m = _state["model"]
    if m is None:
        m = _load()
    return m


@app.on_event("startup")
def _startup():
    _load()


@app.get("/health")
def health():
    m = model()
    return {"status": "ok", "modelVersion": m.version, "items": len(m.ids)}


@app.get("/similar/{product_id}")
def similar(product_id: str, k: int = Query(5, ge=1, le=50)):
    m = model()
    started = time.perf_counter()
    items = m.similar(product_id, k)
    if items is None:
        raise HTTPException(status_code=404, detail="product not in model")
    return {"modelVersion": m.version, "items": items, "latencyMs": round((time.perf_counter() - started) * 1000, 2)}


class ForUserBody(BaseModel):
    productIds: list[str] = Field(default_factory=list, max_length=50)
    k: int = Field(8, ge=1, le=50)


@app.post("/for-user")
def for_user(body: ForUserBody):
    m = model()
    started = time.perf_counter()
    items = m.for_user(body.productIds, body.k)
    return {"modelVersion": m.version, "items": items, "latencyMs": round((time.perf_counter() - started) * 1000, 2)}


@app.get("/explain/{product_id}")
def explain(product_id: str):
    """Các từ khóa TF-IDF nổi bật của sản phẩm (để giải thích vì sao được gợi ý)."""
    m = model()
    return {"modelVersion": m.version, "terms": m.top_terms(product_id, 10)}


@app.post("/reload")
def reload():
    m = _load(force_train=True)
    return {"modelVersion": m.version, "items": len(m.ids)}
