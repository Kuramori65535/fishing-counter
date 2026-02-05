const BASE_STORAGE_KEY = 'multiCounterAppState_'; 
let STORAGE_KEY = BASE_STORAGE_KEY + 'default'; 

const idInput = document.getElementById('id-input');
const numPeopleInput = document.getElementById('num-people-input');
const minutesInput = document.getElementById('minutes-input');
const secondsInput = document.getElementById('seconds-input');
const setSettingsBtn = document.getElementById('set-settings-btn');
const counterContainer = document.getElementById('counter-container');
const timeDisplay = document.getElementById('time-display');
const startBtn = document.getElementById('start-btn');
const lastSentDisplay = document.getElementById('last-sent-display');
const rotateLeftBtn = document.getElementById('rotate-left-btn');
const rotateRightBtn = document.getElementById('rotate-right-btn');

let timerInterval;
let isRunning = false;
const EXPIRATION_TIME_MS = 6 * 60 * 60 * 1000; 

let appState = {
    userId: 'default',
    numPeople: 4,
    timer: { totalSeconds: 300, remainingSeconds: 300, isRunning: false, inputMinutes: 5, inputSeconds: 0 },
    counters: [], // { name: string, count: number, isEmpty: boolean, fixedLabel: string }
    lastSent: null 
};

const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeSR4hnNwazy8mP4PB98JEhORUl-Gjj7rByiET8HrHTGUwSwg/formResponse'; 
const ENTRY_IDS = {
    SESSION_ID: 'entry.747407692', 
    COUNTER_NAME_1: 'entry.1489675315', COUNTER_COUNT_1: 'entry.563259291', 
    COUNTER_NAME_2: 'entry.1561664164', COUNTER_COUNT_2: 'entry.471612491',
    COUNTER_NAME_3: 'entry.618883719', COUNTER_COUNT_3: 'entry.1122961194',
    COUNTER_NAME_4: 'entry.2062842370', COUNTER_COUNT_4: 'entry.1182115303',
    SUBMIT_TIME: 'entry.521408849' 
};

// ===============================================
// 初期化
// ===============================================

function initialize() {
    const urlParams = new URLSearchParams(window.location.search);
    let userIdFromUrl = urlParams.get('id');
    if (userIdFromUrl) {
        appState.userId = decodeURIComponent(userIdFromUrl);
    }
    
    STORAGE_KEY = BASE_STORAGE_KEY + appState.userId;
    document.title = `カウンター (${appState.userId})`;
    idInput.value = appState.userId;

    loadState();
    renderCounters();
}

// ===============================================
// 設定適用・保存
// ===============================================

function applySettings() {
    const newId = idInput.value.trim() || 'default';
    const newNum = Math.min(Math.max(parseInt(numPeopleInput.value) || 1, 1), 4);
    const min = parseInt(minutesInput.value) || 0;
    const sec = parseInt(secondsInput.value) || 0;
    const totalSec = (min * 60) + sec;

    appState.numPeople = newNum;
    appState.timer.totalSeconds = totalSec;
    appState.timer.remainingSeconds = totalSec;
    appState.timer.inputMinutes = min;
    appState.timer.inputSeconds = sec;

    // カウンター配列の再構築
    let targetLen = (newNum === 3) ? 4 : newNum; // 3人の時は4枠
    let newCounters = [];
    for (let i = 0; i < targetLen; i++) {
        // 既存のデータがあれば引き継ぐ
        const existing = appState.counters[i];
        newCounters.push({
            name: existing ? existing.name : "",
            count: existing ? existing.count : 0,
            isEmpty: (newNum === 3 && i === 3) // 3人の場合、最初は4番目を空きにする
        });
    }
    appState.counters = newCounters;

    saveState();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('id') !== newId) {
        location.href = `?id=${encodeURIComponent(newId)}`;
    } else {
        renderCounters();
        timeDisplay.textContent = formatTime(totalSec);
        startBtn.disabled = totalSec <= 0;
        alert("設定を保存しました。");
    }
}

// ===============================================
// 描画ロジック (ここがメイン)
// ===============================================

function renderCounters() {
    counterContainer.innerHTML = '';
    const n = appState.numPeople;

    // ローテーションボタンの有効/無効
    const disableRotate = (n === 1);
    rotateLeftBtn.disabled = disableRotate;
    rotateRightBtn.disabled = disableRotate;

    appState.counters.forEach((c, i) => {
        // ラベルの決定
        let labelText = `カウンター ${i+1}`;
        if (n === 2) {
            labelText = (i === 0) ? "左釣座" : "右釣座";
        } else if (n >= 3) {
            labelText = `釣座 ${i+1}`;
        }

        const div = document.createElement('div');
        div.className = `counter-set ${c.isEmpty ? 'is-empty' : ''}`;
        
        div.innerHTML = `
            <div class="counter-label">${labelText}</div>
            <input type="text" class="name-input" placeholder="${c.isEmpty ? '(空き)' : '名前'}" value="${c.name}" ${c.isEmpty ? 'disabled' : ''}>
            <div class="count-control">
                <button class="dec-btn" ${c.isEmpty ? 'disabled' : ''}>-</button>
                <div class="count-display">${c.count}</div>
                <button class="inc-btn" ${c.isEmpty ? 'disabled' : ''}>+</button>
            </div>
        `;

        // イベント設定
        if (!c.isEmpty) {
            div.querySelector('.inc-btn').onclick = () => { c.count++; renderCounters(); saveState(); };
            div.querySelector('.dec-btn').onclick = () => { if(c.count > 0) c.count--; renderCounters(); saveState(); };
            div.querySelector('.name-input').oninput = (e) => { c.name = e.target.value; saveState(); };
        }

        counterContainer.appendChild(div);
    });
    
    lastSentDisplay.textContent = appState.lastSent ? `最終送信: ${appState.lastSent}` : "最終送信: なし";
    numPeopleInput.value = n;
}

// ===============================================
// ユーティリティ
// ===============================================

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({appState: appState, timestamp: Date.now()}));
}

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
        let initialLen = (appState.numPeople === 3) ? 4 : appState.numPeople;
        appState.counters = Array.from({length: initialLen}, (_, i) => ({
            name: "", count: 0, isEmpty: (appState.numPeople === 3 && i === 3)
        }));
        return;
    }
    const data = JSON.parse(saved);
    appState = data.appState;
    minutesInput.value = appState.timer.inputMinutes;
    secondsInput.value = appState.timer.inputSeconds;
    numPeopleInput.value = appState.numPeople;
}

function formatTime(s) {
    return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

function toggleTimer() {
    if (isRunning) { clearInterval(timerInterval); isRunning = false; startBtn.textContent = "再開"; }
    else {
        isRunning = true; startBtn.textContent = "一時停止";
        timerInterval = setInterval(() => {
            if (appState.timer.remainingSeconds <= 0) {
                clearInterval(timerInterval); isRunning = false; startBtn.textContent = "スタート"; alert("終了！"); return;
            }
            appState.timer.remainingSeconds--;
            timeDisplay.textContent = formatTime(appState.timer.remainingSeconds);
            saveState();
        }, 1000);
    }
}

function rotateCounters(dir) {
    if (appState.numPeople === 1) return;
    if (dir === 'right') appState.counters.unshift(appState.counters.pop());
    else appState.counters.push(appState.counters.shift());
    renderCounters();
    saveState();
}

function submitData() {
    if (!confirm("送信しますか？")) return;
    const data = new FormData();
    data.append(ENTRY_IDS.SESSION_ID, appState.userId);
    // 送信時は常に4枠分送る（空きの場合は0として送る）
    for(let i=0; i<4; i++) {
        const c = appState.counters[i] || { name: "未設定", count: 0 };
        data.append(ENTRY_IDS[`COUNTER_NAME_${i+1}`], c.name || (c.isEmpty ? "空き" : `釣座${i+1}`));
        data.append(ENTRY_IDS[`COUNTER_COUNT_${i+1}`], c.count);
    }
    const now = new Date().toLocaleString('ja-JP');
    data.append(ENTRY_IDS.SUBMIT_TIME, now);

    fetch(FORM_URL, { method: 'POST', body: data, mode: 'no-cors' })
    .then(() => { appState.lastSent = now; renderCounters(); saveState(); alert('送信完了'); });
}

function downloadCSV() {
    let csv = "日時,ユーザーID,釣座,名前,数値\n";
    appState.counters.forEach((c, i) => {
        csv += `${new Date().toLocaleString()},${appState.userId},釣座${i+1},${c.isEmpty ? '空き' : c.name},${c.count}\n`;
    });
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `report_${appState.userId}.csv`;
    a.click();
}

setSettingsBtn.onclick = applySettings;
startBtn.onclick = toggleTimer;
rotateLeftBtn.onclick = () => rotateCounters('left');
rotateRightBtn.onclick = () => rotateCounters('right');
document.getElementById('submit-btn').onclick = submitData;
document.getElementById('download-csv-btn').onclick = downloadCSV;
document.getElementById('reset-all-btn').onclick = () => { if(confirm("消去しますか？")) { localStorage.removeItem(STORAGE_KEY); location.reload(); }};

initialize();
