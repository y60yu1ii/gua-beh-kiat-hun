# Spec Delta: 協紀辨方書建除黑道 Bug 修正（T2.4.2）

## Task: T2.4.2 — 核對十二建除黃黑道歸屬

**Status:** ✅ Completed（發現 Bug，已修正）

**Date:** 2026-05-25

## Bug 發現

《協紀辨方書》十二建除黃黑道分類：

| 類型 | 建除名 | 說明 |
|------|--------|------|
| 黃道吉日 | 除、定、執、成、滿、平、收、危、**開** | 9個 |
| 黑道凶日（veto） | **破、閉** | 2個 |
| 黑道凶日（warning） | **建** | 1個 |
| 中性日（warning） | 其餘 |  |

**現實作（line 386）：**
```javascript
} else if (["破","閉","執"].includes(pillars.jianchu)) { veto = true; }
```

將 `執` 列為 veto，但 `執` 實為黃道吉日（九喜之一）。代碼多了一個 `執`。

## Changes Made

**File:** `index.html`

**Before:**
```javascript
} else if (["破","閉","執"].includes(pillars.jianchu)) {
    veto = true; score = Math.min(score, 20); jianchuClass = "danger";
    jianchuText = `今日值【${pillars.jianchu}日】，屬《協紀辨方書》十二建除黑道凶日，諸事不宜，嫁娶安床俱為大忌。`;
```

**After:**
```javascript
} else if (["破","閉"].includes(pillars.jianchu)) {
    veto = true; score = Math.min(score, 20); jianchuClass = "danger";
    jianchuText = `今日值【${pillars.jianchu}日】，屬《協紀辨方書》黑道凶日，諸事不宜，嫁娶安床俱為大忌。`;
```

## Verification

- 2026年7月（壬午月）某日若為「執日」，不應再觸發 veto
