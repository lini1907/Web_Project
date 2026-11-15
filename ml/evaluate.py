"""
Đánh giá offline mô hình gợi ý so với phương pháp cơ sở.
    python evaluate.py                      # đánh giá offline (in-process)
    python evaluate.py --http http://127.0.0.1:8000   # đo thêm độ trễ qua HTTP của dịch vụ đang chạy

Chỉ số (k = 5):
  - Precision@5  : tỉ lệ sản phẩm liên quan trong 5 gợi ý đầu
  - Recall@5     : tỉ lệ nhãn liên quan được tìm thấy trong 5 gợi ý đầu
  - HitRate@5    : có ít nhất 1 gợi ý liên quan
  - nDCG@5       : có xét thứ hạng
  - Coverage     : số sản phẩm khác nhau từng được gợi ý / tổng catalog (đo trên MỌI sản phẩm)
  - Latency      : thời gian tính gợi ý (ms) p50/p95
Lưu ý: nhãn chỉ có 1–5 sản phẩm liên quan mỗi truy vấn nên Precision@5 có trần < 1 (vd: 1 nhãn => tối đa 0,2).
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import statistics
import time
import urllib.request
from pathlib import Path

from recommender import ContentRecommender, load_catalog

HERE = Path(__file__).resolve().parent
K = 5


def baseline_similar(products: list[dict], product_id: str, k: int = K) -> list[str]:
    """Phương pháp cơ sở: cùng danh mục, bán chạy nhất (soldCount giảm dần); thiếu thì lấy bán chạy toàn sàn."""
    target = next(p for p in products if p["id"] == product_id)
    pool = [p for p in products if p["id"] != product_id]
    key = lambda p: (-(p.get("soldCount") or 0), p["id"])
    same = sorted([p for p in pool if p["category"] == target["category"]], key=key)
    rest = sorted([p for p in pool if p["category"] != target["category"]], key=key)
    return [p["id"] for p in (same + rest)[:k]]


def metrics(recommended: list[str], relevant: set[str]) -> dict:
    hits = [1 if r in relevant else 0 for r in recommended[:K]]
    dcg = sum(h / math.log2(i + 2) for i, h in enumerate(hits))
    ideal = sum(1 / math.log2(i + 2) for i in range(min(len(relevant), K)))
    return {
        "precision": sum(hits) / K,
        "recall": sum(hits) / len(relevant) if relevant else 0.0,
        "hit": 1.0 if any(hits) else 0.0,
        "ndcg": dcg / ideal if ideal else 0.0,
    }


def pct(values: list[float], q: float) -> float:
    s = sorted(values)
    return s[min(len(s) - 1, int(round(q * (len(s) - 1))))]


def evaluate(method_name: str, recommend, products, queries, slug_to_id, id_to_slug) -> tuple[dict, list[dict]]:
    rows, lat = [], []
    for q in queries:
        qid = slug_to_id[q["query"]]
        relevant = {slug_to_id[s] for s in q["relevant"] if s in slug_to_id}
        t0 = time.perf_counter()
        rec = recommend(qid)
        lat.append((time.perf_counter() - t0) * 1000)
        m = metrics(rec, relevant)
        rows.append({"method": method_name, "query": q["query"], "recommended": "|".join(id_to_slug[r] for r in rec), **{k: round(v, 4) for k, v in m.items()}})
    covered = set()
    for p in products:  # coverage đo trên toàn catalog
        covered.update(recommend(p["id"]))
    summary = {
        "method": method_name,
        "queries": len(queries),
        "precision@5": round(statistics.mean(r["precision"] for r in rows), 4),
        "recall@5": round(statistics.mean(r["recall"] for r in rows), 4),
        "hitRate@5": round(statistics.mean(r["hit"] for r in rows), 4),
        "ndcg@5": round(statistics.mean(r["ndcg"] for r in rows), 4),
        "coverage": round(len(covered) / len(products), 4),
        "latencyMs_p50": round(pct(lat, 0.5), 3),
        "latencyMs_p95": round(pct(lat, 0.95), 3),
    }
    return summary, rows


def http_latency(base: str, ids: list[str], rounds: int = 30) -> dict:
    lat, errors = [], 0
    for i in range(rounds):
        pid = ids[i % len(ids)]
        t0 = time.perf_counter()
        try:
            with urllib.request.urlopen(f"{base}/similar/{pid}?k=5", timeout=3) as r:
                r.read()
        except Exception:  # noqa: BLE001
            errors += 1
        lat.append((time.perf_counter() - t0) * 1000)
    return {"requests": rounds, "errors": errors, "p50": round(pct(lat, 0.5), 2), "p95": round(pct(lat, 0.95), 2), "max": round(max(lat), 2)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--catalog", type=Path, default=HERE / "data" / "catalog.json")
    ap.add_argument("--labels", type=Path, default=HERE / "eval" / "labels.json")
    ap.add_argument("--http", type=str, default=None)
    args = ap.parse_args()

    products = load_catalog(args.catalog)
    labels = json.loads(args.labels.read_text(encoding="utf-8"))
    slug_to_id = {p["slug"]: p["id"] for p in products}
    id_to_slug = {p["id"]: p["slug"] for p in products}
    queries = [q for q in labels["queries"] if q["query"] in slug_to_id]
    missing = [q["query"] for q in labels["queries"] if q["query"] not in slug_to_id]

    full = ContentRecommender().fit(products)
    name_desc = ContentRecommender(weights={"name": 1, "category": 0, "description": 1, "farm": 0, "province": 0, "certifications": 0}).fit(products)
    unigram = ContentRecommender(ngram_range=(1, 1)).fit(products)

    methods = [
        ("baseline_category_popular", lambda pid: baseline_similar(products, pid)),
        ("tfidf_name_desc", lambda pid: [r["id"] for r in name_desc.similar(pid, K)]),
        ("tfidf_unigram_full", lambda pid: [r["id"] for r in unigram.similar(pid, K)]),
        ("tfidf_full (model)", lambda pid: [r["id"] for r in full.similar(pid, K)]),
    ]
    summaries, all_rows = [], []
    for name, fn in methods:
        s, rows = evaluate(name, fn, products, queries, slug_to_id, id_to_slug)
        summaries.append(s)
        all_rows += rows

    out_dir = HERE / "eval"
    with (out_dir / "results_per_query.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(all_rows[0].keys()))
        w.writeheader()
        w.writerows(all_rows)
    result = {
        "modelVersion": full.version,
        "catalogSize": len(products),
        "queries": len(queries),
        "missingQueries": missing,
        "k": K,
        "summary": summaries,
    }
    if args.http:
        result["httpLatency"] = http_latency(args.http.rstrip("/"), [slug_to_id[q["query"]] for q in queries])
    (out_dir / "results.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Catalog: {len(products)} sản phẩm · {len(queries)} truy vấn có nhãn · model {full.version}")
    hdr = ["method", "precision@5", "recall@5", "hitRate@5", "ndcg@5", "coverage", "latencyMs_p50", "latencyMs_p95"]
    print(" | ".join(hdr))
    for s in summaries:
        print(" | ".join(str(s[h]) for h in hdr))
    if args.http:
        print("HTTP /similar:", result["httpLatency"])


if __name__ == "__main__":
    main()
