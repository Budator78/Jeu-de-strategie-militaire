#!/usr/bin/env node
// Downloads/filters Natural Earth admin-1 provinces into a small TopoJSON
// covering a starting region, for apps/web to render.
//
// Usage: node scripts/prepare-geo-data.mjs
// Requires scripts/geo-src/ne_10m_admin_1/ne_10m_admin_1_states_provinces.shp
// (see scripts/geo-src/README.md for the Natural Earth download step).

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SHP = path.join(
  ROOT,
  "scripts/geo-src/ne_10m_admin_1/ne_10m_admin_1_states_provinces.shp",
);
const INTERMEDIATE = path.join(ROOT, "scripts/geo-src/intermediate.geojson");
const INTERMEDIATE_WITH_REGIONS = path.join(
  ROOT,
  "scripts/geo-src/intermediate-with-regions.geojson",
);
const OUT = path.join(ROOT, "apps/web/src/data/geo/western-europe.topojson");

// Starting region: Western/Central Europe. Extend this list to grow the map later.
const COUNTRY_CODES = ["DEU", "FRA", "POL", "BEL", "NLD", "LUX", "CZE", "AUT", "CHE"];

// Overseas territories/departments pulled in by adm0_a3 that sit far outside
// Europe (French Guiana, Antilles, Réunion, Mayotte, Dutch Caribbean) — excluded
// by id prefix so the map projection stays centered on continental Europe.
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

if (!existsSync(SHP)) {
  console.error(`Missing source shapefile: ${SHP}`);
  console.error(
    "Download it first: curl -sL -o scripts/geo-src/ne_10m_admin_1.zip " +
      "https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_admin_1_states_provinces.zip " +
      "&& unzip -o scripts/geo-src/ne_10m_admin_1.zip -d scripts/geo-src/ne_10m_admin_1",
  );
  process.exit(1);
}

// Step 1: filter the world shapefile down to our starting countries, drop
// overseas territories, compute a stable "id" field, and export GeoJSON.
// Windows spawns this via cmd.exe (which ignores single quotes as grouping),
// so shell-level quoting uses double quotes and JS string literals use single quotes.
const filterExpr = COUNTRY_CODES.map((c) => `adm0_a3=='${c}'`).join(" || ");
const excludeExpr = EXCLUDE_ID_PREFIXES.map((p) => `id.indexOf('${p}')==0`).join(" || ");

const step1 = [
  "npx --yes mapshaper",
  `-i "${SHP}" encoding=utf8`,
  `-filter "${filterExpr}"`,
  `-each "id = iso_3166_2 && iso_3166_2 !== '' ? iso_3166_2 : adm1_code"`,
  `-filter "!(${excludeExpr})"`,
  `-filter-fields id,name,name_en,adm0_a3,type_en`,
  `-o format=geojson "${INTERMEDIATE}"`,
].join(" ");

console.log(step1);
execSync(step1, { stdio: "inherit", cwd: ROOT });

// Step 2 (plain Node, not mapshaper, to avoid shell-quoting a 96-entry lookup
// table): tag every French département with the id/name of its région, so the
// next dissolve step merges them.
const data = JSON.parse(readFileSync(INTERMEDIATE, "utf8"));
let mappedCount = 0;
for (const f of data.features) {
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
writeFileSync(INTERMEDIATE_WITH_REGIONS, JSON.stringify(data));
console.log(`Mapped ${mappedCount} French départements into ${Object.keys(FR_REGION_NAMES).length} régions.`);

// Step 3: dissolve by the id we just assigned (a no-op for non-French
// features, since their dissolve_id is already their original unique id),
// simplify, and export the final TopoJSON.
const step3 = [
  "npx --yes mapshaper",
  `-i "${INTERMEDIATE_WITH_REGIONS}"`,
  "-dissolve dissolve_id copy-fields=name,name_en,adm0_a3,type_en",
  "-rename-fields id=dissolve_id",
  "-simplify 10% visvalingam keep-shapes",
  "-rename-layers provinces",
  `-o format=topojson id-field=id "${OUT}"`,
].join(" ");

console.log(step3);
execSync(step3, { stdio: "inherit", cwd: ROOT });
console.log(`Wrote ${OUT}`);
