// ===============================================
// 定数と要素の取得
// ===============================================

const BASE_STORAGE_KEY = 'multiCounterAppState_'; 
let STORAGE_KEY = BASE_STORAGE_KEY + 'default'; 

const counterSets = document.querySelectorAll('.counter-set');
const resetAllBtn = document.getElementById('reset-all-btn');
const timeDisplay = document.getElementById('time-display');
const minutesInput = document.getElementById('minutes-input');
const secondsInput = document.getElementById('seconds-input');
const setTimeBtn = document.getElementById('set-time-btn');
const startBtn = document.getElementById('start-btn');
const submitBtn = document.getElementById('submit-btn'); 
const downloadCsvBtn = document.getElementById('download-csv-btn');
const lastSentDisplay = document.getElementById('last-sent-display');

const rotateLeftBtn = document.getElementById('rotate-left-btn');
const rotateRightBtn = document.getElementById('rotate-right-btn');

let timeInSeconds = 300;
let timerInterval;
let isRunning = false;
const EXPIRATION_TIME_MS = 6 * 60 * 60 * 1000; 

let appState = {
    timer: {
        totalSeconds: 300,
        remainingSeconds: 300,
        isRunning: false,
        inputMinutes: 5,
        inputSeconds: 0
    },
    counters: [
        { name: "", count: 0 },
        { name: "", count: 0 },
        { name: "", count: 0 },
        { name: "", count: 0 }
    ],
    lastSent: null 
};

// ★修正済みURL: /d/ を追加しました
const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeSR4hnNwazy8mP4PB98JEhORUl-Gjj7rByiET8HrHTGUwSwg/formResponse'; 

const ENTRY_IDS = {
    SESSION_ID: 'entry.747407692', 
    COUNTER_NAME_1: 'entry.1489675315', 
    COUNTER_COUNT_1: 'entry.563259291', 
    COUNTER_NAME_2: 'entry.1561664164',
    COUNTER_COUNT_2: 'entry.471612491',
    COUNTER_NAME_3: 'entry.618883719',
    COUNTER_COUNT_3: 'entry.1122961194',
    COUNTER_NAME_4: 'entry.2062842370',
    COUNTER_COUNT_4: 'entry.1182115303',
    SUBMIT_TIME: 'entry.521408849' 
};

// ===============================================
// 初期化・永続化
// ===============================================

function initializeStorageKey() {
    const urlParams = new URLSearchParams(window.location.search);
    let userId = urlParams.get('id');
    if (userId) userId = decodeURIComponent(userId);

    if (!userId) {
        userId = prompt("識別用のIDを入力してください。") || 'default';
        if (userId !== 'default') {
             const encodedUserId = encodeURIComponent(userId);
             const newUrl = window.location.origin + window.location.pathname + `?id=${encodedUserId}`;
             window.location.href = newUrl;
             return true; 
        }
    }
    STORAGE_KEY = BASE_STORAGE_KEY + userId;
    document.title = `カウンター (${userId})`; 
    return false;
}

function saveState() {
    appState.counters = Array.from(counterSets).map((counterSet) => {
        return {
            name: counterSet.querySelector('.name-input').value,
            count: parseInt(counterSet.querySelector('.count-display').textContent)
        };
    });
    appState.timer.inputMinutes = parseInt(minutesInput.value) || 0;
    appState.timer.inputSeconds = parseInt(secondsInput.value) || 0;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({appState: appState, timestamp: Date.now()}));
}

function updateCounterDisplay() {
    appState.counters.forEach((data, index) => {
        const counterSet = counterSets[index];
        if (counterSet) {
            counterSet.querySelector('.name-input').value = data.name;
            counterSet.querySelector('.count-display').textContent = data.count;
        }
    });
    lastSentDisplay.textContent = appState.lastSent ? `最終送信: ${appState.lastSent}` : "最終送信: なし";
}

function loadState() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) return;
    const loadedData = JSON.parse(savedData);
    if (loadedData.timestamp && (Date.now() - loadedData.timestamp > EXPIRATION_TIME_MS)) {
        localStorage.removeItem(STORAGE_KEY);
        return;
    }
    appState = loadedData.appState;
    updateCounterDisplay();
    timeInSeconds = appState.timer.remainingSeconds;
    isRunning = appState.timer.isRunning;
    minutesInput.value = appState.timer.inputMinutes;
    secondsInput.value = appState.timer.inputSeconds;
    timeDisplay.textContent = formatTime(timeInSeconds);
    if (isRunning) { startTimerInterval(); startBtn.textContent = "一時停止"; setTimeBtn.disabled = true; }
    else { startBtn.textContent = "スタート"; startBtn.disabled = timeInSeconds <= 0; }
}

// ===============================================
// カウンター・タイマー・機能
// ===============================================

function setupCounters() {
    counterSets.forEach(counterSet => {
        const display = counterSet.querySelector('.count-display');
        counterSet.querySelector('.increment-btn').addEventListener('click', () => {
            display.textContent = parseInt(display.textContent) + 1;
            saveState(); 
        });
        counterSet.querySelector('.decrement-btn').addEventListener('click', () => {
            let count = parseInt(display.textContent);
            if (count > 0) { display.textContent = count - 1; saveState(); }
        });
        counterSet.querySelector('.name-input').addEventListener('input', () => saveState());
    });
}

function rotateCounters(direction) {
    saveState(); 
    if (direction === 'right') appState.counters.unshift(appState.counters.pop());
    else appState.counters.push(appState.counters.shift());
    updateCounterDisplay();
    saveState();
}

function formatTime(totalSeconds) {
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return `${m}:${s}`;
}

function startTimerInterval() {
    timerInterval = setInterval(() => {
        if (timeInSeconds <= 0) {
            clearInterval(timerInterval);
            isRunning = false;
            appState.timer.isRunning = false;
            startBtn.textContent = "スタート"; startBtn.disabled = true; setTimeBtn.disabled = false;
            timeDisplay.textContent = "00:00";
            saveState(); alert("制限時間終了！"); return;
        }
        timeInSeconds--;
        appState.timer.remainingSeconds = timeInSeconds; 
        timeDisplay.textContent = formatTime(timeInSeconds);
        timeDisplay.style.color = timeInSeconds <= 30 ? '#dc3545' : 'white';
        saveState(); 
    }, 1000);
    appState.timer.isRunning = true;
}

function setTimer() {
    const min = parseInt(minutesInput.value) || 0;
    const sec = parseInt(secondsInput.value) || 0;
    timeInSeconds = (min * 60) + sec;
    appState.timer.totalSeconds = timeInSeconds;
    appState.timer.remainingSeconds = timeInSeconds;
    timeDisplay.textContent = formatTime(timeInSeconds);
    startBtn.disabled = timeInSeconds <= 0;
    saveState(); 
}

function toggleTimer() {
    if (isRunning) {
        clearInterval(timerInterval);
        startBtn.textContent = "再開";
        isRunning = false;
        appState.timer.isRunning = false;
        setTimeBtn.disabled = false; 
    } else {
        if (timeInSeconds <= 0) return;
        startTimerInterval();
        startBtn.textContent = "一時停止";
        isRunning = true;
        setTimeBtn.disabled = true; 
    }
    saveState();
}

// ===============================================
// 送信・CSVダウンロード
// ===============================================

function submitData() {
    if (!confirm("結果を送信しますか？")) return;
    saveState(); 
    const data = new FormData();
    const userId = STORAGE_KEY.replace(BASE_STORAGE_KEY, ''); 
    data.append(ENTRY_IDS.SESSION_ID, userId);
    appState.counters.forEach((c, i) => {
        data.append(ENTRY_IDS[`COUNTER_NAME_${i+1}`], c.name || `カウンター${i+1}`);
        data.append(ENTRY_IDS[`COUNTER_COUNT_${i+1}`], c.count);
    });
    const nowStr = new Date().toLocaleString('ja-JP');
    data.append(ENTRY_IDS.SUBMIT_TIME, nowStr);

    fetch(FORM_URL, { method: 'POST', body: data, mode: 'no-cors' })
    .then(() => {
        appState.lastSent = nowStr;
        updateCounterDisplay();
        saveState();
        alert('正常に送信されました。');
    })
    .catch(() => alert('送信に失敗しました。CSVで保存してください。'));
}

function downloadCSV() {
    const now = new Date().toLocaleString('ja-JP');
    const userId = STORAGE_KEY.replace(BASE_STORAGE_KEY, '');
    let csv = "日時,ユーザーID,項目1,数値1,項目2,数値2,項目3,数値3,項目4,数値4\n";
    let row = `${now},${userId}`;
    appState.counters.forEach(c => row += `,${c.name || "未設定"},${c.count}`);
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csv + row], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `counter_${userId}_${Date.now()}.csv`;
    a.click();
}

// ===============================================
// イベント設定・起動
// ===============================================

setTimeBtn.addEventListener('click', setTimer);
startBtn.addEventListener('click', toggleTimer);
resetAllBtn.addEventListener('click', () => { if(confirm("全てリセットしますか？")) { localStorage.removeItem(STORAGE_KEY); location.reload(); }});
submitBtn.addEventListener('click', submitData);
downloadCsvBtn.addEventListener('click', downloadCSV);
rotateLeftBtn.addEventListener('click', () => rotateCounters('left'));
rotateRightBtn.addEventListener('click', () => rotateCounters('right'));

if (!initializeStorageKey()) {
    loadState();
    setupCounters();
}