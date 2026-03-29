"""
Migrate data/sites.json → Supabase

Usage:
  pip install supabase
  python scripts/migrate_to_supabase.py

Set these environment variables (or edit the constants below):
  SUPABASE_URL       — your project URL, e.g. https://xxxx.supabase.co
  SUPABASE_SERVICE_KEY — service role key (from Project Settings → API)

Run this ONCE after creating the Supabase schema. Re-running is safe (uses upsert).
"""

import json
import os
import sys

try:
    from supabase import create_client
except ImportError:
    print("supabase package not found. Run: pip install supabase")
    sys.exit(1)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Error: set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(ROOT, "data", "sites.json"), encoding="utf-8") as f:
    data = json.load(f)

tags = data["tags"]
sites = data["sites"]

print(f"Found {len(tags)} tags and {len(sites)} sites.")

# ---- Migrate tags ----
print("\nMigrating tags…")
tag_rows = [
    {
        "id": t["id"],
        "name": t["name"],
        "description": t.get("description", ""),
        "image_url": t.get("image_url"),
        "featured": t.get("featured", False),
        "created_by": None,
    }
    for t in tags
]

BATCH = 100
for i in range(0, len(tag_rows), BATCH):
    batch = tag_rows[i:i+BATCH]
    result = supabase.table("tags").upsert(batch, on_conflict="id").execute()
    print(f"  Tags {i+1}–{i+len(batch)}: {'OK' if result.data else 'FAILED'}")

# ---- Migrate sites ----
print("\nMigrating sites…")
site_rows = []
image_rows = []
link_rows = []
tag_assignment_rows = []
note_rows = []

for s in sites:
    site_rows.append({
        "id": s["id"],
        "name": s["name"],
        "short_description": s.get("short_description", ""),
        "latitude": s["latitude"],
        "longitude": s["longitude"],
        "google_maps_url": s.get("google_maps_url", ""),
        "featured": s.get("featured", False),
        "interest": s.get("interest"),
        "contributor": s.get("contributor"),
        "updated_at": s.get("updated_at", "2024-01-01T00:00:00Z"),
        "created_by": None,
    })

    for img in s.get("images", []):
        image_rows.append({
            "site_id": s["id"],
            "url": img["url"],
            "caption": img.get("caption"),
            "storage_type": img.get("storage_type", "external"),
            "display_order": img.get("display_order", 0),
        })

    for link in s.get("links", []):
        link_rows.append({
            "site_id": s["id"],
            "url": link["url"],
            "link_type": link["link_type"],
            "comment": link.get("comment"),
        })

    for tag_id in s.get("tag_ids", []):
        tag_assignment_rows.append({
            "site_id": s["id"],
            "tag_id": tag_id,
        })

    for note_text in s.get("contributor_notes", []):
        note_rows.append({
            "site_id": s["id"],
            "note": note_text,
            "created_by": None,
        })

for i in range(0, len(site_rows), BATCH):
    batch = site_rows[i:i+BATCH]
    result = supabase.table("sites").upsert(batch, on_conflict="id").execute()
    print(f"  Sites {i+1}–{i+len(batch)}: {'OK' if result.data else 'FAILED'}")

print(f"\nMigrating {len(image_rows)} images…")
for i in range(0, len(image_rows), BATCH):
    batch = image_rows[i:i+BATCH]
    supabase.table("site_images").upsert(batch).execute()
print(f"  Done.")

print(f"\nMigrating {len(link_rows)} links…")
for i in range(0, len(link_rows), BATCH):
    batch = link_rows[i:i+BATCH]
    supabase.table("site_links").upsert(batch).execute()
print(f"  Done.")

print(f"\nMigrating {len(tag_assignment_rows)} tag assignments…")
for i in range(0, len(tag_assignment_rows), BATCH):
    batch = tag_assignment_rows[i:i+BATCH]
    supabase.table("site_tag_assignments").upsert(batch, on_conflict="site_id,tag_id").execute()
print(f"  Done.")

if note_rows:
    print(f"\nMigrating {len(note_rows)} contributor notes…")
    for i in range(0, len(note_rows), BATCH):
        batch = note_rows[i:i+BATCH]
        supabase.table("site_contributor_notes").upsert(batch).execute()
    print(f"  Done.")

print("\n✓ Migration complete.")
