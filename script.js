// ===============================================
// 設定・定数
// ===============================================
const BASE_STORAGE_KEY = 'fishCounterState_'; 
let STORAGE_KEY = BASE_STORAGE_KEY + 'default'; 

// エントリーリスト (CSV公開URL)
const MEMBER_LIST_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS4kjbsVgE0ev4GXesqX6DgCC6ZUq5tpNiNZb8ouD3rXpkoRTt0ivU2cceNx6_X47h2ubikQzlulxWL/pub?gid=1216185592&single=true&output=csv';

// Googleフォーム送信先URL
const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeSR4hnNwazy8mP4PB98JEhORUl-Gjj7rByiET8HrHTGUwSwg/formResponse'; 

// フォームの各項目ID
const ENTRY_IDS = {
    SESSION_ID: 'entry.747407692', 
    COUNTER_NAME_1: 'entry.1489675315', COUNTER_COUNT_1: 'entry.563259291', 
    COUNTER_NAME_2: 'entry.1561664164', COUNTER_COUNT_2: 'entry.471612491',
    COUNTER_NAME_3: 'entry.618883719', COUNTER_COUNT_3: 'entry.1122961194',
    COUNTER_NAME_4: 'entry.2062842370', COUNTER_COUNT_4: 'entry.1182115303',
    SUBMIT_TIME: 'entry.521408849' 
};

// ===============================================
// 状態管理・DOM要素
// ===============================================
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

let appState = {
    userId: 'default',
    numPeople: 4,
    timer: { totalSeconds: 300, remainingSeconds: 300, inputMinutes: 5, inputSeconds: 0 },
    counters: [],
    lastSent: null 
};

let timerInterval, isRunning = false, memberList = [];

// ===============================================
// 初期化・読み込み
// ===============================================
async function initialize() {
    // URLからIDを取得
    const urlParams = new URLSearchParams(window.location.search);
    let userIdFromUrl = urlParams.get('id');
    if (userIdFromUrl) appState.userId = decodeURIComponent(userIdFromUrl);
    
    STORAGE_KEY = BASE_STORAGE_KEY + appState.userId;
    idInput.value = appState.userId;

    // リストを取得してから状態を読み込み、描画する
    await fetchMemberList();
    loadState();
    renderCounters();
    updateTimerDisplay();
}

async function fetchMemberList() {
    try {
        // CORS回避と最新取得のためタイムスタンプを付与
        const response = await fetch(`${MEMBER_LIST_URL}&t=${Date.now()}`);
        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/).map(r => r.trim()).filter(r => r.length > 0);
        
        // A2から始まるとのことなので1行目(A1)を飛ばす
        memberList = rows.slice(1).map(name => name.replace(/^["']|["']$/g, '').trim());
        
        const dl = document.getElementById('member-list');
        dl.innerHTML = memberList.map(name => `<option value="${name}"></option>`).join('');
        console.log("リスト読み込み完了:", memberList);
    } catch (e) { 
        console.error("リスト読み込みエラー (ローカル環境ではCORSにより制限される場合があります):", e);
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ appState, timestamp: Date.now() }));
}

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) { resetCountersArray(); return; }
    
    const data = JSON.parse(saved);
    const savedDate = new Date(data.timestamp), now = new Date();
    
    // 毎日0時リセット判定
    const isExpired = savedDate.getDate() !== now.getDate() || savedDate.getMonth() !== now.getMonth() || savedDate.getFullYear() !== now.getFullYear();

    if (isExpired) { 
        localStorage.removeItem(STORAGE_KEY); 
        resetCountersArray(); 
        return; 
    }
    
    appState = data.appState;
    minutesInput.value = appState.timer.inputMinutes;
    secondsInput.value = appState.timer.inputSeconds;
    numPeopleInput.value = appState.numPeople;
}

function resetCountersArray() {
    const n = parseInt(appState.numPeople);
    let targetLen = (n === 3) ? 4 : n;
    appState.counters = Array.from({length: targetLen}, (_, i) => ({
        name: "", count: 0, isEmpty: (n === 3 && i === 3)
    }));
}

// ===============================================
// アクション処理
// ===============================================
function applySettings() {
    const newId = idInput.value.trim() || 'default';
    appState.numPeople = Math.min(Math.max(parseInt(numPeopleInput.value) || 1, 1), 4);
    appState.timer.inputMinutes = parseInt(minutesInput.value) || 0;
    appState.timer.inputSeconds = parseInt(secondsInput.value) || 0;
    appState.timer.totalSeconds = (appState.timer.inputMinutes * 60) + appState.timer.inputSeconds;
    appState.timer.remainingSeconds = appState.timer.totalSeconds;

    resetCountersArray();
    saveState();
    
    // IDが変わった場合はURLを更新してリロード
    if (new URLSearchParams(window.location.search).get('id') !== newId) {
        location.href = `?id=${encodeURIComponent(newId)}`;
    } else { 
        renderCounters(); 
        updateTimerDisplay(); 
        alert("設定を更新しました"); 
    }
}

function renderCounters() {
    counterContainer.innerHTML = '';
    const n = appState.numPeople;
    rotateLeftBtn.disabled = rotateRightBtn.disabled = (n === 1);

    appState.counters.forEach((c, i) => {
        let labelText = (n === 2) ? (i === 0 ? "左釣座" : "右釣座") : `釣座 ${i+1}`;
        const div = document.createElement('div');
        div.className = `counter-set ${c.isEmpty ? 'is-empty' : ''}`;
        div.innerHTML = `
            <div class="counter-label">${labelText}</div>
            <input type="text" class="name-input" list="member-list" placeholder="${c.isEmpty ? '(空き)' : '名前を入力'}" value="${c.name}" ${c.isEmpty ? 'disabled' : ''}>
            <div class="count-control">
                <button class="dec-btn" ${c.isEmpty ? 'disabled' : ''}>-</button>
                <div class="count-display">${c.count}</div>
                <button class="inc-btn" ${c.isEmpty ? 'disabled' : ''}>+</button>
            </div>`;

        if (!c.isEmpty) {
            div.querySelector('.inc-btn').onclick = () => { c.count++; renderCounters(); saveState(); };
            div.querySelector('.dec-btn').onclick = () => { if(c.count > 0) c.count--; renderCounters(); saveState(); };
            div.querySelector('.name-input').onchange = (e) => { c.name = e.target.value; saveState(); };
        }
        counterContainer.appendChild(div);
    });
    lastSentDisplay.textContent = appState.lastSent ? `最終送信: ${appState.lastSent}` : "最終送信: なし";
}

function updateTimerDisplay() {
    const s = appState.timer.remainingSeconds;
    timeDisplay.textContent = `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

function toggleTimer() {
    if (isRunning) { 
        clearInterval(timerInterval); 
        isRunning = false; 
        startBtn.textContent = "再開"; 
    } else {
        if (appState.timer.remainingSeconds <= 0) return;
        isRunning = true; 
        startBtn.textContent = "一時停止";
        timerInterval = setInterval(() => {
            if (appState.timer.remainingSeconds <= 0) { 
                clearInterval(timerInterval); 
                isRunning = false; 
                startBtn.textContent = "終了"; 
                alert("タイムアップ！"); 
                return; 
            }
            appState.timer.remainingSeconds--; 
            updateTimerDisplay(); 
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
    if (!confirm("Googleフォームに結果を送信しますか？")) return;
    const data = new FormData();
    data.append(ENTRY_IDS.SESSION_ID, appState.userId);
    for(let i=0; i<4; i++) {
        const c = appState.counters[i] || { name: "", count: 0, isEmpty: true };
        data.append(ENTRY_IDS[`COUNTER_NAME_${i+1}`], c.isEmpty ? "（空き）" : (c.name || `釣座${i+1}`));
        data.append(ENTRY_IDS[`COUNTER_COUNT_${i+1}`], c.count);
    }
    const nowStr = new Date().toLocaleString('ja-JP');
    data.append(ENTRY_IDS.SUBMIT_TIME, nowStr);

    fetch(FORM_URL, { method: 'POST', body: data, mode: 'no-cors' })
        .then(() => { 
            appState.lastSent = nowStr; 
            renderCounters(); 
            saveState(); 
            alert('送信リクエストを完了しました'); 
        })
        .catch(err => alert('送信エラーが発生しました'));
}

function downloadCSV() {
    let csv = "日時,ユーザーID,釣座,名前,数値\n";
    const now = new Date().toLocaleString();
    appState.counters.forEach((c, i) => { 
        csv += `${now},${appState.userId},釣座${i+1},${c.isEmpty ? '空き' : c.name},${c.count}\n`; 
    });
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv' });
    const a = document.createElement("a"); 
    a.href = URL.createObjectURL(blob); 
    a.download = `fish_${appState.userId}_${Date.now()}.csv`; 
    a.click();
}

// ===============================================
// イベントリスナー設定
// ===============================================
setSettingsBtn.onclick = applySettings;
startBtn.onclick = toggleTimer;
rotateLeftBtn.onclick = () => rotateCounters('left');
rotateRightBtn.onclick = () => rotateCounters('right');
document.getElementById('submit-btn').onclick = submitData;
document.getElementById('download-csv-btn').onclick = downloadCSV;
document.getElementById('reset-all-btn').onclick = () => { 
    if(confirm("全てのデータを消去して初期状態に戻しますか？")) { 
        localStorage.removeItem(STORAGE_KEY); 
        location.reload(); 
    }
};

// 起動
initialize();
