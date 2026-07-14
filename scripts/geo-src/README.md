Source data for `prepare-geo-data.mjs`, not committed to keep the repo small.

To regenerate `ne_10m_admin_1/`:

```
curl -sL -o ne_10m_admin_1.zip https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_admin_1_states_provinces.zip
unzip -o ne_10m_admin_1.zip -d ne_10m_admin_1
```

Then from the repo root: `node scripts/prepare-geo-data.mjs`
