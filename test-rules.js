// test-rules.js — gehuen 通書規則 engine 測試
// 策略：用 lunar-javascript 直接重建 calculateScoreForMode 邏輯，驗證分數機制

const {Lunar, LunarMonth} = require('lunar-javascript');

const DZ_MAP = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const TG_IDX = "甲乙丙丁戊己庚辛壬癸";

// ──────────────────────────────────────────────────────────
// 從 index.html getPrecisionPillars() 重現（使用 getEightChar）
// ──────────────────────────────────────────────────────────
function getPrecisionPillars(dateObj) {
    const lunar = Lunar.fromDate(dateObj);
    const eightChar = lunar.getEightChar();
    // 錯誤用法（年柱當日柱）：const dayGZ = lunar.getYearInGanZhi();
    // 正確用法（index.html）：
    const dayGZ = eightChar.getDay();        // 日柱 ← 關鍵！
    const monthGZ = eightChar.getMonth();    // 月柱
    const yearGZ = eightChar.getYear();      // 年柱
    const dayDzIdx = DZ_MAP.indexOf(dayGZ.substring(1));
    const monthDzIdx = DZ_MAP.indexOf(monthGZ.substring(1));
    const yearDzIdx = DZ_MAP.indexOf(yearGZ.substring(1));

    let isSansha = false, ssReason = "";
    const monthSanHe = [[8, 0, 4], [2, 6, 10], [11, 3, 7], [5, 9, 1]];
    const ssDZs = [[5, 6, 7], [11, 0, 1], [8, 9, 10], [2, 3, 4]];
    const dirs = ["南方","北方","西方","東方"];
    for (let i = 0; i < 4; i++) {
        if (monthSanHe[i].includes(monthDzIdx)) {
            if (ssDZs[i].includes(dayDzIdx)) { isSansha = true; ssReason = "三煞在" + dirs[i]; }
            break;
        }
    }
    return {
        gz: dayGZ, dz: dayGZ.substring(1), dzIdx: dayDzIdx,
        monthGZ, yearGZ, yearDzIdx,
        jianchu: lunar.getZhiXing(),
        isSansha, ssReason, lunarInfo: lunar
    };
}

// ──────────────────────────────────────────────────────────
// 從 index.html calculateScoreForMode() 重現
// ──────────────────────────────────────────────────────────
function calculateScoreForMode(dateObj, mode, ENABLED_RULES) {
    const pillars = getPrecisionPillars(dateObj);
    const lunar = pillars.lunarInfo;
    let score = 100, veto = false, notes = [];

    // 1. 行嫁月（碎金賦）
    if (ENABLED_RULES.hangjiaYue) {
        const monthName = pillars.monthGZ.substring(1);
        const DALIZHOU = {
            "正七":["卯","酉"],"二八":["寅","申"],"三九":["巳","亥"],
            "四十":["辰","戌"],"五一":["丑","未"],"六十二":["子","午"]
        };
        const allDalizhou = Object.values(DALIZHOU).flat();
        let haili = {t:"當前為平月，無特殊行嫁禁忌，通書可用。",c:"success"};
        if (allDalizhou.includes(monthName)) {
            const key = Object.entries(DALIZHOU).find(([,v]) => v.includes(monthName))?.[0];
            score += 10; haili = {t:`當前適逢【行嫁大利月】（${key}月），百無禁忌。`,c:"success"};
        }
        else if (["卯","酉"].includes(monthName)) { score -= 15; haili = {t:"屬【妨翁姑月】",c:"warning"}; }
        else if (["寅","申"].includes(monthName)) { score -= 20; haili = {t:"屬【妨父母月】",c:"danger"}; }
        else if (["午","子"].includes(monthName)) { score -= 35; veto = true; haili = {t:"屬【妨女身月/妨夫主月】",c:"danger"}; }
        if (mode !== 'anchuang') notes.push({title:"碎金賦行嫁月",text:haili.t,c:haili.c});
    }

    // 2. 周堂（象吉通書）
    if (ENABLED_RULES.zhouTang) {
        const chineseDay = lunar.getDay();
        const lm = LunarMonth.fromYm(lunar.getYear(), lunar.getMonth());
        const isBig = lm ? lm.getDayCount() === 30 : true;
        const jqSeq = ["廚","夫","姑","堂","翁","第","灶","婦"];
        const acSeq = ["碓","廁","爐","灶","門","路","床","墓"];
        const cycleIdx = isBig ? ((chineseDay - 1) % 8) : ((8 - ((chineseDay - 1) % 8)) % 8);
        const jqVal = jqSeq[cycleIdx], acVal = acSeq[cycleIdx];

        if (mode === 'jiaqu') {
            let ztType = "success", ztText = `周堂值【${jqVal}】位，無煞`;
            if (["夫","婦"].includes(jqVal)) { veto = true; score = 0; ztType = "danger"; ztText = `周堂值【${jqVal}】，一票否決！`; }
            else if (["翁","姑"].includes(jqVal)) { score -= 40; ztType = "warning"; ztText = `周堂值【${jqVal}】，score=-40`; }
            notes.push({title:"象吉周堂",text:ztText,type:ztType});
        } else if (mode === 'anchuang') {
            if (["床","墓"].includes(acVal)) { veto = true; score = 0; notes.push({title:"安床周堂",text:`值【${acVal}】大凶`,type:"danger"}); }
            else if (acVal === "門") { score -= 30; notes.push({title:"安床周堂",text:`值【${acVal}】次煞`,type:"warning"}); }
            else notes.push({title:"安床周堂",text:`值【${acVal}】可用`,type:"success"});
        }
    }

    // 3. 主位沖煞（無主婚人資料時略過）

    // 4. 建除
    if (ENABLED_RULES.jianchu) {
        if (pillars.dz === "亥" && mode !== 'anchuang') {
            veto = true; score = Math.min(score, 20);
            notes.push({title:"彭祖百忌",text:"亥日禁嫁",type:"danger"});
        } else if (["破","閉"].includes(pillars.jianchu)) {
            veto = true; score = Math.min(score, 20);
            notes.push({title:"協紀建除",text:`值【${pillars.jianchu}】凶`,type:"danger"});
        } else if (pillars.jianchu === "建") {
            score -= 10; notes.push({title:"協紀建除",text:"建日宜慎",type:"warning"});
        }
    }

    // 5. 歲破・月破
    if (ENABLED_RULES.suiPo) {
        const monthDzIdx = DZ_MAP.indexOf(pillars.monthGZ.substring(1));
        const suePoIdx = (pillars.yearDzIdx + 6) % 12;
        const yuePoIdx = (monthDzIdx + 6) % 12;
        if (pillars.dzIdx === suePoIdx) {
            veto = true; score = 0;
            notes.push({title:"歲破日",text:`日支${DZ_MAP[pillars.dzIdx]}為歲破`,type:"danger"});
        } else if (pillars.dzIdx === yuePoIdx) {
            score -= 25;
            notes.push({title:"月破日",text:`日支${DZ_MAP[pillars.dzIdx]}為月破`,type:"warning"});
        }
        if (mode === 'anchuang' && pillars.isSansha) {
            veto = true; score = 0;
            notes.push({title:"三煞方位",text:pillars.ssReason,type:"danger"});
        }
    }

    // 6. 伏吟反吟（無主婚人略過）

    // 7. 紅砂
    if (ENABLED_RULES.hongSha) {
        const RED_SAND_COMBOS = [
            ["辛","卯"],["辛","午"],["辛","酉"],
            ["丁","卯"],["丁","午"],["丁","酉"],
            ["丙","午"]
        ];
        const isHongSha = RED_SAND_COMBOS.some(([g,d]) => pillars.gz[0] === g && pillars.dz === d);
        if (isHongSha) { veto = true; score = 0; notes.push({title:"紅砂大煞",text:`${pillars.gz}紅砂凶`,type:"danger"}); }
    }

    // 8. 桃花（無主婚人略過）

    // 9. 紅鸞天喜（無主婚人略過）

    if (score > 100) score = 100;
    if (score < 0) score = 0;
    return {score, veto, notes};
}

// ──────────────────────────────────────────────────────────
// 測試
// ──────────────────────────────────────────────────────────
const ALL_ON = {hangjiaYue:true, zhouTang:true, zhuWei:true, jianchu:true, suiPo:true, fuYin:true, hongSha:true, taoHua:true, hongLuan:true};
const ALL_OFF = {hangjiaYue:false, zhouTang:false, zhuWei:false, jianchu:false, suiPo:false, fuYin:false, hongSha:false, taoHua:false, hongLuan:false};

function t(name, got, expected) {
    const ok = got === expected;
    console.log((ok ? "PASS" : "FAIL") + " " + name + " | got:" + got + " exp:" + expected);
    return ok;
}

let pass = 0, fail = 0;
function check(name, cond, got) {
    if (cond) { console.log("PASS " + name + " | " + got); pass++; }
    else { console.error("FAIL " + name + " | got: " + got); fail++; }
}

// ── 找正確的測試日期 ──

// 端午（丙午年五月初五）：2026-06-19（日柱=甲子，月柱=甲午）
const duanwu = new Date(Date.UTC(2026, 5, 19));
const lDw = Lunar.fromDate(duanwu);
console.log("端午: " + duanwu.toISOString().slice(0,10) + " 日柱=" + lDw.getEightChar().getDay() + " 月柱=" + lDw.getEightChar().getMonth() + " 年柱=" + lDw.getEightChar().getYear() + " 月=" + lDw.getMonthInChinese() + " 日=" + lDw.getDayInChinese());

// 丙午年歲破日（子日）：yearDzIdx=6(午) → suePoIdx=0(子)
// 第一個歲破日：2026-02-19 甲子
const suePoDay = new Date(Date.UTC(2026, 1, 19));
const lSp = Lunar.fromDate(suePoDay);
console.log("歲破日: " + suePoDay.toISOString().slice(0,10) + " 日柱=" + lSp.getEightChar().getDay() + " 年柱=" + lSp.getEightChar().getYear() + " yearDzIdx=" + DZ_MAP.indexOf(lSp.getEightChar().getYear().slice(-1)) + " suePoIdx=" + ((DZ_MAP.indexOf(lSp.getEightChar().getYear().slice(-1))+6)%12));

// 丙午年周堂平日（非歲破）：2026-02-17 壬戌 周堂=廚（非夫/婦/翁/姑）
const ziDay = new Date(Date.UTC(2026, 1, 17));
const lZi = Lunar.fromDate(ziDay);
console.log("平日: " + ziDay.toISOString().slice(0,10) + " 日柱=" + lZi.getEightChar().getDay() + " dzIdx=" + DZ_MAP.indexOf(lZi.getEightChar().getDay().slice(-1)));

// 丙午年周堂值翁（非歲破日）：
// 2026-02-21 丙寅 周堂=翁（非歲破）
const wengDay = new Date(Date.UTC(2026, 1, 21));
const lWg = Lunar.fromDate(wengDay);
const chineseDay = lWg.getDay();
const lm = LunarMonth.fromYm(lWg.getYear(), lWg.getMonth());
const isBig = lm ? lm.getDayCount() === 30 : true;
const jqSeq = ["廚","夫","姑","堂","翁","第","灶","婦"];
const cycleIdx = isBig ? ((chineseDay - 1) % 8) : ((8 - ((chineseDay - 1) % 8)) % 8);
console.log("周堂值翁: " + wengDay.toISOString().slice(0,10) + " 日柱=" + lWg.getEightChar().getDay() + " jqVal=" + jqSeq[cycleIdx] + " dzIdx=" + DZ_MAP.indexOf(lWg.getEightChar().getDay().slice(-1)));

// ── T1: 全關 → score=100, veto=false ──
var r = calculateScoreForMode(duanwu, 'jiaqu', ALL_OFF);
check("T1 全關 score=100", r.score === 100, "score="+r.score);
check("T1 全關 veto=false", r.veto === false, "veto="+r.veto);

// ── T2: 歲破日 veto ──
var r2 = calculateScoreForMode(suePoDay, 'jiaqu', {...ALL_OFF, suiPo:true});
check("T2 歲破 veto", r2.veto === true, "veto="+r2.veto);
check("T2 歲破 score=0", r2.score === 0, "score="+r2.score);

// ── T3: 端午行嫁月——月支午在「六十二月」= 大利月，不veto（歲破另論）──
var r3 = calculateScoreForMode(duanwu, 'jiaqu', {...ALL_OFF, hangjiaYue:true});
check("T3 端午行嫁月不veto(大利月)", r3.veto === false, "veto="+r3.veto);
check("T3 端午行嫁月 score=100(clamped)", r3.score === 100, "score="+r3.score);

// ── T4: 紅砂日 veto（端午6/25非紅砂，測2/18歲破也不是）──
// 用丙午年的丙午日測紅砂
let hongShaDay;
for (let d = new Date(Date.UTC(2026,1,17)); d <= new Date(Date.UTC(2027,1,6)); d.setDate(d.getDate()+1)) {
    const l = Lunar.fromDate(d);
    if (l.getYearInGanZhi() === '丙午') {
        const dayGZ = l.getEightChar().getDay();
        if (dayGZ === '丙午') { hongShaDay = d; break; }
    }
}
console.log("紅砂日(丙午):", hongShaDay.toISOString().slice(0,10));
var r4 = calculateScoreForMode(hongShaDay, 'jiaqu', {...ALL_OFF, hongSha:true});
check("T4 紅砂(丙午) veto", r4.veto === true, "veto="+r4.veto);

// ── T5: 紅砂 toggle ──
var rOn = calculateScoreForMode(hongShaDay, 'jiaqu', {...ALL_OFF, hongSha:true});
var rOff = calculateScoreForMode(hongShaDay, 'jiaqu', {...ALL_OFF, hongSha:false});
check("T5 紅砂on veto", rOn.veto === true, "veto="+rOn.veto);
check("T5 紅砂off veto=false", rOff.veto === false, "veto="+rOff.veto);
check("T5 紅砂off score=100", rOff.score === 100, "score="+rOff.score);

// ── T6: 周堂平日不veto ──
var r6 = calculateScoreForMode(ziDay, 'jiaqu', {...ALL_OFF, zhouTang:true});
check("T6 周堂平日不veto", r6.veto === false, "veto="+r6.veto);
check("T6 周堂平日 score=100", r6.score === 100, "score="+r6.score);

// ── T7: 全開端午 → veto（歲破+行嫁月）──
var r7 = calculateScoreForMode(duanwu, 'jiaqu', ALL_ON);
check("T7 全開端午 veto", r7.veto === true, "veto="+r7.veto);

// ── T8: 周堂值翁 score=60 ──
var r8 = calculateScoreForMode(wengDay, 'jiaqu', {...ALL_OFF, zhouTang:true});
console.log("T8 周堂值翁: score="+r8.score+" veto="+r8.veto+" notes="+r8.notes.length);
check("T8 周堂值翁 score=60", r8.score === 60, "score="+r8.score);
check("T8 周堂值翁不veto", r8.veto === false, "veto="+r8.veto);

// ── T9: 周堂值翁 + 全規則（確認歲破覆蓋）──
var r9 = calculateScoreForMode(wengDay, 'jiaqu', ALL_ON);
console.log("T9 周堂值翁全開: score="+r9.score+" veto="+r9.veto+" notes="+r9.notes.length);
// wengDay 不是歲破日，不應被歲破影響

console.log("\n=== 結果: " + pass + " passed, " + fail + " failed ===");
process.exit(fail > 0 ? 1 : 0);
