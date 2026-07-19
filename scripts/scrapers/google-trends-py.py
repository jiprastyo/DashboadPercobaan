#!/usr/bin/env python3
"""
scripts/scrapers/google-trends-py.py — Google Trends (Python)
Uses pytrends library to fetch interest over time, regional breakdown,
and related topics for labor keywords.
"""

import json
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

try:
    from pytrends.request import TrendReq
except ImportError:
    print("ERROR: pytrends not installed. Run: pip install pytrends>=4.9.0")
    sys.exit(1)

# ─── Configuration ────────────────────────────────────────────────────────────
KEYWORDS = [
    "PHK",
    "Lowongan Kerja",
    "Jobstreet",
    "Cari Kerja",
    "Loker",
    "Upah Minimum",
    "BPJS Ketenagakerjaan",
    "Gaji",
]
GEO = "ID"
DELAY_SECONDS = 5
MAX_RETRIES = 3

# ─── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "trends" / "python"


def get_iso_week(dt: datetime) -> str:
    """Return ISO week string like '2026-W23'."""
    iso_cal = dt.isocalendar()
    return f"{iso_cal[0]}-W{iso_cal[1]:02d}"


def log(source: str, message: str) -> None:
    """Print a timestamped log message."""
    ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    print(f"[{ts}] [{source}] {message}")


def fetch_trend_data(pytrends: TrendReq, keyword: str) -> dict:
    """Fetch interest over time, regional interest, and related topics."""
    result: dict = {
        "keyword": keyword,
        "interest_over_time": [],
        "interest_by_region": [],
        "related_topics": [],
        "average_interest": 0,
        "_source_url": f"https://trends.google.com/trends/explore?q={keyword.replace(' ', '%20')}&geo=ID",
        "_scraped_at": datetime.utcnow().isoformat() + "Z",
    }

    # Calculate timeframe: last 3 months
    end_date = datetime.now()
    start_date = end_date - timedelta(days=90)
    timeframe = f"{start_date.strftime('%Y-%m-%d')} {end_date.strftime('%Y-%m-%d')}"

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            pytrends.build_payload([keyword], timeframe=timeframe, geo=GEO)

            # Interest over time
            iot_df = pytrends.interest_over_time()
            if not iot_df.empty and keyword in iot_df.columns:
                interest_data = []
                for idx, row in iot_df.iterrows():
                    interest_data.append({
                        "date": idx.strftime("%Y-%m-%d"),
                        "value": int(row[keyword]),
                    })
                result["interest_over_time"] = interest_data
                values = [d["value"] for d in interest_data]
                result["average_interest"] = round(sum(values) / len(values)) if values else 0

            time.sleep(2)

            # Interest by region
            try:
                ibr_df = pytrends.interest_by_region(resolution="COUNTRY", inc_low_vol=True, inc_geo_code=True)
                if not ibr_df.empty and keyword in ibr_df.columns:
                    region_data = []
                    for region_name, row in ibr_df.iterrows():
                        val = int(row[keyword])
                        if val > 0:
                            region_data.append({
                                "region": region_name,
                                "value": val,
                            })
                    region_data.sort(key=lambda x: x["value"], reverse=True)
                    result["interest_by_region"] = region_data[:20]  # Top 20
            except Exception as e:
                log("google-trends-py", f"  Regional data error for '{keyword}': {e}")

            time.sleep(2)

            # Related topics
            try:
                related = pytrends.related_topics()
                if keyword in related:
                    kw_related = related[keyword]
                    topics = []
                    for topic_type in ["top", "rising"]:
                        df = kw_related.get(topic_type)
                        if df is not None and not df.empty:
                            for _, row in df.head(10).iterrows():
                                topics.append({
                                    "type": topic_type,
                                    "topic_title": str(row.get("topic_title", "")),
                                    "topic_type": str(row.get("topic_type", "")),
                                    "value": str(row.get("value", "")),
                                })
                    result["related_topics"] = topics
            except Exception as e:
                log("google-trends-py", f"  Related topics error for '{keyword}': {e}")

            break  # Success, exit retry loop

        except Exception as e:
            log("google-trends-py", f"  Attempt {attempt}/{MAX_RETRIES} failed for '{keyword}': {e}")
            if attempt < MAX_RETRIES:
                wait_time = DELAY_SECONDS * (2 ** (attempt - 1))
                log("google-trends-py", f"  Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                log("google-trends-py", f"  All retries exhausted for '{keyword}'")

    return result


def main() -> None:
    log("google-trends-py", "Starting Google Trends (Python) scraper")

    # Ensure output directory exists
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Initialize pytrends
    pytrends = TrendReq(hl="id-ID", tz=420)  # UTC+7 (WIB)

    results = []
    for i, keyword in enumerate(KEYWORDS):
        log("google-trends-py", f"Querying ({i+1}/{len(KEYWORDS)}): '{keyword}'")
        result = fetch_trend_data(pytrends, keyword)
        results.append(result)
        log(
            "google-trends-py",
            f"  '{keyword}': {len(result['interest_over_time'])} time points, "
            f"avg={result['average_interest']}, "
            f"{len(result['interest_by_region'])} regions, "
            f"{len(result['related_topics'])} related topics",
        )
        # Rate limit delay
        if i < len(KEYWORDS) - 1:
            log("google-trends-py", f"  Waiting {DELAY_SECONDS}s...")
            time.sleep(DELAY_SECONDS)

    # Build output
    week_str = get_iso_week(datetime.now())
    output = {
        "week": week_str,
        "fetched_at": datetime.utcnow().isoformat() + "Z",
        "keywords": KEYWORDS,
        "geo": GEO,
        "results": results,
        "_source_url": "https://trends.google.com/trends/",
        "_scraped_at": datetime.utcnow().isoformat() + "Z",
    }

    # Save
    out_path = DATA_DIR / f"{week_str}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    log("google-trends-py", f"Saved to {out_path}")
    log(
        "google-trends-py",
        f"Done. Total data points: {sum(len(r['interest_over_time']) for r in results)}, "
        f"Keywords: {len(results)}",
    )


if __name__ == "__main__":
    main()
