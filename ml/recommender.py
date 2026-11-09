"""
Mô hình gợi ý dựa trên nội dung (content-based) cho FarmTable.

Đặc trưng: TF-IDF (unigram + bigram âm tiết) trên văn bản sản phẩm gồm tên (nhân trọng số),
nhãn danh mục, mô tả, nông trại, tỉnh và chứng nhận. Độ tương đồng: cosine.
Hồ sơ người dùng: trung bình có trọng số (gần đây nặng hơn) các vector sản phẩm đã tương tác.
"""
from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel

CATEGORY_WORDS = {
    "rau-cu": "rau cu rau xanh cu qua",
    "trai-cay": "trai cay hoa qua",
    "thit-thuy-san": "thit thuy san hai san",
    "trung-sua": "trung sua",
}

# Từ phổ biến không mang thông tin phân biệt sản phẩm (đã bỏ dấu).
STOP_WORDS = [
    "va", "cua", "cho", "duoc", "khi", "nhung", "rat", "co", "la", "voi", "tai", "trong", "theo",
    "nhieu", "it", "hon", "mot", "cac", "nhu", "de", "vi", "do", "nen", "ngay", "bang", "tu", "den",
    "thich", "hop", "dam", "bao", "chat", "luong", "tuoi", "ngon", "sach", "giai", "cuu",
]

DEFAULT_WEIGHTS = {"name": 3, "category": 2, "description": 1, "farm": 1, "province": 1, "certifications": 1}


def normalize(text: str) -> str:
    """Bỏ dấu tiếng Việt + chữ thường + bỏ ký tự đặc biệt."""
    text = unicodedata.normalize("NFD", text or "")
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = text.replace("đ", "d").replace("Đ", "D").lower()
    return re.sub(r"[^a-z0-9 ]+", " ", text)


def product_text(p: dict, weights: dict | None = None) -> str:
    w = weights or DEFAULT_WEIGHTS
    parts = []
    parts += [p.get("name", "")] * w.get("name", 1)
    parts += [CATEGORY_WORDS.get(p.get("category", ""), "")] * w.get("category", 1)
    parts += [p.get("description", "")] * w.get("description", 1)
    parts += [p.get("farm", "")] * w.get("farm", 1)
    parts += [p.get("province", "")] * w.get("province", 1)
    parts += [" ".join(p.get("certifications", []))] * w.get("certifications", 1)
    return normalize(" ".join(parts))


@dataclass
class ContentRecommender:
    weights: dict = field(default_factory=lambda: dict(DEFAULT_WEIGHTS))
    ngram_range: tuple = (1, 2)
    vectorizer: TfidfVectorizer | None = None
    matrix: sparse.csr_matrix | None = None
    ids: list = field(default_factory=list)
    meta: list = field(default_factory=list)
    version: str = ""

    def fit(self, products: list[dict]) -> "ContentRecommender":
        products = sorted(products, key=lambda p: p["id"])  # thứ tự cố định => kết quả tái lập
        texts = [product_text(p, self.weights) for p in products]
        self.vectorizer = TfidfVectorizer(ngram_range=self.ngram_range, sublinear_tf=True, stop_words=STOP_WORDS, min_df=1)
        self.matrix = self.vectorizer.fit_transform(texts).tocsr()
        self.ids = [p["id"] for p in products]
        self.meta = [{"id": p["id"], "slug": p.get("slug"), "name": p.get("name"), "category": p.get("category")} for p in products]
        digest = hashlib.sha1(json.dumps([self.ids, texts, self.weights], ensure_ascii=False).encode()).hexdigest()[:8]
        self.version = f"tfidf-{digest}"
        return self

    @property
    def index(self) -> dict:
        return {pid: i for i, pid in enumerate(self.ids)}

    def _rank(self, scores: np.ndarray, exclude: set[int], k: int) -> list[dict]:
        order = np.argsort(-scores, kind="stable")
        out = []
        for i in order:
            if i in exclude:
                continue
            if scores[i] <= 0:
                break
            out.append({"id": self.ids[i], "slug": self.meta[i]["slug"], "score": float(scores[i])})
            if len(out) >= k:
                break
        return out

    def similar(self, product_id: str, k: int = 5) -> list[dict] | None:
        idx = self.index.get(product_id)
        if idx is None:
            return None
        scores = linear_kernel(self.matrix[idx], self.matrix).ravel()  # TF-IDF đã chuẩn hóa L2 => cosine
        return self._rank(scores, {idx}, k)

    def for_user(self, product_ids: list[str], k: int = 8, decay: float = 0.85) -> list[dict]:
        """Hồ sơ sở thích = trung bình có trọng số các sản phẩm đã tương tác (phần tử đầu = gần nhất)."""
        idx_map = self.index
        rows, weights = [], []
        for rank, pid in enumerate(product_ids):
            if pid in idx_map:
                rows.append(idx_map[pid])
                weights.append(decay**rank)
        if not rows:
            return []
        w = np.asarray(weights).reshape(-1, 1)
        profile = np.asarray(self.matrix[rows].multiply(w).sum(axis=0) / w.sum())
        norm = np.linalg.norm(profile)
        if norm == 0:
            return []
        scores = linear_kernel(profile / norm, self.matrix).ravel()
        return self._rank(scores, set(rows), k)

    def top_terms(self, product_id: str, n: int = 8) -> list[str]:
        idx = self.index.get(product_id)
        if idx is None:
            return []
        row = self.matrix[idx].toarray().ravel()
        vocab = self.vectorizer.get_feature_names_out()
        return [vocab[i] for i in np.argsort(-row)[:n] if row[i] > 0]


def load_catalog(path: Path) -> list[dict]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    products = data["products"] if isinstance(data, dict) else data
    # Loại bản ghi thiếu dữ liệu văn bản (không thể tạo đặc trưng).
    return [p for p in products if p.get("id") and p.get("name")]
