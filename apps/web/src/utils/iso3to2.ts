/**
 * ISO 3166-1 alpha-3 → alpha-2 (factual standard data), plus a few Natural
 * Earth-specific codes (Kosovo, Palestine, South Sudan, Western Sahara…).
 * Used to pick the right flag-icons class; anything unmapped falls back to a
 * colored square (see CountryFlag).
 */
export const ISO3_TO_ISO2: Record<string, string> = {
  AFG: 'af', ALB: 'al', DZA: 'dz', AND: 'ad', AGO: 'ao', ATG: 'ag', ARG: 'ar',
  ARM: 'am', AUS: 'au', AUT: 'at', AZE: 'az', BHS: 'bs', BHR: 'bh', BGD: 'bd',
  BRB: 'bb', BLR: 'by', BEL: 'be', BLZ: 'bz', BEN: 'bj', BTN: 'bt', BOL: 'bo',
  BIH: 'ba', BWA: 'bw', BRA: 'br', BRN: 'bn', BGR: 'bg', BFA: 'bf', BDI: 'bi',
  CPV: 'cv', KHM: 'kh', CMR: 'cm', CAN: 'ca', CAF: 'cf', TCD: 'td', CHL: 'cl',
  CHN: 'cn', COL: 'co', COM: 'km', COG: 'cg', COD: 'cd', CRI: 'cr', CIV: 'ci',
  HRV: 'hr', CUB: 'cu', CYP: 'cy', CZE: 'cz', DNK: 'dk', DJI: 'dj', DMA: 'dm',
  DOM: 'do', ECU: 'ec', EGY: 'eg', SLV: 'sv', GNQ: 'gq', ERI: 'er', EST: 'ee',
  SWZ: 'sz', ETH: 'et', FJI: 'fj', FIN: 'fi', FRA: 'fr', GAB: 'ga', GMB: 'gm',
  GEO: 'ge', DEU: 'de', GHA: 'gh', GRC: 'gr', GRD: 'gd', GTM: 'gt', GIN: 'gn',
  GNB: 'gw', GUY: 'gy', HTI: 'ht', HND: 'hn', HUN: 'hu', ISL: 'is', IND: 'in',
  IDN: 'id', IRN: 'ir', IRQ: 'iq', IRL: 'ie', ISR: 'il', ITA: 'it', JAM: 'jm',
  JPN: 'jp', JOR: 'jo', KAZ: 'kz', KEN: 'ke', KIR: 'ki', PRK: 'kp', KOR: 'kr',
  KWT: 'kw', KGZ: 'kg', LAO: 'la', LVA: 'lv', LBN: 'lb', LSO: 'ls', LBR: 'lr',
  LBY: 'ly', LIE: 'li', LTU: 'lt', LUX: 'lu', MDG: 'mg', MWI: 'mw', MYS: 'my',
  MDV: 'mv', MLI: 'ml', MLT: 'mt', MHL: 'mh', MRT: 'mr', MUS: 'mu', MEX: 'mx',
  FSM: 'fm', MDA: 'md', MCO: 'mc', MNG: 'mn', MNE: 'me', MAR: 'ma', MOZ: 'mz',
  MMR: 'mm', NAM: 'na', NRU: 'nr', NPL: 'np', NLD: 'nl', NZL: 'nz', NIC: 'ni',
  NER: 'ne', NGA: 'ng', MKD: 'mk', NOR: 'no', OMN: 'om', PAK: 'pk', PLW: 'pw',
  PAN: 'pa', PNG: 'pg', PRY: 'py', PER: 'pe', PHL: 'ph', POL: 'pl', PRT: 'pt',
  QAT: 'qa', ROU: 'ro', RUS: 'ru', RWA: 'rw', KNA: 'kn', LCA: 'lc', VCT: 'vc',
  WSM: 'ws', SMR: 'sm', STP: 'st', SAU: 'sa', SEN: 'sn', SRB: 'rs', SYC: 'sc',
  SLE: 'sl', SGP: 'sg', SVK: 'sk', SVN: 'si', SLB: 'sb', SOM: 'so', ZAF: 'za',
  ESP: 'es', LKA: 'lk', SDN: 'sd', SUR: 'sr', SWE: 'se', CHE: 'ch', SYR: 'sy',
  TWN: 'tw', TJK: 'tj', TZA: 'tz', THA: 'th', TLS: 'tl', TGO: 'tg', TON: 'to',
  TTO: 'tt', TUN: 'tn', TUR: 'tr', TKM: 'tm', TUV: 'tv', UGA: 'ug', UKR: 'ua',
  ARE: 'ae', GBR: 'gb', USA: 'us', URY: 'uy', UZB: 'uz', VUT: 'vu', VAT: 'va',
  VEN: 've', VNM: 'vn', YEM: 'ye', ZMB: 'zm', ZWE: 'zw',
  // Dependencies & territories that appear as Natural Earth admin-0 units
  GRL: 'gl', FLK: 'fk', ATF: 'tf', NCL: 'nc', PYF: 'pf', SPM: 'pm', WLF: 'wf',
  BMU: 'bm', CYM: 'ky', VGB: 'vg', AIA: 'ai', MSR: 'ms', TCA: 'tc', SHN: 'sh',
  IOT: 'io', PCN: 'pn', SGS: 'gs', HKG: 'hk', MAC: 'mo', FRO: 'fo', ALA: 'ax',
  IMN: 'im', JEY: 'je', GGY: 'gg', GIB: 'gi', CUW: 'cw', ABW: 'aw', SXM: 'sx',
  MAF: 'mf', BLM: 'bl', PRI: 'pr', VIR: 'vi', ASM: 'as', GUM: 'gu', MNP: 'mp',
  COK: 'ck', NIU: 'nu', TKL: 'tk', CXR: 'cx', CCK: 'cc', NFK: 'nf', HMD: 'hm',
  ATA: 'aq',
  // Natural Earth specials / disputed
  KOS: 'xk', PSX: 'ps', SDS: 'ss', SAH: 'eh',
}
