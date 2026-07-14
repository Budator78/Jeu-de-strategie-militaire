#!/usr/bin/env node
// Builds the world map TopoJSON used by apps/web:
//   - Western/Central Europe (the active conflict zone) at admin-1 granularity,
//     with France's 96 départements dissolved into its 13 régions.
//   - Every other country in the world at admin-0 (whole-country) granularity,
//     kept coarse since they're background/neutral territory for now.
//
// Usage: node scripts/prepare-geo-data.mjs
// Requires the two Natural Earth shapefiles described in scripts/geo-src/README.md.

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ADMIN1_SHP = path.join(
  ROOT,
  "scripts/geo-src/ne_10m_admin_1/ne_10m_admin_1_states_provinces.shp",
);
const ADMIN0_SHP = path.join(
  ROOT,
  "scripts/geo-src/ne_50m_admin_0/ne_50m_admin_0_countries.shp",
);
const INTERMEDIATE = path.join(ROOT, "scripts/geo-src/intermediate.geojson");
const INTERMEDIATE_WITH_REGIONS = path.join(
  ROOT,
  "scripts/geo-src/intermediate-with-regions.geojson",
);
const EUROPE_DISSOLVED = path.join(ROOT, "scripts/geo-src/europe-dissolved.geojson");
const WORLD_REST = path.join(ROOT, "scripts/geo-src/world-rest.geojson");
const MERGED = path.join(ROOT, "scripts/geo-src/merged-world.geojson");
const OUT = path.join(ROOT, "apps/web/src/data/geo/world.topojson");

// The detailed conflict-zone countries. Extend this list to grow the detailed area later.
const COUNTRY_CODES = ["DEU", "FRA", "POL", "BEL", "NLD", "LUX", "CZE", "AUT", "CHE"];

// Overseas territories/departments pulled in by adm0_a3 that sit far outside
// Europe (French Guiana, Antilles, Réunion, Mayotte, Dutch Caribbean) — excluded
// by id prefix so the detailed cluster stays centered on continental Europe.
const EXCLUDE_ID_PREFIXES = ["FR-GF", "FR-GP", "FR-MQ", "FR-RE", "FR-YT", "NL-BQ"];

// Natural Earth's admin-1 unit for France is the département (96 of them) —
// far too granular for a game map. Dissolve into France's 13 metropolitan
// régions (2016 reform) so France ends up comparable in scale to Germany's
// 16 Länder, Poland's 16 voivodeships, etc.
const FR_REGION_NAMES = {
  IDF: "Île-de-France",
  ARA: "Auvergne-Rhône-Alpes",
  BFC: "Bourgogne-Franche-Comté",
  BRE: "Bretagne",
  CVL: "Centre-Val de Loire",
  COR: "Corse",
  GES: "Grand Est",
  HDF: "Hauts-de-France",
  NOR: "Normandie",
  NAQ: "Nouvelle-Aquitaine",
  OCC: "Occitanie",
  PDL: "Pays de la Loire",
  PAC: "Provence-Alpes-Côte d'Azur",
};

const FR_DEPARTMENT_TO_REGION = {
  "01": "ARA", "02": "HDF", "03": "ARA", "04": "PAC", "05": "PAC",
  "06": "PAC", "07": "ARA", "08": "GES", "09": "OCC", "10": "GES",
  "11": "OCC", "12": "OCC", "13": "PAC", "14": "NOR", "15": "ARA",
  "16": "NAQ", "17": "NAQ", "18": "CVL", "19": "NAQ", "21": "BFC",
  "22": "BRE", "23": "NAQ", "24": "NAQ", "25": "BFC", "26": "ARA",
  "27": "NOR", "28": "CVL", "29": "BRE", "2A": "COR", "2B": "COR",
  "30": "OCC", "31": "OCC", "32": "OCC", "33": "NAQ", "34": "OCC",
  "35": "BRE", "36": "CVL", "37": "CVL", "38": "ARA", "39": "BFC",
  "40": "NAQ", "41": "CVL", "42": "ARA", "43": "ARA", "44": "PDL",
  "45": "CVL", "46": "OCC", "47": "NAQ", "48": "OCC", "49": "PDL",
  "50": "NOR", "51": "GES", "52": "GES", "53": "PDL", "54": "GES",
  "55": "GES", "56": "BRE", "57": "GES", "58": "BFC", "59": "HDF",
  "60": "HDF", "61": "NOR", "62": "HDF", "63": "ARA", "64": "NAQ",
  "65": "OCC", "66": "OCC", "67": "GES", "68": "GES", "69": "ARA",
  "70": "BFC", "71": "BFC", "72": "PDL", "73": "ARA", "74": "ARA",
  "75": "IDF", "76": "NOR", "77": "IDF", "78": "IDF", "79": "NAQ",
  "80": "HDF", "81": "OCC", "82": "OCC", "83": "PAC", "84": "PAC",
  "85": "PDL", "86": "NAQ", "87": "NAQ", "88": "GES", "89": "BFC",
  "90": "BFC", "91": "IDF", "92": "IDF", "93": "IDF", "94": "IDF",
  "95": "IDF",
};

if (!existsSync(ADMIN1_SHP) || !existsSync(ADMIN0_SHP)) {
  console.error(`Missing source shapefile(s). Expected:\n  ${ADMIN1_SHP}\n  ${ADMIN0_SHP}`);
  console.error("See scripts/geo-src/README.md for the Natural Earth download commands.");
  process.exit(1);
}

function run(cmd) {
  console.log(cmd);
  execSync(cmd, { stdio: "inherit", cwd: ROOT });
}

// Step 1: filter the detailed admin-1 shapefile down to our conflict-zone
// countries, drop overseas territories, compute a stable "id" field.
// Windows spawns this via cmd.exe (which ignores single quotes as grouping),
// so shell-level quoting uses double quotes and JS string literals use single quotes.
const filterExpr = COUNTRY_CODES.map((c) => `adm0_a3=='${c}'`).join(" || ");
const excludeExpr = EXCLUDE_ID_PREFIXES.map((p) => `id.indexOf('${p}')==0`).join(" || ");

run(
  [
    "npx --yes mapshaper",
    `-i "${ADMIN1_SHP}" encoding=utf8`,
    `-filter "${filterExpr}"`,
    `-each "id = iso_3166_2 && iso_3166_2 !== '' ? iso_3166_2 : adm1_code"`,
    `-filter "!(${excludeExpr})"`,
    `-filter-fields id,name,name_en,adm0_a3,type_en`,
    `-o format=geojson "${INTERMEDIATE}"`,
  ].join(" "),
);

// Step 2 (plain Node, not mapshaper, to avoid shell-quoting a 96-entry lookup
// table): tag every French département with the id/name of its région, so the
// next dissolve step merges them.
const admin1Data = JSON.parse(readFileSync(INTERMEDIATE, "utf8"));
let mappedCount = 0;
for (const f of admin1Data.features) {
  const p = f.properties;
  if (p.adm0_a3 !== "FRA") {
    p.dissolve_id = p.id;
    continue;
  }
  const deptCode = p.id.replace(/^FR-/, "");
  const regionCode = FR_DEPARTMENT_TO_REGION[deptCode];
  if (!regionCode) {
    throw new Error(`No région mapping for French department ${p.id}`);
  }
  p.dissolve_id = `FR-${regionCode}`;
  p.name_en = FR_REGION_NAMES[regionCode];
  p.name = FR_REGION_NAMES[regionCode];
  p.type_en = "Region";
  mappedCount++;
}
writeFileSync(INTERMEDIATE_WITH_REGIONS, JSON.stringify(admin1Data));
console.log(`Mapped ${mappedCount} French départements into ${Object.keys(FR_REGION_NAMES).length} régions.`);

// Step 3: dissolve by the id we just assigned (a no-op for non-French
// features, since their dissolve_id is already their original unique id).
run(
  [
    "npx --yes mapshaper",
    `-i "${INTERMEDIATE_WITH_REGIONS}"`,
    "-dissolve dissolve_id copy-fields=name,name_en,adm0_a3,type_en",
    "-rename-fields id=dissolve_id",
    `-o format=geojson "${EUROPE_DISSOLVED}"`,
  ].join(" "),
);

// Step 4: the rest of the world, at whole-country granularity (admin-0),
// excluding the countries we already have in detail above.
const restExcludeExpr = COUNTRY_CODES.map((c) => `ADM0_A3=='${c}'`).join(" || ");
run(
  [
    "npx --yes mapshaper",
    `-i "${ADMIN0_SHP}" encoding=utf8`,
    `-filter "!(${restExcludeExpr})"`,
    `-each "id = ADM0_A3; name = NAME_EN; name_en = NAME_EN; adm0_a3 = ADM0_A3; type_en = 'Country'"`,
    "-filter-fields id,name,name_en,adm0_a3,type_en",
    `-o format=geojson "${WORLD_REST}"`,
  ].join(" "),
);

// Step 5 (plain Node): merge the two feature collections. Both ultimately
// derive from the same Natural Earth base cartography, so shared borders
// (e.g. Germany/Poland) line up closely enough for mapshaper to detect them
// as shared arcs when it rebuilds topology from this combined file.
const europeData = JSON.parse(readFileSync(EUROPE_DISSOLVED, "utf8"));
const restData = JSON.parse(readFileSync(WORLD_REST, "utf8"));
const merged = { type: "FeatureCollection", features: [...europeData.features, ...restData.features] };
writeFileSync(MERGED, JSON.stringify(merged));
console.log(
  `Merged ${europeData.features.length} detailed Europe features + ${restData.features.length} world countries = ${merged.features.length} total.`,
);

// Step 6: simplify and export the final whole-world TopoJSON.
run(
  [
    "npx --yes mapshaper",
    `-i "${MERGED}"`,
    "-simplify 10% visvalingam keep-shapes",
    "-rename-layers provinces",
    `-o format=topojson id-field=id "${OUT}"`,
  ].join(" "),
);
console.log(`Wrote ${OUT}`);
