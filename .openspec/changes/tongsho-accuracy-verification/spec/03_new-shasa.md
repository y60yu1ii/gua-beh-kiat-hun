# Spec Delta: 新增伏吟・反吟・紅砂・桃花（T2.6, T3.3-T3.5）

## Tasks: T2.6.1, T2.6.2, T2.6.3, T2.6.4, T3.3, T3.4, T3.5

**Status:** ✅ Completed

**Date:** 2026-05-25

## Changes Made

**File:** `index.html`

### 伏吟・反吟（《永寧通書》）

**Before:** 無此邏輯

**After:** 在 `calculateScoreForMode` 第6節新增：
```javascript
// 6. 《永寧通書》伏吟・反吟
const fuyinText_list = [], fanshiText_list = [];
APP_CONFIG.hosts.forEach(h => {
    if (h.dzIdx === pillars.yearDzIdx) {
        fuyinText_list.push(h.name);  // 伏吟：年支與日支相同 → veto
    }
    if ((h.dzIdx + 6) % 12 === pillars.yearDzIdx) {
        fanshiText_list.push(h.name);  // 反吟：年支與日支相沖 → score=20
    }
});
if (fuyinText_list.length > 0) {
    veto = true; score = 0;
    notes.push({ title: "永寧通書・歲運伏吟", ... });
} else if (fanshiText_list.length > 0) {
    score = Math.min(score, 20);
    notes.push({ title: "永寧通書・歲運反吟", ... });
}
```

### 紅砂大煞（《永寧通書》）

**Before:** 無此邏輯

**After:**
```javascript
// 7. 《永寧通書》紅砂大煞
// 歌曰：「正四七十月逢辛，二三五八十一十二月逢丁，九月逢丙。」
const RED_SAND_COMBOS = [
    ["辛","卯"],["辛","午"],["辛","酉"],
    ["丁","卯"],["丁","午"],["丁","酉"],
    ["丙","午"]
];
const isHongSha = RED_SAND_COMBOS.some(
    ([g,d]) => pillars.gz[0] === g && pillars.dz === d
);
if (isHongSha) { veto = true; score = 0; ... }
```

### 桃花煞（《天機蠡書》）

**Before:** 無此邏輯

**After:**
```javascript
// 8. 《天機蠡書》桃花煞
// 歌曰：「寅午戌在卯，申子辰在酉，亥卯未在子，巳酉丑在午」
const TAOHUA_MAP = {
    "寅":"卯","午":"卯","戌":"卯",
    "申":"酉","子":"酉","辰":"酉",
    "亥":"子","卯":"子","未":"子",
    "巳":"午","酉":"午","丑":"午"
};
const taohuaDz = TAOHUA_MAP[pillars.dz];
const taohuaIdx = DZ_MAP.indexOf(taohuaDz);
const taohuaHits = APP_CONFIG.hosts.filter(h => h.dzIdx === taohuaIdx);
if (taohuaHits.length > 0) {
    score -= 15;
    notes.push({ title: "天機蠡書・桃花煞", ... });
}
```

## Verification

- `node --check` 語法檢查通過
- browser console 無 JS 錯誤（新 session）
- 2026-07-01 測試：伏吟（score=0）、桃花煞（warning）正確觸發
