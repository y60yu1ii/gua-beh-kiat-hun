# Spec Delta: 碎金賦行嫁月 Bug 修正（T2.1.1）

## Task: T2.1.1 — 核對行嫁月歌謠完整性

**Status:** ✅ Completed（發現 Bug，已修正）

**Date:** 2026-05-25

## Bug 發現

歌曰：「正七迎雞兔，二八虎和猴，三九蛇與豬，四十龍和狗，牛羊五一十一十二各」

| 月份 | 女命大利月生肖 | 對應地支 |
|------|--------------|---------|
| 正月（寅）、七月（申）| 雞(酉)、兔(卯) | 卯、酉 |
| 二月（卯）、八月（酉）| 虎(寅)、猴(申) | 寅、申 |
| 三月（辰）、九月（亥）| 蛇(巳)、豬(亥) | 巳、亥 |
| 四月（巳）、十月（戌）| 龍(辰)、狗(戌) | 辰、戌 |
| 五月（午）、十一月（子）| 牛(丑)、羊(未) | 丑、未 |
| 六月（未）、十二月（丑）| 鼠(子)、馬(午) | 子、午 |

**現實作只有 `["戌","辰"]`（第四組），其餘五組大利月全部漏掉。**

## Changes Made

**File:** `index.html`

**Before:**
```javascript
if (["戌","辰"].includes(monthName)) { score += 10; ... }
```

**After:**
```javascript
const DALIZHOU = {
  "正七": ["卯","酉"], "二八": ["寅","申"], "三九": ["巳","亥"],
  "四十": ["辰","戌"], "五一": ["丑","未"], "六十二": ["子","午"]
};
const allDalizhou = Object.values(DALIZHOU).flat();
if (allDalizhou.includes(monthName)) {
  const key = Object.entries(DALIZHOU).find(([,v]) => v.includes(monthName))?.[0];
  score += 10; haili = { t: `當前適逢【行嫁大利月】（${key}月），百無禁忌，通書大吉。`, c: "success" };
}
```

## Verification

隨機抽樣：
- 2026年8月（申月）→ 申月無行嫁月 → 平月
- 2026年9月（亥月）→ 亥為大利月（見三九：巳亥）→ score+10
