import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ country: string; municipality: string } | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "orbis-dei-backfill/1.0 (catholic-holy-sites-project)",
    },
  });

  if (!res.ok) {
    console.warn(`Nominatim HTTP error: ${res.status}`);
    return null;
  }

  const data = await res.json();
  const addr = data.address;
  if (!addr) return null;

  const country = (addr.country_code as string)?.toUpperCase();
  const municipality: string =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    addr.state ||
    "";

  if (!country || !municipality) return null;
  return { country, municipality };
}

function generateId(country: string, municipality: string, name: string): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return `${country.toLowerCase()}-${slug(municipality)}-${slug(name)}`;
}

async function main() {
  const { data: sites, error } = await supabase
    .from("sites")
    .select("id, name, latitude, longitude, country, municipality")
    .or("country.is.null,municipality.is.null");

  if (error) throw error;
  if (!sites?.length) {
    console.log("No sites need backfilling.");
    return;
  }

  console.log(`Backfilling ${sites.length} sites...`);

  for (const site of sites) {
    try {
      if (site.latitude == null || site.longitude == null) {
        console.warn(`⚠️  No coordinates for "${site.name}" — skipping.`);
        continue;
      }

      // Nominatim requires max 1 request/second
      await new Promise((r) => setTimeout(r, 1100));

      const geo = await reverseGeocode(site.latitude, site.longitude);
      if (!geo) {
        console.warn(`⚠️  Nominatim returned no result for "${site.name}" (${site.latitude}, ${site.longitude}) — skipping.`);
        continue;
      }

      const { country, municipality } = geo;
      const newId = generateId(country, municipality, site.name);

      const { data: existing } = await supabase
        .from("sites")
        .select("id")
        .eq("id", newId)
        .neq("id", site.id)
        .maybeSingle();

      if (existing) {
        console.warn(`⚠️  ID collision for "${site.name}" → ${newId} already exists — skipping, fix manually.`);
        continue;
      }

      const { error: updateError } = await supabase
        .from("sites")
        .update({ country, municipality, id: newId })
        .eq("id", site.id);

      if (updateError) throw updateError;
      console.log(`✓  "${site.name}" → ${newId} (${municipality}, ${country})`);
    } catch (err) {
      console.error(`✗  Failed for "${site.name}":`, err);
    }
  }

  console.log("\nDone. Re-run the SQL NOT NULL constraints when all rows are populated.");
}

main().catch((err) => {
  console.error("Fatal error:");
  console.error(err instanceof Error ? err.stack : JSON.stringify(err, null, 2));
  process.exit(1);
});