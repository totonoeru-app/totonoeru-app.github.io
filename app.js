// ---------- スマホ(タッチ操作)かどうか。絵文字をFluent Emoji(3D)に置き換えるかどうかの判定に使う ----------
// タッチスクリーン付きPC（2-in-1等）の誤判定を避けるため、pointer:coarseだけでなく
// OSがスマホ系であることも合わせて見る（Windows/Macは対象外にする）
const USE_FLUENT_EMOJI = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
  !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
// SVG内の絵文字は<text>のままだとtwemoji.parse()で<img>に置き換えられない（SVGの<text>の
// 子要素として<img>は無効なため）。気象グラフ（気圧グラフ）の朝夜マーク・体調記録マークは
// SVG文字列に直接埋め込んでいるので、ここだけは<image>タグでFluent Emoji画像を直接埋め込む。
// x/yはテキスト版と同じ「中央揃えの基準点」を受け取り、画像用の左上座標に変換する
function svgEmojiImage(unicode, xCenter, yBaseline, size) {
  const w = size, h = size;
  const x = xCenter - w / 2, y = yBaseline - h * 0.85;
  return `<image href="assets/emoji/fluent/${unicode}.png" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="${h}" />`;
}
// Microsoft Fluent Emoji(3D)を自前ホストして使用。用意していない絵文字だけ自前ホストのTwemoji(72x72)に
// 自動フォールバックする（unifyEmojiRenderingのtwemoji.parse()コールバックと共通のリスト）
const FLUENT_EMOJI_CODES = new Set(['1f300','1f305','1f30a','1f30f','1f319','1f321','1f324','1f326','1f327','1f328','1f32b','1f32c','1f331','1f337','1f338','1f33c','1f33f','1f345','1f35a','1f380','1f389','1f399','1f3af','1f3c3','1f3c6','1f3e0','1f3e5','1f3eb','1f431','1f43e','1f451','1f48c','1f496','1f497','1f49d','1f4a6','1f4a7','1f4a8','1f4ac','1f4ad','1f4bc','1f4be','1f4c5','1f4c8','1f4c9','1f4ca','1f4cb','1f4d6','1f4dd','1f4e4','1f4e5','1f4e9','1f4ee','1f501','1f504','1f50b','1f50d','1f50e','1f514','1f524','1f525','1f52e','1f534','1f538','1f53d','1f5a8','1f5c2','1f5d3','1f60c','1f629','1f634','1f636','1f638','1f63b','1f63d','1f63f','1f640','1f642','1f6cf','1f6e1','1f7e0','1f7e1','1f7e2','1f916','1f937','1f975','1f9a5','1f9e0','1f9e9','1f9ed','1fa77','1faab','2600','2601','2611','2614','2699','26a0','26a1','26c5','26c8','2705','270f','2728','2744','1f198','23fa','1f63c']);
// 通常のHTML文中に絵文字を埋め込む版。innerHTMLに生の絵文字文字を入れると、あとから
// unifyEmojiRendering()のMutationObserverが画像に置き換えるまでの一瞬（最大200ms）だけ
// OS標準の絵文字が見えてしまい、特に警報アイコンのようにまとまった数を一度に表示する箇所では
// 「チカチカ」して見える（実際にスマホで確認された）。最初から画像タグとして埋め込むことで防ぐ
function htmlEmojiImg(unicode, altChar) {
  if (!USE_FLUENT_EMOJI) return altChar;
  const dir = FLUENT_EMOJI_CODES.has(unicode) ? 'fluent' : '72x72';
  return `<img class="twemoji-icon" src="assets/emoji/${dir}/${unicode}.png" alt="${altChar}">`;
}

// ---------- ヘッダー実高さ →  --header-h（sticky toolbarの位置合わせ用） ----------
function setHeaderHeightVar() {
  const header = document.querySelector('header');
  if (header) document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
}
window.addEventListener('resize', setHeaderHeightVar);
setHeaderHeightVar();

// ---------- Tabs ----------
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
  if ((name === 'record' || name === 'weather') && typeof checkWeatherAlert === 'function') checkWeatherAlert();
  if (name === 'history' && typeof renderHospitalVisitList === 'function') renderHospitalVisitList();
  if (name === 'weather' && typeof renderWeatherTab === 'function') renderWeatherTab();
  if (name === 'album' && typeof renderAlbumTab === 'function') renderAlbumTab();
  if (name === 'myguide' && typeof renderMyGuideTab === 'function') renderMyGuideTab();
}
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// 候補体質 → セルフケアタブへジャンプ（体質名で絞り込み）
function goToCare(name) {
  switchTab('care');
  document.querySelectorAll('#careSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.seg === 'taishitsu'));
  careSeg = 'taishitsu';
  careFilter = name;
  const box = document.getElementById('careSearch');
  if (box) box.value = name;
  renderCare();
}

// タイプ別セルフケアへジャンプ（「伝える」で選んだ言葉からの提案用）
function goToCareType(name) {
  switchTab('care');
  document.querySelectorAll('#careSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.seg === 'type'));
  careSeg = 'type';
  careFilter = name;
  const box = document.getElementById('careSearch');
  if (box) box.value = name;
  renderCare();
}

// ---------- 結果の出力（印刷/PDF・共有） ----------
function printResult() { window.print(); }

async function shareText(text, title) {
  try {
    if (navigator.share) { await navigator.share({ title, text }); return; }
  } catch { /* キャンセル等は無視 */ }
  try {
    await navigator.clipboard.writeText(text);
    alert('結果をコピーしました。LINE等に貼り付けて渡せます。');
  } catch {
    alert('共有に対応していません。印刷ボタンをお使いください。');
  }
}

async function shareResult(boxId, title) {
  const box = document.getElementById(boxId);
  if (!box) return;
  await shareText(`【${title}】\n` + box.innerText.trim() + '\n\n— 東洋医学チェッカー', title);
}

function outputBar(boxId, title) {
  return `<div class="output-bar no-print">
    <button class="btn-out" onclick="printResult()">🖨 印刷 / PDF保存</button>
    <button class="btn-out" onclick="shareResult('${boxId}','${title}')">📤 共有・コピー</button>
  </div>`;
}

// ---------- localStorage helpers ----------
const LS = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
};

// ---------- クリック確認（window.confirmは一部のPWA/端末で動作しないため、2段階クリックで代替） ----------
function confirmClick(btn, confirmText, onConfirm) {
  if (btn.dataset.confirming) {
    clearTimeout(btn._confirmTimer);
    delete btn.dataset.confirming;
    onConfirm();
    return;
  }
  btn.dataset.confirming = '1';
  if (btn.dataset.origText == null) btn.dataset.origText = btn.textContent;
  btn.textContent = confirmText;
  btn.classList.add('confirming');
  btn._confirmTimer = setTimeout(() => {
    delete btn.dataset.confirming;
    btn.textContent = btn.dataset.origText;
    btn.classList.remove('confirming');
  }, 3000);
}

// ---------- 夜モード ----------
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}
let currentTheme = LS.get('theme', 'light');
applyTheme(currentTheme);
document.getElementById('themeToggle').addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  LS.set('theme', currentTheme);
  applyTheme(currentTheme);
});

// ---------- 省エネモード：「今日はスペックを落として運用する」を、サイト全体にゆるく反映する ----------
// タイマーの初期値をやさしい設定に寄せる・週間予報や詳細パネルを折りたたむ・マスコットの動きをゆっくりにする、程度の
// 控えめな効果にとどめる（機能そのものを消したり、断定的な「休んでください」という指示は出さない）
let energySaveMode = LS.get('energySaveMode', false);
function applyEnergySaveButton() {
  const btn = document.getElementById('energySaveToggle');
  if (!btn) return;
  btn.textContent = energySaveMode ? '🪫' : '🔋';
  btn.classList.toggle('on', energySaveMode);
  document.body.classList.toggle('energy-save', energySaveMode);
}
applyEnergySaveButton();
document.getElementById('energySaveToggle').addEventListener('click', () => {
  energySaveMode = !energySaveMode;
  LS.set('energySaveMode', energySaveMode);
  applyEnergySaveButton();
  if (energySaveMode && typeof pomoState !== 'undefined' && pomoState.preset === 'standard' && typeof pomoApplyPreset === 'function') {
    pomoApplyPreset('gentle');
  }
  if (typeof renderWeatherTab === 'function' && weatherTabState.loaded) { weatherTabState.loaded = false; renderWeatherTab(); }
});

// ---------- しんどいときモード（SOS） ----------
// 「健康管理のために頑張る」という矛盾を避けるための出口。普段の画面を全部いったん覆い隠し、
// ①今日はしんどい？→はい ②何もしなくていい旨の一言と、一言だけの記録欄、だけを見せる。
// ページを再読み込みすると通常画面に戻る（常にONのまま残り続ける設定にはしない）
(function initSosMode() {
  const overlay = document.getElementById('sosOverlay');
  const toggleBtn = document.getElementById('sosModeToggle');
  if (!overlay || !toggleBtn) return;

  function renderAsk() {
    overlay.innerHTML = `
      <div class="sos-card">
        <h2>🐱 今日はしんどい？</h2>
        <button type="button" class="sos-big-btn" id="sosYesBtn">はい</button>
        <button type="button" class="sos-exit" id="sosNoBtn">ううん、大丈夫</button>
      </div>`;
    document.getElementById('sosYesBtn').addEventListener('click', renderSimple);
    document.getElementById('sosNoBtn').addEventListener('click', closeSos);
  }

  function renderSimple() {
    overlay.innerHTML = `
      <div class="sos-card">
        <h2>🐱 わかった。今はこれだけでいいよ</h2>
        <div class="sos-line">🌙 記録はあとでOK</div>
        <div class="sos-line">💧 水分とれたらえらい</div>
        <div class="sos-line">🛏️ 今は休もう</div>
        <div class="sos-line">📝 今日の記録は一言だけでもOK</div>
        <textarea class="sos-textarea" id="sosMemo" rows="2" placeholder="（書いても書かなくても大丈夫）"></textarea>
        <button type="button" class="sos-big-btn" id="sosSaveBtn">一言だけ残す</button>
        <p class="note" id="sosSaveStatus" style="min-height:1.4em;"></p>
        <button type="button" class="sos-exit" id="sosCloseBtn">🌷 通常の画面に戻る</button>
      </div>`;
    document.getElementById('sosSaveBtn').addEventListener('click', async () => {
      const memo = document.getElementById('sosMemo').value.trim();
      const status = document.getElementById('sosSaveStatus');
      if (!memo) { if (status) status.textContent = '書かなくても大丈夫だよ。'; return; }
      const now = new Date();
      const dateKey = todayKey(now);
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      // 通常の記録タブと同じく、保存のたびにcollectWeatherを呼んで位置情報の許可ダイアログを出す
      const saveBtn = document.getElementById('sosSaveBtn');
      saveBtn.disabled = true;
      const weather = await collectWeather(status, dateKey, time);
      saveBtn.disabled = false;
      records.push({ id: String(Date.now()), dateKey, time, memo, mood: null, checkSnapshot: null, intakeSnapshot: null, tags: null, weather, sos: true });
      saveRecords();
      if (status) status.textContent = '残しておいたよ。おつかれさま。';
      document.getElementById('sosMemo').value = '';
    });
    document.getElementById('sosCloseBtn').addEventListener('click', closeSos);
  }

  function openSos() {
    overlay.hidden = false;
    renderAsk();
  }
  function closeSos() {
    overlay.hidden = true;
    overlay.innerHTML = '';
  }
  toggleBtn.addEventListener('click', () => { if (overlay.hidden) openSos(); else closeSos(); });
})();

// ---------- データのバックアップ / 復元 / LAN同期 ----------
// バックアップ書き出し・ファイル復元・LAN同期の3つで同じデータの形を使い回すため、
// 「今のlocalStorageから作る」「localStorageへ書き戻す」を関数として切り出しておく
function buildBackupData() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    check: LS.get('check', {}),
    intake: LS.get('intake', {}),
    intakeQuickMode: LS.get('intakeQuickMode', false),
    records: LS.get('records', []),
    tsutaeru: LS.get('tsutaeru', null),
    handoverLog: LS.get('handoverLog', {}),
    minLineLog: LS.get('minLineLog', {}),
    torisetsu: LS.get('torisetsu', null),
    forecastAccuracyLog: LS.get('forecastAccuracyLog', []),
    dailyForecastSnapshot: LS.get('dailyForecastSnapshot', {}),
    ganbattaPoints: LS.get('ganbattaPoints', 0),
    ganbattaPointsLog: LS.get('ganbattaPointsLog', []),
    ganbattaRecordDates: LS.get('ganbattaRecordDates', []),
    ganbattaDekitaDates: LS.get('ganbattaDekitaDates', []),
    ganbattaForecastBetterDates: LS.get('ganbattaForecastBetterDates', []),
    dekitaLog: LS.get('dekitaLog', []),
    tsChecklistLog: LS.get('tsChecklistLog', []),
    factorTagLog: LS.get('factorTagLog', {}),
  };
}
function applyBackupData(data) {
  if (!data || typeof data !== 'object') throw new Error('invalid');
  if (data.check) LS.set('check', data.check);
  if (data.intake) LS.set('intake', data.intake);
  if (typeof data.intakeQuickMode === 'boolean') LS.set('intakeQuickMode', data.intakeQuickMode);
  if (Array.isArray(data.records)) LS.set('records', data.records);
  if (data.tsutaeru) LS.set('tsutaeru', data.tsutaeru);
  if (data.handoverLog) LS.set('handoverLog', data.handoverLog);
  if (data.minLineLog) LS.set('minLineLog', data.minLineLog);
  if (data.torisetsu) LS.set('torisetsu', data.torisetsu);
  if (Array.isArray(data.forecastAccuracyLog)) LS.set('forecastAccuracyLog', data.forecastAccuracyLog);
  if (data.dailyForecastSnapshot) LS.set('dailyForecastSnapshot', data.dailyForecastSnapshot);
  if (typeof data.ganbattaPoints === 'number') LS.set('ganbattaPoints', data.ganbattaPoints);
  if (Array.isArray(data.ganbattaPointsLog)) LS.set('ganbattaPointsLog', data.ganbattaPointsLog);
  if (Array.isArray(data.ganbattaRecordDates)) LS.set('ganbattaRecordDates', data.ganbattaRecordDates);
  if (Array.isArray(data.ganbattaDekitaDates)) LS.set('ganbattaDekitaDates', data.ganbattaDekitaDates);
  if (Array.isArray(data.ganbattaForecastBetterDates)) LS.set('ganbattaForecastBetterDates', data.ganbattaForecastBetterDates);
  if (Array.isArray(data.dekitaLog)) LS.set('dekitaLog', data.dekitaLog);
  if (Array.isArray(data.tsChecklistLog)) LS.set('tsChecklistLog', data.tsChecklistLog);
  if (data.factorTagLog && typeof data.factorTagLog === 'object') LS.set('factorTagLog', data.factorTagLog);
}
function exportBackup() {
  const data = buildBackupData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `totonoeru-backup-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      // 丸ごと上書きすると、この端末で先に記録していた分が消えてしまう（実際に確認された不具合）。
      // LAN同期と同じ合体ロジックを使い、読み込んだファイルと今の記録を両方とも残す
      const merged = mergeBackupData(buildBackupData(), data);
      applyBackupData(merged);
      alert('データを取り込みました（今までの記録と合体しています）。ページを再読み込みします。');
      location.reload();
    } catch {
      alert('ファイルを読み込めませんでした。バックアップ用のファイルか確認してください。');
    }
  };
  reader.readAsText(file);
}
document.getElementById('exportBackup').addEventListener('click', exportBackup);
document.getElementById('importBackup').addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) importBackup(file);
  e.target.value = '';
});

// ---------- LAN同期（家のWi-Fi上のパソコンとだけ、インターネットを経由せず記録をやり取りする） ----------
// 「クラウドには一切預けたくないが、パソコン・スマホの手動バックアップ往復は面倒」という要望から。
// 同じWi-Fi上にあるパソコンのLAN開発サーバー（.claude/static-server.ps1、/api/syncを追加済み）を
// 単純な「置き場」として使い、各端末が「取得→自分のデータと合体→書き戻す」を行うことで、
// どちら側からも記録を失わずに同期できるようにする。サーバー自身は合体処理をせずただ保存するだけ
// （合体のロジックは全端末で共通のこの関数が担う）
function mergeBackupData(local, incoming) {
  if (!incoming || typeof incoming !== 'object') return local;
  if (!local || typeof local !== 'object') return incoming;
  const merged = { ...local };
  // id付きの配列（記録・できたことアルバム等）はidで合体する。同じidが両方にある場合は
  // 「今使っている端末（local）」の内容を優先する（同時編集の衝突は稀という前提の単純な方針）
  const idArrayKeys = ['records', 'dekitaLog', 'ganbattaPointsLog', 'forecastAccuracyLog', 'tsChecklistLog'];
  idArrayKeys.forEach(key => {
    const a = Array.isArray(local[key]) ? local[key] : [];
    const b = Array.isArray(incoming[key]) ? incoming[key] : [];
    const byId = new Map();
    b.forEach(item => { if (item && item.id != null) byId.set(item.id, item); });
    a.forEach(item => { if (item && item.id != null) byId.set(item.id, item); }); // localで上書き＝local優先
    // idを持たない要素（念のため）は、内容が完全一致するものが増え続けないようJSON文字列で重複を除く
    // （これをしないと、GET→合体→POSTを繰り返すたびに際限なく増殖してしまう不具合が実際に起きた：
    // 同期のたびにデータが2倍近くに膨れ上がり、数十MBになってスマホがダウンロードしきれず
    // 毎回タイムアウトしていた）
    const noIdMap = new Map();
    [...a, ...b].filter(item => !item || item.id == null).forEach(item => noIdMap.set(JSON.stringify(item), item));
    merged[key] = [...byId.values(), ...noIdMap.values()];
  });
  // 日付文字列だけの配列（がんばったポイントの記録日など）は重複を除いた集合として合体する
  const dateArrayKeys = ['ganbattaRecordDates', 'ganbattaDekitaDates', 'ganbattaForecastBetterDates'];
  dateArrayKeys.forEach(key => {
    const a = Array.isArray(local[key]) ? local[key] : [];
    const b = Array.isArray(incoming[key]) ? incoming[key] : [];
    merged[key] = [...new Set([...a, ...b])].sort();
  });
  // 日付をキーにしたオブジェクト（申し送り・最低ラインなど）はキーを合体し、衝突時はlocal優先
  const dateMapKeys = ['handoverLog', 'minLineLog', 'dailyForecastSnapshot', 'factorTagLog'];
  dateMapKeys.forEach(key => {
    const a = (local[key] && typeof local[key] === 'object') ? local[key] : {};
    const b = (incoming[key] && typeof incoming[key] === 'object') ? incoming[key] : {};
    merged[key] = { ...b, ...a };
  });
  // その他（体質チェック・問診・伝える文章など「今の状態」に近いもの）は
  // 単純にlocal優先のままにする（mergedの初期値が{...local}なので、何もしなければlocalが残る）
  // ただし「がんばったねポイント」の合計数だけは例外: これは本来ganbattaPointsLogの
  // delta合計であるはずなのに、合計値自体は上のidArrayKeysの対象外なのでlocal側の値が
  // そのまま残ってしまい、他端末で貯めた分がログには合体されても合計には反映されない
  // （実際に「アルバムは39件になったのにポイントは0のまま」という形で確認された）。
  // ログを合体し終えた後の値から合計を作り直すことで、この食い違いを防ぐ
  if (Array.isArray(merged.ganbattaPointsLog)) {
    merged.ganbattaPoints = merged.ganbattaPointsLog.reduce((sum, item) => sum + (Number(item && item.delta) || 0), 0);
  }
  return merged;
}
// 実機のスマホから試したところ3秒では間に合わないことがあったため、他のAPI呼び出しと同じ8秒にし、
// 一度だけ再試行もする（Wi-Fiの瞬断・PowerShellのRunspace起動待ちなどを想定）
const LAN_SYNC_TIMEOUT_MS = 8000;
async function fetchLanSync(url, opts, retries) {
  if (retries == null) retries = 1;
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LAN_SYNC_TIMEOUT_MS);
    try {
      return await fetch(url, { ...opts, signal: controller.signal });
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise(r => setTimeout(r, 400));
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw lastErr;
}
async function runLanSync(opts) {
  opts = opts || {};
  const statusEl = document.getElementById('lanSyncStatus');
  const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };
  const urlInput = document.getElementById('lanSyncUrl');
  const base = ((urlInput && urlInput.value) || '').trim().replace(/\/+$/, '');
  if (!base) {
    if (!opts.silent) setStatus('先にパソコンのアドレスを入力してください');
    return;
  }
  if (!opts.silent) setStatus('同期中…');
  try {
    const getRes = await fetchLanSync(`${base}/api/sync`);
    if (!getRes.ok) throw new Error('get-failed');
    const incoming = await getRes.json();
    const local = buildBackupData();
    const merged = mergeBackupData(local, incoming);
    const changed = JSON.stringify(local) !== JSON.stringify(merged);
    // サーバー側には常に最新の合体結果を書き戻しておく（他の端末が次に取得したときのため）
    await fetchLanSync(`${base}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    });
    LS.set('lanSyncLastAt', Date.now());
    if (changed) {
      applyBackupData(merged);
      // ページ読み込み時の自動（silent）同期でここまで来るたびに毎回reloadすると、
      // 「読み込み→自動同期→reload→読み込み→自動同期→reload…」の無限ループになりかねない
      // （実際にサーバー上のデータが読み込むたびに膨れ上がる不具合として確認された）。
      // 手動で「今すぐ同期」を押したときだけ再読み込みし、自動同期は静かに反映するだけにする
      if (!opts.silent) {
        setStatus('同期して新しい記録を取り込みました。ページを再読み込みします。');
        setTimeout(() => location.reload(), 600);
      }
    } else {
      setStatus(`同期しました（変化なし・${new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}）`);
    }
  } catch (e) {
    if (opts.silent) return;
    // https:// のページ（例：GitHub Pages版）からhttp://のパソコンへ直接アクセスしようとすると、
    // ブラウザのセキュリティ機能（混在コンテンツ・プライベートネットワークアクセス制限）でブロック
    // されることが実際に確認された。この場合は「パソコンが見つからない」のではなく、そもそも
    // ブラウザが通信自体を許可していないので、原因を区別して案内する
    if (location.protocol === 'https:' && base.startsWith('http://')) {
      setStatus('このアドレス（https://…）からは、暗号化なしのパソコンに直接アクセスできない仕様です。スマホでも同じパソコンのアドレスを開いてから同期してください。');
    } else {
      const detail = (e && e.name) ? `（詳細: ${e.name}${e.message ? ' - ' + e.message : ''}）` : '';
      setStatus(`パソコンが見つかりませんでした（同じWi-Fiに繋がっているか、パソコンが起動しているか確認してください）${detail}`);
    }
  }
}
(function initLanSyncUI() {
  const input = document.getElementById('lanSyncUrl');
  const btn = document.getElementById('lanSyncBtn');
  if (!input || !btn) return;
  // パソコンのアドレスは保存しない。ブラウザに残しておきたくないという要望のため、
  // 開き直す（再読み込み・再起動する）たびに欄は空になり、毎回入力し直す必要がある。
  // これに伴い、以前あった「保存済みアドレスがあれば起動時に静かに自動同期」も行わなくなった
  btn.addEventListener('click', () => runLanSync({ silent: false }));
})();

// ============================================================
// 体質チェック
// ============================================================
const checkState = LS.get('check', {}); // {kikyo: Set of indices}
const checkOpenSections = new Set();

function renderCheck() {
  const root = document.getElementById('checkList');
  root.innerHTML = TAISHITSU.map(t => {
    const checked = new Set(checkState[t.id] || []);
    const total = t.checks.length;
    const count = checked.size;
    const items = t.checks.map((c, i) => {
      const on = checked.has(i) ? 'on' : '';
      return `<label class="chip ${on}" data-tid="${t.id}" data-idx="${i}"><input type="checkbox" ${on?'checked':''} hidden>${c}</label>`;
    }).join('');
    return `
    <details class="card" data-sec="${t.id}" ${count>0 || checkOpenSections.has(t.id) ?'open':''}>
      <summary><b>${t.name}</b><span class="kana">（${t.kana}）</span>
        <span class="badge ${count>=5?'hot':''}">${count}/${total}</span>
      </summary>
      <div class="chips">${items}</div>
    </details>`;
  }).join('');

  root.querySelectorAll('details[data-sec]').forEach(det => {
    det.addEventListener('toggle', () => {
      if (det.open) checkOpenSections.add(det.dataset.sec);
      else checkOpenSections.delete(det.dataset.sec);
    });
  });

  root.querySelectorAll('.chip').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const tid = el.dataset.tid, idx = parseInt(el.dataset.idx, 10);
      const set = new Set(checkState[tid] || []);
      set.has(idx) ? set.delete(idx) : set.add(idx);
      checkState[tid] = [...set];
      LS.set('check', checkState);
      renderCheck(); // re-render badge
      renderCheckResult();
    });
  });
  renderCheckResult();
}

function getCheckRanking() {
  return TAISHITSU.map(t => ({
    name: t.name, id: t.id, label: t.label, count: (checkState[t.id] || []).length, total: t.checks.length,
    summary: t.summary, care: t.care, tsubo: t.tsubo, tongue: t.tongue,
  })).filter(r => r.count >= 1).sort((a,b) => b.count - a.count);
}

// 直近に保存された「体質チェック結果を含める」記録を、前回の目安として使う
function getPreviousCheckSnapshot() {
  const withSnap = records
    .filter(r => r.checkSnapshot && r.checkSnapshot.length)
    .sort((a, b) => (a.dateKey + a.time).localeCompare(b.dateKey + b.time));
  return withSnap.length ? withSnap[withSnap.length - 1] : null;
}

function renderCheckResult() {
  const ranked = getCheckRanking();

  const box = document.getElementById('checkResult');
  const jump = document.getElementById('checkResultJump');
  if (!ranked.length) { box.hidden = true; if (jump) jump.hidden = true; return; }
  box.hidden = false;
  if (jump) jump.hidden = false;
  const prevRecord = getPreviousCheckSnapshot();
  box.innerHTML = `
    <h3>近いかもしれない体質</h3>
    <p class="note">今の体からの、小さなサインかもしれません。無理せず、できるところから見てみてください。</p>
    <ul class="rank">
      ${ranked.slice(0,3).map((r,i) => {
        let compareText = '';
        if (prevRecord) {
          const prev = prevRecord.checkSnapshot.find(x => x.name === r.name);
          const prevCount = prev ? prev.count : 0;
          const diff = r.count - prevCount;
          if (diff > 0) compareText = `前回（${prevRecord.dateKey}）より+${diff}`;
          else if (diff < 0) compareText = `前回（${prevRecord.dateKey}）より${diff}`;
          else compareText = `前回（${prevRecord.dateKey}）と変わらず`;
        }
        return `
        <li>
          <div class="rank-head"><span class="medal">${i+1}</span><b>${r.label}</b>
            <span class="kana">（${r.name}）</span>
            <span class="badge ${r.count>=5?'hot':''}">${r.count}/${r.total}</span></div>
          <p class="lead">${r.summary}</p>
          ${compareText ? `<p class="note">📈 ${compareText}</p>` : ''}
          <p class="tongue"><b>舌診の目安:</b> ${escapeHtml(r.tongue)}</p>
          <div><b>ツボ:</b>${tsuboHtml(r.tsubo)}</div>
          <p><b>セルフケア:</b> ${r.care.slice(0,3).join(' / ')}</p>
          <button class="btn-link no-print" onclick="goToCare('${r.name}')">→ ${r.name}のセルフケアを見る</button>
        </li>`;
      }).join('')}
    </ul>
    ${ranked.length > 1 ? `<p class="note">※ いくつかのタイプが重なっていることも多いようです。上位2〜3つを、ゆるく参考にしてみてください。</p>` : ''}
    ${outputBar('checkResult', '体質チェック結果')}
  `;
}

document.getElementById('resetCheck').addEventListener('click', (e) => {
  confirmClick(e.currentTarget, 'もう一度押すとクリア', () => {
    for (const k in checkState) delete checkState[k];
    LS.set('check', checkState);
    renderCheck();
  });
});

// ============================================================
// 症状辞典（逆引き内蔵）
// ============================================================
function renderDict(filter = '') {
  const f = filter.trim();
  const rev = document.getElementById('dictReverse');
  const list = document.getElementById('dictList');

  // 逆引き
  const revMatched = REVERSE.map(g => ({
    ...g,
    items: g.items.filter(x => !f || x.sym.includes(f) || x.cand.includes(f) || g.group.includes(f))
  })).filter(g => g.items.length);

  rev.innerHTML = `<details class="card" ${f?'open':''}>
    <summary><b>症状 → 候補体質（逆引き）</b><span class="badge">${REVERSE.reduce((s,g)=>s+g.items.length,0)}</span></summary>
    ${revMatched.map(g => `
      <div class="rev-group">
        <h4>${g.group}</h4>
        <table class="rev"><tbody>
          ${g.items.map(x => `<tr><td>${highlight(x.sym, f)}</td><td>${highlight(x.cand, f)}</td></tr>`).join('')}
        </tbody></table>
      </div>`).join('')}
  </details>`;

  // 症状辞典
  const matched = SYMPTOMS.filter(s => !f || s.name.includes(f) || s.cat.includes(f) ||
    (s.organ||[]).some(x=>x.includes(f)) || (s.emotion||[]).some(x=>x.includes(f)) ||
    (s.life||[]).some(x=>x.includes(f)) || (s.memo||'').includes(f));

  // カテゴリでグルーピング
  const byCat = {};
  matched.forEach(s => { (byCat[s.cat] = byCat[s.cat] || []).push(s); });

  list.innerHTML = Object.keys(byCat).map(cat => `
    <h3 class="cat-head">${cat}</h3>
    ${byCat[cat].map(s => `
      <details class="card sym" ${f?'open':''}>
        <summary><b>${highlight(s.name, f)}</b><span class="lead">${s.lead}</span></summary>
        <div class="sym-grid">
          <section><h5>内臓・身体</h5><ul>${(s.organ||[]).map(x=>`<li>${highlight(x,f)}</li>`).join('')}</ul></section>
          <section><h5>感情</h5><ul>${(s.emotion||[]).map(x=>`<li>${highlight(x,f)}</li>`).join('')}</ul></section>
          <section><h5>生活習慣</h5><ul>${(s.life||[]).map(x=>`<li>${highlight(x,f)}</li>`).join('')}</ul></section>
          ${s.structure ? `<section><h5>構造・姿勢</h5><ul>${s.structure.map(x=>`<li>${highlight(x,f)}</li>`).join('')}</ul></section>`:''}
        </div>
        <blockquote class="memo">${highlight(s.memo, f)}</blockquote>
      </details>`).join('')}
  `).join('') || `<p class="note">該当なし</p>`;
}

function highlight(text, term) {
  if (!term) return escapeHtml(text);
  const t = escapeHtml(text);
  const re = new RegExp(escapeReg(term), 'g');
  return t.replace(re, m => `<mark>${m}</mark>`);
}
function escapeHtml(s){return s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function escapeReg(s){return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');}

function tsuboHtml(str) {
  return `<ul class="tsubo-list">${str.split(/[・、]/).map(n => {
    const name = n.trim();
    const loc = TSUBO_INFO[name];
    return `<li><b>${escapeHtml(name)}</b>${loc ? `<span class="tsubo-loc">${escapeHtml(loc)}</span>` : ''}</li>`;
  }).join('')}</ul>`;
}

document.getElementById('dictSearch').addEventListener('input', e => renderDict(e.target.value));

// ============================================================
// 体質一覧
// ============================================================
function renderRef(filter = '') {
  const f = filter.trim();
  const root = document.getElementById('refList');
  const matched = TAISHITSU.filter(t => !f || t.name.includes(f) || t.kana.includes(f) || t.summary.includes(f) || t.memo.includes(f));
  root.innerHTML = matched.map(t => `
    <details class="card" ${f?'open':''}>
      <summary><b>${highlight(t.name,f)}</b><span class="kana">（${t.kana}）</span></summary>
      <p class="lead">${highlight(t.summary,f)}</p>
      <div class="ref-grid">
        <div><h5>舌診</h5><p>${t.tongue}</p></div>
        <div><h5>よくある主訴</h5><ul>${t.chief.map(x=>`<li>${x}</li>`).join('')}</ul></div>
        <div><h5>合う食事</h5><p>${t.food_ok}</p></div>
        <div><h5>合わない食事</h5><p>${t.food_ng}</p></div>
        <div><h5>セルフケア</h5><ul>${t.care.map(x=>`<li>${x}</li>`).join('')}</ul></div>
        <div><h5>ツボ</h5>${tsuboHtml(t.tsubo)}</div>
      </div>
      <blockquote class="memo">${highlight(t.memo,f)}</blockquote>
    </details>`).join('') || `<p class="note">該当なし</p>`;
}
document.getElementById('refSearch').addEventListener('input', e => renderRef(e.target.value));

// ============================================================
// コラム
// ============================================================
function renderColumn(filter = '') {
  const f = filter.trim();
  const root = document.getElementById('columnList');
  const matched = COLUMNS.filter(c => !f || c.title.includes(f) || c.body.includes(f));
  root.innerHTML = matched.map(c => `
    <details class="card" ${f?'open':''}>
      <summary><b>${highlight(c.title,f)}</b><span class="lead">${c.date}</span></summary>
      <div style="margin:0 16px 14px;">${c.body}</div>
    </details>`).join('') || `<p class="note">該当なし</p>`;
}
document.getElementById('columnSearch').addEventListener('input', e => renderColumn(e.target.value));

// ============================================================
// 問診シート
// ============================================================
const intakeState = LS.get('intake', {});
let intakeQuickMode = LS.get('intakeQuickMode', false);
const intakeOpenSections = new Set();

function updateQuickModeButton() {
  const btn = document.getElementById('toggleQuickMode');
  if (btn) btn.textContent = intakeQuickMode ? '全部の質問を見る' : '簡単モードにする';
}

function renderIntake() {
  const root = document.getElementById('intakeList');
  if (intakeQuickMode) {
    const qs = [];
    INTAKE.forEach(sec => sec.q.forEach(q => { if (QUICK_INTAKE_KEYS.includes(q.key)) qs.push(q); }));
    root.innerHTML = `
    <p class="note" style="margin:0 0 8px;">全部答えなくても大丈夫。気になるところだけで十分です。</p>
    <details class="card" open>
      <summary><b>簡単モード</b><span class="lead">体調が悪い日・時間がない日向けの${qs.length}問だけ</span></summary>
      ${qs.map(q => renderQuestion(q)).join('')}
    </details>`;
  } else {
    root.innerHTML = INTAKE.map(sec => `
    <details class="card" data-sec="${escapeHtml(sec.sec)}" ${intakeOpenSections.has(sec.sec) ? 'open' : ''}>
      <summary><b>${sec.sec}</b></summary>
      ${sec.q.map(q => renderQuestion(q)).join('')}
    </details>`).join('');
  }

  // 開閉状態を再描画をまたいで保持する
  root.querySelectorAll('details[data-sec]').forEach(det => {
    det.addEventListener('toggle', () => {
      if (det.open) intakeOpenSections.add(det.dataset.sec);
      else intakeOpenSections.delete(det.dataset.sec);
    });
  });

  // bind events
  root.querySelectorAll('[data-qkey]').forEach(el => {
    el.addEventListener('click', e => {
      const key = el.dataset.qkey, type = el.dataset.qtype, val = el.dataset.qval;
      if (type === 'radio') {
        intakeState[key] = (intakeState[key] === val) ? null : val;
      } else if (type === 'multi') {
        const prev = intakeState[key];
        const arr = Array.isArray(prev) ? prev : (prev ? [prev] : []);
        const set = new Set(arr);
        set.has(val) ? set.delete(val) : set.add(val);
        intakeState[key] = [...set];
      } else if (type === 'scale') {
        intakeState[key] = parseInt(val, 10);
      }
      LS.set('intake', intakeState);
      renderIntake();
    });
  });

  renderIntakeResult();
}

function renderQuestion(q) {
  if (q.type === 'scale') {
    const cur = intakeState[q.key] || 0;
    const cells = Array.from({length:q.max}, (_,i) => {
      const v = i+1;
      return `<button class="scale-cell ${cur>=v?'on':''}" data-qkey="${q.key}" data-qtype="scale" data-qval="${v}">${v}</button>`;
    }).join('');
    return `<div class="q"><label>${q.label}</label><div class="scale">${cells}</div></div>`;
  }
  const sel = intakeState[q.key];
  const cells = q.opts.map(o => {
    const on = q.type === 'radio' ? (sel === o) : (Array.isArray(sel) && sel.includes(o));
    return `<label class="chip ${on?'on':''}" data-qkey="${q.key}" data-qtype="${q.type}" data-qval="${escapeHtml(o)}">${o}</label>`;
  }).join('');
  return `<div class="q"><label>${q.label}</label><div class="chips">${cells}</div></div>`;
}

// 問診の回答から体質スコアを計算し、上位3件を返す（結果表示・記録の記録スナップショットの両方から使う）
function computeIntakeRanked() {
  const scores = {};
  const reasons = {}; // id -> [{ans, pts}] 判定根拠
  TAISHITSU.forEach(t => { scores[t.id] = 0; reasons[t.id] = []; });
  INTAKE.forEach(sec => sec.q.forEach(q => {
    const v = intakeState[q.key]; if (!v) return;
    const vals = Array.isArray(v) ? v : [v];
    vals.forEach(x => {
      const m = SCORE_MAP[`${q.key}:${x}`];
      if (m) for (const id in m) {
        scores[id] = (scores[id]||0) + m[id];
        reasons[id].push({ ans: x, pts: m[id] });
      }
    });
  }));
  SCORE_SCALE.forEach(rule => {
    const v = intakeState[rule.key];
    const hit = (rule.th != null && v >= rule.th) || (rule.max != null && v && v <= rule.max);
    if (hit) for (const id in rule.score) {
      scores[id] += rule.score[id];
      reasons[id].push({ ans: `${rule.key.replace(/^[A-Z]\d_/, '')}=${v}`, pts: rule.score[id] });
    }
  });
  return Object.entries(scores)
    .filter(([,s]) => s >= 2)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, s]) => {
      const t = TAISHITSU.find(x => x.id === id);
      const c = CARE_TAISHITSU.find(x => x.name === t.name);
      return {id, name:t.name, kana:t.kana, label:t.label, summary:t.summary, score:s, tsubo:t.tsubo, care:c, tongue:t.tongue, reasons:reasons[id]};
    });
}

// 記録に含める用の軽量な問診スナップショット
function getIntakeRanking() {
  return computeIntakeRanked().map(r => ({ id:r.id, name:r.name, kana:r.kana, score:r.score }));
}

function renderIntakeResult() {
  const hints = [];
  INTAKE.forEach(sec => sec.q.forEach(q => {
    if (!q.hints) return;
    const v = intakeState[q.key];
    if (Array.isArray(v)) v.forEach(x => { if (q.hints[x]) hints.push({sec:sec.sec, q:q.label, ans:x, hint:q.hints[x]}); });
    else if (typeof v === 'string' && q.hints[v]) hints.push({sec:sec.sec, q:q.label, ans:v, hint:q.hints[v]});
  }));
  // scale-based hints
  const stress = intakeState['F1_レベル']; if (stress >= 7) hints.push({sec:'F. ストレス', q:'ストレスレベル', ans:String(stress), hint:'ストレスが高めのようです。副腎・自律神経・横隔膜のあたりを見てあげるとよさそうです'});
  const cold = intakeState['E1_強さ']; if (cold >= 7) hints.push({sec:'E. 冷え', q:'冷えの強さ', ans:String(cold), hint:'冷えが強めのようです。陽虚・腎虚・脾虚と関係することがあるかも'});
  const sleep = intakeState['B2_寝つき']; if (sleep && sleep <= 4) hints.push({sec:'B. 睡眠', q:'寝つきの悪さ', ans:String(sleep), hint:'交感神経が優位になりやすく、肝が少し高ぶりやすいのかも'});

  const ranked = computeIntakeRanked();

  // ---- 個別おすすめセルフケア（特定回答に基づく）----
  const extras = EXTRA_CARE.filter(r => { try { return r.trigger(intakeState); } catch { return false; } });

  const box = document.getElementById('intakeResult');
  const jump = document.getElementById('intakeResultJump');
  if (!hints.length && !ranked.length && !extras.length) { box.hidden = true; if (jump) jump.hidden = true; return; }
  box.hidden = false;
  if (jump) jump.hidden = false;
  box.innerHTML = `
    ${hints.length ? `
      <h3>気づいたこと</h3>
      <ul class="hint-list">
        ${hints.map(h => `<li><span class="tag">${h.sec}</span><b>${h.ans}</b> → ${h.hint}</li>`).join('')}
      </ul>` : ''}
    ${ranked.length ? `
      <h3 style="margin-top:14px;">近いかもしれない体質</h3>
      <p class="note">今の体からの、小さなサインかもしれません。無理せず、できるところから見てみてください。</p>
      <ul class="rank">
        ${ranked.map((r,i) => `
          <li>
            <div class="rank-head"><span class="medal">${i+1}</span><b>${r.label}</b>
              <span class="kana">（${r.name}）</span>
              <span class="badge ${r.score>=4?'hot':''}">${r.score}点</span></div>
            <p class="lead">${r.summary}</p>
            <p class="tongue"><b>舌診の目安:</b> ${escapeHtml(r.tongue)}</p>
            <div><b>ツボ:</b>${tsuboHtml(r.tsubo)}</div>
            ${r.reasons && r.reasons.length ? `
            <details class="reason"><summary class="hint">そう感じた理由（${r.reasons.length}件）</summary>
              <ul class="reason-list">${r.reasons.map(x=>`<li>${escapeHtml(x.ans)} <span class="pts">+${x.pts}</span></li>`).join('')}</ul>
            </details>` : ''}
            <button class="btn-link no-print" onclick="goToCare('${r.name}')">→ ${r.name}のセルフケアを見る</button>
          </li>`).join('')}
      </ul>
      <h3 style="margin-top:14px;">おすすめのセルフケア（まずは1つ）</h3>
      <ul class="rank">
        ${ranked.map(r => r.care ? `
          <li>
            <div class="rank-head"><b>${r.name}</b><span class="kana">かもしれない人へ</span></div>
            <p><b>💖 ${r.care.best}</b></p>
            <p class="note">${r.care.why}</p>
            <details style="margin-top:6px;">
              <summary class="hint">その他のセルフケアを見る</summary>
              <ul class="care-list" style="margin:6px 0 0;">${r.care.list.map(l=>`<li>${l}</li>`).join('')}</ul>
            </details>
          </li>` : '').join('')}
      </ul>
      <p class="note">※ いくつかのタイプが重なっていることも多いようです。上位2〜3つを、ゆるく参考にしてみてください</p>
    ` : ''}
    ${extras.length ? `
      <h3 style="margin-top:14px;">生活習慣からの、追加のセルフケア</h3>
      <ul class="rank">
        ${extras.map(e => `
          <li>
            <p><b>💝 ${escapeHtml(e.title)}</b></p>
            <p class="note">${escapeHtml(e.why)}</p>
          </li>`).join('')}
      </ul>` : ''}
    ${outputBar('intakeResult', '問診結果')}
  `;
}

document.getElementById('resetIntake').addEventListener('click', (e) => {
  confirmClick(e.currentTarget, 'もう一度押すとクリア', () => {
    for (const k in intakeState) delete intakeState[k];
    LS.set('intake', intakeState);
    renderIntake();
  });
});

document.getElementById('toggleQuickMode').addEventListener('click', () => {
  intakeQuickMode = !intakeQuickMode;
  LS.set('intakeQuickMode', intakeQuickMode);
  updateQuickModeButton();
  renderIntake();
});
updateQuickModeButton();

// ============================================================
// セルフケア
// ============================================================
let careSeg = 'taishitsu';
let careFilter = '';

function renderCare() {
  const root = document.getElementById('careList');
  const f = careFilter.trim();
  const hl = (t) => highlight(t, f);

  if (careSeg === 'taishitsu') {
    const list = CARE_TAISHITSU.filter(x => !f || x.name.includes(f) || x.sub.includes(f) || x.aim.includes(f) || x.list.some(l=>l.includes(f)) || x.best.includes(f));
    root.innerHTML = list.map(x => `
      <details class="card" ${f?'open':''}>
        <summary><b>${hl(x.name)}</b><span class="kana">${hl(x.sub)}</span></summary>
        <p class="lead"><b>狙い：</b>${hl(x.aim)}</p>
        <ul class="care-list">${x.list.map(l=>`<li>${hl(l)}</li>`).join('')}</ul>
        <blockquote class="memo"><b>一番効く1個：</b>${hl(x.best)}<br><span class="note">${hl(x.why)}</span></blockquote>
      </details>`).join('') || `<p class="note">該当なし</p>`;
  } else if (careSeg === 'type') {
    const list = CARE_TYPE.filter(x => !f || x.name.includes(f) || x.signs.includes(f) || x.list.some(l=>l.includes(f)) || x.best.includes(f));
    root.innerHTML = list.map(x => `
      <details class="card" ${f?'open':''}>
        <summary><b>${hl(x.name)}</b></summary>
        <p class="lead"><b>見分け方：</b>${hl(x.signs)}</p>
        <ul class="care-list">${x.list.map(l=>`<li>${hl(l)}</li>`).join('')}</ul>
        <blockquote class="memo"><b>一番効く1個：</b>${hl(x.best)}<br><span class="note">${hl(x.why)}</span></blockquote>
      </details>`).join('') || `<p class="note">該当なし</p>`;
  } else if (careSeg === 'scene') {
    const list = CARE_SCENE.map(g => ({
      ...g,
      items: g.items.filter(x => !f || x.do.includes(f) || x.eff.includes(f) || x.tgt.includes(f) || g.scene.includes(f))
    })).filter(g => g.items.length);
    root.innerHTML = list.map(g => `
      <details class="card" open>
        <summary><b>${g.scene}</b><span class="badge">${g.items.length}</span></summary>
        <table class="rev"><thead><tr><th>行動</th><th>効果</th><th>対象</th></tr></thead><tbody>
          ${g.items.map(x => `<tr><td>${hl(x.do)}</td><td>${hl(x.eff)}</td><td>${hl(x.tgt)}</td></tr>`).join('')}
        </tbody></table>
      </details>`).join('') || `<p class="note">該当なし</p>`;
  } 
}

document.querySelectorAll('#careSeg .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#careSeg .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    careSeg = btn.dataset.seg;
    renderCare();
  });
});
document.getElementById('careSearch').addEventListener('input', e => { careFilter = e.target.value; renderCare(); });


// ============================================================
// 記録カレンダー
// ============================================================
const records = LS.get('records', []);
let calMonth = new Date(); calMonth.setDate(1);
let selectedDate = null;
let recordSeg = 'calendar';

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function saveRecords() { LS.set('records', records); }

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('no-geo')); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve(pos.coords),
      err => reject(err),
      { timeout: 10000 }
    );
  });
}

// 気温・気圧・風速・降水量を取得し、大雨/台風/線状降水帯の「目安」を簡易判定する。
// 線状降水帯・台風の公式検知APIは一般公開されていないため、
// 気圧・風速・降水量のしきい値による近似値であることをUI側で明記する。
// dateKey（YYYY-MM-DD）・timeStr（HH:MM）を指定すると、その日時に一番近い時間の記録を取得する
// （今日の場合も含め、常にhourlyから該当時刻を拾うことで「記録した時点」の天気にする）。
async function fetchWeatherAt(lat, lon, dateKey, timeStr) {
  // 3時間前の気圧も拾えるよう、前日分も含めて取得する
  const [y, m, d] = dateKey.split('-').map(Number);
  const prevDateKey = todayKey(new Date(y, m - 1, d - 1));
  // 気圧はsurface_pressure（その場所の標高そのままの気圧）ではなくpressure_msl（海面更正気圧）を使う。
  // 頭痛ーる・windy.com・気象庁の発表などは軒並み海面更正気圧を表示しており、surface_pressureのままでは
  // 標高の分だけ常に低い値になり、「他アプリと数値が明らかに違う」という不安の原因になっていた
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,pressure_msl,wind_speed_10m,precipitation,weather_code,relative_humidity_2m` +
    `&start_date=${prevDateKey}&end_date=${dateKey}` +
    `&wind_speed_unit=ms&timezone=Asia%2FTokyo`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('weather-fetch-failed');
  const j = await res.json();
  const times = j.hourly && j.hourly.time;
  if (!times || !times.length) throw new Error('weather-no-data');
  const targetHour = (timeStr || '12:00').split(':')[0].padStart(2, '0');
  let idx = times.indexOf(`${dateKey}T${targetHour}:00`);
  if (idx < 0) idx = times.length - 1;
  const precipitation = j.hourly.precipitation?.[idx] ?? null;
  const pressure = j.hourly.pressure_msl?.[idx] ?? null;
  const windSpeed = j.hourly.wind_speed_10m?.[idx] ?? null;
  const humidity = j.hourly.relative_humidity_2m?.[idx] ?? null;
  const pressure3hAgo = idx >= 3 ? j.hourly.pressure_msl?.[idx - 3] ?? null : null;
  const pressureChange3h = (pressure != null && pressure3hAgo != null) ? pressure - pressure3hAgo : null;
  // 猛暑日・強風などは「記録した瞬間」より「その日の最大値」で判定した方が実態に近いため、
  // 記録日（dateKey）のうち取得できた時間帯の最大値を別途集計する
  const dayIdxs = times.map((t, i) => i).filter(i => times[i].startsWith(dateKey));
  const dayMax = arr => {
    const vals = dayIdxs.map(i => arr?.[i]).filter(v => v != null);
    return vals.length ? Math.max(...vals) : null;
  };
  const dayMaxTemp = dayMax(j.hourly.temperature_2m);
  const dayMaxHumidity = dayMax(j.hourly.relative_humidity_2m);
  const dayMaxWind = dayMax(j.hourly.wind_speed_10m);
  return {
    temp: j.hourly.temperature_2m?.[idx] ?? null,
    pressure, windSpeed, precipitation, humidity, pressureChange3h,
    dayMaxTemp, dayMaxHumidity, dayMaxWind,
    weatherCode: j.hourly.weather_code?.[idx] ?? null,
    heavyRainFlag: precipitation != null && precipitation >= 30,
    linearRainbandFlag: precipitation != null && precipitation >= 50,
    typhoonFlag: pressure != null && windSpeed != null && pressure < 990 && windSpeed >= 15,
    pressureDropFlag: pressureChange3h != null && pressureChange3h <= -3,
    extremeHeatFlag: dayMaxTemp != null && dayMaxTemp >= 35, // 猛暑日（気象庁の定義：日最高気温35℃以上）の目安
    highHumidityFlag: dayMaxHumidity != null && dayMaxHumidity >= 80, // 高湿度（蒸し暑さ）の目安
    strongWindFlag: dayMaxWind != null && dayMaxWind >= 10, // 強風の目安（台風によらない強風も含む）
    status: 'ok',
  };
}

// ---------- 気象庁 公式警報・注意報・特別警報の取得 ----------
// 降水量からの自前推定（目安）だけでなく、気象庁が実際に発表している警報・注意報そのものを取得する。
// 現在地の緯度経度 → 市区町村コード（国土地理院 逆ジオコーディング、キー不要）
// → 気象庁の警報区域コード（area.jsonの階層をたどって解決）→ 警報・注意報JSON、という流れで取得する。
//
// コード表は気象庁防災情報XMLの公式コード管理表（xml.kishou.go.jp 掲載の「警報等情報要素コード管理表」
// code.WeatherWarning）にもとづく。以前は大雨・暴風・波浪・高潮まわりの13種類しか登録しておらず、
// 雷注意報・強風注意報・波浪注意報・濃霧注意報など、それ以外の「いろんな注意報・警報」は無言で捨てられていた
// （JMA_WARNING_CODE_MEANING[code]がundefinedになり.filter(Boolean)で消える）。ここでは公式コード表の
// 全項目（暴風雪・大雨・洪水・暴風・大雪・波浪・高潮・土砂災害・雷・強風・融雪・濃霧・乾燥・なだれ・低温・霜・
// 着氷・着雪の各警報/注意報/特別警報/危険警報）を登録し、発表中のものをすべて拾えるようにする。
const JMA_WARNING_CODE_MEANING = {
  '02': { label: '暴風雪警報', kind: 'stormsnow', level: 2 },
  '03': { label: '大雨警報', kind: 'rain', level: 2 },
  '04': { label: '洪水警報', kind: 'rain', level: 2 },
  '05': { label: '暴風警報', kind: 'storm', level: 2 },
  '06': { label: '大雪警報', kind: 'snow', level: 2 },
  '07': { label: '波浪警報', kind: 'wave', level: 2 },
  '08': { label: '高潮警報', kind: 'surge', level: 2 },
  '09': { label: '土砂災害警報', kind: 'landslide', level: 2 },
  '10': { label: '大雨注意報', kind: 'rain', level: 1 },
  '12': { label: '大雪注意報', kind: 'snow', level: 1 },
  '13': { label: '風雪注意報', kind: 'stormsnow', level: 1 },
  '14': { label: '雷注意報', kind: 'thunder', level: 1 },
  '15': { label: '強風注意報', kind: 'wind', level: 1 },
  '16': { label: '波浪注意報', kind: 'wave', level: 1 },
  '17': { label: '融雪注意報', kind: 'snowmelt', level: 1 },
  '18': { label: '洪水注意報', kind: 'rain', level: 1 },
  '19': { label: '高潮注意報', kind: 'surge', level: 1 },
  '20': { label: '濃霧注意報', kind: 'fog', level: 1 },
  '21': { label: '乾燥注意報', kind: 'dry', level: 1 },
  '22': { label: 'なだれ注意報', kind: 'avalanche', level: 1 },
  '23': { label: '低温注意報', kind: 'coldtemp', level: 1 },
  '24': { label: '霜注意報', kind: 'frost', level: 1 },
  '25': { label: '着氷注意報', kind: 'icing', level: 1 },
  '26': { label: '着雪注意報', kind: 'snowsticking', level: 1 },
  '29': { label: '土砂災害注意報', kind: 'landslide', level: 1 },
  '32': { label: '暴風雪特別警報', kind: 'stormsnow', level: 4 },
  '33': { label: '大雨特別警報', kind: 'rain', level: 4 },
  '35': { label: '暴風特別警報', kind: 'storm', level: 4 },
  '36': { label: '大雪特別警報', kind: 'snow', level: 4 },
  '37': { label: '波浪特別警報', kind: 'wave', level: 4 },
  '38': { label: '高潮特別警報', kind: 'surge', level: 4 },
  '39': { label: '土砂災害特別警報', kind: 'landslide', level: 4 },
  '43': { label: '大雨危険警報', kind: 'rain', level: 3 },
  '48': { label: '高潮危険警報', kind: 'surge', level: 3 },
  '49': { label: '土砂災害危険警報', kind: 'landslide', level: 3 },
};

// 何度か同じ形の失敗をする外部API（GSI・気象庁とも一時的なタイムアウト/瞬断がある）向けの、
// 1回だけ短い間隔を置いて再試行するfetch。「取れないときは無言で諦める」をやめ、瞬断だけでも拾う
async function fetchWithRetry(url, opts) {
  const retries = (opts && opts.retries) != null ? opts.retries : 1;
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('http-' + res.status);
      return res;
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise(r => setTimeout(r, 600));
    }
  }
  throw lastErr;
}

let jmaAreaMasterCache = null;
async function loadJmaAreaMaster() {
  if (jmaAreaMasterCache) return jmaAreaMasterCache;
  const cached = LS.get('jmaAreaMaster', null);
  if (cached && cached.fetchedAt && (Date.now() - cached.fetchedAt) < 30 * 24 * 60 * 60 * 1000) {
    jmaAreaMasterCache = cached.data;
    return jmaAreaMasterCache;
  }
  let res;
  try { res = await fetchWithRetry('https://www.jma.go.jp/bosai/common/const/area.json'); }
  catch (e) { const err = new Error('jma-area-master-failed'); err.stage = 'area-master'; throw err; }
  const data = await res.json();
  jmaAreaMasterCache = data;
  try { LS.set('jmaAreaMaster', { fetchedAt: Date.now(), data }); } catch { /* 保存容量超過などは無視 */ }
  return data;
}

// 緯度経度 → 市区町村コード（国土地理院 逆ジオコーディングAPI。無料・キー不要の公的機関提供API）
async function reverseGeocodeMuniCd(lat, lon) {
  let res;
  try { res = await fetchWithRetry(`https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lon=${lon}&lat=${lat}`); }
  catch (e) { const err = new Error('gsi-geocode-failed'); err.stage = 'geocode'; throw err; }
  const j = await res.json();
  const muniCd = j.results && j.results.muniCd;
  if (!muniCd) { const err = new Error('gsi-geocode-no-result'); err.stage = 'geocode'; throw err; }
  return muniCd;
}

// 市区町村コード → 気象庁の警報区域コード（area.jsonの class20→class15→class10→office をたどる）
// 政令指定都市の区（例: 札幌市中央区）は警報区域としては市単位でまとめられているため、
// 区コードそのものが無ければ市レベルのコード（先頭3桁+0000）にフォールバックする
function resolveJmaArea(areaMaster, muniCd) {
  const exact = muniCd + '00';
  let class20Code = areaMaster.class20s[exact] ? exact : null;
  if (!class20Code) {
    const cityLevel = muniCd.slice(0, 3) + '0000';
    if (areaMaster.class20s[cityLevel]) class20Code = cityLevel;
  }
  if (!class20Code) return null;
  const class20 = areaMaster.class20s[class20Code];
  const class15Code = class20.parent;
  const class15 = areaMaster.class15s[class15Code];
  if (!class15) return null;
  const class10Code = class15.parent;
  const class10 = areaMaster.class10s[class10Code];
  if (!class10) return null;
  const officeCode = class10.parent;
  if (!areaMaster.offices[officeCode]) return null;
  return { officeCode, class20Code, class10Code, areaName: class20.name };
}

// 大雨危険警報・大雨特別警報の発表（公式な代替指標）に加えて、同じレスポンスに含まれるheadlineText
// （気象庁が発表する見出し文そのもの）に「顕著な大雨」「線状降水帯」という言葉が入っていないかも確認する。
// 見出し文は気象庁が実際に発表した文章そのものなので、危険警報級に達していない・警報区域の粒度がずれている、
// といった理由で他の判定が漏れた場合でも、見出しに含まれていれば確実に拾える
// （「線状降水帯が発生しました」という発表そのものは、下のfetchLinearRainbandInfo()の専用フィードで
// 確実に拾えるようになったが、こちらの見出し文チェックもフォールバックとして残す）
function detectLinearRainbandFromHeadline(headlineText) {
  return /顕著な大雨|線状降水帯/.test(headlineText || '');
}

// 「線状降水帯が発生しました」「線状降水帯の発生が直前に予想されます」という気象庁の公式発表は、
// ニュースでは見かけるのに気象庁サイトのどこで見られるのか分かりにくい（ユーザー自身が調べても
// 見つけられなかった）。実際には単独のページやAPIがあるわけではなく、気象庁の統合地図ページの
// 「気象情報」レイヤー（map.html#.../&elem=senjouinfo）が使っている、ありとあらゆる種類の気象情報
// （高温・少雨・台風解説・記録的短時間大雨…）を時系列にまとめた1本のログの中に、infoTagが
// 「線状降水帯直前」「線状降水帯発生」になっているものとして混ざって入っている
// このログ全体で使われている「valid」は、この情報種別に関わらず一律「発表から1週間」を機械的に
// 入れているだけで（実際に確認：線状降水帯直前予測でもreportDatetimeのちょうど7日後になっていた）、
// 「まだ線状降水帯が続いている」ことを意味しない。直前予測は文字通り数時間先の話でしかなく、発生の
// 発表も普通は数時間で収まるため、validではなく発表時刻からの経過時間で「今のもの」かどうかを判断する
const LINEAR_RAINBAND_FRESH_MS = { chokuzen: 3 * 60 * 60 * 1000, hassei: 6 * 60 * 60 * 1000 };
let jmaLinearRainbandCache = null;
async function fetchLinearRainbandInfo(force) {
  if (!force && jmaLinearRainbandCache && (Date.now() - jmaLinearRainbandCache.fetchedAt) < 10 * 60 * 1000) return jmaLinearRainbandCache.data;
  let res;
  try { res = await fetchWithRetry('https://www.jma.go.jp/bosai/information/data/r8/information.json'); }
  catch (e) { const err = new Error('jma-linear-rainband-failed'); err.stage = 'linear-rainband-fetch'; throw err; }
  const arr = await res.json();
  const now = Date.now();
  const active = arr
    .map(entry => {
      const tag = (entry.infoTag || []).find(t => t.condition && t.condition.includes('線状降水帯'));
      if (!tag) return null;
      const kind = tag.condition.includes('発生') ? 'hassei' : 'chokuzen'; // 発生 or 直前予測
      const reportAt = new Date(entry.reportDatetime).getTime();
      if (!reportAt || (now - reportAt) > LINEAR_RAINBAND_FRESH_MS[kind]) return null; // 発表からしばらく経ったものは除外
      return {
        kind,
        officeCode: entry.areaCode,
        areaNames: (entry.areaTag || []).map(a => a.name),
        areaCodes: (entry.areaTag || []).map(a => a.code),
        reportDatetime: entry.reportDatetime,
        targetDatetime: entry.targetDatetime,
      };
    })
    .filter(Boolean);
  const data = { fetchedAt: now, active };
  jmaLinearRainbandCache = { fetchedAt: now, data };
  return data;
}

// 気象庁の地方ごとの個別JSON（旧: /bosai/warning/data/warning/{officeCode}.json）は、実際には
// 更新が止まっている地域があることが判明した（例：岐阜県のJSONが2026年5月の「注意報解除」情報の
// まま止まっており、実際には大雨危険警報・土砂災害危険警報級の状況が出ていても一切反映されなかった。
// 気象庁の警報・注意報ページ自体が今使っているデータで確認して発覚）。気象庁のサイトが実際に使っている
// 新しいデータ（/bosai/warning/data/r8/map.json）に切り替える。
//
// この1ファイルは全国ぶんの「発表イベント」を時系列で並べたログで、同じ地域が何度も登場する。
// 重要な点として、1件のイベントは「その時点で新たに変化した警報等の種類だけ」を載せている
// （例：大雨危険警報の発表イベントと、その後の土砂災害危険警報の発表イベントは別々のログ行になり、
// 後者には大雨の情報が含まれない）。そのため「地域ごとに一番新しい1件だけ採用する」と、複数の
// 警報が同時に発表されている場合に後から出た方しか拾えなくなる不具合になる（実際に確認：岐阜県で
// 大雨危険警報と土砂災害危険警報が両方発表中なのに、後発の土砂災害の行しか採用されず、土砂災害は
// このサイトの方針で除外しているため結果的に「岐阜は何も出ていない」ことになっていた）。
// 正しくは、地域×警報コードごとに時系列で状態を再生し、最後に「解除」されていない警報コードだけを
// 「今アクティブなもの」として残す必要がある
let jmaWarningMapCache = null;
async function loadJmaWarningMap(force) {
  if (!force && jmaWarningMapCache && (Date.now() - jmaWarningMapCache.fetchedAt) < 10 * 60 * 1000) return jmaWarningMapCache;
  let res;
  try { res = await fetchWithRetry('https://www.jma.go.jp/bosai/warning/data/r8/map.json'); }
  catch (e) { const err = new Error('jma-warning-map-failed'); err.stage = 'warning-fetch'; throw err; }
  const arr = await res.json();
  // 時系列順（古い→新しい）に再生する必要があるので、まずcontrolDatetime昇順に並べる
  const sorted = [...arr].sort((a, b) => (a.controlDatetime < b.controlDatetime ? -1 : 1));
  // areaCode -> { activeKinds: Map<code, kindObj>, headlineText, controlDatetime(最新) }
  const stateByArea = new Map();
  sorted.forEach(entry => {
    const cd = entry.controlDatetime;
    ['class10Items', 'class20Items'].forEach(field => {
      ((entry.warning && entry.warning[field]) || []).forEach(item => {
        let state = stateByArea.get(item.areaCode);
        if (!state) { state = { activeKinds: new Map(), headlineText: null, controlDatetime: cd }; stateByArea.set(item.areaCode, state); }
        (item.kinds || []).forEach(k => {
          if (!k.code) {
            // code無し（「発表警報・注意報はなし」等）は、その地域の警報等が一括で解除されたことを示す
            state.activeKinds.clear();
          } else if (k.status === '解除') {
            state.activeKinds.delete(k.code);
          } else {
            state.activeKinds.set(k.code, k);
          }
        });
        state.headlineText = entry.headlineText || state.headlineText;
        state.controlDatetime = cd;
      });
    });
  });
  jmaWarningMapCache = { fetchedAt: Date.now(), stateByArea };
  return jmaWarningMapCache;
}
// 指定した地域コードの「今、発表中のもの」を取り出す。土砂災害は体調との関連というこのサイトの
// 主旨から外れるため、そもそも集計に含めない
function activeInfosForArea(stateByArea, areaCode) {
  const state = stateByArea.get(areaCode);
  if (!state) return { infos: [], headlineText: null };
  const infos = [...state.activeKinds.values()]
    .map(k => JMA_WARNING_CODE_MEANING[k.code])
    .filter(Boolean)
    .filter(i => i.kind !== 'landslide');
  return { infos, headlineText: state.headlineText };
}
async function fetchOfficialAlerts(lat, lon) {
  const areaMaster = await loadJmaAreaMaster();
  const muniCd = await reverseGeocodeMuniCd(lat, lon);
  const resolved = resolveJmaArea(areaMaster, muniCd);
  if (!resolved) { const err = new Error('jma-area-resolve-failed'); err.stage = 'area-resolve'; throw err; }
  const [map, rainbandInfo] = await Promise.all([
    loadJmaWarningMap(),
    fetchLinearRainbandInfo().catch(() => null), // 失敗しても見出し文の判定だけで続行する
  ]);
  // 細かい区域（class20）にデータがあればそちらを優先し、無ければ大きい区域（class10）を使う
  let { infos, headlineText } = activeInfosForArea(map.stateByArea, resolved.class20Code);
  if (!infos.length) {
    const wider = activeInfosForArea(map.stateByArea, resolved.class10Code);
    infos = wider.infos;
    headlineText = headlineText || wider.headlineText;
  }
  // 種類（kind）ごとに、いちばんレベルの高いものだけを残す（同じ種類の警報・特別警報が両方に出ることがあるため）
  const byKind = {};
  infos.forEach(i => { if (!byKind[i.kind] || i.level > byKind[i.kind].level) byKind[i.kind] = i; });
  const allActive = Object.values(byKind).sort((a, b) => b.level - a.level);
  const topOf = kind => byKind[kind] || null;
  const rain = topOf('rain');
  const storm = topOf('storm');
  const headlineHasRainband = detectLinearRainbandFromHeadline(headlineText);
  // 「線状降水帯が発生しました／直前に予想されます」の公式発表そのもの（fetchLinearRainbandInfo）が
  // この地域（府県単位 or 細分区域単位）に出ていれば、見出し文の推測より確実な情報として別途持たせる
  const linearRainbandAnnounced = rainbandInfo
    ? rainbandInfo.active
        .filter(a => a.officeCode === resolved.officeCode || a.areaCodes.includes(resolved.class10Code))
        .sort((a, b) => new Date(b.reportDatetime) - new Date(a.reportDatetime))[0] || null
    : null;
  return {
    areaName: resolved.areaName,
    rainLevel: rain ? rain.level : 0, rainLabel: rain ? rain.label : null,
    stormLevel: storm ? storm.level : 0, stormLabel: storm ? storm.label : null,
    // 大雨危険警報・大雨特別警報（代替指標）、見出し文に「線状降水帯」「顕著な大雨」の記載、
    // または公式発表そのものが出ていれば true
    linearRainbandLikely: (!!rain && rain.level >= 3) || headlineHasRainband || !!linearRainbandAnnounced,
    linearRainbandAnnounced, // 公式発表そのもの（あれば）。{ kind: 'hassei'|'chokuzen', areaNames, reportDatetime }
    headlineText: headlineText || null,
    allActive, // rain/storm以外も含む、現在発表中のすべての警報・注意報・特別警報（レベル降順）
    otherActive: allActive.filter(i => i.kind !== 'rain' && i.kind !== 'storm'),
    reportDatetime: (map.stateByArea.get(resolved.class20Code) || map.stateByArea.get(resolved.class10Code) || {}).controlDatetime || null,
    status: 'ok',
  };
}

// ---------- 全国の警報・注意報一覧 ----------
// 現在地だけでなく日本全国の状況もまとめて見たい、という要望から追加。loadJmaWarningMap()が
// 全国ぶんの発表状況を1回の取得でまとめて持っているので、地方（office）ごとに管轄区域
// （area.jsonのoffices[code].children、細分区域コードの配列）を集計するだけでよい
// （以前は地方の数だけ個別リクエストしていたが、全国1ファイルの取得だけで済むようになった）
const NATIONWIDE_ALERT_CACHE_TTL = 20 * 60 * 1000;
function summarizeOfficeFromMap(officeCode, officeName, children, stateByArea, rainbandAnnounced) {
  const allInfos = [];
  let headlineText = null;
  (children || []).forEach(childCode => {
    const { infos, headlineText: h } = activeInfosForArea(stateByArea, childCode);
    allInfos.push(...infos);
    if (h && !headlineText) headlineText = h;
  });
  const byKind = {};
  allInfos.forEach(i => { if (!byKind[i.kind] || i.level > byKind[i.kind].level) byKind[i.kind] = i; });
  const top = Object.values(byKind).sort((a, b) => b.level - a.level);
  const linearRainbandLikely = (byKind.rain && byKind.rain.level >= 3) || detectLinearRainbandFromHeadline(headlineText) || !!rainbandAnnounced;
  return { officeCode, officeName, top, linearRainbandLikely, rainbandAnnounced, headlineText };
}
async function fetchNationwideAlerts(force) {
  if (!force) {
    const cached = LS.get('nationwideAlertCache', null);
    if (cached && cached.fetchedAt && (Date.now() - cached.fetchedAt) < NATIONWIDE_ALERT_CACHE_TTL) return cached.data;
  }
  const areaMaster = await loadJmaAreaMaster();
  const [map, rainbandInfo] = await Promise.all([
    loadJmaWarningMap(force),
    fetchLinearRainbandInfo(force).catch(() => null), // 失敗しても警報・注意報の集計だけで続行する
  ]);
  // 地方（office）ごとに、いちばん新しい「線状降水帯発生／直前予測」の発表を1件だけ紐付ける
  const rainbandByOffice = new Map();
  if (rainbandInfo) rainbandInfo.active.forEach(a => {
    const prev = rainbandByOffice.get(a.officeCode);
    if (!prev || new Date(a.reportDatetime) > new Date(prev.reportDatetime)) rainbandByOffice.set(a.officeCode, a);
  });
  const results = Object.entries(areaMaster.offices)
    .map(([code, o]) => summarizeOfficeFromMap(code, o.name, o.children, map.stateByArea, rainbandByOffice.get(code) || null));
  const maxLevel = r => Math.max(0, ...r.top.map(i => i.level));
  const notable = results
    .filter(r => maxLevel(r) >= 2 || r.linearRainbandLikely)
    .sort((a, b) => maxLevel(b) - maxLevel(a));
  const data = { fetchedAt: Date.now(), notable, totalChecked: results.length };
  try { LS.set('nationwideAlertCache', { fetchedAt: data.fetchedAt, data }); } catch { /* 保存容量超過などは無視 */ }
  return data;
}
async function runNationwideAlertCheck(force) {
  const resultEl = document.getElementById('nationwideAlertResult');
  if (!resultEl) return;
  resultEl.textContent = '全国の警報・注意報を確認中…（少し時間がかかります）';
  try {
    const data = await fetchNationwideAlerts(force);
    const stamp = `${new Date(data.fetchedAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}時点・全国${data.totalChecked}地方より`;
    if (!data.notable.length) {
      resultEl.textContent = `✅ 現在、警報級以上の発表がある地方はありません（${stamp}）`;
      return;
    }
    const icon = lv => lv >= 4 ? htmlEmojiImg('1f534', '🔴') : lv >= 3 ? htmlEmojiImg('1f7e0', '🟠') : htmlEmojiImg('26a0', '⚠️');
    const lines = data.notable.map(r => {
      const top = r.top[0];
      const rainbandNote = r.rainbandAnnounced
        ? `　${r.rainbandAnnounced.kind === 'hassei' ? '線状降水帯が発生' : '線状降水帯の発生が直前に予想'}（${escapeHtml(r.rainbandAnnounced.areaNames.join('・'))}）`
        : (r.linearRainbandLikely ? '　線状降水帯が関係している可能性' : '');
      // 警報級には達していないが、線状降水帯の発表だけが単独で出ている地方（top自体が空）もある
      if (!top) return `${htmlEmojiImg('1f30a', '🌊')} <b>${escapeHtml(r.officeName)}</b>：${rainbandNote.trim()}`;
      return `${icon(top.level)} <b>${escapeHtml(r.officeName)}</b>：${escapeHtml(top.label)}${rainbandNote}`;
    });
    resultEl.innerHTML = lines.join('<br>') + `<br><span style="font-size:11px; color:var(--ink-sub);">${stamp}</span>`;
  } catch {
    resultEl.textContent = '⚠️ 全国の警報・注意報を確認できませんでした。もう一度お試しください。';
  }
}

async function collectWeather(statusEl, dateKey, timeStr) {
  try {
    if (statusEl) statusEl.textContent = '位置情報を取得中…';
    const coords = await getPosition();
    if (statusEl) statusEl.textContent = dateKey === todayKey() ? '天気を取得中…' : 'その日時の天気を取得中…';
    const w = await fetchWeatherAt(coords.latitude, coords.longitude, dateKey, timeStr);
    // 気象庁の公式警報・注意報は「現在」しか取得できないため、今日の記録の場合のみ併記する（取得失敗は無視して目安のみで続行）
    if (dateKey === todayKey()) {
      try { w.official = await fetchOfficialAlerts(coords.latitude, coords.longitude); }
      catch { w.official = null; }
    } else {
      w.official = null;
    }
    if (statusEl) statusEl.textContent = '天気を取得しました';
    return w;
  } catch (err) {
    if (statusEl) statusEl.textContent = '天気は取得できませんでした（メモのみ保存されます）';
    const denied = err && err.code === 1; // GeolocationPositionError.PERMISSION_DENIED
    return { temp:null, pressure:null, windSpeed:null, precipitation:null, weatherCode:null, heavyRainFlag:false, linearRainbandFlag:false, typhoonFlag:false, extremeHeatFlag:false, highHumidityFlag:false, strongWindFlag:false, official:null, status: denied ? 'denied' : 'error' };
  }
}

// すでに許可済みかどうかを確認できたときだけtrueを返す。「granted」以外（prompt/denied、
// または確認できない環境）ではfalse＝呼び出し側は新規に位置情報を求めない、という判断に使う
// （checkWeatherAlertと同じ考え方。記録のたびに許可を新しく求めることを避けるため）
async function isGeolocationGranted() {
  try {
    if (!navigator.permissions || !navigator.permissions.query) return false;
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state === 'granted';
  } catch { return false; }
}

// ---------- 現在地の気象を自動チェック（台風・線状降水帯・大雨の目安） ----------
// 位置情報の許可を新たに求めることはせず、すでに許可済みの場合だけ静かにチェックする。
let weatherAlertChecked = false;
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// 気象庁の台風情報（非公式・無認証のJSONエンドポイント）から、現在活動中の台風を取得する。
// 仕様が変わる可能性があるため、失敗時は例外を投げて呼び出し側でフォールバックできるようにする。
async function fetchActiveTyphoonsJMA(lat, lon) {
  const res = await fetch('https://www.jma.go.jp/bosai/typhoon/data/targetTc.json');
  if (!res.ok) throw new Error('jma-typhoon-list-failed');
  const list = await res.json();
  if (!Array.isArray(list) || !list.length) return [];
  const details = await Promise.all(list.map(async t => {
    try {
      const r = await fetch(`https://www.jma.go.jp/bosai/typhoon/data/${t.tropicalCyclone}/specifications.json`);
      if (!r.ok) return null;
      const spec = await r.json();
      if (!Array.isArray(spec)) return null;
      const titlePart = spec.find(p => p.part === 'title');
      const analysisPart = spec.find(p => p.part && p.part.jp === '実況');
      if (!analysisPart) return null;
      const pos = analysisPart.position && analysisPart.position.deg;
      const distKm = (pos && lat != null && lon != null) ? haversineKm(lat, lon, pos[0], pos[1]) : null;
      return {
        number: (titlePart && titlePart.typhoonNumber) || t.typhoonNumber,
        nameJa: (titlePart && titlePart.name && titlePart.name.jp) || '',
        category: (titlePart && titlePart.category && titlePart.category.jp) || t.category,
        location: analysisPart.location || null,
        intensity: analysisPart.intensity || null,
        pressure: analysisPart.pressure ? Number(analysisPart.pressure) : null,
        windMs: analysisPart.maximumWind && analysisPart.maximumWind.sustained ? Number(analysisPart.maximumWind.sustained['m/s']) : null,
        lat: pos ? pos[0] : null, lon: pos ? pos[1] : null,
        distKm,
      };
    } catch { return null; }
  }));
  return details.filter(Boolean).sort((a, b) => (a.distKm ?? Infinity) - (b.distKm ?? Infinity));
}

const JMA_ALERT_STAGE_NOTE = {
  geocode: '（現在地→市区町村の変換に失敗しました。電波状況が悪いか、国土地理院APIが一時的に混み合っている可能性があります）',
  'area-master': '（気象庁の区域マスターデータの取得に失敗しました。回線が不安定な可能性があります）',
  'area-resolve': '（現在地に対応する気象庁の警報区域が見つかりませんでした。位置情報の精度が低い可能性があります）',
  'warning-fetch': '（気象庁の警報・注意報データの取得に失敗しました。気象庁サイトが一時的に混み合っている可能性があります）',
};
async function runWeatherAlertCheck() {
  const resultEl = document.getElementById('weatherAlertResult');
  if (!resultEl) return;
  resultEl.textContent = '気象情報を確認中…';
  try {
    const coords = await getPosition();
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    let officialErrorStage = null;
    const [w, typhoons, official] = await Promise.all([
      fetchWeatherAt(coords.latitude, coords.longitude, todayKey(now), time),
      fetchActiveTyphoonsJMA(coords.latitude, coords.longitude).catch(() => null), // 取得失敗時はnull（ローカルの目安のみで判断）
      fetchOfficialAlerts(coords.latitude, coords.longitude).catch(e => { officialErrorStage = (e && e.stage) || 'unknown'; return null; }),
    ]);

    const lines = [];
    // 気象庁が実際に発表している警報・注意報・特別警報（もっとも確実な情報源）。rain/stormだけでなく、
    // 雷注意報・強風注意報・波浪注意報・濃霧注意報など「発表中のものすべて」を拾う
    if (official) {
      // 「線状降水帯が発生しました／直前に予想されます」の公式発表そのものがあれば、見出し文からの
      // 推測（「可能性があります」）より確実な言い方で伝える
      const rainbandNote = a => `${a.kind === 'hassei' ? '線状降水帯が発生しています' : '線状降水帯の発生が直前に予想されています'}（${escapeHtml(a.areaNames.join('・'))}）`;
      if (official.rainLevel >= 2) {
        const note = official.linearRainbandAnnounced ? `　${rainbandNote(official.linearRainbandAnnounced)}`
          : (official.linearRainbandLikely ? '　線状降水帯が関係している可能性があります' : '');
        lines.push(`🌊 【気象庁発表】${escapeHtml(official.rainLabel)}（${escapeHtml(official.areaName)}）${note}`);
      } else if (official.rainLevel === 1) {
        lines.push(`⚠️ 【気象庁発表】${escapeHtml(official.rainLabel)}（${escapeHtml(official.areaName)}）`);
      } else if (official.linearRainbandAnnounced) {
        lines.push(`🌊 【気象庁発表】${rainbandNote(official.linearRainbandAnnounced)}`);
      } else if (official.linearRainbandLikely) {
        // 大雨警報級には達していなくても、見出し文に「顕著な大雨」「線状降水帯」の記載がある場合はそのまま伝える
        lines.push(`🌊 【気象庁発表】線状降水帯に関する情報が発表されています（${escapeHtml(official.areaName)}）`);
      }
      if (official.stormLevel >= 1) {
        lines.push(`🌀 【気象庁発表】${escapeHtml(official.stormLabel)}（${escapeHtml(official.areaName)}）`);
      }
      // rain/storm以外（雷・強風・波浪・濃霧・大雪・土砂災害…）も、発表中のものはすべて列挙する
      if (official.otherActive && official.otherActive.length) {
        const icon = i => i.level >= 4 ? htmlEmojiImg('1f534', '🔴') : i.level >= 3 ? htmlEmojiImg('1f7e0', '🟠') : i.level >= 2 ? htmlEmojiImg('26a0', '⚠️') : htmlEmojiImg('1f538', '🔸');
        lines.push(official.otherActive.map(i => `${icon(i)}【気象庁発表】${escapeHtml(i.label)}`).join('　'));
      }
      if (official.rainLevel === 0 && official.stormLevel === 0 && !official.otherActive.length && !official.linearRainbandLikely) {
        lines.push(`✅ 気象庁発表の警報・注意報：現在なし（${escapeHtml(official.areaName)}）`);
      }
    } else if (officialErrorStage) {
      // 「何も出ていない」のか「取得自体に失敗した」のかを区別できないと、本当は警報が出ているのに
      // 見た目上は静かなまま、ということが起こりうる。取得失敗そのものを必ず伝える
      lines.push(`⚠️ 気象庁の公式警報・注意報を確認できませんでした${JMA_ALERT_STAGE_NOTE[officialErrorStage] || ''}。下の「🔍 今すぐチェック」でもう一度お試しください。`);
    }

    if (typhoons && typhoons.length) {
      typhoons.slice(0, 3).forEach(t => {
        const distText = t.distKm != null ? `現在地から約${Math.round(t.distKm).toLocaleString()}km` : '';
        const strength = (t.intensity && t.intensity !== '-') ? t.intensity : t.category;
        lines.push(`🌀 台風${String(t.number).slice(-2)}号${t.nameJa ? '　' + t.nameJa : ''}（${strength}）　${t.location || ''}　${distText}`);
      });
    } else if (typhoons) {
      lines.push('🌀 現在、気象庁が発表している活動中の台風はありません。');
    }

    if (w.status === 'ok') {
      const localAlerts = [];
      // 公式の大雨警報級（レベル2以上）がすでに出ていれば、重複する簡易目安（降水量ベース）は表示しない
      const officialRainCovers = official && official.rainLevel >= 2;
      if (!officialRainCovers) {
        if (w.linearRainbandFlag) localAlerts.push('🌊 線状降水帯の目安（現在地の降水量から）');
        else if (w.heavyRainFlag) localAlerts.push('⚠️ 大雨の目安（現在地の降水量から）');
      }
      if (w.pressureDropFlag) localAlerts.push('📉 気圧急降下の目安');
      if (!typhoons && !(official && official.stormLevel >= 1) && w.typhoonFlag) localAlerts.push('🌀 台風接近の目安（現在地の気圧・風速から）');
      if (localAlerts.length) lines.push(localAlerts.join('　'));
    } else if (!lines.length) {
      lines.push('気象情報を取得できませんでした。');
    }

    // 台風・線状降水帯・大雨のどれか1つでも該当していれば、パネルの一番上に🙀を出す
    // （マスコットの吹き出しとは無関係。この自動チェックの結果そのものに表示するだけ）
    const hasOfficialSevere = official && (official.rainLevel >= 1 || official.stormLevel >= 1 || (official.otherActive && official.otherActive.length));
    const hasActiveTyphoon = typhoons && typhoons.length > 0;
    const hasLocalSevere = w.status === 'ok' && (w.linearRainbandFlag || w.heavyRainFlag || w.typhoonFlag);
    if (hasOfficialSevere || hasActiveTyphoon || hasLocalSevere) {
      lines.unshift('🙀 台風・線状降水帯・大雨、ちょっと気をつけたい状況です');
    }
    resultEl.innerHTML = lines.map(l => `<div>${l}</div>`).join('') +
      `<p class="note" style="margin:6px 0 0;">※ 【気象庁発表】は気象庁の警報・注意報データそのものです。台風情報は気象庁の非公式データ、それ以外の「目安」は現在地の降水量・気圧などからの簡易推定です。線状降水帯そのものを直接判定する専用APIはないため、大雨特別警報・大雨危険警報の発表、および気象庁発表の見出し文に「顕著な大雨」「線状降水帯」の記載があるかを合わせて確認しています。</p>`;
  } catch (err) {
    const denied = err && err.code === 1;
    resultEl.textContent = denied
      ? '位置情報の利用が許可されていません。「🔍 今すぐチェック」を押すと許可を求められます。'
      : '位置情報または気象情報を取得できませんでした。';
  }
}

// タブを開いた時の自動チェックは、位置情報がすでに許可済みの場合だけ静かに行う（新規プロンプトは出さない）
async function checkWeatherAlert() {
  if (weatherAlertChecked) return;
  try {
    if (!navigator.permissions || !navigator.permissions.query) return;
    const status = await navigator.permissions.query({ name: 'geolocation' });
    if (status.state !== 'granted') return;
    weatherAlertChecked = true;
    await runWeatherAlertCheck();
  } catch { /* 静かに諦める */ }
}
document.getElementById('weatherAlertCheckBtn').addEventListener('click', () => {
  weatherAlertChecked = true;
  runWeatherAlertCheck();
});
const nationwideAlertBtn = document.getElementById('nationwideAlertCheckBtn');
if (nationwideAlertBtn) nationwideAlertBtn.addEventListener('click', () => runNationwideAlertCheck(true));

function moodEmoji(m) {
  return { 1: '😿', 2: '🐱', 3: '😽' }[m] || '';
}
// moodEmoji()と対になるFluent Emoji側のファイル名（拡張子なし）。svgEmojiImage()から使う
function moodEmojiFluentCode(m) {
  return { 1: '1f63f', 2: '1f431', 3: '1f63d' }[m] || '';
}

let selectedMood = null;
document.querySelectorAll('#moodPicker .mood-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const v = parseInt(btn.dataset.mood, 10);
    selectedMood = (selectedMood === v) ? null : v;
    document.querySelectorAll('#moodPicker .mood-btn').forEach(b => {
      b.classList.toggle('on', parseInt(b.dataset.mood, 10) === selectedMood);
    });
  });
});
function resetMoodPicker() {
  selectedMood = null;
  document.querySelectorAll('#moodPicker .mood-btn').forEach(b => b.classList.remove('on'));
}

// ---------- メモの音声入力（Web Speech API が使える端末のみ） ----------
(() => {
  const micBtn = document.getElementById('recordMemoMic');
  if (!micBtn) return;
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) { micBtn.hidden = true; return; }
  let recognizing = false;
  let recognizer = null;
  micBtn.addEventListener('click', () => {
    if (recognizing) { if (recognizer) recognizer.stop(); return; }
    recognizer = new SpeechRecognitionCtor();
    recognizer.lang = 'ja-JP';
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 1;
    recognizer.onresult = (e) => {
      const text = e.results[0][0].transcript;
      const memoBox = document.getElementById('recordMemo');
      memoBox.value = memoBox.value.trim() ? memoBox.value.trim() + ' ' + text : text;
    };
    recognizer.onstart = () => { recognizing = true; micBtn.textContent = '⏺️'; micBtn.classList.add('confirming'); };
    recognizer.onend = () => { recognizing = false; micBtn.textContent = '🎙️'; micBtn.classList.remove('confirming'); };
    recognizer.onerror = () => { recognizing = false; micBtn.textContent = '🎙️'; micBtn.classList.remove('confirming'); };
    recognizer.start();
  });
})();

function weatherChips(w) {
  if (!w) return '';
  if (w.status !== 'ok') return `<span class="badge">天気: 取得できませんでした</span>`;
  const icon = weatherIcon(w.weatherCode);
  const parts = [`<span class="badge">${icon.emoji} ${w.temp!=null?w.temp.toFixed(1):'-'}℃</span>`];
  if (w.pressure != null) parts.push(`<span class="badge">🔽 ${w.pressure.toFixed(0)}hPa</span>`);
  if (w.humidity != null) parts.push(`<span class="badge">💧 ${w.humidity.toFixed(0)}%</span>`);
  if (w.windSpeed != null) parts.push(`<span class="badge">💨 ${w.windSpeed.toFixed(1)}m/s</span>`);
  if (w.precipitation != null) parts.push(`<span class="badge">${w.precipitation > 0 ? '☔ ' : ''}${w.precipitation.toFixed(1)}mm/h</span>`);
  if (w.pressureChange3h != null) parts.push(`<span class="badge">📉 3h${w.pressureChange3h>=0?'+':''}${w.pressureChange3h.toFixed(1)}hPa</span>`);
  if (w.pressureDropFlag) parts.push(`<span class="badge hot">📉 気圧急降下の目安</span>`);
  const officialRainCovers = w.official && w.official.rainLevel >= 2;
  if (!officialRainCovers && w.heavyRainFlag) parts.push(`<span class="badge hot">⚠️ 大雨目安</span>`);
  if (!officialRainCovers && w.linearRainbandFlag) parts.push(`<span class="badge hot">🌊 線状降水帯の目安</span>`);
  if (!(w.official && w.official.stormLevel >= 1) && w.typhoonFlag) parts.push(`<span class="badge hot">🌀 台風目安</span>`);
  if (w.official && w.official.rainLevel >= 1) parts.push(`<span class="badge hot">🌊 【気象庁発表】${escapeHtml(w.official.rainLabel)}</span>`);
  if (w.official && w.official.stormLevel >= 1) parts.push(`<span class="badge hot">🌀 【気象庁発表】${escapeHtml(w.official.stormLabel)}</span>`);
  if (w.extremeHeatFlag) parts.push(`<span class="badge hot">🥵 酷暑（猛暑日）の目安</span>`);
  if (w.highHumidityFlag) parts.push(`<span class="badge hot">💦 高湿度の目安</span>`);
  if (w.strongWindFlag && !w.typhoonFlag) parts.push(`<span class="badge hot">🌬️ 強風の目安</span>`);
  return `<div class="chips">${parts.join('')}</div>
    <p class="note">※ 【気象庁発表】以外は公式発表ではなく、気温・気圧・湿度・風速からの目安です</p>`;
}

// 記録フォームの「この日は生理／通院」トグル（体調ピッカーのすぐ下・控えめな表示）を、
// 現在選んでいる記録日付（recordDate）に合わせて更新する
function bindRecordDayToggle(elId, isFn, toggleFn) {
  const el = document.getElementById(elId);
  if (!el) return () => {};
  const refresh = () => { el.classList.toggle('on', isFn(document.getElementById('recordDate').value || todayKey())); };
  el.addEventListener('click', () => {
    toggleFn(document.getElementById('recordDate').value || todayKey());
    refresh();
  });
  return refresh;
}
const refreshRecordPeriodToggle = bindRecordDayToggle('recordPeriodToggle', isPeriodDay, togglePeriodDay);
const refreshRecordHospitalToggle = bindRecordDayToggle('recordHospitalToggle', isHospitalDay, toggleHospitalDay);
document.getElementById('recordDate').addEventListener('change', () => { refreshRecordPeriodToggle(); refreshRecordHospitalToggle(); });

function openRecordFormUI() {
  document.getElementById('recordForm').hidden = false;
  const now = new Date();
  const todayK = todayKey(now);
  // カレンダーで日付を選んだ状態で「＋記録を追加」を押した場合は、その選んだ日付を初期値にする
  const targetDate = selectedDate || todayK;
  document.getElementById('recordDate').value = targetDate;
  document.getElementById('recordTime').value = targetDate === todayK
    ? `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    : '12:00';
  document.getElementById('weatherStatus').textContent = '位置情報を許可すると、その時点の天気も一緒に記録されます';
  // 体質チェック・問診に今すでに入力がある場合は、わざわざチェックしなくても記録に残るよう初期値をONにしておく
  // （オフのままだと「問診・体質チェックをやったのに記録に残らない」という気づきにくい抜け漏れになるため）
  document.getElementById('includeCheck').checked = getCheckRanking().length > 0;
  document.getElementById('includeIntake').checked = getIntakeRanking().length > 0;
  renderRecordWordPicker();
  refreshRecordPeriodToggle();
  refreshRecordHospitalToggle();
}
document.getElementById('openRecordForm').addEventListener('click', openRecordFormUI);
document.getElementById('cancelRecord').addEventListener('click', () => {
  document.getElementById('recordForm').hidden = true;
  document.getElementById('recordMemo').value = '';
  document.getElementById('includeCheck').checked = false;
  document.getElementById('includeIntake').checked = false;
  resetMoodPicker();
});
document.getElementById('saveRecord').addEventListener('click', async () => {
  const memo = document.getElementById('recordMemo').value.trim();
  const includeCheck = document.getElementById('includeCheck').checked;
  const includeIntake = document.getElementById('includeIntake').checked;
  const ranking = includeCheck ? getCheckRanking() : null;
  const intakeRanking = includeIntake ? getIntakeRanking() : null;
  if (!memo && !(ranking && ranking.length) && !(intakeRanking && intakeRanking.length) && !selectedMood) {
    alert('メモ・体質チェック・問診・今の気分のいずれかを入力してください');
    return;
  }
  const dateKey = document.getElementById('recordDate').value || todayKey();
  const time = document.getElementById('recordTime').value || `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`;
  // 天気タブのワンタップ記録（wxQuickMood）と同じ形式：保存のたびにcollectWeatherを呼び、
  // まだ許可/拒否が決まっていなければブラウザの位置情報許可ダイアログをその場で出す
  const saveBtn = document.getElementById('saveRecord');
  const statusEl = document.getElementById('weatherStatus');
  saveBtn.disabled = true;
  const weather = await collectWeather(statusEl, dateKey, time);
  saveBtn.disabled = false;
  const record = {
    id: String(Date.now()),
    dateKey,
    time,
    memo,
    mood: selectedMood,
    checkSnapshot: ranking,
    intakeSnapshot: intakeRanking,
    tags: rfHasAnyWord() ? { ...rfWordState } : null,
    weather,
  };
  records.push(record);
  saveRecords();
  document.getElementById('recordForm').hidden = true;
  document.getElementById('recordMemo').value = '';
  document.getElementById('includeCheck').checked = false;
  document.getElementById('includeIntake').checked = false;
  resetMoodPicker();
  resetRecordWordPicker();
  const [dy, dm] = dateKey.split('-').map(Number);
  calMonth = new Date(dy, dm - 1, 1);
  selectedDate = dateKey;
  renderCalendar();
});

// 記録した日が何日連続で続いているか（今日 or 昨日まで記録があれば継続中とみなす）
function calcStreak() {
  const dateSet = new Set(records.map(r => r.dateKey));
  const d = new Date();
  if (!dateSet.has(todayKey(d))) d.setDate(d.getDate() - 1); // 今日まだ書いてなくても昨日までの連続は表示する
  let streak = 0;
  while (dateSet.has(todayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// 直近7日間の記録を、ゆるく振り返るミニサマリー
function renderWeeklySummary() {
  const box = document.getElementById('weeklySummary');
  if (!box) return;
  const today = new Date();
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - 6);
  const cutoffKey = todayKey(cutoff);
  const todayK = todayKey(today);
  const recent = records.filter(r => r.dateKey >= cutoffKey && r.dateKey <= todayK);
  const streak = calcStreak();
  if (!recent.length && streak < 2) { box.hidden = true; return; }
  box.hidden = false;
  const moodCounts = { 1: 0, 2: 0, 3: 0 };
  recent.forEach(r => { if (r.mood) moodCounts[r.mood]++; });
  const daysLogged = new Set(recent.map(r => r.dateKey)).size;
  const moodSummary = [3, 2, 1].filter(m => moodCounts[m] > 0).map(m => `${moodEmoji(m)}${moodCounts[m]}`).join(' ');
  const streakText = streak >= 2 ? `<p class="note" style="margin:0 0 4px;"><b>🔥 ${streak}日連続</b>で記録できています</p>` : '';
  box.innerHTML = `
    ${streakText}
    ${recent.length ? `<p class="note" style="margin:0;"><b>直近7日間のふりかえり：</b>${daysLogged}日、記録できました${moodSummary ? '　' + moodSummary : ''}</p>` : ''}
  `;
}

// ---------- 明日の自分への申し送り ----------
// 単なる日記ではなく「今日の自分→明日の自分」への引き継ぎにする。書いた内容は、翌日「天気」タブの
// 冒頭に「昨日のあなたから」として表示される（記録タブと天気タブをつなぐ導線の1つ）
let handoverLog = LS.get('handoverLog', {}); // { [dateKey]: {tough, done, caution, plan, message} }
function saveHandoverLog() { LS.set('handoverLog', handoverLog); }
const HANDOVER_FIELDS = [
  { key: 'tough', label: '今日つらかったこと', placeholder: '例）午後から頭が重くて、外出を1件減らした' },
  { key: 'done', label: '今日できたこと', placeholder: '例）提出物を1つ出せた' },
  { key: 'caution', label: '明日気をつけたいこと', placeholder: '例）朝は無理せず、様子を見てから予定を決める' },
  { key: 'plan', label: '明日の予定', placeholder: '例）10時に通院、それ以外は特になし' },
  { key: 'message', label: '明日の自分への一言', placeholder: '例）朝は体が重かったら、最初から無理しない' },
];
function renderHandoverCard() {
  const el = document.getElementById('handoverCard');
  if (!el) return;
  const tk = todayKey();
  const entry = handoverLog[tk] || {};
  el.innerHTML = `
    <label style="display:block; font-weight:700; font-size:14px; margin-bottom:4px;">🌙 今日の申し送り</label>
    <p class="note" style="margin:0 0 10px;">今日の自分から、明日の自分へのメモです。書いておくと、明日「天気」タブを開いたときに「昨日のあなたから」として表示されます。</p>
    ${HANDOVER_FIELDS.map(f => `
      <div class="q" style="margin:0 0 10px;">
        <label style="display:block; font-weight:600; font-size:12px; margin-bottom:4px;">${escapeHtml(f.label)}</label>
        <textarea data-ho="${f.key}" rows="2" placeholder="${escapeHtml(f.placeholder)}" style="width:100%; padding:8px; font-size:13px; border:1px solid var(--border); border-radius:8px; font-family:inherit;">${escapeHtml(entry[f.key] || '')}</textarea>
      </div>`).join('')}
    <button type="button" class="btn-out no-print" id="handoverSaveBtn" style="flex:none;">💾 保存する</button>
    <p class="note" id="handoverSaveStatus" style="min-height:1.4em; margin:6px 0 0;"></p>
  `;
  el.querySelectorAll('[data-ho]').forEach(box => {
    box.addEventListener('input', () => {
      if (!handoverLog[tk]) handoverLog[tk] = {};
      handoverLog[tk][box.dataset.ho] = box.value;
      saveHandoverLog();
    });
  });
  const saveBtn = document.getElementById('handoverSaveBtn');
  const saveStatus = document.getElementById('handoverSaveStatus');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (!handoverLog[tk]) handoverLog[tk] = {};
      el.querySelectorAll('[data-ho]').forEach(box => { handoverLog[tk][box.dataset.ho] = box.value; });
      saveHandoverLog();
      if (saveStatus) {
        saveStatus.textContent = '保存しました';
        setTimeout(() => { if (saveStatus.textContent === '保存しました') saveStatus.textContent = ''; }, 2200);
      }
    });
  }
}
// 昨日の申し送りのうち、意味のある内容が書かれていた場合だけ「昨日のあなたから」カードを出す
function buildYesterdayHandoverHtml() {
  const yk = addDaysToKey(todayKey(), -1);
  const entry = handoverLog[yk];
  if (!entry) return '';
  const parts = [];
  if (entry.message && entry.message.trim()) parts.push(`<p style="margin:0 0 6px;">${escapeHtml(entry.message)}</p>`);
  if (entry.tough && entry.tough.trim()) parts.push(`<p style="margin:0 0 4px;"><b>つらかったこと</b>：${escapeHtml(entry.tough)}</p>`);
  if (entry.done && entry.done.trim()) parts.push(`<p style="margin:0 0 4px;"><b>できたこと</b>：${escapeHtml(entry.done)}</p>`);
  if (entry.caution && entry.caution.trim()) parts.push(`<p style="margin:0 0 4px;"><b>気をつけたいと書いていたこと</b>：${escapeHtml(entry.caution)}</p>`);
  if (entry.plan && entry.plan.trim()) parts.push(`<p style="margin:0;"><b>メモしていた今日の予定</b>：${escapeHtml(entry.plan)}</p>`);
  if (!parts.length) return '';
  return `
    <div class="card no-print" style="padding:12px 16px; margin:12px 16px 0; background:var(--accent-soft);">
      <label style="display:block; font-weight:700; font-size:13px; margin-bottom:6px;">☀️ 昨日のあなたから</label>
      ${parts.join('')}
    </div>`;
}

// ---------- 今日の最低ライン ----------
// 「100点を目指して途中で崩れる」ではなく、「最低ラインを確保して、余力があれば+αに進む」設計。
// 未達成でも失敗にはしない（チェックが入っている分だけを、できたこととして残す）
// サイト方針でいったん非表示にする。コードは消さず、falseにしておくだけ＝いつでもtrueに戻せば復活する
const MIN_LINE_ENABLED = false;
let minLineLog = LS.get('minLineLog', {}); // { [dateKey]: { items:[{text,done}], plusAlpha:[{text,done}], plusAlphaOpen:bool } }
function saveMinLineLog() { LS.set('minLineLog', minLineLog); }
function getMinLineDay(dateKey) {
  if (!minLineLog[dateKey]) minLineLog[dateKey] = { items: [], plusAlpha: [], plusAlphaOpen: false };
  if (!minLineLog[dateKey].plusAlpha) minLineLog[dateKey].plusAlpha = [];
  return minLineLog[dateKey];
}
function buildMinLineHtml() {
  if (!MIN_LINE_ENABLED) return '';
  const tk = todayKey();
  const day = getMinLineDay(tk);
  const allDone = day.items.length > 0 && day.items.every(it => it.done);
  return `
    <div class="card no-print" style="padding:14px 16px; margin:12px 16px 0;">
      <label style="display:block; font-weight:700; font-size:14px; margin-bottom:4px;">🎯 今日の最低ライン</label>
      <p class="note" style="margin:0 0 10px;">「今日はこれだけできれば十分」を1〜3個だけ決めます。達成できなくても、チェックが入った分がそのまま「できたこと」です。</p>
      <div id="minLineItems">
        ${day.items.map((it, i) => `
          <label class="chip ${it.done ? 'on' : ''}" data-minitem="${i}" style="display:flex; align-items:center; gap:6px; margin:0 0 6px; width:100%; justify-content:space-between;">
            <span>${it.done ? '✅' : '☐'} ${escapeHtml(it.text)}</span>
            <button type="button" class="btn-link no-print" data-mindel="${i}" style="padding:2px 6px;">削除</button>
          </label>`).join('')}
      </div>
      ${day.items.length < 3 ? `
        <div style="display:flex; gap:6px; margin-top:6px;">
          <input type="text" id="minLineInput" placeholder="例：英単語10個" style="flex:1; padding:8px; font-size:13px; border:1px solid var(--border); border-radius:8px; font-family:inherit;" />
          <button type="button" class="btn-sub" id="minLineAdd">追加</button>
        </div>` : ''}
      ${allDone ? `
        <p class="note" style="margin:10px 0 6px; padding:6px 8px; background:var(--accent-soft); border-radius:8px;">🎉 今日の最低ライン、達成できました</p>
        <div id="minLinePlusAlpha">
          ${day.plusAlpha.map((it, i) => `
            <label class="chip ${it.done ? 'on' : ''}" data-plusitem="${i}" style="display:flex; align-items:center; gap:6px; margin:0 0 6px; width:100%; justify-content:space-between;">
              <span>${it.done ? '✅' : '☐'} ${escapeHtml(it.text)}</span>
              <button type="button" class="btn-link no-print" data-plusdel="${i}" style="padding:2px 6px;">削除</button>
            </label>`).join('')}
        </div>
        <div style="display:flex; gap:6px; margin-top:6px;">
          <input type="text" id="plusAlphaInput" placeholder="＋α：余力があれば" style="flex:1; padding:8px; font-size:13px; border:1px solid var(--border); border-radius:8px; font-family:inherit;" />
          <button type="button" class="btn-sub" id="plusAlphaAdd">＋αに追加</button>
        </div>
      ` : ''}
    </div>`;
}
function attachMinLineHandlers() {
  if (!MIN_LINE_ENABLED) return;
  const tk = todayKey();
  const day = getMinLineDay(tk);
  document.querySelectorAll('#minLineItems [data-minitem]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const i = Number(el.dataset.minitem);
      day.items[i].done = !day.items[i].done;
      saveMinLineLog();
      refreshMinLineCard();
    });
  });
  document.querySelectorAll('[data-mindel]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation(); e.preventDefault();
      day.items.splice(Number(btn.dataset.mindel), 1);
      saveMinLineLog();
      refreshMinLineCard();
    });
  });
  const addBtn = document.getElementById('minLineAdd');
  if (addBtn) addBtn.addEventListener('click', () => {
    const input = document.getElementById('minLineInput');
    const text = input.value.trim();
    if (!text || day.items.length >= 3) return;
    day.items.push({ text, done: false });
    saveMinLineLog();
    refreshMinLineCard();
  });
  document.querySelectorAll('#minLinePlusAlpha [data-plusitem]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const i = Number(el.dataset.plusitem);
      day.plusAlpha[i].done = !day.plusAlpha[i].done;
      saveMinLineLog();
      refreshMinLineCard();
    });
  });
  document.querySelectorAll('[data-plusdel]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation(); e.preventDefault();
      day.plusAlpha.splice(Number(btn.dataset.plusdel), 1);
      saveMinLineLog();
      refreshMinLineCard();
    });
  });
  const plusAddBtn = document.getElementById('plusAlphaAdd');
  if (plusAddBtn) plusAddBtn.addEventListener('click', () => {
    const input = document.getElementById('plusAlphaInput');
    const text = input.value.trim();
    if (!text) return;
    day.plusAlpha.push({ text, done: false });
    saveMinLineLog();
    refreshMinLineCard();
  });
}
function refreshMinLineCard() {
  const wrap = document.getElementById('minLineCardWrap');
  if (!wrap) return;
  wrap.innerHTML = buildMinLineHtml();
  attachMinLineHandlers();
}

// ---------- 生理カレンダー ----------
// 生理日はレコード（複数記入できる体調ログ）とは別に、日付単位のON/OFFとしてシンプルに管理する
let periodDays = new Set(LS.get('periodDays', []));
function savePeriodDays() { LS.set('periodDays', [...periodDays].sort()); }
function isPeriodDay(dateKey) { return periodDays.has(dateKey); }
function togglePeriodDay(dateKey) {
  if (periodDays.has(dateKey)) periodDays.delete(dateKey); else periodDays.add(dateKey);
  savePeriodDays();
}

// ---------- 通院カレンダー ----------
// 生理日と同じ考え方で、通院した日を日付単位のON/OFFで管理する
let hospitalDays = new Set(LS.get('hospitalDays', []));
function saveHospitalDays() { LS.set('hospitalDays', [...hospitalDays].sort()); }
function isHospitalDay(dateKey) { return hospitalDays.has(dateKey); }
function toggleHospitalDay(dateKey) {
  if (hospitalDays.has(dateKey)) hospitalDays.delete(dateKey); else hospitalDays.add(dateKey);
  saveHospitalDays();
}
function addDaysToKey(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d + days));
}
function daysBetweenKeys(fromKey, toKey) {
  const [y1,m1,d1] = fromKey.split('-').map(Number);
  const [y2,m2,d2] = toKey.split('-').map(Number);
  return Math.round((new Date(y2,m2-1,d2) - new Date(y1,m1-1,d1)) / 86400000);
}
// 生理の「開始日」（前日は生理日ではない日）だけを古い順に抽出する
function periodStartDates() {
  const sorted = [...periodDays].sort();
  return sorted.filter(d => !periodDays.has(addDaysToKey(d, -1)));
}
// 記録された開始日どうしの間隔（10〜60日のものだけ）から平均周期を推定する
function averageCycleLength() {
  const starts = periodStartDates();
  if (starts.length < 2) return null;
  const diffs = [];
  for (let i = 1; i < starts.length; i++) {
    const days = daysBetweenKeys(starts[i-1], starts[i]);
    if (days > 10 && days < 60) diffs.push(days);
  }
  return diffs.length ? diffs.reduce((a,b)=>a+b,0) / diffs.length : null;
}
function predictedNextPeriodStart() {
  const starts = periodStartDates();
  if (!starts.length) return null;
  const avg = averageCycleLength();
  if (avg == null) return null;
  return addDaysToKey(starts[starts.length - 1], Math.round(avg));
}
// カレンダー表示用：平均周期から予測した次回生理の前後1日を「予測」として薄く示す
function isPredictedPeriodWindow(dateKey) {
  if (periodDays.has(dateKey)) return false;
  const next = predictedNextPeriodStart();
  if (!next) return false;
  const diff = daysBetweenKeys(next, dateKey);
  return diff >= -1 && diff <= 1;
}
// 分析用：予測ではなく実測の生理開始日から遡って数えた「生理前ウィンドウ」（デフォルト7日間）
function isPreMenstrualWindow(dateKey, windowDays = 7) {
  return periodStartDates().some(start => {
    const diff = daysBetweenKeys(dateKey, start);
    return diff > 0 && diff <= windowDays;
  });
}

// その日の記録の中でもっとも目立つ気象イベントを1つだけ選んでカレンダーに出すアイコン
// worstWeatherIcon()が返す絵文字→Fluent Emojiのファイル名（拡張子なし）。SVG内に直接埋め込む用
const WORST_WEATHER_ICON_FLUENT_CODE = { '🌊': '1f30a', '🌀': '1f300', '⚠️': '26a0', '🥵': '1f975', '🌬️': '1f32c', '💦': '1f4a6' };
function worstWeatherIcon(dayRecords) {
  const ws = dayRecords.map(r => r.weather).filter(w => w && w.status === 'ok');
  if (!ws.length) return '';
  const has = key => ws.some(w => w[key]);
  if (ws.some(w => w.official && w.official.rainLevel >= 3)) return '🌊';
  if (has('linearRainbandFlag')) return '🌊';
  if (ws.some(w => w.official && w.official.stormLevel >= 1) || has('typhoonFlag')) return '🌀';
  if (ws.some(w => w.official && w.official.rainLevel >= 1) || has('heavyRainFlag')) return '⚠️';
  if (has('extremeHeatFlag')) return '🥵';
  if (has('strongWindFlag')) return '🌬️';
  if (has('highHumidityFlag')) return '💦';
  return '';
}

// 過去の記録を一目で振り返れるよう、気分の推移を面グラフ＋折れ線で描画する（記録がある全期間）。
// 天気の目立つ日にだけ小さなアイコンを添えて、「あの時は何があったか」を思い出しやすくする。
// 気分・体質チェック合計点・問診スコアなど、日付ごとに1つの数値を持つ時系列を、共通の見た目で描くための部品。
// 天気の要因別寄与度チャートと同じ「時間軸に沿った折れ線」という土俵に、体質チェック・問診の推移も乗せることで、
// レイヤーを切り替えるだけで見た目・操作感を変えずに比較できるようにする（気象イベントの目印も共通で乗せる）。
function buildTrendSVG(recordsAll, opts) {
  const withVal = recordsAll.filter(r => opts.accessor(r) != null);
  if (withVal.length < 5) return null;
  const byDate = {};
  withVal.forEach(r => { (byDate[r.dateKey] = byDate[r.dateKey] || []).push(opts.accessor(r)); });
  const recordedKeys = Object.keys(byDate).sort();
  if (recordedKeys.length < 5) return null;

  // 引き伸ばしはせず、代わりに軸を過去方向に延長して幅を確保する（右端＝今日は常に軸の右端になるので、
  // 空白ができる場合は目立ちにくい「記録がまだない過去側」に出る）
  const todayK = todayKey();
  const MIN_DAYS = 45;
  const span = daysBetweenKeys(recordedKeys[0], todayK) + 1;
  const totalDays = Math.max(MIN_DAYS, span);
  const dateKeys = [];
  for (let i = totalDays - 1; i >= 0; i--) dateKeys.push(addDaysToKey(todayK, -i));
  const n = dateKeys.length;
  const avgByDate = dateKeys.map(d => byDate[d] ? byDate[d].reduce((a, b) => a + b, 0) / byDate[d].length : null);

  const observed = avgByDate.filter(v => v != null);
  const [rangeMin, rangeMax] = opts.range || (() => {
    const lo = Math.min(...observed), hi = Math.max(...observed);
    return hi > lo ? [lo, hi] : [lo - 1, hi + 1];
  })();

  const dayPx = 12, padL = 30, padR = 20, padT = 20, plotH = 120, padB = 22;
  const W = padL + n * dayPx + padR;
  const xPositions = dateKeys.map((_, i) => padL + i * dayPx + dayPx / 2);
  const y = v => padT + plotH * (1 - (v - rangeMin) / (rangeMax - rangeMin || 1));
  const colorFor = opts.colorFor || (() => 'var(--accent)');

  // 記録がない日をまたいで線をつながないよう、記録が連続している区間ごとに分けて描画する
  const segments = [];
  let cur = [];
  avgByDate.forEach((v, i) => {
    if (v == null) { if (cur.length) segments.push(cur); cur = []; }
    else cur.push(i);
  });
  if (cur.length) segments.push(cur);

  const lineParts = segments.map(seg =>
    `<polyline class="chart-draw-line" points="${seg.map(i => `${xPositions[i].toFixed(1)},${y(avgByDate[i]).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.5" />`
  ).join('');
  const areaParts = segments.map(seg => {
    const pts = seg.map(i => `${xPositions[i].toFixed(1)},${y(avgByDate[i]).toFixed(1)}`).join(' ');
    const first = xPositions[seg[0]].toFixed(1), last = xPositions[seg[seg.length - 1]].toFixed(1);
    return `<polygon points="${first},${(padT + plotH).toFixed(1)} ${pts} ${last},${(padT + plotH).toFixed(1)}" fill="var(--accent-soft)" opacity="0.3" />`;
  }).join('');

  const eventByDate = {};
  recordsAll.forEach(r => {
    const icon = worstWeatherIcon([r]);
    if (icon) eventByDate[r.dateKey] = icon;
  });
  const markers = dateKeys.map((d, i) => {
    const icon = eventByDate[d];
    if (!icon) return '';
    const fluentCode = WORST_WEATHER_ICON_FLUENT_CODE[icon];
    return (USE_FLUENT_EMOJI && fluentCode)
      ? svgEmojiImage(fluentCode, xPositions[i], padT - 6, 11)
      : `<text x="${xPositions[i].toFixed(1)}" y="${padT - 6}" font-size="11" text-anchor="middle">${icon}</text>`;
  }).join('');
  const labels = [];
  dateKeys.forEach((d, i) => {
    if (d.endsWith('-01') || i === 0 || i === n - 1) labels.push(`<text x="${xPositions[i].toFixed(1)}" y="${padT + plotH + 16}" font-size="9" fill="var(--ink-sub)" text-anchor="middle">${d.slice(5)}</text>`);
  });
  const dots = avgByDate.map((v, i) => v == null ? '' : `<circle cx="${xPositions[i].toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.5" fill="${colorFor(v)}" />`).join('');
  const todayIdx = dateKeys.indexOf(todayK);
  const todayLine = todayIdx >= 0
    ? `<line x1="${xPositions[todayIdx].toFixed(1)}" y1="${padT}" x2="${xPositions[todayIdx].toFixed(1)}" y2="${padT + plotH}" stroke="var(--warm)" stroke-width="1.5" stroke-dasharray="3,2" />`
    : '';

  // 天気の要素（気温・気圧・湿度・風速・降水量）を、破線の重ね描きレイヤーとして複数追加できる。
  // 主系列とはスケールが違うため、それぞれの重ね描き自身の最小〜最大で正規化し、同じプロット領域に収める
  // （縦の目盛りは共有しない「形の見比べ」用で、絶対値の比較には使わない）
  const overlayParts = (opts.overlays || []).map(ov => {
    const overlayByDate = {};
    recordsAll.forEach(r => {
      const v = ov.accessor(r);
      if (v == null) return;
      (overlayByDate[r.dateKey] = overlayByDate[r.dateKey] || []).push(v);
    });
    const overlayAvg = dateKeys.map(d => overlayByDate[d] ? overlayByDate[d].reduce((a, b) => a + b, 0) / overlayByDate[d].length : null);
    const overlayObserved = overlayAvg.filter(v => v != null);
    if (overlayObserved.length < 3) return '';
    const oLo = Math.min(...overlayObserved), oHi = Math.max(...overlayObserved);
    const oy = v => padT + plotH * (1 - (v - oLo) / ((oHi - oLo) || 1));
    const oSegments = [];
    let ocur = [];
    overlayAvg.forEach((v, i) => { if (v == null) { if (ocur.length) oSegments.push(ocur); ocur = []; } else ocur.push(i); });
    if (ocur.length) oSegments.push(ocur);
    return oSegments.map(seg =>
      `<polyline points="${seg.map(i => `${xPositions[i].toFixed(1)},${oy(overlayAvg[i]).toFixed(1)}`).join(' ')}" fill="none" stroke="${ov.color}" stroke-width="1.75" stroke-dasharray="4,2" opacity="0.9" />`
    ).join('');
  }).join('');

  const totalH = padT + plotH + padB;
  const html = `<svg width="${W}" height="${totalH}" viewBox="0 0 ${W} ${totalH}" style="display:block;" role="img" aria-label="${escapeHtml(opts.label)}の推移（ドラッグまたはスクロールバーで前後の日を確認できます）">
    ${areaParts}
    ${todayLine}
    ${overlayParts}
    ${lineParts}
    ${dots}
    ${markers}
    ${labels.join('')}
  </svg>`;
  return { html, xPositions, dateKeys, todayIdx: todayIdx >= 0 ? todayIdx : n - 1 };
}

function buildMoodTrendSVG(recordsAll, overlays) {
  return buildTrendSVG(recordsAll, {
    accessor: r => r.mood || null,
    range: [1, 3],
    colorFor: v => v >= 2.5 ? 'var(--accent)' : v >= 1.5 ? 'var(--warm)' : '#ff8fa3',
    label: '気分',
    overlays,
  });
}

// 天気タブのメトログラム（━気温 ┄露点 ■降水 ┄風 ━気圧背景 ●風のピーク）と同じ色使いで、
// 体調の推移チャートに重ねて描ける天気レイヤー。露点・風のピークは1日1回の記録スナップショットには
// 含まれておらず（過去の時間ごとの天気を保存していないため）、この重ね描きでは出せない。
// 色は気象グラフ（buildMeteogramSVG）が実際にそれぞれの線・棒に使っている色そのものに合わせている
// （温度→--wx-temp、気圧→--wx-pressure、風速→--wx-wind、降水量→--wx-precip-deep（棒の縁の色。
// 淡い塗り色--wx-precipだと細い破線では見えにくいため）。湿度だけは気象グラフ側に対応する線が
// ないため、一番近い概念である露点の色（--wx-dew）を代わりに使う
const WEATHER_OVERLAY_LAYERS = {
  none: null,
  temp: { key: 'temp', label: '気温', color: 'var(--wx-temp)', accessor: r => (r.weather && r.weather.status === 'ok') ? r.weather.temp : null },
  pressure: { key: 'pressure', label: '気圧', color: 'var(--wx-pressure)', accessor: r => (r.weather && r.weather.status === 'ok') ? r.weather.pressure : null },
  humidity: { key: 'humidity', label: '湿度', color: 'var(--wx-dew)', accessor: r => (r.weather && r.weather.status === 'ok') ? r.weather.humidity : null },
  wind: { key: 'wind', label: '風速', color: 'var(--wx-wind)', accessor: r => (r.weather && r.weather.status === 'ok') ? r.weather.windSpeed : null },
  precip: { key: 'precip', label: '降水量', color: 'var(--wx-precip-deep)', accessor: r => (r.weather && r.weather.status === 'ok') ? r.weather.precipitation : null },
};
// 複数選択できるようにする（Setに選ばれたキーを保持。'none'相当は空集合で表す）
let analysisTrendOverlays = new Set();

// 分析タブの「体調の推移」で切り替えられるレイヤー。気分・体質チェック・問診を同じ部品（buildTrendSVG）で描くことで、
// 見た目や操作感を変えずに、どれがどう動いているかを見比べられるようにする。
const ANALYSIS_TREND_LAYERS = {
  mood: {
    key: 'mood', label: '気分',
    hasData: recordsAll => recordsAll.filter(r => r.mood).length >= 5,
    build: (recordsAll, overlays) => buildMoodTrendSVG(recordsAll, overlays),
  },
  check: {
    key: 'check', label: '体質チェック合計',
    hasData: recordsAll => recordsAll.filter(r => r.checkSnapshot && r.checkSnapshot.length).length >= 5,
    build: (recordsAll, overlays) => buildTrendSVG(recordsAll, {
      accessor: r => (r.checkSnapshot && r.checkSnapshot.length) ? r.checkSnapshot.reduce((s, x) => s + x.count, 0) : null,
      colorFor: () => 'var(--accent)',
      label: '体質チェック合計点（高いほど、当てはまる項目が多い）',
      overlays,
    }),
  },
  intake: {
    key: 'intake', label: '問診スコア',
    hasData: recordsAll => recordsAll.filter(r => r.intakeSnapshot && r.intakeSnapshot.length).length >= 5,
    build: (recordsAll, overlays) => buildTrendSVG(recordsAll, {
      accessor: r => (r.intakeSnapshot && r.intakeSnapshot.length) ? r.intakeSnapshot[0].score : null,
      colorFor: () => 'var(--accent)',
      label: '問診スコア（もっとも近かった体質の点数）',
      overlays,
    }),
  },
};
let analysisTrendLayer = 'mood';
// 分析タブの「体調の推移」を、選ばれているレイヤーで描き直す（データがないレイヤーが選ばれていた場合は、
// データのある最初のレイヤーに自動で切り替える）
function renderAnalysisTrendChart() {
  const wrap = document.getElementById('analysisTrendChartWrap');
  if (!wrap) return;
  document.querySelectorAll('#analysisTrendSeg .seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.layer === analysisTrendLayer);
  });
  let layer = ANALYSIS_TREND_LAYERS[analysisTrendLayer];
  if (!layer || !layer.hasData(records)) {
    layer = Object.values(ANALYSIS_TREND_LAYERS).find(l => l.hasData(records)) || null;
    if (layer) {
      analysisTrendLayer = layer.key;
      document.querySelectorAll('#analysisTrendSeg .seg-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.layer === analysisTrendLayer);
      });
    }
  }
  if (!layer) {
    wrap.innerHTML = '<p class="note">気分・体質チェック・問診のいずれかが5件以上たまると、ここに推移が表示されます。</p>';
    return;
  }
  document.querySelectorAll('#analysisTrendOverlaySeg .chip').forEach(chip => {
    const key = chip.dataset.overlay;
    chip.classList.toggle('on', key === 'none' ? analysisTrendOverlays.size === 0 : analysisTrendOverlays.has(key));
  });
  const overlays = [...analysisTrendOverlays].map(k => WEATHER_OVERLAY_LAYERS[k]).filter(Boolean);
  const chart = layer.build(records, overlays);
  if (!chart) {
    wrap.innerHTML = '<p class="note">このレイヤーはまだ図にできるだけの記録がありません。</p>';
    return;
  }
  const overlayNote = overlays.length ? `<p class="note" style="margin:0 0 4px;">┄ の破線が、${overlays.map(o=>`<b style="color:${o.color};">${escapeHtml(o.label)}</b>`).join('・')}の重ね描きです（記録した時点の値・複数記録がある日は平均。縦の目盛りは共有していない「形の見比べ」用です）。</p>` : '';
  wrap.innerHTML = `
    ${overlayNote}
    <p class="note" id="analysisTrendReadout" style="margin:0 0 4px; font-weight:600;"></p>
    <div class="card scrub-wrap" style="padding:10px 0;">
      <div class="scrub-scroll" id="analysisTrendScrub">${chart.html}</div>
    </div>
    <div class="hbar-track" id="analysisTrendHbar"></div>
  `;
  setupScrubbableChart('analysisTrendScrub', chart.xPositions, chart.todayIdx, (idx) => {
    const readout = document.getElementById('analysisTrendReadout');
    if (!readout) return;
    const d = chart.dateKeys[idx];
    const diffDays = daysBetweenKeys(d, todayKey());
    const offsetText = diffDays === 0 ? '今日' : diffDays > 0 ? `${diffDays}日前` : `${-diffDays}日後`;
    readout.textContent = `${d}（${offsetText}）`;
  }, { align: 'end' });
  attachHScrollbar(document.getElementById('analysisTrendScrub'), document.getElementById('analysisTrendHbar'));
}

// ---------- 今日は何が影響した？（あくまでユーザー自身の予想メモ。義務ではなく、気が向いたら選ぶ） ----------
// 「わからない」も正式な選択肢にする。過去の日にもさかのぼって記録できるよう、
// カレンダーの各日付（dateKey）に対して自由に付け外しできるようにする
const FACTOR_TAGS = [
  { id: 'weather', emoji: '🌤️', label: '気象' },
  { id: 'sleep', emoji: '😴', label: '睡眠' },
  { id: 'activity', emoji: '🏃', label: '活動量' },
  { id: 'meal', emoji: '🍚', label: '食事' },
  { id: 'schedule', emoji: '📅', label: '予定の多さ' },
  { id: 'stress', emoji: '💭', label: 'ストレス' },
  { id: 'other', emoji: '🩷', label: 'その他' },
  { id: 'unknown', emoji: '🤷', label: 'よくわからない' },
];
let factorTagLog = LS.get('factorTagLog', {}); // { [dateKey]: string[]（FACTOR_TAGSのid） }
function saveFactorTagLog() { LS.set('factorTagLog', factorTagLog); }
function toggleFactorTag(dateKey, tagId) {
  const cur = new Set(factorTagLog[dateKey] || []);
  if (tagId === 'unknown') {
    // 「わからない」は他の選択と両立しない（わからない、と具体的な予想は矛盾するため）
    if (cur.has('unknown')) cur.delete('unknown'); else { cur.clear(); cur.add('unknown'); }
  } else {
    cur.delete('unknown');
    if (cur.has(tagId)) cur.delete(tagId); else cur.add(tagId);
  }
  if (cur.size) factorTagLog[dateKey] = [...cur]; else delete factorTagLog[dateKey];
  saveFactorTagLog();
}
function buildFactorTagHtml(dateKey) {
  const selected = new Set(factorTagLog[dateKey] || []);
  return `
    <div class="card no-print" id="factorTagWrap" style="padding:12px 16px; margin-bottom:10px;">
      <label style="display:block; font-weight:600; font-size:13px; margin-bottom:6px;">🧠 ${dateKey} は何が影響してそう？</label>
      <p class="note" style="margin:0 0 8px;">これはあなたの予想を残すだけの任意のメモです。医学的な原因の特定ではありません。義務ではないので、気が向いたときだけどうぞ（あとから見返しての「〜だったかも」も歓迎です）。</p>
      <div style="display:flex; flex-wrap:wrap; gap:6px;">
        ${FACTOR_TAGS.map(t => `<label class="chip no-print ${selected.has(t.id) ? 'on' : ''}" data-factor-tag="${t.id}">${t.emoji} ${t.label}</label>`).join('')}
      </div>
    </div>`;
}
function attachFactorTagHandlers(dateKey) {
  document.querySelectorAll('[data-factor-tag]').forEach(chip => {
    chip.addEventListener('click', () => {
      toggleFactorTag(dateKey, chip.dataset.factorTag);
      const wrap = document.getElementById('factorTagWrap');
      if (wrap) { wrap.outerHTML = buildFactorTagHtml(dateKey); attachFactorTagHandlers(dateKey); }
    });
  });
}

function renderCalendar() {
  renderWeeklySummary();
  renderHandoverCard();
  const moodTrendCard = document.getElementById('moodTrendCard');
  if (moodTrendCard) {
    const chart = buildMoodTrendSVG(records);
    if (chart) {
      moodTrendCard.hidden = false;
      moodTrendCard.innerHTML = `
        <label style="display:block; font-weight:600; font-size:12px; margin:2px 6px 2px;">📈 気分の推移（ドラッグまたはスクロールバーで過去も見られます）</label>
        <p class="note" id="moodTrendReadout" style="margin:0 6px 4px; font-weight:600;"></p>
        <div class="scrub-wrap">
          <div class="scrub-scroll" id="moodTrendScrub">${chart.html}</div>
        </div>
        <div class="hbar-track" id="moodTrendHbar"></div>`;
      setupScrubbableChart('moodTrendScrub', chart.xPositions, chart.todayIdx, (idx) => {
        const readout = document.getElementById('moodTrendReadout');
        if (!readout) return;
        const d = chart.dateKeys[idx];
        const diffDays = daysBetweenKeys(d, todayKey());
        const offsetText = diffDays === 0 ? '今日' : diffDays > 0 ? `${diffDays}日前` : `${-diffDays}日後`;
        readout.textContent = `${d}（${offsetText}）`;
      }, { align: 'end' });
      attachHScrollbar(document.getElementById('moodTrendScrub'), document.getElementById('moodTrendHbar'));
    } else {
      moodTrendCard.hidden = true;
    }
  }
  const grid = document.getElementById('calendarGrid');
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const first = new Date(y, m, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const byDate = {};
  records.forEach(r => { (byDate[r.dateKey] = byDate[r.dateKey] || []).push(r); });
  const dekitaDates = new Set((typeof dekitaLog !== 'undefined' ? dekitaLog : []).map(e => e.dateKey));

  const cells = [];
  for (let i=0; i<startWeekday; i++) cells.push('<div class="cal-cell empty"></div>');
  for (let d=1; d<=daysInMonth; d++) {
    const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayRecords = byDate[key] || [];
    const count = dayRecords.length;
    const moods = dayRecords.map(r => r.mood).filter(Boolean);
    const isToday = key === todayKey();
    const isSelected = key === selectedDate;
    let dot = '';
    if (moods.length) {
      const avgMood = Math.round(moods.reduce((a,b)=>a+b,0) / moods.length);
      dot = `<span class="cal-dot mood">${moodEmoji(avgMood)}</span>`;
    } else if (count) {
      dot = `<span class="cal-dot">${count}</span>`;
    }
    const wIcon = worstWeatherIcon(dayRecords);
    const periodMark = isPeriodDay(key) ? '●' : (isPredictedPeriodWindow(key) ? '·' : '');
    const hospitalMark = isHospitalDay(key) ? '🏥' : '';
    const dekitaMark = dekitaDates.has(key) ? '🌷' : '';
    cells.push(`<button class="cal-cell${isToday?' today':''}${isSelected?' selected':''}" data-date="${key}">
      <span class="cal-day">${d}</span>${dot}
      <span class="cal-marks">${wIcon}${hospitalMark}${dekitaMark}${periodMark ? `<span class="cal-period">${periodMark}</span>` : ''}</span>
    </button>`);
  }

  grid.innerHTML = `
    <div class="cal-head">
      <button class="btn-sub" id="calPrev">‹</button>
      <b>${y}年${m+1}月</b>
      <button class="btn-sub" id="calNext">›</button>
    </div>
    <div class="cal-week">${['日','月','火','水','木','金','土'].map(w=>`<span>${w}</span>`).join('')}</div>
    <div class="cal-grid">${cells.join('')}</div>
  `;

  document.getElementById('calPrev').addEventListener('click', () => { calMonth.setMonth(calMonth.getMonth()-1); renderCalendar(); });
  document.getElementById('calNext').addEventListener('click', () => { calMonth.setMonth(calMonth.getMonth()+1); renderCalendar(); });
  grid.querySelectorAll('.cal-cell[data-date]').forEach(el => {
    el.addEventListener('click', () => {
      selectedDate = el.dataset.date;
      renderCalendar();
      document.getElementById('dayEntries').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  renderDayEntries(selectedDate);
}

function periodToggleHtml(dateKey) {
  const on = isPeriodDay(dateKey);
  const avg = averageCycleLength();
  const next = predictedNextPeriodStart();
  const hOn = isHospitalDay(dateKey);
  return `
    <div class="card" style="padding:12px 16px; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button type="button" class="chip no-print ${on?'on':''}" id="periodToggleBtn">${dateKey} は生理${on?'（記録あり）':''}</button>
        <button type="button" class="chip no-print ${hOn?'on':''}" id="hospitalToggleBtn">🏥 ${dateKey} は通院日${hOn?'（記録あり）':''}</button>
      </div>
      <span class="note" style="margin:0;">${avg != null ? `平均周期 約${avg.toFixed(0)}日` : '2周期分たまると平均周期を計算します'}${next ? `　次回予測 ${next}ごろ` : ''}</span>
    </div>`;
}

// 記録に保存された「言葉から文章を作って伝える」の選択（tags）を、日ごとの記録カードに表示するための一文
// メモ欄に文章として挿入していなかった場合でも、選んだ言葉自体は記録に残っているのでここで振り返れるようにする
function rfTagsSentence(tags) {
  if (!tags) return '';
  try {
    const sentence = generateTsutaeruSentence({ ...tags, includeCheck: false, includeIntake: false });
    return sentence || '';
  } catch (e) {
    return '';
  }
}

function renderDayEntries(dateKey) {
  const box = document.getElementById('dayEntries');
  if (!dateKey) {
    box.innerHTML = `<p class="note">日付をタップすると、その日の記録が表示されます</p>`;
    return;
  }
  const list = records.filter(r => r.dateKey === dateKey).sort((a,b) => a.time.localeCompare(b.time));
  const periodHtml = periodToggleHtml(dateKey);
  const factorTagHtml = buildFactorTagHtml(dateKey);
  const dekitaDayHtml = buildDekitaDayHtml(dateKey);
  if (!list.length) {
    box.innerHTML = periodHtml + dekitaDayHtml + factorTagHtml + `<p class="note">${dateKey} の記録はまだありません</p>`;
    bindPeriodToggle(dateKey);
    attachFactorTagHandlers(dateKey);
    return;
  }
  box.innerHTML = periodHtml + dekitaDayHtml + factorTagHtml + list.map(r => `
    <div class="card">
      <div style="padding:14px 16px 0; display:flex; justify-content:space-between; align-items:center;">
        <b>${dateKey} ${r.time}${r.mood ? ` <span style="font-size:18px;">${moodEmoji(r.mood)}</span>` : ''}${r.sos ? ' <span class="chip on" style="font-size:11px; padding:2px 8px;">🆘 しんどいときモード</span>' : ''}</b>
        <button class="btn-link no-print" data-del="${r.id}">削除</button>
      </div>
      <div style="margin:8px 16px 0;">${weatherChips(r.weather)}</div>
      ${r.memo ? `<p class="lead" style="margin:8px 16px;">${escapeHtml(r.memo)}</p>` : ''}
      ${r.tags && rfTagsSentence(r.tags) ? `<p class="note" style="margin:4px 16px 8px;">📝 ${escapeHtml(rfTagsSentence(r.tags))}</p>` : ''}
      ${r.checkSnapshot && r.checkSnapshot.length ? `
        <div class="care-list" style="margin:0 16px 14px;">
          <b>体質チェック結果:</b>
          <ul style="margin:6px 0 0; padding-left:18px;">
            ${r.checkSnapshot.slice(0,3).map(x=>`<li>${x.name}（${x.count}/${x.total}）</li>`).join('')}
          </ul>
        </div>` : ''}
      ${r.intakeSnapshot && r.intakeSnapshot.length ? `
        <div class="care-list" style="margin:0 16px 14px;">
          <b>問診結果:</b>
          <ul style="margin:6px 0 0; padding-left:18px;">
            ${r.intakeSnapshot.slice(0,3).map(x=>`<li>${x.name}（${x.score}点）</li>`).join('')}
          </ul>
        </div>` : ''}
    </div>`).join('');

  box.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmClick(btn, 'もう一度押すと削除', () => {
        const idx = records.findIndex(r => r.id === btn.dataset.del);
        if (idx >= 0) records.splice(idx, 1);
        saveRecords();
        renderCalendar();
      });
    });
  });
  bindPeriodToggle(dateKey);
  attachFactorTagHandlers(dateKey);
}

function bindPeriodToggle(dateKey) {
  const btn = document.getElementById('periodToggleBtn');
  if (btn) btn.addEventListener('click', () => { togglePeriodDay(dateKey); renderCalendar(); });
  const hBtn = document.getElementById('hospitalToggleBtn');
  if (hBtn) hBtn.addEventListener('click', () => { toggleHospitalDay(dateKey); renderCalendar(); });
}

// ---------- 記録の一括印刷（設定・集計サマリー・日記形式） ----------
// 診察・相談で渡せるだけの情報量にするため、単なる記録の列挙ではなく、
// 問診タブの結果と同じように「集計してわかったこと」を先頭にまとめてから、時系列の記録を続ける。
const MOOD_LABEL = { 1: 'つらい', 2: 'ふつう', 3: '元気' };
function weatherSummaryText(w) {
  if (!w || w.status !== 'ok') return '';
  const parts = [];
  if (w.temp != null) parts.push(`${w.temp.toFixed(1)}℃`);
  if (w.pressure != null) parts.push(`${w.pressure.toFixed(0)}hPa`);
  if (w.humidity != null) parts.push(`${w.humidity.toFixed(0)}%`);
  if (w.windSpeed != null) parts.push(`風${w.windSpeed.toFixed(1)}m/s`);
  if (w.precipitation != null && w.precipitation > 0) parts.push(`降水${w.precipitation.toFixed(1)}mm/h`);
  const flags = [];
  if (w.official && w.official.rainLevel >= 1) flags.push(`【気象庁発表】${w.official.rainLabel}`);
  if (w.official && w.official.stormLevel >= 1) flags.push(`【気象庁発表】${w.official.stormLabel}`);
  if (w.linearRainbandFlag) flags.push('線状降水帯の目安');
  else if (w.heavyRainFlag) flags.push('大雨の目安');
  if (w.typhoonFlag) flags.push('台風の目安');
  if (w.extremeHeatFlag) flags.push('酷暑の目安');
  if (w.highHumidityFlag) flags.push('高湿度の目安');
  if (w.strongWindFlag) flags.push('強風の目安');
  if (w.pressureDropFlag) flags.push('気圧急降下の目安');
  return [parts.join(' '), flags.join('・')].filter(Boolean).join('　');
}

// ---- 印刷対象の記録を選ぶ（期間・間引き間隔・個別追加日） ----
let printExtraDates = new Set();
function initPrintConfigDefaults() {
  if (!records.length) return;
  const dates = records.map(r => r.dateKey).sort();
  const fromEl = document.getElementById('printFromDate');
  const toEl = document.getElementById('printToDate');
  if (fromEl && !fromEl.value) fromEl.value = dates[0];
  if (toEl && !toEl.value) toEl.value = dates[dates.length - 1];
}
function renderPrintExtraDateList() {
  const el = document.getElementById('printExtraDateList');
  if (!el) return;
  el.innerHTML = [...printExtraDates].sort().map(d => `<span class="chip on" data-extra="${d}">${d} ✕</span>`).join('');
  el.querySelectorAll('[data-extra]').forEach(chip => {
    chip.addEventListener('click', () => { printExtraDates.delete(chip.dataset.extra); renderPrintExtraDateList(); refreshPrintConfigSummary(); });
  });
}
// 「必ず入れる日」は件数上限なく、いくつでも追加できる（Setなので重複も自動で無視される）
function addPrintExtraDate() {
  const input = document.getElementById('printExtraDateInput');
  if (!input.value) return;
  printExtraDates.add(input.value);
  input.value = ''; // 続けて次の日付を入力しやすいようにクリアする
  input.focus();
  renderPrintExtraDateList();
  refreshPrintConfigSummary();
}
document.getElementById('printExtraDateAdd').addEventListener('click', addPrintExtraDate);
document.getElementById('printExtraDateInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); addPrintExtraDate(); }
});
function computePrintRecordsSubset() {
  const fromKey = document.getElementById('printFromDate').value;
  const toKey = document.getElementById('printToDate').value;
  const interval = Number(document.getElementById('printInterval').value) || 1;
  const included = records.filter(r => {
    if (printExtraDates.has(r.dateKey)) return true;
    if (!fromKey || !toKey) return true;
    if (r.dateKey < fromKey || r.dateKey > toKey) return false;
    if (interval <= 1) return true;
    return Math.abs(daysBetweenKeys(fromKey, r.dateKey)) % interval === 0;
  });
  return included.sort((a, b) => (a.dateKey + a.time).localeCompare(b.dateKey + b.time));
}

// ---- 集計サマリー各セクション ----
function buildPrintOverviewHTML(subset) {
  const days = new Set(subset.map(r => r.dateKey));
  const moodCounts = { 1: 0, 2: 0, 3: 0 };
  subset.forEach(r => { if (r.mood) moodCounts[r.mood]++; });
  const moodTotal = moodCounts[1] + moodCounts[2] + moodCounts[3];
  const moodText = moodTotal
    ? [1, 2, 3].map(m => `${MOOD_LABEL[m]} ${moodCounts[m]}件（${Math.round(moodCounts[m] / moodTotal * 100)}%）`).join('　')
    : '気分の記録なし';
  const rangeStart = subset.length ? subset[0].dateKey : null;
  const rangeEnd = subset.length ? subset[subset.length - 1].dateKey : null;
  const periodInRange = rangeStart ? [...periodDays].filter(d => d >= rangeStart && d <= rangeEnd) : [];
  const hospitalInRange = rangeStart ? [...hospitalDays].filter(d => d >= rangeStart && d <= rangeEnd).sort() : [];
  const avgCycle = averageCycleLength();
  const rows = [
    { label: '記録日数', value: `${days.size}日（${subset.length}件）` },
    { label: '気分の内訳', value: moodText },
  ];
  if (periodInRange.length) rows.push({ label: '生理記録', value: `期間中${periodInRange.length}日${avgCycle != null ? `（平均周期 約${avgCycle.toFixed(0)}日）` : ''}` });
  if (hospitalInRange.length) rows.push({ label: '通院記録', value: `${hospitalInRange.length}回（${hospitalInRange.join('、')}）` });
  return `<div class="pj-summary-block">${rows.map(r => `<div class="pj-stat-row"><span class="pj-stat-label">${r.label}</span><span class="pj-stat-value">${escapeHtml(r.value)}</span></div>`).join('')}</div>`;
}
function buildPrintSymptomRankingHTML(subset) {
  const stats = {};
  subset.forEach(r => {
    const words = new Set();
    if (r.memo) extractMemoKeywords(r.memo).forEach(w => words.add(w));
    if (r.tags) [...(r.tags.place || []), ...(r.tags.feel || []), ...(r.tags.mind || []), ...(r.tags.body || [])].forEach(w => words.add(w));
    words.forEach(w => {
      const b = stats[w] || (stats[w] = { count: 0, moodSum: 0, moodN: 0 });
      b.count++;
      if (r.mood) { b.moodSum += r.mood; b.moodN++; }
    });
  });
  const withMood = subset.filter(r => r.mood);
  const overallMood = withMood.length ? withMood.reduce((s, r) => s + r.mood, 0) / withMood.length : null;
  const rows = Object.entries(stats).sort((a, b) => b[1].count - a[1].count).slice(0, 12);
  if (!rows.length) return '<p class="note">記録されたメモ・言葉がまだありません。</p>';
  return `<ul class="pj-rank-list">${rows.map(([word, v]) => {
    const avgMood = v.moodN ? v.moodSum / v.moodN : null;
    let moodNote = '';
    if (avgMood != null && overallMood != null) {
      const diff = avgMood - overallMood;
      if (diff <= -0.3) moodNote = '　この言葉が出た日は気分が低めな傾向';
      else if (diff >= 0.3) moodNote = '　この言葉が出た日は気分が高めな傾向';
    }
    return `<li><b>${escapeHtml(word)}</b>　${v.count}回${moodNote}</li>`;
  }).join('')}</ul>`;
}
function buildPrintTaishitsuHTML(subset) {
  const counts = {};
  subset.forEach(r => {
    if (!r.checkSnapshot) return;
    r.checkSnapshot.forEach(c => {
      const b = counts[c.name] || (counts[c.name] = { count: 0, scoreSum: 0 });
      b.count++; b.scoreSum += c.count;
    });
  });
  const rows = Object.entries(counts).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  if (!rows.length) return '<p class="note">体質チェックを含む記録がまだありません。</p>';
  return `<ul class="pj-rank-list">${rows.map(([name, v]) => `<li><b>${escapeHtml(name)}</b>　${v.count}回登場（平均${(v.scoreSum / v.count).toFixed(1)}点）</li>`).join('')}</ul>`;
}
// 気象条件との相関・イベント比較・重回帰を、選んだ期間の記録だけを対象に計算し直す（分析タブと同じ統計エンジンを再利用）
function computePrintWeatherStats(subset) {
  const usable = subset.filter(r => r.weather && r.weather.status === 'ok');
  const moodRecords = usable.filter(r => r.mood);
  const useMood = moodRecords.length >= 5;
  const checkRecords = usable.filter(r => r.checkSnapshot && r.checkSnapshot.length);
  const withScore = useMood ? moodRecords : checkRecords;
  if (withScore.length < 5) return null;
  const severity = r => useMood ? (4 - r.mood) : r.checkSnapshot.reduce((s, x) => s + x.count, 0);
  const factors = REGRESSION_FACTORS.map(f => ({ ...f, accessor: {
    pressure: r => r.weather.pressure, pressureChange3h: r => r.weather.pressureChange3h,
    humidity: r => r.weather.humidity, temp: r => r.weather.temp, wind: r => r.weather.windSpeed,
  }[f.key] }));
  const corrList = factors.map(f => {
    const s = withScore.filter(r => f.accessor(r) != null);
    if (s.length < 5) return { key: f.key, label: f.label, r: null, n: s.length };
    const r = pearson(s.map(f.accessor), s.map(severity));
    return { key: f.key, label: f.label, r, n: s.length, p: r != null ? pearsonPValue(r, s.length) : null, ci: r != null ? pearsonCI95(r, s.length) : null };
  });
  const eventResults = EVENT_DEFS.map(ev => {
    const groupEvent = withScore.filter(ev.test).map(severity);
    const groupOther = withScore.filter(r => !ev.test(r)).map(severity);
    const stat = welchTTest(groupEvent, groupOther);
    return stat ? { ...ev, n1: groupEvent.length, n2: groupOther.length, stat } : null;
  }).filter(Boolean);
  const allP = [...corrList.map(c => c.p), ...eventResults.map(e => e.stat.p)];
  const allAdj = benjaminiHochberg(allP);
  corrList.forEach((c, i) => { c.pAdj = allAdj[i]; });
  eventResults.forEach((e, i) => { e.pAdj = allAdj[corrList.length + i]; });

  const regressionRows = withScore
    .filter(r => r.weather.pressure != null && r.weather.pressureChange3h != null && r.weather.humidity != null && r.weather.temp != null && r.weather.windSpeed != null)
    .map(r => ({ pressure: r.weather.pressure, pressureChange3h: r.weather.pressureChange3h, humidity: r.weather.humidity, temp: r.weather.temp, wind: r.weather.windSpeed, y: severity(r) }));
  const regression = multipleRegression(regressionRows, REGRESSION_FACTORS.map(f => f.key));
  if (regression) {
    const regAdj = benjaminiHochberg(regression.results.map(r => r.p));
    regression.results.forEach((r, i) => { r.label = REGRESSION_FACTORS[i].label; r.pAdj = regAdj[i]; });
  }
  return { corrList, eventResults, regression, scoreLabel: useMood ? '記録した気分' : '体質チェックでのつらさ' };
}
function buildPrintWeatherHTML(subset) {
  const stats = computePrintWeatherStats(subset);
  if (!stats) return '<p class="note">気象条件との関連を見るには、この期間にあと数件記録が必要です。</p>';
  let html = `<p class="note" style="margin:0 0 6px;">指標：${escapeHtml(stats.scoreLabel)}</p>`;
  html += `<ul class="pj-rank-list">${stats.corrList.map(c => `<li>${corrHedgedText(c)}</li>`).join('')}</ul>`;
  if (stats.eventResults.length) {
    html += `<h4 class="pj-subhead">イベント日との比較</h4><ul class="pj-rank-list">${stats.eventResults.map(e => `<li>${eventHedgedText(e)}</li>`).join('')}</ul>`;
  }
  if (stats.regression) {
    html += `<h4 class="pj-subhead">重回帰分析（他の要因を調整した関連・有効記録${stats.regression.n}件）</h4><ul class="pj-rank-list">${stats.regression.results.map(r => `<li>${regressionRowText(r, stats.corrList)}</li>`).join('')}</ul>`;
  }
  return html;
}

function buildRecordJournalHTML(subset) {
  if (!subset.length) return '<p>選んだ条件に一致する記録がありません。</p>';
  const first = subset[0], last = subset[subset.length - 1];
  const now = new Date();
  const entries = subset.map(r => {
    const [y, m, d] = r.dateKey.split('-').map(Number);
    const wd = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, m - 1, d).getDay()];
    const moodText = r.mood ? `　${moodEmoji(r.mood)} ${MOOD_LABEL[r.mood]}` : '';
    const periodText = isPeriodDay(r.dateKey) ? '　●生理' : '';
    const hospitalText = isHospitalDay(r.dateKey) ? '　🏥通院' : '';
    const sosText = r.sos ? '　🆘しんどいときモード' : '';
    const wText = weatherSummaryText(r.weather);
    const tagText = r.tags ? generateTsutaeruSentence(Object.assign({ when: null, degree: null, place: [], feel: [], mind: [], body: [] }, r.tags)) : '';
    const checkText = r.checkSnapshot && r.checkSnapshot.length ? `体質チェック: ${r.checkSnapshot.slice(0, 3).map(x => `${x.name}(${x.count}/${x.total})`).join('、')}` : '';
    const intakeText = r.intakeSnapshot && r.intakeSnapshot.length ? `問診: ${r.intakeSnapshot.slice(0, 3).map(x => `${x.name}(${x.score}点)`).join('、')}` : '';
    return `
      <div class="pj-entry">
        <div class="pj-head">${r.dateKey}（${wd}）${r.time}${moodText}${periodText}${hospitalText}${sosText}</div>
        ${wText ? `<div class="pj-badges">${escapeHtml(wText)}</div>` : ''}
        ${checkText ? `<div class="pj-badges">${escapeHtml(checkText)}</div>` : ''}
        ${intakeText ? `<div class="pj-badges">${escapeHtml(intakeText)}</div>` : ''}
        ${tagText && tagText !== '気になる言葉を選ぶと、ここに文章が自動で作られます。' ? `<div class="pj-badges">選んだ言葉: ${escapeHtml(tagText)}</div>` : ''}
        ${r.memo ? `<div class="pj-memo">${escapeHtml(r.memo)}</div>` : ''}
      </div>`;
  }).join('');
  return `
    <div class="print-journal">
      <h2>体調記録</h2>
      <p class="pj-meta">対象期間：${first.dateKey}〜${last.dateKey}（${subset.length}件）　印刷日時：${todayKey(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}</p>
      <h3 class="pj-sechead">記録の概要</h3>
      ${buildPrintOverviewHTML(subset)}
      <h3 class="pj-sechead">よく出てくる症状・言葉</h3>
      ${buildPrintSymptomRankingHTML(subset)}
      <h3 class="pj-sechead">体質チェックの傾向</h3>
      ${buildPrintTaishitsuHTML(subset)}
      <h3 class="pj-sechead">気象条件との関連</h3>
      ${buildPrintWeatherHTML(subset)}
      <p class="note" style="margin:6px 0 0;">※ 相関係数・p値等の統計指標は、あなた自身の記録だけにもとづく参考情報です。医学的な診断や因果関係の証明ではありません。</p>
      <h3 class="pj-sechead">記録の詳細（時系列）</h3>
      ${entries}
    </div>`;
}
document.getElementById('printAllRecordsBtn').addEventListener('click', () => {
  const subset = computePrintRecordsSubset();
  if (!subset.length) { alert('選んだ条件に一致する記録がありません'); return; }
  document.getElementById('recordJournalPrintView').innerHTML = buildRecordJournalHTML(subset);
  printResult();
});
// 期間・間隔を変えるたびに、今の条件で何件が対象になるかをその場で表示する
function refreshPrintConfigSummary() {
  const summaryEl = document.getElementById('printConfigSummary');
  if (!summaryEl) return;
  if (!records.length) { summaryEl.textContent = 'まだ記録がありません'; return; }
  const subset = computePrintRecordsSubset();
  summaryEl.textContent = `現在の条件で ${subset.length}件 が対象です`;
}
['printFromDate', 'printToDate', 'printInterval'].forEach(id => {
  document.getElementById(id).addEventListener('change', refreshPrintConfigSummary);
});
initPrintConfigDefaults();
renderPrintExtraDateList();
refreshPrintConfigSummary();

document.querySelectorAll('#recordSeg .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#recordSeg .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    recordSeg = btn.dataset.seg;
    document.getElementById('calendarView').hidden = recordSeg !== 'calendar';
    document.getElementById('analysisView').hidden = recordSeg !== 'analysis';
    if (recordSeg === 'analysis') renderAnalysis();
  });
});

// ---------- 分析: ピアソン相関係数 ----------
function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((a,b)=>a+b,0)/n, my = ys.reduce((a,b)=>a+b,0)/n;
  let num=0, dx2=0, dy2=0;
  for (let i=0;i<n;i++) { const dx=xs[i]-mx, dy=ys[i]-my; num+=dx*dy; dx2+=dx*dx; dy2+=dy*dy; }
  const den = Math.sqrt(dx2*dy2);
  return den === 0 ? null : num/den;
}

// ---------- 統計ユーティリティ（t分布のp値・信頼区間・多重比較補正） ----------
// 外部の統計ライブラリを使わず、Numerical Recipes方式の正則化不完全ベータ関数で
// 相関係数の有意性（p値）を計算する。ログガンマはLanczos近似を使用。
function logGamma(x) {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
function betacf(x, a, b) {
  const MAXIT = 200, EPS = 3e-9, FPMIN = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
function betai(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return bt * betacf(x, a, b) / a;
  return 1 - bt * betacf(1 - x, b, a) / b;
}
// t統計量と自由度から両側p値を求める（相関のt検定・Welchのt検定・重回帰係数のt検定で共通利用）
function studentTPValue(t, df) {
  if (df == null || df <= 0) return null;
  const absT = Math.abs(t);
  return betai(df / (df + absT * absT), df / 2, 0.5);
}
// 相関係数rの両側p値（自由度 n-2 のt分布）
function pearsonPValue(r, n) {
  if (r == null || n < 3) return null;
  const df = n - 2;
  if (Math.abs(r) >= 1) return 0;
  const t = Math.abs(r) * Math.sqrt(df / (1 - r * r));
  return studentTPValue(t, df);
}
// Welchのt検定（両群の分散が異なることを仮定した2標本比較）。台風の日/そうでない日、のような
// 「イベントの有無」で不調度を比較するために使う。Cohenのdも合わせて返す。
function welchTTest(groupA, groupB) {
  const n1 = groupA.length, n2 = groupB.length;
  if (n1 < 3 || n2 < 3) return null;
  const mean = arr => arr.reduce((a,b)=>a+b,0) / arr.length;
  const variance = (arr, m) => arr.reduce((s,v)=>s+(v-m)*(v-m),0) / (arr.length - 1);
  const m1 = mean(groupA), m2 = mean(groupB);
  const v1 = variance(groupA, m1), v2 = variance(groupB, m2);
  const se2 = v1 / n1 + v2 / n2;
  if (se2 <= 0) return null;
  const t = (m1 - m2) / Math.sqrt(se2);
  const df = (se2 * se2) / (((v1/n1)*(v1/n1))/(n1-1) + ((v2/n2)*(v2/n2))/(n2-1));
  const pooledSD = Math.sqrt(((n1-1)*v1 + (n2-1)*v2) / (n1+n2-2));
  const cohend = pooledSD > 0 ? (m1 - m2) / pooledSD : null;
  return { t, df, p: studentTPValue(t, df), meanA: m1, meanB: m2, n1, n2, cohend };
}
// 2群の出現率（割合）の差を検定する（大標本近似：自由度の大きいt分布は正規分布に収束することを利用）
function twoProportionZTest(x1, n1, x2, n2) {
  if (n1 < 3 || n2 < 3) return null;
  const p1 = x1 / n1, p2 = x2 / n2;
  const pooled = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pooled * (1 - pooled) * (1/n1 + 1/n2));
  if (se === 0) return null;
  const z = (p1 - p2) / se;
  return { p1, p2, diff: p1 - p2, z, p: studentTPValue(z, 100000) };
}
// ---------- 行列ユーティリティ（重回帰分析用） ----------
function matTranspose(A) { return A[0].map((_, j) => A.map(row => row[j])); }
function matMultiply(A, B) {
  const rows = A.length, cols = B[0].length, inner = B.length;
  const out = [];
  for (let i = 0; i < rows; i++) {
    out.push(new Array(cols).fill(0));
    for (let k = 0; k < inner; k++) {
      const a = A[i][k];
      if (a === 0) continue;
      for (let j = 0; j < cols; j++) out[i][j] += a * B[k][j];
    }
  }
  return out;
}
// Gauss-Jordan消去法による逆行列（多重共線性が強すぎて特異行列になる場合はnullを返す）
function matInverse(A) {
  const n = A.length;
  const aug = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(aug[r][col]) > Math.abs(aug[pivotRow][col])) pivotRow = r;
    if (Math.abs(aug[pivotRow][col]) < 1e-9) return null;
    [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = aug[r][col];
      if (factor === 0) continue;
      for (let j = 0; j < 2 * n; j++) aug[r][j] -= factor * aug[col][j];
    }
  }
  return aug.map(row => row.slice(n));
}
function meanSd(arr) {
  const n = arr.length;
  const mean = arr.reduce((a,b)=>a+b,0) / n;
  const sd = Math.sqrt(arr.reduce((s,v)=>s+(v-mean)*(v-mean),0) / (n - 1)) || 1;
  return { mean, sd };
}
function standardize(arr) {
  const { mean, sd } = meanSd(arr);
  return arr.map(v => (v - mean) / sd);
}
// 標準化重回帰（最小二乗法）。気圧・気圧変化・湿度・気温・風速を同時にモデルへ入れることで、
// 「他の要因を一定とみなしたときに、この要因だけがどれくらい体調と関連しているか」（＝交絡の調整）を見る。
// 単相関では強く見えた要因が、他の要因を考慮すると弱まる（＝他の要因と一緒に動いていただけ）ことがある。
function multipleRegression(rows, factorKeys) {
  const n = rows.length;
  const p = factorKeys.length;
  if (n < p + 3) return null;
  const yStats = meanSd(rows.map(r => r.y));
  const factorStats = {};
  factorKeys.forEach(k => { factorStats[k] = meanSd(rows.map(r => r[k])); });
  const y = standardize(rows.map(r => r.y));
  const X = factorKeys.map(k => standardize(rows.map(r => r[k])));
  const design = rows.map((_, i) => [1, ...X.map(col => col[i])]);
  const Xt = matTranspose(design);
  const XtX = matMultiply(Xt, design);
  const XtXinv = matInverse(XtX);
  if (!XtXinv) return null;
  const XtY = matMultiply(Xt, y.map(v => [v]));
  const betaVec = matMultiply(XtXinv, XtY).map(row => row[0]);
  const yHat = matMultiply(design, betaVec.map(b => [b])).map(row => row[0]);
  const dfResid = n - p - 1;
  if (dfResid < 1) return null;
  const rss = y.reduce((s, v, i) => s + (v - yHat[i]) * (v - yHat[i]), 0);
  const tss = y.reduce((s, v) => s + v * v, 0); // yは標準化済み（平均0）なのでtssは中心化済み平方和と一致
  const r2 = tss > 0 ? 1 - rss / tss : null;
  const mse = rss / dfResid;
  const tCrit = tCritical95(dfResid);
  const results = factorKeys.map((k, i) => {
    const beta = betaVec[i + 1];
    const se = Math.sqrt(Math.max(0, mse * XtXinv[i + 1][i + 1]));
    const t = se > 0 ? beta / se : 0;
    const ci = tCrit != null ? [beta - tCrit * se, beta + tCrit * se] : null;
    return { key: k, beta, se, t, p: studentTPValue(t, dfResid), ci };
  });
  return { n, p, r2, dfResid, results, yStats, factorStats, intercept: betaVec[0] };
}
// 自由度dfのt分布における両側95%臨界値。既存のp値関数（studentTPValue）は単調減少なので、
// 目的のp=0.05になるtを二分探索で逆算する（専用の分位点関数を別途持たずに済ませるため）
function tCritical95(df) {
  if (df == null || df <= 0) return null;
  let lo = 0, hi = 60;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const p = studentTPValue(mid, df);
    if (p > 0.05) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
// leave-one-out交差検証によるQ²（LOOCVでのR²相当）。通常のR²は学習に使ったデータへの当てはまりの良さでしかなく、
// 記録数が少ないほど過大評価されやすい。1件を除いて残りでモデルを作り直し、除いた1件をどれだけ言い当てられるかを
// 全件について繰り返すことで、モデルが記録データに過学習していないかの目安にする。
function computeLOOCVQ2(rows, factorKeys) {
  const n = rows.length;
  if (n < factorKeys.length + 6) return null;
  const yMean = rows.reduce((s, r) => s + r.y, 0) / n;
  let ssRes = 0, ssTot = 0, usable = 0;
  const points = []; // キャリブレーション表示（予測 vs 実際）用に、1件ずつの予測値も残しておく
  for (let i = 0; i < n; i++) {
    const trainRows = rows.filter((_, j) => j !== i);
    const model = multipleRegression(trainRows, factorKeys);
    if (!model) continue;
    let zPred = model.intercept;
    factorKeys.forEach((k, idx) => {
      const stat = model.factorStats[k];
      if (!stat || stat.sd === 0) return;
      zPred += model.results[idx].beta * ((rows[i][k] - stat.mean) / stat.sd);
    });
    const yPred = model.yStats.mean + zPred * model.yStats.sd;
    ssRes += (rows[i].y - yPred) ** 2;
    ssTot += (rows[i].y - yMean) ** 2;
    usable++;
    points.push({ actual: rows[i].y, predicted: yPred });
  }
  if (usable < factorKeys.length + 6 || ssTot === 0) return null;
  return { q2: 1 - ssRes / ssTot, n: usable, points };
}
// Q²のキャリブレーション表示：LOOCVでの予測値（そのデータを除いて作ったモデルによる予測）と、
// 実際に記録した値を散布図にする。点が点線（予測=実際）に近いほど、予測が当たっていたことになる。
function buildCalibrationScatterSVG(points) {
  if (!points || points.length < 6) return '<p class="note">まだ図にできるだけの記録がありません。</p>';
  const W = 320, H = 240, pad = 32;
  const allVals = points.flatMap(p => [p.actual, p.predicted]);
  const lo = Math.min(...allVals), hi = Math.max(...allVals);
  const scaleX = v => pad + (hi > lo ? (v - lo) / (hi - lo) : 0.5) * (W - 2 * pad);
  const scaleY = v => (H - pad) - (hi > lo ? (v - lo) / (hi - lo) : 0.5) * (H - 2 * pad);
  const dots = points.map(p => `<circle cx="${scaleX(p.predicted).toFixed(1)}" cy="${scaleY(p.actual).toFixed(1)}" r="3" fill="var(--accent)" opacity="0.75" />`).join('');
  const diagLine = `<line x1="${scaleX(lo).toFixed(1)}" y1="${scaleY(lo).toFixed(1)}" x2="${scaleX(hi).toFixed(1)}" y2="${scaleY(hi).toFixed(1)}" stroke="var(--border)" stroke-dasharray="4,3" />`;
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%; max-width:340px; height:auto; display:block;" role="img" aria-label="LOOCVで予測した不調度と実際の不調度の比較（点線に近いほど予測が当たっている）">
    ${diagLine}
    ${dots}
    <text x="${pad}" y="16" font-size="9" fill="var(--ink-sub)">実際（縦）</text>
    <text x="${W - pad}" y="${H - 12}" font-size="9" fill="var(--ink-sub)" text-anchor="end">予測（横）</text>
  </svg>`;
}
// 1つの気象要因と体調の関係が、直線ではなく途中で傾きが変わっていそうか（閾値のような反応）を、
// 値を5つの区間に分けてそれぞれの平均を線でつなぐ、簡易版GAMのような形で確認する。
// 新しい回帰モデルを作るわけではなく、記録を並べ替えて区間ごとに平均を取っているだけの単純な集計。
function computeBinnedRelationship(rows, accessor, severityFn, bins = 5) {
  const pairs = rows.map(r => ({ x: accessor(r), y: severityFn(r) })).filter(p => p.x != null && p.y != null);
  if (pairs.length < bins * 3) return null;
  pairs.sort((a, b) => a.x - b.x);
  const n = pairs.length;
  const binSize = Math.floor(n / bins);
  const result = [];
  for (let i = 0; i < bins; i++) {
    const start = i * binSize;
    const end = i === bins - 1 ? n : start + binSize;
    const slice = pairs.slice(start, end);
    if (!slice.length) continue;
    result.push({
      xMean: slice.reduce((s, p) => s + p.x, 0) / slice.length,
      yMean: slice.reduce((s, p) => s + p.y, 0) / slice.length,
      n: slice.length,
    });
  }
  return result.length >= 3 ? result : null;
}
function binnedRelationshipShapeText(binsData) {
  const diffs = [];
  for (let i = 1; i < binsData.length; i++) diffs.push(binsData[i].yMean - binsData[i - 1].yMean);
  const signs = diffs.map(d => Math.abs(d) < 1e-6 ? 0 : Math.sign(d));
  const nonZero = signs.filter(s => s !== 0);
  const allSameSign = nonZero.length > 0 && nonZero.every(s => s === nonZero[0]);
  return allSameSign
    ? '区間ごとに見ても、ほぼ一定方向に変化しており、直線的な関係に近そうです。'
    : '区間によって変化の向きが一定でなく、直線的な関係ではなく、途中に傾向の変わり目（閾値のようなもの）がある可能性があります。';
}
function buildBinnedRelationshipSVG(binsData, label) {
  const W = 320, H = 140, padL = 34, padR = 14, padT = 14, padB = 26;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const xs = binsData.map(b => b.xMean), ys = binsData.map(b => b.yMean);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const x = v => padL + (xMax > xMin ? (v - xMin) / (xMax - xMin) : 0.5) * plotW;
  const y = v => padT + plotH - (yMax > yMin ? (v - yMin) / (yMax - yMin) : 0.5) * plotH;
  const points = binsData.map(b => `${x(b.xMean).toFixed(1)},${y(b.yMean).toFixed(1)}`).join(' ');
  const dots = binsData.map(b => `<circle cx="${x(b.xMean).toFixed(1)}" cy="${y(b.yMean).toFixed(1)}" r="3.5" fill="var(--accent)" />`).join('');
  const labels = binsData.map(b => `<text x="${x(b.xMean).toFixed(1)}" y="${H - 8}" font-size="9" fill="var(--ink-sub)" text-anchor="middle">${b.xMean.toFixed(1)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%; max-width:360px; height:auto; display:block;" role="img" aria-label="${escapeHtml(label)}と不調度の関係（区間ごとの平均）">
    <polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="2" />
    ${dots}
    ${labels}
  </svg>`;
}
// 分散拡大要因（VIF）：ある気象要因が、他の気象要因だけからどれだけ予測できてしまうかを見る。
// 気圧と気圧の変化のように要因同士が強く関連していると、重回帰の係数（β）の推定が不安定になる
// （多重共線性）ため、その目安として提示する。一般的にVIF>=10で強い多重共線性の目安とされる。
function computeVIF(rows, factorKeys) {
  return factorKeys.map(target => {
    const others = factorKeys.filter(k => k !== target);
    if (others.length < 2) return { key: target, vif: null };
    const subRows = rows.map(r => ({ ...r, y: r[target] }));
    const model = multipleRegression(subRows, others);
    if (!model || model.r2 == null || model.r2 >= 0.999) return { key: target, vif: null };
    return { key: target, vif: 1 / (1 - model.r2) };
  });
}
// フィッシャーのz変換による相関係数の95%信頼区間
function pearsonCI95(r, n) {
  if (r == null || n < 4 || Math.abs(r) >= 1) return null;
  const z = 0.5 * Math.log((1 + r) / (1 - r));
  const se = 1 / Math.sqrt(n - 3);
  return [Math.tanh(z - 1.96 * se), Math.tanh(z + 1.96 * se)];
}
// Benjamini-Hochberg法による多重比較（偽発見率）補正。複数の気象因子を同時に検定しているため、
// 単独のp値だけでは「たまたま5個試したうちの1個が当たった」偶然を見分けられないことに対応する。
function benjaminiHochberg(pValues) {
  const idx = pValues.map((p, i) => ({ p, i })).filter(x => x.p != null);
  const m = idx.length;
  const sorted = [...idx].sort((a, b) => a.p - b.p);
  const adjusted = new Array(pValues.length).fill(null);
  let prevMin = 1;
  for (let k = m - 1; k >= 0; k--) {
    const raw = sorted[k].p * m / (k + 1);
    prevMin = Math.min(prevMin, raw);
    adjusted[sorted[k].i] = Math.min(1, prevMin);
  }
  return adjusted;
}
// Cohenの目安による効果量の言語化
function effectSizeLabel(r) {
  const a = Math.abs(r);
  if (a < 0.1) return '無視できる程度';
  if (a < 0.3) return '小さい';
  if (a < 0.5) return '中程度';
  return '大きい';
}

// r（相関係数）を、統計用語だけに頼らず「〜かもしれません」という参考程度の文章にする
function corrHedgedText(c) {
  const { label, r, n, p, pAdj, ci } = c;
  if (r == null) return `${label}との関連は、記録が少なく算出できませんでした（有効な記録${n}件）。`;
  const a = Math.abs(r);
  const dir = r > 0 ? '高い' : '低い';
  const effect = effectSizeLabel(r);
  const ciText = ci ? `95%信頼区間 ${ci[0].toFixed(2)}〜${ci[1].toFixed(2)}` : '信頼区間は記録数不足のため未算出';
  const sigText = (pAdj != null && pAdj < 0.05)
    ? '他の気象項目とまとめて検定した補正後でも、統計的に意味のありそうな関連です'
    : (p != null && p < 0.05)
      ? '単独では有意水準に達していますが、複数項目を同時に見ているため偶然の可能性も残ります'
      : 'この記録数では統計的に「意味がある」とまでは言い切れない範囲です';
  if (a < 0.1) return `${label}とのはっきりした関連は見られませんでした（r=${r.toFixed(2)}、効果量: ${effect}、記録${n}件）。`;
  return `${label}が${dir}日に、体調が優れないと感じることが多かったようです（r=${r.toFixed(2)}［${ciText}］、効果量: ${effect}。${sigText}。記録${n}件）`;
}

// Cohenの目安によるd（2群比較の効果量）の言語化
function cohenDLabel(d) {
  const a = Math.abs(d);
  if (a < 0.2) return '無視できる程度';
  if (a < 0.5) return '小さい';
  if (a < 0.8) return '中程度';
  return '大きい';
}

// ---------- 曜日ランキング（遊び心のある切り口。新しい統計モデルではなく、曜日ごとに平均を並べただけ） ----------
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
function computeWeekdayStats(withScore, severityFn) {
  const byWeekday = Array.from({ length: 7 }, () => []);
  withScore.forEach(r => {
    const dow = new Date(`${r.dateKey}T00:00:00`).getDay();
    byWeekday[dow].push(severityFn(r));
  });
  const rows = byWeekday
    .map((arr, dow) => arr.length ? { day: WEEKDAY_LABELS[dow], dow, avg: arr.reduce((a, b) => a + b, 0) / arr.length, n: arr.length } : null)
    .filter(Boolean);
  const weekdayVals = [];
  const weekendVals = [];
  withScore.forEach(r => {
    const dow = new Date(`${r.dateKey}T00:00:00`).getDay();
    (dow === 0 || dow === 6 ? weekendVals : weekdayVals).push(severityFn(r));
  });
  const weekdayVsWeekend = welchTTest(weekdayVals, weekendVals);
  return { rows, weekdayVsWeekend };
}
function weekdayVsWeekendText(stat) {
  if (!stat) return null;
  const worse = stat.meanA > stat.meanB; // A=平日, B=休日（severityは高いほど不調）
  const sigText = stat.p != null && stat.p < 0.05 ? '統計的にも意味のありそうな差です' : 'この記録数ではまだ「意味がある」とまでは言い切れません';
  return `平日と休日で比べると、${worse ? '平日の方が不調度高め' : '休日の方が不調度高め'}の傾向でした（効果量 d=${stat.cohend != null ? stat.cohend.toFixed(2) : '-'}［${cohenDLabel(stat.cohend)}］。${sigText}）`;
}

// ---------- 不調度の分布チェック（山が1つか、2つ以上に分かれているか） ----------
function computeSeverityHistogram(values, bins = 6) {
  if (values.length < 10) return null;
  const lo = Math.min(...values), hi = Math.max(...values);
  if (hi === lo) return null;
  const width = (hi - lo) / bins;
  const counts = new Array(bins).fill(0);
  values.forEach(v => {
    let idx = Math.floor((v - lo) / width);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  });
  return { counts, lo, hi, width, bins };
}
function histogramShapeText(hist) {
  const { counts } = hist;
  const peakBins = [];
  for (let i = 0; i < counts.length; i++) {
    const prev = i > 0 ? counts[i - 1] : -Infinity;
    const next = i < counts.length - 1 ? counts[i + 1] : -Infinity;
    if (counts[i] > 1 && counts[i] >= prev && counts[i] >= next) peakBins.push(i);
  }
  const merged = [];
  peakBins.forEach(i => { if (!merged.length || i - merged[merged.length - 1] > 1) merged.push(i); });
  return merged.length <= 1
    ? 'なだらかに1つの山がある分布で、「まあまあの日」を中心に、良い日・悪い日へ緩やかに広がっている形です。'
    : `山が${merged.length}つある分布に見えます。「調子がいい日」と「調子が悪い日」がはっきり分かれている可能性があります（天気以外にも、曜日や生理周期など別の要因が関わっているのかもしれません）。`;
}
function buildHistogramSVG(hist) {
  const W = 320, H = 140, padL = 10, padR = 10, padT = 16, padB = 20;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const maxCount = Math.max(...hist.counts, 1);
  const barW = plotW / hist.bins;
  const bars = hist.counts.map((c, i) => {
    const h = (c / maxCount) * plotH;
    const x = padL + i * barW;
    const y = padT + plotH - h;
    return `<rect x="${(x + 2).toFixed(1)}" y="${y.toFixed(1)}" width="${(barW - 4).toFixed(1)}" height="${h.toFixed(1)}" fill="var(--accent)" opacity="0.85" />` +
      (c > 0 ? `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" font-size="9" fill="var(--ink-sub)" text-anchor="middle">${c}</text>` : '');
  }).join('');
  const labels = hist.counts.map((_, i) => {
    const v = hist.lo + i * hist.width;
    return `<text x="${(padL + i * barW + barW / 2).toFixed(1)}" y="${H - 6}" font-size="8" fill="var(--ink-sub)" text-anchor="middle">${v.toFixed(1)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%; max-width:340px; height:auto; display:block;" role="img" aria-label="不調度の分布">${bars}${labels}</svg>`;
}
// イベント比較（大雨の日 vs それ以外、など）の結果を、統計指標つきの参考程度の文章にする
function eventHedgedText(e) {
  const { label, n1, n2, stat, pAdj } = e;
  const worse = stat.meanA > stat.meanB;
  const sigText = (pAdj != null && pAdj < 0.05)
    ? '他の項目とまとめて検定した補正後でも、統計的に意味のありそうな差です'
    : (stat.p != null && stat.p < 0.05)
      ? '単独では有意水準に達していますが、複数項目を同時に見ているため偶然の可能性も残ります'
      : 'この記録数では統計的に「意味がある」とまでは言い切れない差です';
  if (stat.cohend == null || Math.abs(stat.cohend) < 0.2) {
    return `${label}の日（${n1}件）とそれ以外の日（${n2}件）で、はっきりした不調度の違いは見られませんでした（d=${stat.cohend!=null?stat.cohend.toFixed(2):'-'}）。`;
  }
  return `${label}の日（${n1}件）は、それ以外の日（${n2}件）より不調度が${worse?'高い':'低い'}傾向がありました（効果量 d=${stat.cohend.toFixed(2)}［${cohenDLabel(stat.cohend)}］。${sigText}）`;
}
// 重回帰係数を、単相関の結果と比べながら文章にする（交絡の有無が伝わるように）
function regressionRowText(row, corrList) {
  const corr = corrList.find(c => c.key === row.key);
  const sigText = (row.pAdj != null && row.pAdj < 0.05) ? '他の要因を調整した後でも統計的に意味のありそうな関連です'
    : '他の要因を調整すると、統計的に意味があるとまでは言えなくなりました';
  let confound = '';
  if (corr && corr.r != null) {
    const cSig = corr.p != null && corr.p < 0.05;
    const rSig = row.p != null && row.p < 0.05;
    if (cSig && !rSig) confound = '（単独で見た時より関連が弱くなっており、他の気象要因と一緒に動いていた可能性があります）';
    else if (!cSig && rSig) confound = '（単独で見た時は目立たなかったのに、他の要因を調整すると関連が見えてきました）';
  }
  const dir = row.beta > 0 ? '高いほど' : '低いほど';
  return `${row.label}: 標準化係数 β=${row.beta.toFixed(2)}（${dir}不調寄り、p=${row.p!=null?row.p.toFixed(3):'-'}）。${sigText}${confound}`;
}

function buildWeatherNarrative(corrList, length) {
  const sorted = corrList.filter(c => c.r != null && Math.abs(c.r) >= 0.2).sort((a,b) => Math.abs(b.r) - Math.abs(a.r));
  if (!sorted.length) return '今のところ、気温・気圧・気圧の変化・湿度・風速と体調のはっきりした関連は見つかりませんでした。もう少し記録が増えると傾向が見えてくるかもしれません。';
  const top = sorted[0];
  const dir = top.r > 0 ? '高い' : '低い';
  let text = `${top.label}が${dir}日に、体調が優れないと感じることが多かったようです。`;
  if (length === 'short') return text + '（あくまで参考程度に）';
  text += `（記録${top.n}件、関連の強さ r=${top.r.toFixed(2)}、効果量: ${effectSizeLabel(top.r)}${top.pAdj != null ? `、多重比較補正後 p=${top.pAdj.toFixed(3)}` : ''}）`;
  if (sorted[1] && Math.abs(sorted[1].r) >= 0.2) {
    const second = sorted[1];
    text += ` ${second.label}についても${second.r>0?'高い':'低い'}日にやや不調が出やすい傾向がありました。`;
  }
  if (length === 'medium') return text + ' あくまで参考程度に受け止めてください。';
  text += ' ただしこれはあなた個人の記録にもとづく統計的な目安で、医学的な診断ではありません。記録数が少ないと偶然の一致で数値が出ることもあります。天気以外にも睡眠・食事・ストレスなど様々な要因が体調に影響するため、数ある可能性のひとつとして参考にしてください。';
  return text;
}

function buildMethodNarrative(length) {
  let text = '記録した日の気温・気圧・気圧の変化（3時間あたり）・湿度・風速と、記録した体調の関連の強さを「相関係数」という数値で計算しています。';
  if (length === 'short') return text;
  text += '1に近いほど関連が強く、0に近いほど関連が薄いことを示す統計の指標で、原因と結果を証明するものではありません。';
  if (length === 'medium') return text;
  text += 'サンプル数が少ないと、偶然そう見えているだけの可能性もあります。また、気圧・湿度・気温など複数の項目を同時に調べているため、たまたま1つだけ数値が高く出ることもあります。これを防ぐため、各項目の信頼区間（真の値がだいたいこの範囲に収まるという幅）を示すとともに、Benjamini-Hochberg法という手法で複数比較後のp値を補正しています。それでもこの分析はあなた個人の記録だけを使った参考情報で、体調不良の原因を断定するものではないので、「こういう理由かもしれない」くらいの気持ちで見てください。';
  return text;
}

// 明日の気象予報（Open-Meteoのhourlyから明日分だけ平均する）
// 今日から最大7日先までの気象予報。1日ごとの集計（週間の見通し用）と、
// 直近48時間の時間別データ（一日の推移グラフ用）の両方を返す。
async function fetchForecastDays(lat, lon, days = 7) {
  // pressure_msl（海面更正気圧）を使う。理由はfetchWeatherAt内のコメントを参照
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=pressure_msl,temperature_2m,apparent_temperature,dew_point_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,precipitation_probability,relative_humidity_2m,weather_code` +
    `&wind_speed_unit=ms&forecast_days=${days + 1}&past_days=1&timezone=Asia%2FTokyo`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('forecast-fetch-failed');
  const j = await res.json();
  const times = j.hourly.time;
  const todayK = todayKey();

  const byDate = {};
  times.forEach((t, i) => { (byDate[t.slice(0, 10)] = byDate[t.slice(0, 10)] || []).push(i); });
  const dateKeys = Object.keys(byDate).filter(d => d >= todayK).sort().slice(0, days);
  const dayList = dateKeys.map(dateKey => {
    const idxs = byDate[dateKey];
    const avg = arr => idxs.reduce((s, i) => s + arr[i], 0) / idxs.length;
    const maxPrecip = Math.max(...idxs.map(i => j.hourly.precipitation[i]));
    const minPressure = Math.min(...idxs.map(i => j.hourly.pressure_msl[i]));
    const maxWind = Math.max(...idxs.map(i => j.hourly.wind_speed_10m[i]));
    const maxTemp = Math.max(...idxs.map(i => j.hourly.temperature_2m[i]));
    const minTemp = Math.min(...idxs.map(i => j.hourly.temperature_2m[i]));
    const maxHumidity = Math.max(...idxs.map(i => j.hourly.relative_humidity_2m[i]));
    const maxPrecipProb = Math.max(...idxs.map(i => j.hourly.precipitation_probability[i]));
    let maxDrop = 0;
    idxs.forEach(i => {
      if (i >= 3) {
        const drop = j.hourly.pressure_msl[i] - j.hourly.pressure_msl[i - 3];
        if (drop < maxDrop) maxDrop = drop;
      }
    });
    return {
      dateKey,
      pressure: avg(j.hourly.pressure_msl), minPressure, maxPressure: Math.max(...idxs.map(i => j.hourly.pressure_msl[i])),
      temp: avg(j.hourly.temperature_2m), minTemp, maxTemp,
      humidity: avg(j.hourly.relative_humidity_2m), maxHumidity,
      windSpeed: avg(j.hourly.wind_speed_10m), maxWind,
      precip: maxPrecip, precipProb: maxPrecipProb,
      pressureChange3h: maxDrop,
      heavyRainFlag: maxPrecip >= 30,
      linearRainbandFlag: maxPrecip >= 50,
      typhoonFlag: minPressure < 990 && maxWind >= 15,
      pressureDropFlag: maxDrop <= -3,
      extremeHeatFlag: maxTemp >= 35,
      highHumidityFlag: maxHumidity >= 80,
      strongWindFlag: maxWind >= 10,
    };
  });

  // 「今」を中心に前後にドラッグして見られるよう、過去24時間〜予報日数分先までの時間別データを持たせる
  // （past_days=1を指定しているため、timesには前日分から含まれている）
  const nowHourStr = `${todayK}T${String(new Date().getHours()).padStart(2, '0')}:00`;
  let nowIdxInTimes = times.indexOf(nowHourStr);
  if (nowIdxInTimes < 0) nowIdxInTimes = Math.min(24, times.length - 1);
  const rangeStart = Math.max(0, nowIdxInTimes - 24);
  const rangeEnd = Math.min(times.length, nowIdxInTimes + days * 24);
  const hIdxs = [];
  for (let i = rangeStart; i < rangeEnd; i++) hIdxs.push(i);
  const hourly = {
    times: hIdxs.map(i => times[i]),
    pressure: hIdxs.map(i => j.hourly.pressure_msl[i]),
    precip: hIdxs.map(i => j.hourly.precipitation[i]),
    temp: hIdxs.map(i => j.hourly.temperature_2m[i]),
    apparent: hIdxs.map(i => j.hourly.apparent_temperature[i]),
    dew: hIdxs.map(i => j.hourly.dew_point_2m[i]),
    humidity: hIdxs.map(i => j.hourly.relative_humidity_2m[i]),
    wind: hIdxs.map(i => j.hourly.wind_speed_10m[i]),
    gust: hIdxs.map(i => j.hourly.wind_gusts_10m[i]),
    windDir: hIdxs.map(i => j.hourly.wind_direction_10m[i]),
    weatherCode: hIdxs.map(i => j.hourly.weather_code[i]),
    nowIndex: nowIdxInTimes - rangeStart,
  };

  return { days: dayList, hourly };
}

// 予報1日分から、もっとも目立つ気象イベントの絵文字を1つ選ぶ（カレンダーのworstWeatherIconの予報版）
// ☔（降水確率）と並んで表示すると、湿度や気圧のフラグまで「雨っぽいマーク」に見えて
// 常に雨が降っているような誤解を招くため、絵文字だけでなく短いラベルも必ず添える。
// 1日に複数の条件が重なることもある（例：猛暑＋高湿度）ので、最初に一致したものだけでなく
// 当てはまるものを全部返す。カード幅が狭いため、ラベルは短い言葉にとどめる
// （同じカード内のfd-pattern「⚠️近い日」も同じ理由で短縮形。詳しい「〜の目安」という
// 言い回しはtitle属性（長押し・ホバー）で補う）
function forecastDayFlags(day) {
  const flags = [];
  if (day.linearRainbandFlag) flags.push({ emoji: '🌊', label: '線状降水帯', title: '線状降水帯の目安' });
  if (day.typhoonFlag) flags.push({ emoji: '🌀', label: '台風', title: '台風の目安' });
  if (day.heavyRainFlag) flags.push({ emoji: '⚠️', label: '大雨', title: '大雨の目安' });
  if (day.extremeHeatFlag) flags.push({ emoji: '🥵', label: '猛暑', title: '猛暑の目安' });
  if (day.strongWindFlag) flags.push({ emoji: '🌬️', label: '強風', title: '強風の目安' });
  if (day.highHumidityFlag) flags.push({ emoji: '💦', label: '高湿度', title: '高湿度の目安' });
  if (day.pressureDropFlag) flags.push({ emoji: '📉', label: '気圧急降下', title: '気圧急降下の目安' });
  return flags; // 空配列＝特に気になる兆候なし（🙂を表示）
}
// 週間の見通しを、日付ごとのミニカードを横に並べた帯として描画する
// タップすると、下の気圧・降水量チャートがその日の0時まで移動する
// 日ごとの予報が、これまでの記録の中の「不調が強かった日」の気象パターンにどれだけ近いかを判定する
// （記録が少ない・関連が見つからない場合はnullを返し、バッジは出さない）
function forecastPatternMatch(day) {
  const adv = computeForecastAdvisory(day);
  if (!adv) return null;
  if (adv.fcAlerts.length || adv.worseCount >= 3) return 'strong';
  if (adv.worseCount >= 1) return 'mild';
  return null;
}

function buildForecastWeekStrip(days) {
  return `<div class="forecast-strip" id="forecastStrip">${days.map(d => {
    const [y, m, dd] = d.dateKey.split('-').map(Number);
    const wd = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, m - 1, dd).getDay()];
    const isToday = d.dateKey === todayKey();
    const prob = precipProbColor(d.precipProb);
    const match = forecastPatternMatch(d);
    const matchBadge = match === 'strong' ? `<span class="fd-pattern strong" title="これまで体調が優れなかった日の気象パターンに近い予報です">⚠️近い日</span>`
      : match === 'mild' ? `<span class="fd-pattern mild" title="これまで体調が優れなかった日の気象パターンにやや近い予報です">△近い日</span>` : '';
    const dFlags = forecastDayFlags(d);
    // 複数の条件が重なる日は、当てはまるものを全部積み上げて表示する（例：猛暑＋高湿度の両方）
    const flagsHtml = dFlags.length
      ? dFlags.map(f => `<div class="fd-flag" title="${escapeHtml(f.title)}"><span>${f.emoji}</span><span class="fd-flag-label">${escapeHtml(f.label)}</span></div>`).join('')
      : `<div class="fd-icon" title="特に気になる兆候はありません">🙂</div>`;
    return `<button type="button" class="forecast-day${isToday ? ' today' : ''}${match ? ' pattern-' + match : ''}" data-date="${d.dateKey}">
      <div class="fd-date">${isToday ? '今日' : `${m}/${dd}`}<span>(${wd})</span></div>
      <span class="fd-prob" style="background:${prob.bg}; color:${prob.fg};" title="降水確率（雨が実際に降っているという意味ではありません）">☔${d.precipProb.toFixed(0)}%</span>
      ${flagsHtml}
      <div class="fd-temp">${d.maxTemp.toFixed(0)}°<span class="fd-temp-low">/${d.minTemp.toFixed(0)}°</span></div>
      <div class="fd-pressure">${d.pressure.toFixed(0)}hPa</div>
      ${matchBadge}
    </button>`;
  }).join('')}</div>`;
}
// 直近48時間の気温（折れ線）・降水量（棒）・風速（点線）の推移を、外部ライブラリなしのSVGで描画する
// ドラッグ・スクロールバーの両方で左右に動かせる横長のチャートとして作る。
// SVGを実ピクセル幅で描画し（%指定にしない）、スクロール位置とグラフ上のx座標を1:1で対応させることで、
// 「中央にある時点が何か」を正確に読み取れるようにしている。
// 折れ線をなめらかな曲線として描くための、Catmull-Rom→3次ベジェ変換
function catmullRomPath(pts) {
  if (pts.length < 3) return `M${pts.map(p => p.join(',')).join('L')}`;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

function buildMeteogramSVG(hourly, moodRecords = []) {
  const n = hourly.times.length;
  if (!n) return { html: '', xPositions: [], width: 0 };
  // 体調（三段階）を重ねる専用の帯の分だけ、上の余白(padT)を広げておく。
  // プロット領域そのものの高さ(plotH)は変えないので、気温・気圧などの折れ線とは重ならない
  const moodBandH = 20;
  const hourPx = 14, padL = 32, padR = 42, padT = 34 + moodBandH, padB = 30;
  const plotW = n * hourPx;
  const W = padL + plotW + padR, H = 208 + moodBandH;
  const plotH = H - padT - padB;
  const tMin = Math.min(...hourly.temp, ...hourly.dew) - 1, tMax = Math.max(...hourly.temp) + 1;
  const wMax = Math.max(5, ...hourly.wind) + 1;
  const pMin = Math.min(...hourly.pressure) - 1, pMax = Math.max(...hourly.pressure) + 1;
  const xPositions = hourly.times.map((_, i) => padL + i * hourPx + hourPx / 2);
  const yT = v => padT + plotH * (1 - (v - tMin) / (tMax - tMin || 1));
  const yW = v => padT + plotH * (1 - v / wMax);
  const yP = v => padT + plotH * (1 - (v - pMin) / (pMax - pMin || 1));
  const precipScaleMax = Math.max(10, ...hourly.precip);
  const barW = Math.max(3, hourPx - 3);

  const tempPts = hourly.temp.map((v, i) => [xPositions[i], yT(v)]);
  const dewPts = hourly.dew.map((v, i) => [xPositions[i], yT(v)]);
  const windPts = hourly.wind.map((v, i) => [xPositions[i], yW(v)]);
  const pressPts = hourly.pressure.map((v, i) => [xPositions[i], yP(v)]);
  const tempPath = catmullRomPath(tempPts);
  const dewPath = catmullRomPath(dewPts);
  const windPath = catmullRomPath(windPts);
  const pressPath = catmullRomPath(pressPts);
  const tempAreaPath = `${tempPath} L${xPositions[n - 1].toFixed(1)},${(padT + plotH).toFixed(1)} L${xPositions[0].toFixed(1)},${(padT + plotH).toFixed(1)} Z`;
  const pressAreaPath = `${pressPath} L${xPositions[n - 1].toFixed(1)},${(padT + plotH).toFixed(1)} L${xPositions[0].toFixed(1)},${(padT + plotH).toFixed(1)} Z`;
  // 気温と露点の間を薄いピンクで塗り、その日の「蒸し暑さ・湿り気」の余白を面で見せる
  const tempDewBand = `${xPositions[0].toFixed(1)},${yT(hourly.temp[0]).toFixed(1)} ` +
    hourly.temp.map((v, i) => `${xPositions[i].toFixed(1)},${yT(v).toFixed(1)}`).join(' ') + ' ' +
    hourly.dew.slice().reverse().map((v, i) => `${xPositions[n - 1 - i].toFixed(1)},${yT(v).toFixed(1)}`).join(' ');
  const bars = hourly.precip.map((p, i) => {
    if (p <= 0) return '';
    const barH = plotH * Math.min(1, p / precipScaleMax);
    return `<rect x="${(xPositions[i] - barW / 2).toFixed(1)}" y="${(padT + plotH - barH).toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="var(--wx-precip)" stroke="var(--wx-precip-deep)" stroke-width="1" opacity="0.9" />`;
  }).join('');

  // 風・降水それぞれのピークに、目立つ丸印と数値ラベルを添える
  let peakWindIdx = 0;
  hourly.wind.forEach((v, i) => { if (v > hourly.wind[peakWindIdx]) peakWindIdx = i; });
  let peakPrecipIdx = 0;
  hourly.precip.forEach((v, i) => { if (v > hourly.precip[peakPrecipIdx]) peakPrecipIdx = i; });
  const windPeakMarker = hourly.wind[peakWindIdx] >= 5 ? `
    <circle cx="${xPositions[peakWindIdx].toFixed(1)}" cy="${yW(hourly.wind[peakWindIdx]).toFixed(1)}" r="4" fill="var(--wx-wind-deep)" stroke="var(--bg-card)" stroke-width="1.6" />
    <text x="${xPositions[peakWindIdx].toFixed(1)}" y="${(yW(hourly.wind[peakWindIdx]) - 8).toFixed(1)}" font-size="10" font-weight="700" fill="var(--wx-wind-deep)" text-anchor="middle">${hourly.wind[peakWindIdx].toFixed(0)}m/s</text>
  ` : '';
  const precipPeakMarker = hourly.precip[peakPrecipIdx] > 0 ? `
    <text x="${xPositions[peakPrecipIdx].toFixed(1)}" y="${(padT + plotH - plotH * Math.min(1, hourly.precip[peakPrecipIdx] / precipScaleMax) - 6).toFixed(1)}" font-size="10" font-weight="700" fill="var(--wx-precip-deep)" text-anchor="middle">${hourly.precip[peakPrecipIdx].toFixed(1)}mm</text>
  ` : '';
  // 3時間おきに目盛りを立てて、スクロールしていても今どのあたりの時間かわかりやすくする。
  // 日付が変わる0時は、はっきりした点線とアイコン（🌙）で区切りを示す
  const labels = [];
  const gridlines = [];
  const dayMarkers = [];
  hourly.times.forEach((t, i) => {
    const hour = Number(t.slice(11, 13));
    if (hour % 3 === 0) {
      const isDayBoundary = hour === 0;
      gridlines.push(isDayBoundary
        ? `<line x1="${xPositions[i].toFixed(1)}" y1="${padT}" x2="${xPositions[i].toFixed(1)}" y2="${padT + plotH}" stroke="var(--wx-temp-deep)" stroke-width="1.3" stroke-dasharray="1,4" stroke-linecap="round" opacity="0.55" />`
        : `<line x1="${xPositions[i].toFixed(1)}" y1="${padT}" x2="${xPositions[i].toFixed(1)}" y2="${padT + plotH}" stroke="var(--border)" stroke-width="1" opacity="0.25" />`);
      labels.push(`<text x="${xPositions[i].toFixed(1)}" y="${H - 6}" font-size="10" fill="var(--ink-sub)" text-anchor="middle">${hour === 0 ? t.slice(5, 10).replace('-', '/') : hour + '時'}</text>`);
      if (isDayBoundary) dayMarkers.push(USE_FLUENT_EMOJI
        ? svgEmojiImage('1f319', xPositions[i], 18, 14)
        : `<text x="${xPositions[i].toFixed(1)}" y="18" font-size="14" text-anchor="middle">🌙</text>`);
      if (hour === 9) dayMarkers.push(USE_FLUENT_EMOJI
        ? svgEmojiImage('2600', xPositions[i], 18, 14)
        : `<text x="${xPositions[i].toFixed(1)}" y="18" font-size="14" text-anchor="middle">☀️</text>`);
    }
  });
  const nowLine = hourly.nowIndex != null && xPositions[hourly.nowIndex] != null
    ? `<line x1="${xPositions[hourly.nowIndex].toFixed(1)}" y1="${padT}" x2="${xPositions[hourly.nowIndex].toFixed(1)}" y2="${padT + plotH}" stroke="var(--warm)" stroke-width="1.5" stroke-dasharray="3,2" />`
    : '';

  const tMid = (tMin + tMax) / 2;
  const pMid = (pMin + pMax) / 2;
  const leftAxis = [tMax, tMid, tMin].map(v => `<text x="4" y="${(yT(v) + 3.5).toFixed(1)}" font-size="10" fill="var(--ink-sub)" font-variant-numeric="tabular-nums">${v.toFixed(0)}°</text>`).join('');
  const rightAxis = [pMax, pMid, pMin].map(v => `<text x="${(W - padR + 6).toFixed(1)}" y="${(yP(v) + 3.5).toFixed(1)}" font-size="9.5" fill="var(--ink-sub)" text-anchor="start" font-variant-numeric="tabular-nums">${v.toFixed(0)}</text>`).join('');

  // 記録した体調（😿🐱😽）を、気象の折れ線とは重ならない専用の帯（プロット領域の外）に、同じ時刻の位置で重ねる。
  // 気象グラフ自体の見やすさを妨げないよう、線やバーとは別レイヤーとして一番上に描く
  const moodBandY = 30, moodMarkerY = moodBandY + moodBandH / 2 + 4.5;
  const moodItems = (moodRecords || []).filter(r => r.mood).map(r => {
    const hh = r.time.slice(0, 2);
    const idx = hourly.times.indexOf(`${r.dateKey}T${hh}:00`);
    if (idx < 0) return '';
    const minuteFrac = Number(r.time.slice(3, 5)) / 60;
    const x = padL + idx * hourPx + minuteFrac * hourPx;
    return USE_FLUENT_EMOJI
      ? svgEmojiImage(moodEmojiFluentCode(r.mood), x, moodMarkerY, 14)
      : `<text x="${x.toFixed(1)}" y="${moodMarkerY.toFixed(1)}" font-size="14" text-anchor="middle">${moodEmoji(r.mood)}</text>`;
  }).filter(Boolean).join('');
  const moodBand = moodItems ? `
    <rect x="0" y="${moodBandY}" width="${W}" height="${moodBandH}" fill="var(--surface-2)" opacity="0.5" />
    <text x="4" y="${moodMarkerY.toFixed(1)}" font-size="9" fill="var(--ink-sub)">体調</text>
    ${moodItems}` : '';

  const html = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;" role="img" aria-label="気温・露点・降水・風・気圧の推移と、記録した体調（同じ時刻に重ねて表示・ピークには数値を表示・ドラッグまたはスクロールバーで前後の時間を確認できます）">
    <defs>
      <linearGradient id="wx-temp-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--wx-temp)" stop-opacity="0.32" />
        <stop offset="100%" stop-color="var(--wx-temp)" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="wx-press-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--wx-pressure)" stop-opacity="0.28" />
        <stop offset="100%" stop-color="var(--wx-pressure)" stop-opacity="0" />
      </linearGradient>
    </defs>
    ${gridlines.join('')}
    ${dayMarkers.join('')}
    ${bars}
    <path d="${pressAreaPath}" fill="url(#wx-press-fill)" />
    <path d="${pressPath}" fill="none" stroke="var(--wx-pressure)" stroke-width="1.6" opacity="0.85" />
    <polygon points="${tempDewBand}" fill="var(--wx-temp)" opacity="0.1" />
    ${precipPeakMarker}
    ${nowLine}
    <path d="${windPath}" fill="none" stroke="var(--wx-wind)" stroke-width="1.8" stroke-linecap="round" opacity="0.9" />
    ${windPeakMarker}
    <path d="${dewPath}" fill="none" stroke="var(--wx-dew)" stroke-width="1.4" stroke-dasharray="1,3.4" stroke-linecap="round" opacity="0.85" />
    <path d="${tempAreaPath}" fill="url(#wx-temp-fill)" />
    <path class="chart-draw-line" d="${tempPath}" fill="none" stroke="var(--wx-temp)" stroke-width="2.8" stroke-linecap="round" />
    ${leftAxis}
    ${rightAxis}
    ${labels.join('')}
    <line class="hover-crosshair" x1="${xPositions[hourly.nowIndex ?? 0]}" y1="${padT}" x2="${xPositions[hourly.nowIndex ?? 0]}" y2="${padT + plotH}" stroke="var(--wx-temp-deep)" stroke-width="1" stroke-dasharray="2,2" opacity="0" />
    ${moodBand}
  </svg>`;
  return { html, xPositions, width: W };
}

// 気象庁式の16方位に、度数（0=北、時計回り）を変換する
function windDirLabel(deg) {
  if (deg == null) return '-';
  const dirs = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'];
  return dirs[Math.round(deg / 22.5) % 16];
}
// 風向き（度数・「その方角から吹いてくる」）を、矢印の向き（＝吹いていく先）用の回転角に変換する
function windDirArrowDeg(deg) {
  return deg == null ? 0 : (deg + 180) % 360;
}
// 風速を、体感的に強さがわかる背景色に変換する（気象庁の風の強さの目安を参考にした区分）
// サイトの暖色パレット（ピンク・ゴールド）から浮かないよう、風は既存の --gold 系統の色で統一する
function windIntensityColor(v) {
  if (v == null) return 'transparent';
  if (v < 3) return 'transparent';
  if (v < 8) return '#fff3cf';
  if (v < 12) return '#ffdd8a';
  if (v < 18) return '#e8ab3f';
  return '#e0748f';
}
function windIntensityTextColor(v) {
  return (v != null && v >= 18) ? '#fff' : 'var(--ink)';
}
// 降水量を、色の濃さで強さがわかる背景色に変換する
// 「雨＝青」の直感は保ちつつ、彩度を落として藤色寄りにし、ピンクと並んでも浮かないようにする
function precipIntensityColor(v) {
  if (v == null || v <= 0) return 'transparent';
  if (v < 1) return '#f1eefb';
  if (v < 5) return '#d3c9ee';
  if (v < 15) return '#a191d4';
  return '#6c5aa8';
}
function precipIntensityTextColor(v) {
  return (v != null && v >= 15) ? '#fff' : 'var(--ink)';
}
// 降水確率を、信号色（緑→黄→橙→赤）のバッジ色に変換する
function precipProbColor(p) {
  if (p == null) return { bg: 'var(--surface-2)', fg: 'var(--ink-sub)' };
  if (p < 30) return { bg: '#dff3e3', fg: '#2f8a4e' };
  if (p < 60) return { bg: '#fff3c4', fg: '#8a6d10' };
  if (p < 80) return { bg: '#ffe0b3', fg: '#a05a00' };
  return { bg: '#ffd0d6', fg: '#b3253d' };
}

// 固定ヘッダー用の「現在の天気」1行サマリー
function buildWeatherNowHtml(hourly) {
  const idx = hourly.nowIndex ?? 0;
  const icon = weatherIcon(hourly.weatherCode[idx]);
  return `
    <span class="wx-now-icon">${icon.emoji}</span>
    <span class="wx-now-temp">${hourly.temp[idx].toFixed(0)}°C</span>
    <span class="wx-now-feels">（体感${hourly.apparent[idx].toFixed(0)}°C）</span>
    <span class="wx-now-item">${hourly.precip[idx] > 0 ? '☔' : ''}${hourly.precip[idx].toFixed(1)}mm</span>
    <span class="wx-now-item">🌬️${hourly.wind[idx].toFixed(0)}m/s</span>
  `;
}

// 時間ごとの予報を、左端に項目名を固定した横スクロール表として描画する（見出し語＝時間、行＝各項目）
function buildHourlyTableHtml(hourly) {
  const cell = (i, content, style, extraClass) =>
    `<td class="${i === hourly.nowIndex ? 'wx-now-col' : ''} ${extraClass || ''}" style="${style || ''}">${content}</td>`;
  const timeCells = hourly.times.map((t, i) => {
    const hour = Number(t.slice(11, 13));
    const label = hour === 0 ? t.slice(5, 10).replace('-', '/') : hour;
    return cell(i, label);
  }).join('');

  // 風・降水それぞれの「一番強い時間」を見つけて、その列を目立たせる
  let peakGustIdx = 0;
  hourly.gust.forEach((v, i) => { if (v > hourly.gust[peakGustIdx]) peakGustIdx = i; });
  let peakPrecipIdx = 0;
  hourly.precip.forEach((v, i) => { if (v > hourly.precip[peakPrecipIdx]) peakPrecipIdx = i; });

  const windCells = hourly.wind.map((v, i) => {
    const g = hourly.gust[i];
    const isPeak = i === peakGustIdx && g >= 5;
    const arrow = `<span class="wx-dir-arrow" style="transform:rotate(${windDirArrowDeg(hourly.windDir[i]).toFixed(0)}deg);">↑</span>`;
    return cell(i, `${arrow}${v.toFixed(0)}`, `background:${windIntensityColor(g)}; color:${windIntensityTextColor(g)};`, isPeak ? 'wx-peak' : '');
  }).join('');

  const precipCells = hourly.precip.map((v, i) => {
    const isPeak = i === peakPrecipIdx && v > 0;
    return cell(i, v > 0 ? v.toFixed(1) : '-', v > 0 ? `background:${precipIntensityColor(v)}; color:${precipIntensityTextColor(v)};` : '', isPeak ? 'wx-peak' : '');
  }).join('');

  const peakGustTime = hourly.times[peakGustIdx];
  const peakPrecipTime = hourly.times[peakPrecipIdx];
  const timeLabel = t => `${Number(t.slice(11, 13))}時`;
  const peakSummary = `
    <p class="note wx-peak-summary" style="margin:6px 16px 0;">
      ${hourly.gust[peakGustIdx] >= 5 ? `🌬️ 突風のピークは<b>${timeLabel(peakGustTime)}ごろ ${hourly.gust[peakGustIdx].toFixed(0)}m/s</b>　` : ''}
      ${hourly.precip[peakPrecipIdx] > 0 ? `☔ 雨のピークは<b>${timeLabel(peakPrecipTime)}ごろ ${hourly.precip[peakPrecipIdx].toFixed(1)}mm/h</b>` : ''}
    </p>`;

  return `<div class="wx-table-wrap" id="weatherHourlyTableWrap">
    <table class="wx-table">
      <tbody>
        <tr><th>時間</th>${timeCells}</tr>
        <tr><th></th>${hourly.weatherCode.map((c, i) => cell(i, weatherIcon(c).emoji)).join('')}</tr>
        <tr><th>気温 ℃</th>${hourly.temp.map((v, i) => cell(i, v.toFixed(0) + '°')).join('')}</tr>
        <tr><th>露点 ℃</th>${hourly.dew.map((v, i) => cell(i, v.toFixed(0) + '°', 'color:var(--ink-sub); font-size:11px;')).join('')}</tr>
        <tr><th>雨 mm</th>${precipCells}</tr>
        <tr><th>風 m/s</th>${windCells}</tr>
      </tbody>
    </table>
  </div>
  ${peakSummary}`;
}

// 気圧・風向・突風・雲量など、日常会話にはあまり出てこない専門的な項目は折りたたんでおく
function buildExpertPanelHtml(hourly) {
  const cell = (i, content) => `<td class="${i === hourly.nowIndex ? 'wx-now-col' : ''}">${content}</td>`;
  return `<details class="card sym">
    <summary><b>専門データ</b><span class="lead">気圧・風向・突風・体感温度</span></summary>
    <div class="wx-table-wrap">
      <table class="wx-table">
        <tbody>
          <tr><th>気圧 hPa</th>${hourly.pressure.map((v, i) => cell(i, v.toFixed(0))).join('')}</tr>
          <tr><th>風向き</th>${hourly.windDir.map((v, i) => cell(i, windDirLabel(v))).join('')}</tr>
          <tr><th>突風 m/s</th>${hourly.gust.map((v, i) => cell(i, v.toFixed(0))).join('')}</tr>
          <tr><th>体感 ℃</th>${hourly.apparent.map((v, i) => cell(i, v.toFixed(0) + '°')).join('')}</tr>
        </tbody>
      </table>
    </div>
  </details>`;
}

// ---------- 似た日を探す ----------
// 「明日どうなりそうか」の因子別の分析（computeForecastAdvisory）とは別に、こちらは気圧・気圧変化・湿度・
// 気温・風速をまとめて標準化し、対象の日にもっとも近い過去の記録を実際に探し出す（最近傍探索）
const SIMILAR_DAY_FACTORS = [
  { key: 'pressure', accessor: r => r.weather.pressure },
  { key: 'pressureChange3h', accessor: r => r.weather.pressureChange3h },
  { key: 'humidity', accessor: r => r.weather.humidity },
  { key: 'temp', accessor: r => r.weather.temp },
  { key: 'windSpeed', accessor: r => r.weather.windSpeed },
];
function findSimilarDays(target, opts) {
  const excludeDateKey = opts && opts.excludeDateKey;
  const usable = records.filter(r => r.weather && r.weather.status === 'ok' && r.dateKey !== excludeDateKey);
  if (usable.length < 5 || !target) return null;
  const stats = {};
  SIMILAR_DAY_FACTORS.forEach(f => {
    const vals = usable.map(f.accessor).filter(v => v != null);
    if (vals.length < 5) { stats[f.key] = null; return; }
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length) || 1;
    stats[f.key] = { mean, sd };
  });
  const activeFactors = SIMILAR_DAY_FACTORS.filter(f => stats[f.key] && target[f.key] != null);
  if (activeFactors.length < 3) return null;
  // 1日に複数の記録がある場合は、いちばん新しい記録だけをその日の代表として使う
  const byDate = {};
  usable.forEach(r => { if (!byDate[r.dateKey] || (r.time || '') > (byDate[r.dateKey].time || '')) byDate[r.dateKey] = r; });
  const candidates = Object.values(byDate).map(r => {
    let distSq = 0, n = 0;
    activeFactors.forEach(f => {
      const v = f.accessor(r);
      if (v == null) return;
      const z = (v - stats[f.key].mean) / stats[f.key].sd;
      const tz = (target[f.key] - stats[f.key].mean) / stats[f.key].sd;
      distSq += (z - tz) ** 2;
      n++;
    });
    if (n < 3) return null;
    return { record: r, dist: Math.sqrt(distSq / n) };
  }).filter(Boolean).sort((a, b) => a.dist - b.dist);
  return candidates.slice(0, 3);
}
function buildSimilarDaysHtml(target, excludeDateKey) {
  const results = findSimilarDays(target, { excludeDateKey });
  if (!results || !results.length) return '';
  return `
    <details class="card" style="padding:2px 0; margin:12px 16px 0;">
      <summary style="padding:10px 16px; font-weight:600; font-size:13px;">🔎 今日と似ている過去の日</summary>
      <div style="margin:0 16px 14px;">
        <p class="note" style="margin:0 0 8px;">気圧・気圧の変化・湿度・気温・風速の近さから、記録の中でもっとも近い日を探しています。</p>
        <ul class="rank" style="margin:0;">
          ${results.map(c => {
            const r = c.record;
            const moodText = r.mood ? `${moodEmoji(r.mood)} ${r.mood === 1 ? 'つらい' : r.mood === 2 ? 'ふつう' : '元気'}` : '気分の記録なし';
            const closeText = c.dist < 0.6 ? 'かなり近い' : c.dist < 1.2 ? '近い' : 'やや近い';
            return `<li>
              <div class="rank-head"><b>${r.dateKey}</b><span class="badge">${closeText}</span></div>
              <p class="note" style="margin:2px 0 0;">体調：${moodText}${r.memo ? '　' + escapeHtml(r.memo.slice(0, 40)) : ''}</p>
            </li>`;
          }).join('')}
        </ul>
        <p class="note" style="margin:8px 0 0;">※ 過去の記録との近さにもとづく参考情報です。「似ている＝同じ結果になる」とは限りません。</p>
      </div>
    </details>`;
}

// ---------- 予報と実際のふりかえり ----------
// 「予報を当てること」自体を目的にせず、外れた日もそのまま記録として残す（サイト自身が予報の的中に固執しないため）
let forecastAccuracyLog = LS.get('forecastAccuracyLog', []); // [{dateKey, level, actualLevel, matched, checkedAt}]
function saveForecastAccuracyLog() { LS.set('forecastAccuracyLog', forecastAccuracyLog); }
let dailyForecastSnapshot = LS.get('dailyForecastSnapshot', {}); // { [dateKey]: {level} }（その日最初に開いた時の予報だけを残す）
function saveDailyForecastSnapshot() { LS.set('dailyForecastSnapshot', dailyForecastSnapshot); }
function forecastLevelFromAdvisory(adv) {
  if (!adv) return null;
  if (adv.fcAlerts.length || adv.worseCount >= 3) return 'red';
  if (adv.worseCount >= 1) return 'yellow';
  return 'green';
}
function captureTodaySnapshotIfNeeded(advToday) {
  const tk = todayKey();
  if (dailyForecastSnapshot[tk]) return;
  const level = forecastLevelFromAdvisory(advToday);
  if (!level) return;
  dailyForecastSnapshot[tk] = { level };
  saveDailyForecastSnapshot();
}
const FORECAST_LEVEL_LABEL = { red: '🔴 少し気をつけたい日', yellow: '🟡 軽く気に留めておく日', green: '🟢 落ち着いていそうな日' };
function buildForecastReflectionHtml() {
  const tk = todayKey();
  const snap = dailyForecastSnapshot[tk];
  if (!snap) return '';
  const todays = records.filter(r => r.dateKey === tk && r.mood);
  const already = forecastAccuracyLog.some(e => e.dateKey === tk);
  const recentList = forecastAccuracyLog.slice(-14);
  const matchedCount = recentList.filter(e => e.matched).length;
  return `
    <div class="card no-print" id="forecastReflectionWrap" style="padding:12px 16px; margin:12px 16px 0;">
      ${buildForecastReflectionInner(snap, todays, already, recentList, matchedCount)}
    </div>`;
}
// 実際の体調は4段階（🟢元気だった〜🔴かなり不調）で自己申告してもらう。予報は3段階（🔴🟡🟢）なので、
// 比較のために4段階→3段階へまとめる：かなり不調・少し不調→0（赤相当）、普通だった→1（黄相当）、
// 元気だった→2（緑相当）。「予想より良かった」の判定もこの数値の大小比較だけで行う（原因は断定しない）
const FORECAST_ACTUAL_TIERS = [
  { tier: 3, label: '🟢 元気だった' },
  { tier: 2, label: '🟡 普通だった' },
  { tier: 1, label: '🟠 少し不調' },
  { tier: 0, label: '🔴 かなり不調' },
];
function forecastActualRank(tier) { return tier <= 1 ? 0 : tier === 2 ? 1 : 2; }
function buildForecastReflectionInner(snap, todays, already, recentList, matchedCount) {
  return `
    <label style="display:block; font-weight:700; font-size:13px; margin-bottom:6px;">🔄 今日の振り返り</label>
    <p class="note" style="margin:0 0 8px;">今日の予報の目安：${FORECAST_LEVEL_LABEL[snap.level]}</p>
    ${already
      ? `<p class="note" style="margin:0;">今日の振り返りは記録済みです</p>`
      : `
        <p class="note" style="margin:0 0 6px;">実際は、どうでしたか？</p>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${FORECAST_ACTUAL_TIERS.map(t => `<button type="button" class="chip no-print" data-forecast-tier="${t.tier}">${t.label}</button>`).join('')}
        </div>`}
    ${recentList.length >= 3 ? `<p class="note" style="margin:8px 0 0;">直近${recentList.length}回のうち、${matchedCount}回は予報と近い体調でした（外れた日も、そのまま記録に残しています）</p>` : ''}
  `;
}
function attachForecastReflectionHandler() {
  document.querySelectorAll('[data-forecast-tier]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tk = todayKey();
      const snap = dailyForecastSnapshot[tk];
      if (!snap) return;
      const tier = Number(btn.dataset.forecastTier);
      const levelRank = { red: 0, yellow: 1, green: 2 };
      const actualRank = forecastActualRank(tier);
      const matched = actualRank === levelRank[snap.level];
      const better = actualRank > levelRank[snap.level];
      forecastAccuracyLog.push({ dateKey: tk, level: snap.level, actualTier: tier, matched, checkedAt: Date.now() });
      saveForecastAccuracyLog();
      // 予報より実際が良かった時だけ、一律+1pt（「近い」「悪かった」にはポイントを付けない。
      // どの結果でも優劣をつけているように見せないため、貯まるポイントは常に一律1pt）
      if (better && !ganbattaForecastBetterDates.has(tk)) {
        ganbattaForecastBetterDates.add(tk);
        saveGanbattaForecastBetterDates();
        addGanbattaPoints(1, 'forecast-better', '予報より元気だった日', tk);
        if (typeof window.mascotReact === 'function') window.mascotReact({ motion: 'poyon', wave: true, say: pickMascotLine('pointsBetter') });
      }
      const wrap = document.getElementById('forecastReflectionWrap');
      if (wrap) {
        const todays = records.filter(r => r.dateKey === tk && r.mood);
        const recentList = forecastAccuracyLog.slice(-14);
        const matchedCount = recentList.filter(e => e.matched).length;
        wrap.innerHTML = buildForecastReflectionInner(snap, todays, true, recentList, matchedCount);
      }
    });
  });
}

// ---------- がんばったねポイント ----------
// 「予報が外れた＝身体が頑張った」と医学的に断定する機能にはしない。原因を決めつけず、
// 「今日は予報よりうまく乗り切れた」という“うれしい誤差”として扱う。ポイントは体調の良し悪しの
// 採点ではなく、記録を残したこと・答え合わせをしたこと自体への「おつかれさま」の合図として使う
let ganbattaPoints = LS.get('ganbattaPoints', 0);
function saveGanbattaPoints() { LS.set('ganbattaPoints', ganbattaPoints); }
let ganbattaPointsLog = LS.get('ganbattaPointsLog', []); // [{dateKey, delta, kind, note, at}]
function saveGanbattaPointsLog() { LS.set('ganbattaPointsLog', ganbattaPointsLog); }
// 「記録しただけ」「できたよを書いただけ」のポイントは1日1回までに制限するための日付集合
let ganbattaRecordDates = new Set(LS.get('ganbattaRecordDates', []));
function saveGanbattaRecordDates() { LS.set('ganbattaRecordDates', [...ganbattaRecordDates]); }
let ganbattaDekitaDates = new Set(LS.get('ganbattaDekitaDates', []));
function saveGanbattaDekitaDates() { LS.set('ganbattaDekitaDates', [...ganbattaDekitaDates]); }
let ganbattaForecastBetterDates = new Set(LS.get('ganbattaForecastBetterDates', []));
function saveGanbattaForecastBetterDates() { LS.set('ganbattaForecastBetterDates', [...ganbattaForecastBetterDates]); }

function addGanbattaPoints(delta, kind, note, dateKey) {
  ganbattaPoints += delta;
  saveGanbattaPoints();
  ganbattaPointsLog.push({ dateKey: dateKey || todayKey(), delta, kind, note, at: Date.now() });
  if (ganbattaPointsLog.length > 200) ganbattaPointsLog = ganbattaPointsLog.slice(-200);
  saveGanbattaPointsLog();
  refreshGanbattaPointsCard();
}

// 称号は「健康になった」ではなく「記録を続けた・観察した」という方向にだけ寄せる
const GANBATTA_BADGES = [
  { min: 500, emoji: '👑', label: 'トトノエ～ルの常連さん' },
  { min: 200, emoji: '✨', label: 'からだ観察マスター' },
  { min: 100, emoji: '💖', label: '自分のペースを知ってきた' },
  { min: 50, emoji: '🎀', label: 'こつこつ記録中' },
  { min: 30, emoji: '🌷', label: 'ちょっとトトノった' },
  { min: 10, emoji: '🌱', label: 'はじめての一歩' },
];
function currentGanbattaBadge() { return GANBATTA_BADGES.find(b => ganbattaPoints >= b.min) || null; }
function nextGanbattaBadge() { return [...GANBATTA_BADGES].reverse().find(b => ganbattaPoints < b.min) || null; }

function buildGanbattaPointsHtml() {
  const badge = currentGanbattaBadge();
  const next = nextGanbattaBadge();
  const recentLog = ganbattaPointsLog.slice(-6).reverse();
  return `
    <div class="card no-print" id="ganbattaPointsWrap" style="padding:12px 16px; margin:12px 16px 0;">
      <label style="display:block; font-weight:700; font-size:14px; margin-bottom:4px;">🌼 がんばったねポイント</label>
      <p style="margin:0 0 4px; font-size:20px; font-weight:700;">${ganbattaPoints}pt${badge ? `　${badge.emoji} ${badge.label}` : ''}</p>
      <ul class="note" style="margin:0 0 8px; padding-left:18px; line-height:1.7;">
        <li>今日の体調を記録した：+1pt（1日1回まで）</li>
        <li>できたよ！アルバムに書いた：+1pt（1日1回まで）</li>
        <li>🔄今日の振り返りで、実際の体調が予報より良かった：+1pt（1日1回まで）</li>
      </ul>
      <p class="note" style="margin:0 0 8px;">どれも一律+1ptです（優劣をつけるものではないので）。</p>
      <p class="note" style="margin:0 0 8px;">使い道はありません。……でも、貯まるとちょっとうれしい。</p>
      ${next ? `<p class="note" style="margin:0 0 8px;">次の称号「${next.emoji} ${next.label}」まで、あと${next.min - ganbattaPoints}pt</p>` : ''}
      ${recentLog.length ? `
        <details>
          <summary style="cursor:pointer; font-size:12px;">🌷 がんばったねアルバム（最近の記録）</summary>
          <ul style="margin:6px 0 0; padding-left:0; list-style:none;">
            ${recentLog.map(e => `<li class="note" style="margin:0 0 4px;">${e.dateKey}　${escapeHtml(e.note)}　<b>+${e.delta}pt</b></li>`).join('')}
          </ul>
        </details>` : ''}
      <p class="note" style="margin:8px 0 0;">※ポイントは体調の良し悪しを評価するものではありません。今日の記録を残したことへの「おつかれさま」です。</p>
    </div>`;
}
function refreshGanbattaPointsCard() {
  const wrap = document.getElementById('ganbattaPointsWrap');
  if (!wrap) return;
  wrap.outerHTML = buildGanbattaPointsHtml();
}

// ---------- できたよ！アルバム ----------
// 「頑張ったこと」だけでなく「休めた」「助かった」「自分を守れた」も対象にする。書くのは義務ではなく、
// サイト側の見本（例文）は出さない＝完全に白紙のまま自由に書けるようにする（例があると、それができて
// いない日に自分を責めてしまいそうなため）。マスコットは入力文を勝手に言い換えず、原文＋ひとことで返す
let dekitaLog = LS.get('dekitaLog', []); // [{id, dateKey, text, praise, category, merged, at}]
function saveDekitaLog() { LS.set('dekitaLog', dekitaLog); }
// 書きかけの「今日のできたよ」は、他のタブに移動して戻ってきても消えないよう下書きとして保持する
// （事前に書いておいて、あとで残すだけにしたいケースがあるため）
let dekitaDraft = LS.get('dekitaDraft', '');
function saveDekitaDraft() { LS.set('dekitaDraft', dekitaDraft); }
// 入力文の最後だけ軽く分類して、褒め方とマスコットの反応を少し変える（あくまで補助機能。
// 分類できなくても、常に「入力文＋ひとこと」という安全な基本形は変わらない）。
// 褒め言葉は「その調子だね」のような、暗に「またやれ」と聞こえかねない言い方を避け、
// 「えらい」のようなどんな内容にも合う、上から目線にならない短い言葉だけに絞っている
const DEKITA_PRAISE_DECORATED = ['えらい', 'えらすぎる', 'がんばったね', 'すごい', 'すごいよ', 'えらいよ〜', '花丸', 'ばっちり'];
const DEKITA_PRAISE_PLAIN = ['立派な一歩', 'おつかれさま'];
// PLAINの2つだけ絵文字がなくて寂しかったので、それぞれに固定の絵文字を付ける。
// 🦥は「なまけもの＝あなたが怠けている」ではなく「のんびり屋のマスコットが労ってくれている」
// というニュアンスにするため、疲れをねぎらう「おつかれさま」側にだけ充てる
const DEKITA_PRAISE_PLAIN_EMOJI = ['🌼', '🦥'];
const DEKITA_EMOJI = ['✨', '💖'];
// 分類は「話した内容にどんなキーワードが入っているか」だけで判定する（文字数のような
// 内容と無関係な指標は使わない。短い文＝小さなこと、と決めつけると「走った」のような
// 短い行動まで誤って「small」に分類されてしまっていたため）。褒め言葉自体はもうカテゴリ分けせず、
// この分類はマスコットのポーズ（休んだ→restポーズ等）を選ぶためだけに使う
function classifyDekitaText(text) {
  if (/休|寝|眠|ごろん|横になっ|昼寝/.test(text)) return 'rest';
  if (/伝え|話した|話せた|相談|言えた|言った|打ち明け/.test(text)) return 'told';
  if (/水を飲|薬を飲|深呼吸|歯を磨|顔を洗|着替え|ご飯を食べ|お風呂に入/.test(text)) return 'small';
  return 'action';
}
// DEKITA_PRAISE_DECORATEDはランダムで✨か💖を、DEKITA_PRAISE_PLAINはそれぞれ専用の
// 絵文字（🌼/🦥）を、どちらも句点の代わりとして言葉の末尾に固定で付ける
function pickDekitaPraise() {
  const all = [...DEKITA_PRAISE_DECORATED, ...DEKITA_PRAISE_PLAIN];
  const idx = Math.floor(Math.random() * all.length);
  const word = all[idx];
  // 絵文字は文の途中に来ないよう、句点の代わりとして必ず言葉の最後に付ける
  if (idx < DEKITA_PRAISE_DECORATED.length) {
    return word + DEKITA_EMOJI[Math.floor(Math.random() * DEKITA_EMOJI.length)];
  }
  return word + DEKITA_PRAISE_PLAIN_EMOJI[idx - DEKITA_PRAISE_DECORATED.length];
}
// 過去に保存済みの記録（できたことアルバム）を直すための一回きりの移行処理。
// 以前は絵文字が「✨えらい」のように言葉の前に付く形で保存されており、「走ったの、✨えらい」の
// ように文の途中に絵文字が来て不自然だった。また、PLAIN（立派な一歩／おつかれさま）は絵文字が
// 全く付いていなかった。保存済みのpraiseだけをその場で書き換え、今後の見た目を過去の記録にも揃える
function migrateDekitaPraiseEmojiPosition() {
  const prefixRe = /^(の、)?(✨|💖)(.+)$/;
  let changed = false;
  dekitaLog.forEach(entry => {
    if (typeof entry.praise !== 'string' || !entry.praise) return;
    const m = prefixRe.exec(entry.praise);
    if (m && DEKITA_PRAISE_DECORATED.includes(m[3])) {
      entry.praise = (m[1] || '') + m[3] + m[2];
      changed = true;
      return;
    }
    for (let i = 0; i < DEKITA_PRAISE_PLAIN.length; i++) {
      const w = DEKITA_PRAISE_PLAIN[i];
      if (entry.praise === w || entry.praise === 'の、' + w) {
        entry.praise += DEKITA_PRAISE_PLAIN_EMOJI[i];
        changed = true;
        break;
      }
    }
  });
  if (changed) saveDekitaLog();
}
migrateDekitaPraiseEmojiPosition();
// 文末の句読点だけ取り除く（「走った。」→「走った」）。これをやらないと、後ろに続ける「の、」との
// 間に句読点が挟まって「走った。の、えらい」のように壊れて見えるため
function stripTrailingPunct(text) {
  return text.replace(/[。！？!?、,\s]+$/, '');
}
// 「た/だ」で終わる、いわゆる普通体の過去形（「〜した」「〜だった」「〜行った」「〜休んだ」等）
// にだけ、「の、」でつないで褒め言葉を続け、ひと続きの自然なセリフにする（例：「ラジオ体操したの、えらい」）。
// た/だ以外で終わる文（ですます調・体言止め等）は「の、」で繋ぐと不自然になるので、
// そこでは無理に繋げず「復唱→独立したひとこと」の安全な2段階にフォールバックする
function canConnectDekitaText(core) {
  return /[ただ]$/.test(core);
}
// 保存時に1回だけ「つなげて話すか／2段階で話すか」を決めて、後から見返す時・再生する時も
// 同じ結果になるよう{merged, praise}の形で確定させる
function buildDekitaResponse(text, category) {
  const core = stripTrailingPunct(text.trim());
  if (canConnectDekitaText(core)) {
    return { merged: true, praise: 'の、' + pickDekitaPraise() };
  }
  return { merged: false, praise: pickDekitaPraise() };
}
// 入力文をそのまま読み上げる（オウム返し）だけの一言は出さない。merged=trueなら
// 「入力文（句読点を整えたもの）＋んだ相槌」を一続きの自然なセリフに、merged=falseなら
// 入力文を繰り返さず、独立したひとことだけを1つの吹き出しで話す
function playDekitaReaction(text, praise, category, merged) {
  if (typeof window.mascotReact !== 'function') return;
  const reactOpts = { heart: true, spark: true, motion: 'poyon', essential: true };
  // 「話した」「小さなこと」も、休んだ以外は他と同じように両手あげで祝う（控えめな反応は廃止）
  if (category === 'rest') { reactOpts.rest = true; reactOpts.spark = false; }
  else { reactOpts.wave = true; reactOpts.doubleWaveChance = 0.2; } // action・told・small共通：5回に1回「ばんざーい！ばんざーい！」
  reactOpts.say = merged ? (stripTrailingPunct(text.trim()) + praise) : praise;
  // callOverで呼び寄せている間は歩行(crossing)を止めているので、反応が終わったら
  // 歩行を再開させる（そうしないと反応後、横を向いたまま止まって見えてしまう）
  reactOpts.onDone = () => { if (typeof window.mascotResumeIdle === 'function') window.mascotResumeIdle(); };
  // 「できたこと」を保存したときの反応は、動画などで確実に映ってほしい場面なので、
  // 今どこにいても画面中央付近の見える位置まで歩いてこさせてから話させる（「おいで」と同じ動き）
  if (typeof window.mascotCallOver === 'function') {
    window.mascotCallOver(() => window.mascotReact(reactOpts));
  } else {
    window.mascotReact(reactOpts);
  }
}
// アルバム上での表示用（保存済みの内容から再構成するだけで、新たに抽選はしない）
function dekitaDisplayLine(entry) {
  return entry.merged ? stripTrailingPunct(entry.text) + entry.praise : entry.praise;
}
// カレンダーの日別表示から、できたよ！アルバムを行き来しなくてもその日の記録が見えるようにする
function buildDekitaDayHtml(dateKey) {
  const entries = dekitaLog.filter(e => e.dateKey === dateKey);
  if (!entries.length) return '';
  return `
    <div class="card no-print" style="padding:12px 16px; margin-bottom:10px;">
      <label style="display:block; font-weight:600; font-size:13px; margin-bottom:8px;">🌷 この日のできたよ</label>
      ${entries.map(e => `
        <div class="chip" style="display:block; width:100%; padding:8px 10px; margin-bottom:6px; box-sizing:border-box;">
          <p style="margin:0 0 4px; font-size:13px; white-space:pre-wrap;">${escapeHtml(e.text)}</p>
          <p class="note" style="margin:0;">🐱 ${escapeHtml(dekitaDisplayLine(e))}</p>
        </div>`).join('')}
    </div>`;
}
function buildDekitaWriteHtml() {
  return `
    <div class="card no-print" id="dekitaWriteWrap" style="padding:14px 16px; margin:12px 16px 0;">
      <label style="display:block; font-weight:700; font-size:14px; margin-bottom:4px;">🌷 今日のできたよ</label>
      <p class="note" style="margin:0 0 8px;">「がんばった」だけじゃなく、「休めた」「助かった」「自分を守れた」も対象です。書くのは義務じゃないので、気が向いたときだけでどうぞ。</p>
      <textarea id="dekitaInput" rows="3" style="width:100%; padding:10px; font-size:14px; border:1px solid var(--border); border-radius:8px; font-family:inherit; resize:vertical; box-sizing:border-box;">${escapeHtml(dekitaDraft)}</textarea>
      <label class="chip" id="dekitaUsableReplyChip" style="display:inline-block; margin-top:8px; font-size:12.5px;">🌱 これ、聞かれたときの返しにも使えそう</label>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
        <button type="button" class="btn-link no-print" id="dekitaToKaeshi">🛡️ ことばのおまもりへ</button>
        <button type="button" class="btn-sub" id="dekitaSave">残す</button>
      </div>
    </div>`;
}
// 「数日前に書いたことを、マスコットがふと持ってくる」演出。1日1回だけ抽選し、その日のうちは
// 同じ内容を出し続ける（今日書いたばかりのものは対象外＝2日以上前のものだけ）
function pickDekitaRecall() {
  const tk = todayKey();
  const stored = LS.get('dekitaRecallState', null);
  if (stored && stored.dateKey === tk) {
    return stored.entryId ? (dekitaLog.find(e => e.id === stored.entryId) || null) : null;
  }
  const candidates = dekitaLog.filter(e => e.dateKey !== tk && daysBetweenKeys(e.dateKey, tk) >= 2);
  const picked = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
  LS.set('dekitaRecallState', { dateKey: tk, entryId: picked ? picked.id : null });
  return picked;
}
function buildDekitaRecallHtml() {
  const entry = pickDekitaRecall();
  if (!entry) return '';
  const days = daysBetweenKeys(entry.dateKey, todayKey());
  return `
    <div class="card no-print" style="padding:12px 16px; margin:12px 16px 0; background:var(--accent-soft);">
      <label style="display:block; font-weight:700; font-size:13px; margin-bottom:6px;">🐱 ふと思い出したこと</label>
      <p class="note" style="margin:0 0 6px;">${days}日前のこれ、覚えてる？</p>
      <p style="margin:0 0 4px; font-size:14px; white-space:pre-wrap;">${escapeHtml(entry.text)}</p>
      <p class="note" style="margin:0 0 8px;">🐱 ${escapeHtml(dekitaDisplayLine(entry))}</p>
      <button type="button" class="btn-link no-print" data-dekita-replay="${entry.id}">🌸 ほめほめ係にきてもらう</button>
    </div>`;
}
function formatDekitaDateHeader(dateKey) { return dateKey === todayKey() ? `${dateKey}（今日）` : dateKey; }
function buildDekitaAlbumHtml() {
  const entries = dekitaLog.slice(-60).reverse();
  let albumInner;
  if (entries.length) {
    let lastDate = null;
    const parts = [];
    entries.forEach(e => {
      if (e.dateKey !== lastDate) {
        parts.push(`<p class="note" style="margin:${lastDate ? '16px' : '0'} 0 6px; font-weight:700;">${formatDekitaDateHeader(e.dateKey)}</p>`);
        lastDate = e.dateKey;
      }
      parts.push(`
        <div class="chip" style="display:block; width:100%; padding:10px 12px;">
          <p style="margin:0 0 6px; font-size:14px; white-space:pre-wrap; line-height:1.5;">${escapeHtml(e.text)}</p>
          <p class="note" style="margin:0 0 6px;">🐱 ${escapeHtml(dekitaDisplayLine(e))}</p>
          <div style="display:flex; gap:12px; flex-wrap:wrap;">
            <button type="button" class="btn-link no-print" data-dekita-replay="${e.id}" style="padding:2px 0;">🌸 ほめほめ係にきてもらう</button>
            <button type="button" class="btn-link no-print" data-dekita-mark-usable="${e.id}" style="padding:2px 0;">${e.usableReply ? '🌱 返しの材料にしてる' : '🌱 返しの材料にする'}</button>
          </div>
        </div>`);
    });
    albumInner = `<div id="dekitaList" style="display:flex; flex-direction:column; gap:8px;">${parts.join('')}</div>`;
  } else {
    albumInner = `<p class="note" style="margin:0;">まだ記録はありません。書いても書かなくても大丈夫です。</p>`;
  }
  return `
    <div class="card no-print" id="dekitaAlbumWrap" style="padding:14px 16px; margin:12px 16px 0;">
      <label style="display:block; font-weight:700; font-size:14px; margin-bottom:10px;">🗂️ アルバム${dekitaLog.length ? `（${dekitaLog.length}件）` : ''}</label>
      ${albumInner}
      <p class="note" style="margin:12px 0 0;">※記録を見返しても、必ず体調が良くなるとは限りません。自分を責めそうなときに見返す材料として使えます。</p>
      <p class="note" style="margin:4px 0 0;">🌱を付けた記録は、「ことばのおまもり」の「ことばを備える」からも見返せます。</p>
    </div>`;
}
function refreshDekitaCards() {
  const writeWrap = document.getElementById('dekitaWriteWrap');
  if (writeWrap) writeWrap.outerHTML = buildDekitaWriteHtml();
  const albumWrap = document.getElementById('dekitaAlbumWrap');
  if (albumWrap) albumWrap.outerHTML = buildDekitaAlbumHtml();
  attachDekitaHandlers();
}
let dekitaUsableReplyChecked = false;
function attachDekitaHandlers() {
  const toKaeshi = document.getElementById('dekitaToKaeshi');
  if (toKaeshi) toKaeshi.addEventListener('click', () => switchTab('kaeshi'));
  const input0 = document.getElementById('dekitaInput');
  if (input0) input0.addEventListener('input', () => { dekitaDraft = input0.value; saveDekitaDraft(); });
  const btn = document.getElementById('dekitaSave');
  if (btn) btn.addEventListener('click', () => {
    const input = document.getElementById('dekitaInput');
    const text = input.value.trim();
    if (!text) return;
    const category = classifyDekitaText(text);
    const { merged, praise } = buildDekitaResponse(text, category);
    const dateKey = todayKey();
    dekitaLog.push({ id: String(Date.now()), dateKey, text, praise, category, merged, at: Date.now(), usableReply: dekitaUsableReplyChecked });
    if (dekitaLog.length > 500) dekitaLog = dekitaLog.slice(-500);
    saveDekitaLog();
    dekitaUsableReplyChecked = false;
    dekitaDraft = '';
    saveDekitaDraft();
    refreshDekitaCards();
    playDekitaReaction(text, praise, category, merged);
    if (!ganbattaDekitaDates.has(dateKey)) {
      ganbattaDekitaDates.add(dateKey);
      saveGanbattaDekitaDates();
      addGanbattaPoints(1, 'dekita', 'できたよ記録を書いた', dateKey);
    }
  });
  const usableChip = document.getElementById('dekitaUsableReplyChip');
  if (usableChip) usableChip.addEventListener('click', () => {
    dekitaUsableReplyChecked = !dekitaUsableReplyChecked;
    usableChip.classList.toggle('on', dekitaUsableReplyChecked);
  });
  document.querySelectorAll('[data-dekita-replay]').forEach(rBtn => {
    rBtn.addEventListener('click', () => {
      const entry = dekitaLog.find(e => e.id === rBtn.dataset.dekitaReplay);
      if (entry) playDekitaReaction(entry.text, entry.praise, entry.category || 'action', entry.merged);
    });
  });
  // 既存の記録を後から「返しにも使えそう」に切り替えられるようにする（書いた直後は気づかないことが多いため）
  document.querySelectorAll('[data-dekita-mark-usable]').forEach(mBtn => {
    mBtn.addEventListener('click', () => {
      const entry = dekitaLog.find(e => e.id === mBtn.dataset.dekitaMarkUsable);
      if (!entry) return;
      entry.usableReply = !entry.usableReply;
      saveDekitaLog();
      refreshDekitaCards();
      renderTsPrepareUsableList();
    });
  });
}

// ---------- アルバムタブ（できたよ！アルバム／がんばったねポイント） ----------
function renderAlbumTab() {
  const root = document.getElementById('albumTabContent');
  if (!root) return;
  root.innerHTML = `
    ${buildDekitaRecallHtml()}
    ${buildDekitaWriteHtml()}
    ${buildGanbattaPointsHtml()}
    ${buildDekitaAlbumHtml()}
  `;
  attachDekitaHandlers();
}

// ---------- 天気タブ（起動して最初に見える画面。位置情報の許可があれば自動で取得する） ----------
let weatherTabState = { loading: false, loaded: false };

// 記録がまだ0件の、はじめて訪れた人にだけ、このサイトが何のためにあるかを短く伝える
// （記録が増えて分析が使えるようになったら、この案内は自然に消える）
// 天気の取得に失敗・位置情報を拒否した場合でも出す（＝この案内が「いちばん最初に伝えたい説明」であり、
// 天気が取れるかどうかとは無関係に見せる必要があるため）
function buildWeatherOnboardingHtml() {
  if (records.length !== 0) return '';
  return `
    <div class="card" style="padding:14px 16px; margin:12px 16px 0;">
      <label style="display:block; font-weight:600; font-size:14px; margin-bottom:6px;">🌸 はじめての方へ</label>
      <p style="margin:0 0 8px;">トトノエ～ルは、気圧や天気で体調が左右される方のためのサイトです。自律神経と体調の関係は曖昧で、人に説明しづらいものですが、記録を続けることで「気圧が低い日に不調が出やすい」といった自分だけの傾向が見えてきます。</p>
      <p style="margin:0 0 8px;">それは、明日への心づもりにも、周りの人への説明にも役立ちます。まずは下のボタンで、今の気分を記録してみましょう。</p>
      <p class="note" style="margin:0 0 8px;">体質チェックや問診もあわせて記録すると、より少ない記録数で分析が使えるようになります。気になる方は先にそちらもどうぞ。</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button type="button" class="btn-sub no-print" id="wxOnboardingCheckBtn" style="font-size:12px; padding:6px 10px;">🧭 体質チェックをやってみる</button>
        <button type="button" class="btn-sub no-print" id="wxOnboardingIntakeBtn" style="font-size:12px; padding:6px 10px;">📋 問診をやってみる</button>
      </div>
    </div>
  `;
}
// ブラウザ標準のscrollIntoView({behavior:'smooth'})は距離によって体感速度がまちまちで、
// 長い距離だと画面が急に動いた印象になりやすい。距離によらず一定の時間・ゆるやかな加減速で
// 動くよう、独自にアニメーションさせる（CSSのscroll-margin-topはここでは効かないので手動で加味する）
function gentleScrollTo(el, duration = 1600) {
  if (!el) return;
  const marginTop = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const startY = window.scrollY;
  const targetY = Math.max(0, el.getBoundingClientRect().top + startY - marginTop);
  const startTime = performance.now();
  const easeInOutQuad = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    window.scrollTo(0, startY + (targetY - startY) * easeInOutQuad(t));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// 記録タブに移動しなくても、天気を見た流れでそのままワンタップで気分を残せるようにする
// （分析の精度は記録数に依存するため、記録のハードルを下げること自体がミッションに直結する。
// 　天気の取得に失敗・位置情報を拒否した場合でも、気分の記録だけは行き止まりにせず出す）
function buildWeatherQuickRecordHtml() {
  return `
    <div class="card no-print" style="padding:12px 16px; margin:12px 16px 0;">
      <label style="display:block; font-weight:600; font-size:13px; margin-bottom:8px;">📝 今の気分をワンタップで記録</label>
      <div class="mood-picker" id="wxQuickMood">
        <button type="button" class="mood-btn" data-mood="1">😿<span>つらい</span></button>
        <button type="button" class="mood-btn" data-mood="2">🐱<span>ふつう</span></button>
        <button type="button" class="mood-btn" data-mood="3">😽<span>元気</span></button>
      </div>
      <p class="note" id="wxQuickRecordStatus" style="margin:8px 0 0;"></p>
    </div>
  `;
}
// 上の2つのカードをrootに描画した後、共通で必要なイベントを結びつける
// （成功時・失敗時のどちらの描画パスからも呼べるようにするための共通化）
function attachWeatherOnboardingHandlers() {
  const checkBtn = document.getElementById('wxOnboardingCheckBtn');
  if (checkBtn) checkBtn.addEventListener('click', () => switchTab('check'));
  const intakeBtn = document.getElementById('wxOnboardingIntakeBtn');
  if (intakeBtn) intakeBtn.addEventListener('click', () => switchTab('intake'));

  // 天気タブから離れなくても、今の気分だけをワンタップで記録できるようにする。
  // 天気の取得（位置情報の許可を含む）が終わるまで記録を待たせる、元の動きに戻した
  document.querySelectorAll('#wxQuickMood .mood-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const mood = parseInt(btn.dataset.mood, 10);
      const statusEl = document.getElementById('wxQuickRecordStatus');
      const moodBtns = document.querySelectorAll('#wxQuickMood .mood-btn');
      moodBtns.forEach(b => { b.disabled = true; });
      if (statusEl) statusEl.textContent = '記録しています…';
      const dateKey = todayKey();
      const time = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
      const weather = await collectWeather(null, dateKey, time);
      records.push({ id: String(Date.now()), dateKey, time, memo: '', mood, checkSnapshot: null, intakeSnapshot: null, tags: null, weather });
      saveRecords();
      moodBtns.forEach(b => {
        b.disabled = false;
        b.classList.toggle('on', parseInt(b.dataset.mood, 10) === mood);
      });
      if (statusEl) {
        statusEl.innerHTML = `記録しました。<button type="button" class="btn-link no-print" id="wxQuickRecordMore">メモや体質チェックも追加する</button>`;
        const moreBtn = document.getElementById('wxQuickRecordMore');
        if (moreBtn) moreBtn.addEventListener('click', () => { switchTab('record'); openRecordFormUI(); });
      }
      // 気分を記録したら「週間の見通し」まで自動でスクロールする。すぐ下に気象グラフが続く並びなので、
      // 見通しとグラフの両方が視界に入る（天気データが取得できていないときは何もしない）。
      // 記録した直後の「記録しました」表示をちゃんと見られるよう、4秒待ってからスクロールする
      setTimeout(() => {
        const weekSection = document.getElementById('weatherWeekSection');
        gentleScrollTo(weekSection);
      }, 4000);
    });
  });
}

// 天気タブの最上部に「明日どうなりそうか」を一言だけ要約して出す（くわしい根拠は分析タブに譲る）。
// 記録が十分たまっていれば自分の記録との比較（computeForecastAdvisory）を、まだ足りなければ
// 予報そのものから読み取れる一般的な注意点だけを、パーソナライズしていない旨を明記した上で出す。
// サイトの「顔」となるマスコット。元絵は1枚だけなので描き分けはできないが、
// フィルター（明るさ・彩度）と小さな重ね飾りだけで、見出しの傾向にゆるく合わせた雰囲気を出す。
// あくまで演出であり、表情そのものが変わっているわけではないことは崩さない。
// 「今日の作戦会議」：気象・記録との比較・今日の体調を一枚にまとめ、トトノエ～ルの一言と
// 既存タブへの導線（タイマー・記録・ことばのおまもり）を添える。天気タブ単体の機能ではなく、サイトの
// 各機能をつなぐハブとして設計している。ここでも断定はしない：「〜の目安」「〜かも」に統一する
function buildBattlePlanHtml(adv, tomorrow) {
  const flags = [];
  if (tomorrow) {
    if (tomorrow.typhoonFlag) flags.push('🌀 台風接近の目安');
    if (tomorrow.linearRainbandFlag) flags.push('🌊 線状降水帯の目安');
    else if (tomorrow.heavyRainFlag) flags.push('⚠️ 大雨の目安');
    if (tomorrow.pressureDropFlag) flags.push('📉 気圧急降下の目安');
    if (tomorrow.extremeHeatFlag) flags.push('🥵 酷暑の目安');
  }
  if (adv && adv.fcAlerts.length) flags.unshift(...adv.fcAlerts);
  const weatherText = flags.length ? flags.join('　') : '大きな変化はなさそうです';

  let patternText = 'まだ記録が少ないので、比較はこれからです';
  if (adv) {
    patternText = adv.worseCount >= 1
      ? '過去に似た気象条件の日は、体調が優れなかった記録が比較的多めです'
      : '過去に似た気象条件の日は、比較的落ち着いていた記録が多めです';
  }

  const tk = todayKey();
  const todays = records.filter(r => r.dateKey === tk && r.mood).sort((a, b) => String(a.time).localeCompare(String(b.time)));
  const latestMood = todays.length ? todays[todays.length - 1].mood : null;
  const moodLabel = latestMood === 1 ? '😿 つらい' : latestMood === 2 ? '🐱 ふつう' : latestMood === 3 ? '😽 元気' : 'まだ今日の記録がありません';

  const risky = flags.length > 0 || (adv && adv.worseCount >= 1);
  let suggestion = 'いつも通りのペースで大丈夫そう';
  if (latestMood === 1) suggestion = '今日は予定を詰め込みすぎず、休憩を多めにしてみる?';
  else if (risky) suggestion = '今日は少し余白を持たせて、様子を見ながら進めるのがおすすめ';

  return `
    <div class="card battle-plan no-print" style="padding:14px 16px; margin:12px 16px 0;">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
        <label style="font-weight:700; font-size:14px;">☁️ 今日の作戦会議</label>
      </div>
      <div style="font-size:13px; line-height:1.8;">
        <p style="margin:0;"><b>気象</b>：${weatherText}</p>
        <p style="margin:0;"><b>あなたの記録</b>：${patternText}</p>
        <p style="margin:0;"><b>今日の体調</b>：${moodLabel}</p>
      </div>
      <p class="note" style="margin:10px 0 12px; padding:8px 10px; background:var(--accent-soft); border-radius:8px; color:var(--ink);">🐾 トトノエ～ルの提案：${suggestion}</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button type="button" class="btn-sub battle-action" data-action="timer">🍅 まず25分だけ</button>
        <button type="button" class="btn-sub battle-action" data-action="record">📝 記録する</button>
        <button type="button" class="btn-sub battle-action" data-action="album">🌷 できたことを書く</button>
        <button type="button" class="btn-sub battle-action" data-action="kaeshi">🛡️ 伝え方を確認する</button>
      </div>
      <p class="note" style="margin:8px 0 0;">くわしい根拠は下の「あなたの記録との比較」や「記録」タブの分析で見られます。</p>
    </div>
  `;
}
function attachBattlePlanHandlers() {
  document.querySelectorAll('.battle-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'timer') switchTab('pomodoro');
      else if (action === 'record') { switchTab('record'); if (typeof openRecordFormUI === 'function') openRecordFormUI(); }
      else if (action === 'album') { switchTab('album'); const ta = document.getElementById('dekitaInput'); if (ta) ta.focus(); }
      else if (action === 'kaeshi') switchTab('kaeshi');
    });
  });
}

async function renderWeatherTab() {
  const root = document.getElementById('weatherTabContent');
  if (!root || weatherTabState.loading || weatherTabState.loaded) return;
  weatherTabState.loading = true;
  root.innerHTML = `<p class="note" style="margin:16px;">位置情報を確認して天気を取得しています…</p>`;
  try {
    const coords = await getPosition();
    const { days, hourly } = await fetchForecastDays(coords.latitude, coords.longitude, 7);
    if (!hourly.times.length) throw new Error('no-data');
    weatherTabState.loaded = true;
    const chart = buildMeteogramSVG(hourly, records);
    // 記録が十分たまっていれば、明日の予報が「これまで不調が強かった日」のパターンに近いかを自動で添える
    // （医師の診察＝長期を前提に、このサイトは明日への短期的な心づもりを出す、という役割分担のための表示）
    const adv = computeForecastAdvisory(days[1] || days[0]);
    const advToday = computeForecastAdvisory(days[0]);
    captureTodaySnapshotIfNeeded(advToday);
    const advisoryHtml = (adv && adv.factorLines.length) ? `
      <div class="card" style="padding:12px 16px; margin:12px 16px 0;">
        <label style="display:block; font-weight:600; font-size:13px; margin-bottom:6px;">📋 あなたの記録との比較（内訳）</label>
        <ul style="margin:4px 0 0; padding-left:18px; font-size:12px;">${adv.factorLines.map(f => `<li><b>${f.label}</b>：${f.valText}程度の予報（${f.worse ? 'これまで体調が優れなかった日の傾向に近そうです' : 'これまで比較的落ち着いていた日の傾向に近そうです'}）</li>`).join('')}</ul>
        <p class="note" style="margin:6px 0 0;">※ あなた自身の記録にもとづく短期的な参考情報です。長期的な経過は医師にご相談ください。</p>
      </div>
    ` : '';
    const onboardingHtml = buildWeatherOnboardingHtml();
    const quickRecordHtml = buildWeatherQuickRecordHtml();
    const battlePlanHtml = buildBattlePlanHtml(adv, days[1] || days[0]);
    const yesterdayHandoverHtml = buildYesterdayHandoverHtml();
    const similarDaysHtml = buildSimilarDaysHtml(days[0], todayKey());
    const forecastReflectionHtml = buildForecastReflectionHtml();
    const energyBannerHtml = energySaveMode ? `
      <div class="card no-print" style="padding:10px 16px; margin:12px 16px 0; background:var(--accent-soft);">
        <b style="font-size:13px;">🪫 省エネモード中</b>
        <span class="note"> 今日は「最低ライン」を中心に、無理のない範囲で。オフにするにはヘッダーの🪫をタップ</span>
      </div>` : '';
    root.innerHTML = `
      ${energyBannerHtml}
      ${yesterdayHandoverHtml}
      ${battlePlanHtml}
      <div id="minLineCardWrap">${buildMinLineHtml()}</div>
      ${forecastReflectionHtml}
      <div class="wx-now-sticky no-print">
        ${buildWeatherNowHtml(hourly)}
        <button type="button" class="wx-refresh no-print" id="weatherRefreshBtn" title="更新">🔄</button>
      </div>
      ${onboardingHtml}
      ${quickRecordHtml}
      ${advisoryHtml}
      ${similarDaysHtml}
      <div style="padding:14px 16px 0;" id="weatherWeekSection">
        <h4 style="margin:0 0 4px; font-size:13px;">週間の見通し</h4>
        <p class="note" style="margin:0 0 4px;">日付をタップすると、下の予報がその日の0時に移動します。⚠️/△は、あなたの記録の中で体調が優れなかった日の気象パターンに近い予報の日です。☔は降水確率（%）です</p>
      </div>
      ${buildForecastWeekStrip(days)}
      <div class="hbar-track" id="weatherStripHbar" style="margin:0 16px;"></div>
      <div style="padding:14px 16px 0;">
        <h4 style="margin:0 0 6px; font-size:13px;">気象グラフ</h4>
        <p class="note" style="margin:0 0 6px;">スクロールバーやチャートをドラッグすると、その時間の値が下に出ます</p>
        <div class="wx-tooltip" id="weatherHourlyReadout"></div>
      </div>
      <div class="wx-legend">
        <span class="chip"><span class="sw" style="background:var(--wx-temp);"></span>気温</span>
        <span class="chip"><span class="sw dash" style="color:var(--wx-dew);"></span>露点</span>
        <span class="chip"><span class="sw sq" style="background:var(--wx-precip);"></span>降水</span>
        <span class="chip"><span class="sw" style="background:var(--wx-wind);"></span>風</span>
        <span class="chip"><span class="sw" style="background:var(--wx-pressure);"></span>気圧（背景）</span>
        <span class="chip"><span class="sw dot" style="background:var(--wx-wind-deep);"></span>風のピーク</span>
        <span class="chip">🐱 体調（記録した時刻に表示）</span>
      </div>
      <div class="card scrub-wrap wx-chart-card" style="padding:10px 0; margin:6px 16px 0;">
        <div class="scrub-scroll" id="weatherChartScrub">${chart.html}</div>
        <div class="scrub-center-line"></div>
        <div class="wx-tooltip-float" id="weatherChartTooltip"></div>
      </div>
      <div class="hbar-track" id="weatherChartHbar" style="margin:4px 16px 0;"></div>
      <div style="padding:14px 16px 0;" id="weatherHourlySection">
        <h4 style="margin:0 0 6px; font-size:13px;">時間ごとの予報</h4>
      </div>
      ${buildHourlyTableHtml(hourly)}
      <div class="hbar-track" id="weatherTableHbar" style="margin:4px 16px 0;"></div>
      <div style="padding:12px 16px;">${buildExpertPanelHtml(hourly)}</div>
      <p class="note" style="margin:0 16px 16px;">※ Open-Meteoの予報にもとづく参考情報です。気象庁の公式予報ではありません。「分析」タブでは、あなた自身の記録との関連も見られます。</p>
    `;
    attachHScrollbar(document.getElementById('forecastStrip'), document.getElementById('weatherStripHbar'));
    attachHScrollbar(document.getElementById('weatherHourlyTableWrap'), document.getElementById('weatherTableHbar'));
    attachHScrollbar(document.getElementById('weatherChartScrub'), document.getElementById('weatherChartHbar'));
    // ドラッグ/スクロールバー操作（setupScrubbableChart）と、マウスを乗せただけのホバーの
    // 両方から同じ内容を更新できるよう、表示ロジックを1つの関数にまとめる
    let weatherTooltipHideTimer = null;
    function updateWeatherReadout(idx) {
      const t = hourly.times[idx];
      const hour = Number(t.slice(11, 13));
      const timeLabel = hour === 0 ? t.slice(5, 10).replace('-', '/') : `${hour}時`;
      const fieldsHtml = `
        <span class="field"><span class="dot" style="background:var(--wx-temp);"></span>気温 ${hourly.temp[idx].toFixed(1)}℃</span>
        <span class="field"><span class="dot" style="background:var(--wx-dew);"></span>露点 ${hourly.dew[idx].toFixed(1)}℃</span>
        <span class="field"><span class="dot" style="background:var(--wx-wind);"></span>風速 ${hourly.wind[idx].toFixed(1)}m/s</span>
        <span class="field"><span class="dot" style="background:var(--wx-pressure);"></span>気圧 ${hourly.pressure[idx].toFixed(1)}hPa</span>
      `;
      const readout = document.getElementById('weatherHourlyReadout');
      if (readout) readout.innerHTML = `<span class="time">${timeLabel}</span>${fieldsHtml}`;

      // チャートの上に浮かせて表示するツールチップ：横スクロール位置(scrollLeft)を差し引いた
      // 「今見えている範囲の中でのx座標」に配置することで、ドラッグ・ホバーどちらでも
      // カーソル/クロスヘアのすぐ近くに表示され続ける
      const tooltipFloat = document.getElementById('weatherChartTooltip');
      const scrollEl = document.getElementById('weatherChartScrub');
      if (tooltipFloat && scrollEl && chart.xPositions[idx] != null) {
        tooltipFloat.innerHTML = `<span class="time">${timeLabel}</span>${fieldsHtml}`;
        tooltipFloat.classList.add('show');
        const cardWidth = scrollEl.clientWidth;
        const tw = tooltipFloat.offsetWidth || 140;
        let left = chart.xPositions[idx] - scrollEl.scrollLeft - tw / 2;
        left = Math.max(6, Math.min(cardWidth - tw - 6, left));
        tooltipFloat.style.left = left + 'px';
        // 追従はそのままに、最後の更新からしばらく操作がなければ自動で消す
        // （出しっぱなしだと邪魔、というフィードバックを受けて）
        clearTimeout(weatherTooltipHideTimer);
        weatherTooltipHideTimer = setTimeout(() => tooltipFloat.classList.remove('show'), 1800);
      }

      const crosshair = document.querySelector('#weatherChartScrub .hover-crosshair');
      if (crosshair && chart.xPositions[idx] != null) {
        crosshair.setAttribute('x1', chart.xPositions[idx]);
        crosshair.setAttribute('x2', chart.xPositions[idx]);
        crosshair.setAttribute('opacity', 1);
      }
    }
    const chartCtl = setupScrubbableChart('weatherChartScrub', chart.xPositions, hourly.nowIndex ?? 0, updateWeatherReadout);
    // ドラッグしなくても、マウスを乗せて動かすだけ（PCでのホバー）で読み取れるようにする
    const weatherChartScrubEl = document.getElementById('weatherChartScrub');
    if (weatherChartScrubEl) {
      weatherChartScrubEl.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return; // タッチはドラッグ操作に任せる（誤反応防止）
        const rect = weatherChartScrubEl.getBoundingClientRect();
        const mouseX = e.clientX - rect.left + weatherChartScrubEl.scrollLeft;
        let best = 0, bestDist = Infinity;
        chart.xPositions.forEach((x, i) => { const d = Math.abs(x - mouseX); if (d < bestDist) { bestDist = d; best = i; } });
        updateWeatherReadout(best);
      });
      // カーソルがチャートの外に出たら、タイムアウトを待たずすぐにツールチップを消す
      weatherChartScrubEl.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'touch') return; // タッチはドラッグ終了時にendDrag側で処理される
        clearTimeout(weatherTooltipHideTimer);
        const tooltipFloat = document.getElementById('weatherChartTooltip');
        if (tooltipFloat) tooltipFloat.classList.remove('show');
      });
    }
    // 週間の見通しの日付をタップしたら、時間ごとの予報グラフをその日の0時まで動かす
    if (chartCtl) {
      document.querySelectorAll('#forecastStrip .forecast-day[data-date]').forEach(btn => {
        btn.addEventListener('click', () => {
          const midnightIdx = hourly.times.indexOf(`${btn.dataset.date}T00:00`);
          if (midnightIdx >= 0) {
            chartCtl.scrollToIndex(midnightIdx);
            document.getElementById('weatherChartScrub').scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      });
    }
    const refreshBtn = document.getElementById('weatherRefreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => { weatherTabState.loaded = false; renderWeatherTab(); });

    attachWeatherOnboardingHandlers();
    attachBattlePlanHandlers();
    attachMinLineHandlers();
    attachForecastReflectionHandler();
    // 画面すみっこのマスコットからも、天気タブを開いた流れで一言だけ添える（毎回ではなく該当時のみ）。
    // 「見に行く」演出にできる時はguideCheckで歩いて見に行かせ、そうでない時は素の一言だけにする
    {
      const tmr = days[1] || days[0];
      const stressed = tmr && (tmr.typhoonFlag || tmr.linearRainbandFlag || tmr.heavyRainFlag || tmr.pressureDropFlag || tmr.extremeHeatFlag);
      const line = (adv && adv.worseCount >= 1) ? pickMascotLine('weatherPattern')
        : stressed ? pickMascotLine('weatherStress')
        : (mascotCasualSpeechEnabled && Math.random() < 0.3) ? 'きょうのお天気、見てきたよ〜' : null;
      if (line) {
        if (typeof window.mascotGuideCheck === 'function') window.mascotGuideCheck(line);
        else if (typeof window.mascotSay === 'function') window.mascotSay(line, 2600);
      }
    }
  } catch (e) {
    const denied = e && e.code === 1;
    const deniedMsg = '天気情報を読み込めませんでした。天気なしでも、下の気分の記録は残せます。';
    // 位置情報を拒否／天気の取得に失敗した場合でも、サイトの目的説明とワンタップ記録は行き止まりにせず出す
    // （これらは天気が取れるかどうかとは無関係に、初めての人へいちばん最初に伝えたい内容のため）
    root.innerHTML = `
      ${buildYesterdayHandoverHtml()}
      <div id="minLineCardWrap">${buildMinLineHtml()}</div>
      ${buildWeatherOnboardingHtml()}
      ${buildWeatherQuickRecordHtml()}
      <div class="card" style="padding:16px; text-align:center; margin:12px 16px 0;">
        <p class="note" style="margin:0 0 10px;">${denied ? deniedMsg : '天気情報を取得できませんでした。電波状況などをご確認のうえ、もう一度お試しください。天気なしでも、下の気分の記録は残せます。'}</p>
        <button type="button" class="btn-sub" id="weatherRetryBtn">🔄 もう一度試す</button>
      </div>`;
    const retryBtn = document.getElementById('weatherRetryBtn');
    if (retryBtn) retryBtn.addEventListener('click', () => { weatherTabState.loaded = false; renderWeatherTab(); });
    attachWeatherOnboardingHandlers();
    attachMinLineHandlers();
  } finally {
    weatherTabState.loading = false;
  }
}
// 横スクロールするチャートを、初期表示で指定インデックスが見えるようにし、
// マウスドラッグ・スクロールの両方で動かせるようにする。中央に来た時点の値を読み取りコールバックに渡す。
// align:'end' を指定すると、指定インデックスを中央寄せではなく右端に固定する（気分推移＝現在を右端に置く用途）
function setupScrubbableChart(scrollElId, xPositions, initialIndex, onScrub, opts) {
  const scrollEl = document.getElementById(scrollElId);
  if (!scrollEl || !xPositions.length) return null;
  const align = (opts && opts.align) || 'center';
  let userInteracted = false;
  let programmaticScroll = false;
  const scrollToIndex = (idx) => {
    programmaticScroll = true;
    if (align === 'end') {
      // scrollWidthより大きい値を入れても、ブラウザが自動で最大値（＝右端）にクランプする
      scrollEl.scrollLeft = scrollEl.scrollWidth;
    } else {
      const x = xPositions[idx] ?? 0;
      scrollEl.scrollLeft = Math.max(0, x - scrollEl.clientWidth / 2);
    }
    onScrub(idx);
    // scrollイベントは非同期で発火するため、次のタスクまでフラグを保持しておく
    setTimeout(() => { programmaticScroll = false; }, 0);
  };
  scrollToIndex(initialIndex);
  // display:noneのタブ内で描画された直後など、幅が0の状態で位置合わせされてしまうことがあるため、
  // 実際に表示されてサイズが確定するまで（＝ユーザーがまだ触っていない間は）繰り返し合わせ直す
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => { if (!userInteracted) scrollToIndex(initialIndex); });
    ro.observe(scrollEl);
  } else {
    requestAnimationFrame(() => { if (!userInteracted) scrollToIndex(initialIndex); });
    setTimeout(() => { if (!userInteracted) scrollToIndex(initialIndex); }, 150);
  }

  function nearestIndexAtCenter() {
    const centerX = scrollEl.scrollLeft + scrollEl.clientWidth / 2;
    let best = 0, bestDist = Infinity;
    xPositions.forEach((x, i) => { const d = Math.abs(x - centerX); if (d < bestDist) { bestDist = d; best = i; } });
    return best;
  }
  let raf = null;
  const scheduleUpdate = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = null; onScrub(nearestIndexAtCenter()); });
  };
  scrollEl.addEventListener('scroll', () => {
    // 自前のscrollToIndexによる移動でなければ、スクロールバー操作も含めて「ユーザーが操作した」とみなす
    if (!programmaticScroll) userInteracted = true;
    scheduleUpdate();
  }, { passive: true });

  let dragging = false, startX = 0, startScroll = 0;
  scrollEl.style.cursor = 'grab';
  scrollEl.addEventListener('pointerdown', (e) => {
    userInteracted = true;
    dragging = true; startX = e.clientX; startScroll = scrollEl.scrollLeft;
    scrollEl.setPointerCapture(e.pointerId);
    scrollEl.style.cursor = 'grabbing';
  });
  scrollEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    scrollEl.scrollLeft = startScroll - (e.clientX - startX);
    // ドラッグ中はスクロールイベントの発火タイミングに頼らず、その場で読み取り値を更新する
    onScrub(nearestIndexAtCenter());
  });
  const endDrag = () => { dragging = false; scrollEl.style.cursor = 'grab'; };
  scrollEl.addEventListener('pointerup', endDrag);
  scrollEl.addEventListener('pointercancel', endDrag);
  scrollEl.addEventListener('pointerleave', () => { if (dragging) endDrag(); });

  onScrub(initialIndex);
  return { scrollToIndex };
}

// 横スクロールできる要素に、常に見えて掴んで動かせるスクロールバーを追加する
// （タッチ端末ではネイティブのスクロールバーが常時表示されないため、代わりに自前で描画する）
function attachHScrollbar(scrollEl, trackEl) {
  if (!scrollEl || !trackEl) return;
  trackEl.innerHTML = '';
  const thumb = document.createElement('div');
  thumb.className = 'hbar-thumb';
  trackEl.appendChild(thumb);

  const update = () => {
    const trackW = trackEl.clientWidth;
    const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
    if (maxScroll <= 0) { trackEl.hidden = true; return; }
    trackEl.hidden = false;
    const ratio = scrollEl.clientWidth / scrollEl.scrollWidth;
    const thumbW = Math.max(24, trackW * ratio);
    const maxThumbX = trackW - thumbW;
    const x = (scrollEl.scrollLeft / maxScroll) * maxThumbX;
    thumb.style.width = `${thumbW}px`;
    thumb.style.transform = `translateY(-50%) translateX(${x}px)`;
  };
  update();
  // display:none のタブが後から表示される場合など、幅が確定するタイミングがずれることがあるため、
  // サイズ変化そのものを監視して再計測する（タブ切り替えで表示された瞬間も検知できる）
  if (window.ResizeObserver) {
    new ResizeObserver(update).observe(scrollEl);
  } else {
    requestAnimationFrame(() => requestAnimationFrame(update));
    setTimeout(update, 150);
  }
  scrollEl.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);

  // つまみの細い部分だけでなく、バー全体のどこを掴んでもそのままドラッグで動かせるようにする
  // （指の当たり判定が甘いタッチ端末で、つまみを正確に掴めず動かせないという問題への対処）
  let dragging = false, startX = 0, startScroll = 0;
  trackEl.addEventListener('pointerdown', (e) => {
    const trackW = trackEl.clientWidth;
    const thumbW = thumb.getBoundingClientRect().width;
    const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
    const maxThumbX = trackW - thumbW;
    if (maxThumbX <= 0 && maxScroll <= 0) return;
    dragging = true;
    try { trackEl.setPointerCapture(e.pointerId); } catch { /* キャプチャに失敗しても以降の移動処理は継続する */ }
    if (e.target === thumb) {
      // つまみそのものを掴んだ場合は、そこからの相対移動でスクロールする
      startX = e.clientX; startScroll = scrollEl.scrollLeft;
    } else {
      // バーの余白を掴んだ場合は、まずその位置へ一気に移動してから、そのままドラッグを続けられるようにする
      const rect = trackEl.getBoundingClientRect();
      const targetX = Math.min(Math.max(0, e.clientX - rect.left - thumbW / 2), maxThumbX);
      scrollEl.scrollLeft = maxThumbX > 0 ? (targetX / maxThumbX) * maxScroll : 0;
      startX = e.clientX; startScroll = scrollEl.scrollLeft;
    }
  });
  trackEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const trackW = trackEl.clientWidth;
    const thumbW = thumb.getBoundingClientRect().width;
    const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
    const maxThumbX = trackW - thumbW;
    if (maxThumbX <= 0) return;
    scrollEl.scrollLeft = startScroll + (e.clientX - startX) * (maxScroll / maxThumbX);
  });
  const endDrag = () => { dragging = false; };
  trackEl.addEventListener('pointerup', endDrag);
  trackEl.addEventListener('pointercancel', endDrag);
}

// ---------- メモの言葉ミニ分析（頻出ワード×天気・気分の関連） ----------
// 「伝える」語彙・症状名・体質名を辞書として、メモ本文から気になる言葉を拾う簡易マイニング。
const MEMO_KEYWORDS = Array.from(new Set([
  ...TSUTAERU_WORDS.place, ...TSUTAERU_WORDS.feel, ...TSUTAERU_WORDS.mind, ...TSUTAERU_WORDS.body,
  ...SYMPTOMS.map(s => s.name),
  ...TAISHITSU.map(t => t.name),
]));
function extractMemoKeywords(text) {
  if (!text) return [];
  return MEMO_KEYWORDS.filter(k => text.includes(k));
}

let analysisLength = 'medium';

// 気象・生理イベントの定義（分析タブと印刷サマリーの両方から共通で使う）
const EVENT_DEFS = [
  { key:'heavyRain', label:'大雨（気象庁の警報級を含む）', test: r => (r.weather.official && r.weather.official.rainLevel >= 2) || r.weather.heavyRainFlag },
  { key:'linearRainband', label:'線状降水帯の目安', test: r => r.weather.linearRainbandFlag || (r.weather.official && r.weather.official.linearRainbandLikely) },
  { key:'typhoon', label:'台風（接近の目安を含む）', test: r => (r.weather.official && r.weather.official.stormLevel >= 1) || r.weather.typhoonFlag },
  { key:'extremeHeat', label:'酷暑（猛暑日の目安）', test: r => !!r.weather.extremeHeatFlag },
  { key:'highHumidity', label:'高湿度の目安', test: r => !!r.weather.highHumidityFlag },
  { key:'strongWind', label:'強風の目安', test: r => !!r.weather.strongWindFlag },
  { key:'preMenstrual', label:'生理前ウィンドウ（生理開始前7日以内）', test: r => isPreMenstrualWindow(r.dateKey) },
];
// 重回帰分析に投入する気象要因（分析タブと印刷サマリーの両方から共通で使う）
const REGRESSION_FACTORS = [
  { key:'pressure', label:'気圧' },
  { key:'pressureChange3h', label:'気圧の変化（3時間）' },
  { key:'humidity', label:'湿度' },
  { key:'temp', label:'気温' },
  { key:'wind', label:'風速' },
];

// 相関係数と95%信頼区間を、研究発表でよく使われる「フォレストプロット」形式で描画する
function buildForestPlotSVG(corrList) {
  const rows = corrList.filter(c => c.r != null && c.ci);
  if (!rows.length) return '<p class="note">まだ図にできるだけの記録がありません。</p>';
  const W = 640, rowH = 34, padL = 130, padR = 60, padT = 24, padB = 24;
  const H = padT + rows.length * rowH + padB;
  const plotL = padL, plotR = W - padR;
  const x = v => plotL + (plotR - plotL) * (v + 1) / 2; // rは-1〜1の範囲
  const zeroX = x(0);
  const body = rows.map((c, i) => {
    const y = padT + i * rowH + rowH / 2;
    const [lo, hi] = c.ci;
    const sig = c.pAdj != null && c.pAdj < 0.05;
    const color = sig ? 'var(--accent)' : 'var(--ink-sub)';
    return `<g style="opacity:0; animation:fadeInUp .5s ease-out forwards; animation-delay:${(i * 0.08).toFixed(2)}s;">` +
      `<line x1="${x(lo).toFixed(1)}" y1="${y}" x2="${x(hi).toFixed(1)}" y2="${y}" stroke="${color}" stroke-width="2" />` +
      `<circle cx="${x(c.r).toFixed(1)}" cy="${y}" r="5.5" fill="${color}" />` +
      `<text x="8" y="${y + 4}" font-size="12" fill="var(--ink)">${escapeHtml(c.label)}</text>` +
      `<text x="${plotR + 8}" y="${y + 4}" font-size="11" fill="var(--ink-sub)">r=${c.r.toFixed(2)}</text></g>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto; display:block;" role="img" aria-label="気象要因ごとの相関係数と95%信頼区間">
    <line x1="${zeroX.toFixed(1)}" y1="${padT - 8}" x2="${zeroX.toFixed(1)}" y2="${H - padB + 8}" stroke="var(--border)" stroke-dasharray="3,3" />
    <text x="${zeroX.toFixed(1)}" y="${padT - 12}" font-size="10" fill="var(--ink-sub)" text-anchor="middle">r=0</text>
    ${body}
  </svg>`;
}
// 重回帰の標準化係数（β）と95%信頼区間を、同じくフォレストプロット形式で描画する。
// rは-1〜1に収まるが、βは多重共線性があると±1を超えることもあるため、軸の範囲をデータに合わせて可変にする。
function buildRegressionForestPlotSVG(regression) {
  const rows = regression.results.filter(r => r.ci);
  if (!rows.length) return '<p class="note">まだ図にできるだけの記録がありません。</p>';
  const maxAbs = Math.max(0.3, ...rows.map(r => Math.max(Math.abs(r.ci[0]), Math.abs(r.ci[1]))));
  const W = 640, rowH = 34, padL = 130, padR = 60, padT = 24, padB = 24;
  const H = padT + rows.length * rowH + padB;
  const plotL = padL, plotR = W - padR;
  const x = v => plotL + (plotR - plotL) * (v + maxAbs) / (2 * maxAbs);
  const zeroX = x(0);
  const body = rows.map((r, i) => {
    const y = padT + i * rowH + rowH / 2;
    const sig = r.pAdj != null && r.pAdj < 0.05;
    const color = sig ? 'var(--accent)' : 'var(--ink-sub)';
    return `<g style="opacity:0; animation:fadeInUp .5s ease-out forwards; animation-delay:${(i * 0.08).toFixed(2)}s;">` +
      `<line x1="${x(r.ci[0]).toFixed(1)}" y1="${y}" x2="${x(r.ci[1]).toFixed(1)}" y2="${y}" stroke="${color}" stroke-width="2" />` +
      `<circle cx="${x(r.beta).toFixed(1)}" cy="${y}" r="5.5" fill="${color}" />` +
      `<text x="8" y="${y + 4}" font-size="12" fill="var(--ink)">${escapeHtml(r.label)}</text>` +
      `<text x="${plotR + 8}" y="${y + 4}" font-size="11" fill="var(--ink-sub)">β=${r.beta.toFixed(2)}</text></g>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto; display:block;" role="img" aria-label="重回帰の標準化係数と95%信頼区間">
    <line x1="${zeroX.toFixed(1)}" y1="${padT - 8}" x2="${zeroX.toFixed(1)}" y2="${H - padB + 8}" stroke="var(--border)" stroke-dasharray="3,3" />
    <text x="${zeroX.toFixed(1)}" y="${padT - 12}" font-size="10" fill="var(--ink-sub)" text-anchor="middle">β=0</text>
    ${body}
  </svg>`;
}
// ラグ相関：気圧・湿度・気温が「その日」ではなく数日遅れて体調に出ていないかを、
// 実際に記録された日付をずらして突き合わせる形で検証する（因果ではなく相関の遅れの確認）
function computeLagCorrelations(usableSubset, scoredSubset, useMood) {
  const severityOf = r => useMood ? (r.mood ? 4 - r.mood : null) : (r.checkSnapshot && r.checkSnapshot.length ? r.checkSnapshot.reduce((s, x) => s + x.count, 0) : null);
  const weatherByDate = {};
  usableSubset.forEach(r => { if (!weatherByDate[r.dateKey]) weatherByDate[r.dateKey] = r.weather; });
  const severityByDate = {};
  scoredSubset.forEach(r => {
    const sev = severityOf(r);
    if (sev == null) return;
    (severityByDate[r.dateKey] = severityByDate[r.dateKey] || []).push(sev);
  });
  const avgSeverityByDate = {};
  Object.entries(severityByDate).forEach(([d, arr]) => { avgSeverityByDate[d] = arr.reduce((a, b) => a + b, 0) / arr.length; });

  const factors = [
    { label: '気圧', accessor: w => w.pressure },
    { label: '湿度', accessor: w => w.humidity },
    { label: '気温', accessor: w => w.temp },
  ];
  const lags = [0, 1, 2, 3];
  return factors.map(f => ({
    label: f.label,
    lagResults: lags.map(lag => {
      const pairs = [];
      Object.keys(avgSeverityByDate).forEach(d => {
        const w = weatherByDate[addDaysToKey(d, -lag)];
        if (w && f.accessor(w) != null) pairs.push([f.accessor(w), avgSeverityByDate[d]]);
      });
      if (pairs.length < 8) return { lag, r: null, n: pairs.length };
      return { lag, r: pearson(pairs.map(p => p[0]), pairs.map(p => p[1])), n: pairs.length };
    }),
  }));
}
// 記録された気象値のうち、その要因の平均から大きく外れている（3σ超）ものを検出する。
// 天気APIの取得タイミングのズレなど、データの取り違えに気づく手がかりにする。
function detectWeatherOutliers(usableSubset) {
  const factors = [
    { label: '気圧', accessor: w => w.pressure },
    { label: '気温', accessor: w => w.temp },
    { label: '湿度', accessor: w => w.humidity },
    { label: '風速', accessor: w => w.windSpeed },
  ];
  const outliers = [];
  factors.forEach(f => {
    const vals = usableSubset.map(r => f.accessor(r.weather)).filter(v => v != null);
    if (vals.length < 8) return;
    const { mean, sd } = meanSd(vals);
    if (sd === 0) return;
    usableSubset.forEach(r => {
      const v = f.accessor(r.weather);
      if (v == null) return;
      const z = (v - mean) / sd;
      if (Math.abs(z) >= 3) outliers.push({ dateKey: r.dateKey, factor: f.label, value: v, z });
    });
  });
  return outliers.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
}
// 「どの要因が、どの日に効いていたか」を時系列で見る要因別寄与度分解。
// 線形モデルでは、各要因の寄与度（SHAP値に相当するもの）は「係数×標準化した値」で数学的に厳密に求まる
// （近似ではなく、線形モデルにおけるSHAP値の正確な定義そのもの）。ニューラルネットを使うIntegrated Gradientsとは別物だが、
// 「この日、何が悪化方向に効いていたか」を知りたいという目的には、この分解で正確に答えられる。
function computeFactorContributions(usableSubset, regression, days = 14) {
  if (!regression) return [];
  const byDate = {};
  usableSubset.forEach(r => { if (!byDate[r.dateKey]) byDate[r.dateKey] = r.weather; });
  const dateKeys = Object.keys(byDate).sort().slice(-days);
  const factorVal = { pressure: 'pressure', pressureChange3h: 'pressureChange3h', humidity: 'humidity', temp: 'temp', wind: 'windSpeed' };
  return dateKeys.map(dateKey => {
    const w = byDate[dateKey];
    const contributions = REGRESSION_FACTORS.map(f => {
      const stat = regression.factorStats[f.key];
      const coef = regression.results.find(x => x.key === f.key);
      const val = w[factorVal[f.key]];
      if (val == null || !stat || !coef) return { key: f.key, label: f.label, value: 0 };
      return { key: f.key, label: f.label, value: coef.beta * ((val - stat.mean) / stat.sd) };
    });
    return { dateKey, contributions };
  });
}
const CONTRIB_COLORS = { pressure: 'var(--accent)', pressureChange3h: '#c98a4b', humidity: '#7fb3e8', temp: '#e0748f', wind: '#8aa9c9' };
function buildContributionTimelineSVG(dayContribs) {
  if (!dayContribs.length) return '<p class="note">表示できるだけのデータがまだありません。</p>';
  const W = 640, padL = 36, padR = 10, padT = 14, plotH = 150, padB = 40;
  const n = dayContribs.length;
  const slot = (W - padL - padR) / n;
  const barW = Math.max(6, slot - 6);
  const maxAbs = Math.max(1, ...dayContribs.map(d =>
    Math.max(d.contributions.reduce((s, c) => s + Math.max(0, c.value), 0), Math.abs(d.contributions.reduce((s, c) => s + Math.min(0, c.value), 0)))
  ));
  const zeroY = padT + plotH / 2;
  const scale = (plotH / 2 - 4) / maxAbs;
  let body = '';
  dayContribs.forEach((d, i) => {
    const x = padL + i * slot + (slot - barW) / 2;
    let posY = zeroY, negY = zeroY;
    let bars = '';
    d.contributions.forEach(c => {
      const h = Math.abs(c.value) * scale;
      if (h < 0.5) return;
      if (c.value >= 0) { bars += `<rect x="${x.toFixed(1)}" y="${(posY - h).toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${CONTRIB_COLORS[c.key]}" opacity="0.9" />`; posY -= h; }
      else { bars += `<rect x="${x.toFixed(1)}" y="${negY.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${CONTRIB_COLORS[c.key]}" opacity="0.5" />`; negY += h; }
    });
    if (bars) body += `<g style="transform-origin:0px ${zeroY}px; opacity:0; animation:barGrow .5s ease-out forwards; animation-delay:${(i * 0.025).toFixed(3)}s;">${bars}</g>`;
    if (i === 0 || i === n - 1 || i % Math.ceil(n / 6) === 0) {
      body += `<text x="${(x + barW / 2).toFixed(1)}" y="${padT + plotH + 16}" font-size="9" fill="var(--ink-sub)" text-anchor="middle">${d.dateKey.slice(5)}</text>`;
    }
  });
  const legend = REGRESSION_FACTORS.map(f => `<span style="display:inline-flex; align-items:center; gap:4px; margin-right:10px;"><span style="width:10px; height:10px; border-radius:2px; background:${CONTRIB_COLORS[f.key]}; display:inline-block;"></span>${escapeHtml(f.label)}</span>`).join('');
  return `<svg viewBox="0 0 ${W} ${padT + plotH + padB}" style="width:100%; height:auto; display:block;" role="img" aria-label="日ごとの要因別寄与度">
      <line x1="${padL}" y1="${zeroY}" x2="${W - padR}" y2="${zeroY}" stroke="var(--border)" />
      <text x="4" y="${padT + 6}" font-size="9" fill="var(--ink-sub)">不調寄り</text>
      <text x="4" y="${padT + plotH - 2}" font-size="9" fill="var(--ink-sub)">好調寄り</text>
      ${body}
    </svg>
    <div style="margin-top:6px; font-size:11px;">${legend}</div>`;
}
// 直近日の主要因＋ラグ相関を組み合わせて、「今日の不調は何が効いていたか」を一文のストーリーにする
function buildContributionStoryText(dayContribs, lagResults) {
  if (!dayContribs.length) return '';
  const today = dayContribs[dayContribs.length - 1];
  const sorted = [...today.contributions].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const top = sorted[0];
  if (!top || Math.abs(top.value) < 0.15) return `${today.dateKey}は、特定の要因が突出して不調に関連している様子は見られません。`;
  const dir = top.value > 0 ? '不調寄りに' : '好調寄りに';
  let text = `${today.dateKey}は、${top.label}がもっとも${dir}働いているようです`;
  const lagInfo = lagResults.find(f => f.label === top.label);
  if (lagInfo) {
    const bestLag = lagInfo.lagResults.filter(x => x.r != null).sort((a, b) => Math.abs(b.r) - Math.abs(a.r))[0];
    if (bestLag && bestLag.lag > 0 && Math.abs(bestLag.r) >= 0.3) {
      text += `。${top.label}は${bestLag.lag}日前の値との関連がもっとも強い傾向があるため、数日前の変化が今に響いている可能性もあります`;
    }
  }
  text += '（あくまで記録データにもとづく統計的な関連で、因果関係を証明するものではありません）。';
  return text;
}

// 重回帰モデルの係数をそのまま使い、スライダーで条件を変えると予測がその場で動く「what-ifシミュレーター」。
// 新しい統計モデルは何も作らず、すでに画面に出している重回帰の結果を評価し直しているだけなので、
// 表示される数値は常に上のモデル説明（β・R²）と矛盾しない。
function renderWhatIfSimulator(regression) {
  const card = document.getElementById('whatIfCard');
  if (!card || !regression) return;
  const state = {};
  REGRESSION_FACTORS.forEach(f => { state[f.key] = regression.factorStats[f.key].mean; });

  function computeZPred() {
    return REGRESSION_FACTORS.reduce((sum, f) => {
      const stat = regression.factorStats[f.key];
      const coef = regression.results.find(r => r.key === f.key);
      return sum + coef.beta * ((state[f.key] - stat.mean) / stat.sd);
    }, 0);
  }
  function render() {
    const zPred = computeZPred();
    const pct = Math.max(0, Math.min(100, 50 + zPred * 25));
    card.innerHTML = `
      ${REGRESSION_FACTORS.map(f => {
        const stat = regression.factorStats[f.key];
        const min = stat.mean - 2 * stat.sd, max = stat.mean + 2 * stat.sd;
        const digits = f.key === 'humidity' || f.key === 'pressure' ? 0 : 1;
        return `<div style="margin-bottom:10px;">
          <label style="display:flex; justify-content:space-between; font-size:12px;"><span>${escapeHtml(f.label)}</span><span>${state[f.key].toFixed(digits)}</span></label>
          <input type="range" class="no-print" data-whatif="${f.key}" min="${min}" max="${max}" step="${(max - min) / 40}" value="${state[f.key]}" style="width:100%;" />
        </div>`;
      }).join('')}
      <div class="diag-bar" style="margin-top:10px;">
        <span class="diag-bar-label">予測される不調の傾き</span>
        <div class="diag-bar-track"><div class="diag-bar-fill" style="width:${pct}%; background:${zPred > 0 ? 'var(--warm)' : 'var(--accent)'};"></div></div>
      </div>
      <p class="note" style="margin:6px 0 0;">${zPred > 0.3 ? 'この条件では、平均的な日より体調が優れないと感じやすい方向です。' : zPred < -0.3 ? 'この条件では、平均的な日より比較的落ち着いていると感じやすい方向です。' : 'この条件では、平均的な日と大きく変わらない見通しです。'}（重回帰モデル R²=${regression.r2 != null ? regression.r2.toFixed(2) : '-'}にもとづく参考値で、未来を保証するものではありません）</p>
    `;
    card.querySelectorAll('[data-whatif]').forEach(slider => {
      slider.addEventListener('input', () => { state[slider.dataset.whatif] = Number(slider.value); render(); });
    });
  }
  render();
}

// ---------- 私の取扱説明書 ----------
// 分析タブと同じ計算方法（ピアソン相関・組み合わせ判定・落ち着いている日判定）を使うが、
// 数式や相関係数は出さず、「崩れやすい条件」「安定しやすい条件」の2つだけに整理して見せる。
// 「世間一般の正解」ではなく、あくまで本人の記録だけから見える傾向であることを明記する
function computeSelfPatterns() {
  const usable = records.filter(r => r.weather && r.weather.status === 'ok');
  const moodRecords = usable.filter(r => r.mood);
  const useMood = moodRecords.length >= 5;
  const checkRecords = usable.filter(r => r.checkSnapshot && r.checkSnapshot.length);
  const withScore = useMood ? moodRecords : checkRecords;
  if (withScore.length < 5) return null;
  const severity = r => useMood ? (4 - r.mood) : r.checkSnapshot.reduce((s, x) => s + x.count, 0);

  const FACTOR_ACCESSORS = {
    pressure: r => r.weather.pressure, pressureChange3h: r => r.weather.pressureChange3h,
    humidity: r => r.weather.humidity, temp: r => r.weather.temp, wind: r => r.weather.windSpeed,
  };
  const FACTOR_LABEL = { pressure: '気圧', pressureChange3h: '気圧の変化', humidity: '湿度', temp: '気温', wind: '風速' };
  function corrForFactor(accessor) {
    const subset = withScore.filter(r => accessor(r) != null);
    if (subset.length < 5) return { r: null, n: subset.length };
    return { r: pearson(subset.map(accessor), subset.map(severity)), n: subset.length };
  }
  const corrList = Object.keys(FACTOR_ACCESSORS).map(key => ({ key, label: FACTOR_LABEL[key], ...corrForFactor(FACTOR_ACCESSORS[key]) }));

  const worsen = [];
  const stable = [];

  // 単独要因（強い順に2つまで）
  corrList.filter(c => c.r != null && Math.abs(c.r) >= 0.3)
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
    .slice(0, 2)
    .forEach(c => worsen.push(`${c.label}が${c.r > 0 ? '高い' : '低い'}日`));

  // 組み合わせ（分析タブのcomputeComboFactorPatternsと同じロジック）
  const candidates = corrList.filter(c => c.r != null && Math.abs(c.r) >= 0.25);
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i], b = candidates[j];
      const accA = FACTOR_ACCESSORS[a.key], accB = FACTOR_ACCESSORS[b.key];
      const subset = withScore.filter(r => accA(r) != null && accB(r) != null);
      if (subset.length < 10) continue;
      const sortedA = subset.map(accA).slice().sort((x, y) => x - y);
      const sortedB = subset.map(accB).slice().sort((x, y) => x - y);
      const medA = sortedA[Math.floor(sortedA.length / 2)];
      const medB = sortedB[Math.floor(sortedB.length / 2)];
      const isBadA = r => a.r > 0 ? accA(r) > medA : accA(r) < medA;
      const isBadB = r => b.r > 0 ? accB(r) > medB : accB(r) < medB;
      const both = subset.filter(r => isBadA(r) && isBadB(r));
      const others = subset.filter(r => !(isBadA(r) && isBadB(r)));
      if (both.length < 5 || others.length < 5) continue;
      const bothAvg = both.reduce((s, r) => s + severity(r), 0) / both.length;
      const othersAvg = others.reduce((s, r) => s + severity(r), 0) / others.length;
      if (bothAvg - othersAvg >= 0.6) worsen.push(`${a.label}${a.r > 0 ? '↑' : '↓'} ＋ ${b.label}${b.r > 0 ? '↑' : '↓'} が重なった日`);
    }
  }

  // 曜日の波
  if (withScore.length >= 10) {
    const weekdayStats = computeWeekdayStats(withScore, severity);
    if (weekdayStats && weekdayStats.rows.length >= 3) {
      const sorted = [...weekdayStats.rows].sort((a, b) => a.avg - b.avg);
      const best = sorted[0], worst = sorted[sorted.length - 1];
      if (worst.avg - best.avg >= 0.5) {
        worsen.push(`${worst.day}曜日`);
        stable.push(`${best.day}曜日`);
      }
    }
  }

  // 落ち着いている日（複数の要因がどれも荒れていない日）
  const meaningful = corrList.filter(c => c.r != null && Math.abs(c.r) >= 0.3);
  if (meaningful.length >= 2 && withScore.length >= 10) {
    const meds = meaningful.map(c => {
      const acc = FACTOR_ACCESSORS[c.key];
      const vals = withScore.map(acc).filter(v => v != null).slice().sort((x, y) => x - y);
      return { ...c, acc, med: vals[Math.floor(vals.length / 2)] };
    });
    const isCalm = r => meds.every(c => { const v = c.acc(r); return v == null || (c.r > 0 ? v <= c.med : v >= c.med); });
    const calmDays = withScore.filter(isCalm);
    const otherDays = withScore.filter(r => !isCalm(r));
    if (calmDays.length >= 5 && otherDays.length >= 5) {
      const calmAvg = calmDays.reduce((s, r) => s + severity(r), 0) / calmDays.length;
      const otherAvg = otherDays.reduce((s, r) => s + severity(r), 0) / otherDays.length;
      if (otherAvg - calmAvg >= 0.5) stable.push(`${meds.map(c => c.label).join('・')}が大きく崩れていない日`);
    }
  }

  return { worsen: [...new Set(worsen)], stable: [...new Set(stable)], n: withScore.length };
}
// 「今日は何が影響した？」タグの集計。一番よく選ばれているタグと、それが「つらい」日と
// どれくらい重なっているかだけを見る（因果の証明ではなく、あくまで自己申告の集計）
function computeFactorTagInsight() {
  const entries = Object.entries(factorTagLog);
  if (entries.length < 5) return null;
  const moodByDate = {};
  records.forEach(r => { if (r.mood && (moodByDate[r.dateKey] == null || r.mood < moodByDate[r.dateKey])) moodByDate[r.dateKey] = r.mood; });
  const tagCounts = {};
  entries.forEach(([dateKey, tags]) => {
    const mood = moodByDate[dateKey];
    (tags || []).forEach(t => {
      if (t === 'unknown') return;
      if (!tagCounts[t]) tagCounts[t] = { total: 0, badDay: 0 };
      tagCounts[t].total++;
      if (mood === 1) tagCounts[t].badDay++;
    });
  });
  const ranked = Object.entries(tagCounts).map(([id, c]) => ({ id, ...c })).filter(c => c.total >= 3).sort((a, b) => b.total - a.total);
  if (!ranked.length) return null;
  const top = ranked[0];
  const tagDef = FACTOR_TAGS.find(t => t.id === top.id);
  return { label: tagDef ? `${tagDef.emoji} ${tagDef.label}` : top.id, total: top.total, badDay: top.badDay };
}
// 🔄今日の振り返り（予報との答え合わせ）の蓄積を、素朴な回数の集計として見せる
function computeForecastAccuracyInsight() {
  if (typeof forecastAccuracyLog === 'undefined' || forecastAccuracyLog.length < 5) return null;
  const total = forecastAccuracyLog.length;
  const matchedCount = forecastAccuracyLog.filter(e => e.matched).length;
  const betterCount = (typeof ganbattaPointsLog !== 'undefined' ? ganbattaPointsLog : [])
    .filter(e => e.kind === 'forecast-better' || e.kind === 'reflect-better').length;
  return { total, matchedCount, betterCount };
}
function buildMyGuideHtml() {
  const p = computeSelfPatterns();
  const tagInsight = computeFactorTagInsight();
  const forecastInsight = computeForecastAccuracyInsight();
  const hasPatterns = p && (p.worsen.length || p.stable.length);
  if (!hasPatterns && !tagInsight && !forecastInsight) {
    return `
      <div class="card" style="padding:16px; margin:12px 16px 0;">
        <label style="display:block; font-weight:700; font-size:16px; margin-bottom:8px;">📋 私の取扱説明書</label>
        <p class="note" style="margin:0;">まだ十分な記録がありません。天気付きの気分記録・「今日は何が影響した？」・🔄今日の振り返りが増えると、ここにあなたの傾向が見えてきます（目安：5件以上で少しずつ、2〜3週間ほど続けるとより安定してきます）。</p>
      </div>`;
  }
  return `
    <div class="card" style="padding:16px; margin:12px 16px 0;">
      <label style="display:block; font-weight:700; font-size:16px; margin-bottom:8px;">📋 私の取扱説明書</label>
      <p class="note" style="margin:0 0 10px;">「世間一般の正解」ではなく、あなた自身の記録${p ? `（${p.n}件）` : ''}だけから見えてきた傾向です。医学的な診断や因果関係の証明ではありません。あくまで「なんとなくの目安」として受け止めてください。記録が増えるほど、内容も変わっていきます。</p>
      ${p && p.worsen.length ? `
        <h3 style="margin:16px 0 8px; font-size:14px;">☁️ 調子を崩しやすい条件</h3>
        <ul class="rank" style="margin:0;">${p.worsen.map(w => `<li><p class="note" style="margin:0;">${escapeHtml(w)}</p></li>`).join('')}</ul>` : ''}
      ${p && p.stable.length ? `
        <h3 style="margin:16px 0 8px; font-size:14px;">🌿 調子が比較的安定しやすい条件</h3>
        <ul class="rank" style="margin:0;">${p.stable.map(s => `<li><p class="note" style="margin:0;">${escapeHtml(s)}</p></li>`).join('')}</ul>` : ''}
      ${tagInsight ? `
        <h3 style="margin:16px 0 8px; font-size:14px;">🧠 自分でよく選んでいる影響</h3>
        <p class="note" style="margin:0;">カレンダーの「今日は何が影響した？」で一番よく選んでいるのは${tagInsight.label}（${tagInsight.total}回）。${tagInsight.badDay ? `そのうち${tagInsight.badDay}回は「つらい」と記録した日でした。` : ''}これはあなた自身の予想の集計であり、原因の断定ではありません。</p>` : ''}
      ${forecastInsight ? `
        <h3 style="margin:16px 0 8px; font-size:14px;">🔮 予報との答え合わせ</h3>
        <p class="note" style="margin:0;">これまで${forecastInsight.total}回振り返った中で、${forecastInsight.matchedCount}回は予報と近い体調、${forecastInsight.betterCount}回は予報より元気に過ごせていました。「予報が外れた＝失敗」ではなく、うれしい誤差もそのまま記録に残しています。</p>` : ''}
      <p class="note" style="margin:16px 0 0;">相関係数などのもっと詳しい数値は「記録」タブ内の「分析」で見られます。周りの人への説明に使いたい時は「伝える」タブでも差し込めます。</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
        <button type="button" class="btn-sub no-print" id="myGuideToAnalysisBtn">📊 分析を見る</button>
        <button type="button" class="btn-sub no-print" id="myGuideToTsutaeruBtn">💌 「伝える」で使う</button>
      </div>
    </div>`;
}
function renderMyGuideTab() {
  const root = document.getElementById('myGuideTabContent');
  if (!root) return;
  root.innerHTML = buildMyGuideHtml();
  const btn = document.getElementById('myGuideToAnalysisBtn');
  if (btn) btn.addEventListener('click', () => {
    switchTab('record');
    const seg = document.querySelector('#recordSeg [data-seg="analysis"]');
    if (seg) seg.click();
  });
  const toTsutaeruBtn = document.getElementById('myGuideToTsutaeruBtn');
  if (toTsutaeruBtn) toTsutaeruBtn.addEventListener('click', () => {
    tsutaeruState.mode = 'objective';
    tsutaeruState.includeData = true;
    LS.set('tsutaeru', tsutaeruState);
    renderTsutaeru();
    const box = document.getElementById('tsutaeruText');
    if (box && (!box.value || box.value === tsutaeruAutoText)) regenerateTsutaeruText();
    switchTab('tsutaeru');
    if (box) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function renderAnalysis() {
  const box = document.getElementById('analysisView');
  const usable = records.filter(r => r.weather && r.weather.status === 'ok');
  const withMemo = records.filter(r => r.memo && r.memo.trim());

  if (usable.length < 5 && withMemo.length < 3) {
    const needWeather = Math.max(0, 5 - usable.length);
    const needMemo = Math.max(0, 3 - withMemo.length);
    box.innerHTML = `<p class="note">あと${needWeather}件、天気付きの記録か、あと${needMemo}件のメモ入り記録があると分析が見られます</p>`;
    return;
  }

  const overallTemp = usable.length ? usable.reduce((s,r)=>s+r.weather.temp,0)/usable.length : null;
  const overallPressure = usable.length ? usable.reduce((s,r)=>s+r.weather.pressure,0)/usable.length : null;

  // A. 体質別の天気傾向
  const byTaishitsu = {};
  usable.forEach(r => {
    if (!r.checkSnapshot || !r.checkSnapshot.length) return;
    const top = r.checkSnapshot[0];
    (byTaishitsu[top.name] = byTaishitsu[top.name] || []).push(r.weather);
  });
  const taishitsuRows = Object.entries(byTaishitsu)
    .filter(([,ws]) => ws.length >= 2)
    .map(([name, ws]) => {
      const avgT = ws.reduce((s,w)=>s+w.temp,0)/ws.length;
      const avgP = ws.reduce((s,w)=>s+w.pressure,0)/ws.length;
      return { name, n: ws.length, avgT, avgP, pDiff: avgP - overallPressure, tDiff: avgT - overallTemp };
    })
    .sort((a,b) => b.n - a.n);

  // A2. 「伝える」で選んだ言葉ごとの天気傾向
  const tagGroups = {};
  usable.forEach(r => {
    if (!r.tags) return;
    const words = [...(r.tags.place||[]), ...(r.tags.feel||[]), ...(r.tags.mind||[])];
    words.forEach(w => { (tagGroups[w] = tagGroups[w] || []).push(r.weather); });
  });
  const tagRows = Object.entries(tagGroups)
    .filter(([,ws]) => ws.length >= 2)
    .map(([word, ws]) => {
      const avgP = ws.reduce((s,w)=>s+w.pressure,0)/ws.length;
      return { word, n: ws.length, avgP, pDiff: avgP - overallPressure };
    })
    .sort((a,b) => b.n - a.n)
    .slice(0, 8);

  // B. 不調度の指標を決める（絵文字体調があれば優先、なければ体質チェックの合計点。尺度が違うので混在させない）
  const moodRecords = usable.filter(r => r.mood);
  const useMood = moodRecords.length >= 5;
  const checkRecords = usable.filter(r => r.checkSnapshot && r.checkSnapshot.length);
  const withScore = useMood ? moodRecords : checkRecords;
  const severity = r => useMood ? (4 - r.mood) : r.checkSnapshot.reduce((s,x)=>s+x.count,0);
  const scoreLabel = useMood ? '記録した気分（😿〜😽）' : '体質チェックでのつらさ（チェック数の合計）';

  // E. 曜日ランキング（遊び心のある切り口）と、不調度の分布チェック
  const weekdayStats = withScore.length >= 10 ? computeWeekdayStats(withScore, severity) : null;
  const severityHist = withScore.length >= 10 ? computeSeverityHistogram(withScore.map(severity)) : null;

  // 記録によっては気圧変化(3h)・湿度が未収録のこともあるため、その因子の値がある記録だけに絞って算出する
  function corrForFactor(accessor) {
    const subset = withScore.filter(r => accessor(r) != null);
    if (subset.length < 5) return { r: null, n: subset.length };
    return { r: pearson(subset.map(accessor), subset.map(severity)), n: subset.length };
  }
  const corrList = [
    { key:'pressure', label:'気圧', ...corrForFactor(r=>r.weather.pressure) },
    { key:'pressureChange3h', label:'気圧の変化（3時間）', ...corrForFactor(r=>r.weather.pressureChange3h) },
    { key:'humidity', label:'湿度', ...corrForFactor(r=>r.weather.humidity) },
    { key:'temp', label:'気温', ...corrForFactor(r=>r.weather.temp) },
    { key:'wind', label:'風速', ...corrForFactor(r=>r.weather.windSpeed) },
  ];
  corrList.forEach(c => { c.p = pearsonPValue(c.r, c.n); c.ci = pearsonCI95(c.r, c.n); });

  // B1-2. もっとも関連の強い要因について、直線的な関係かどうかを区間ごとの平均で簡易チェックする
  const FACTOR_ACCESSORS = {
    pressure: r => r.weather.pressure, pressureChange3h: r => r.weather.pressureChange3h,
    humidity: r => r.weather.humidity, temp: r => r.weather.temp, wind: r => r.weather.windSpeed,
  };
  const shapeFactor = corrList.filter(c => c.r != null).sort((a, b) => Math.abs(b.r) - Math.abs(a.r))[0] || null;
  const shapeBins = shapeFactor ? computeBinnedRelationship(withScore, FACTOR_ACCESSORS[shapeFactor.key], severity) : null;

  // B2. 気象・生理イベント（大雨・台風・線状降水帯・酷暑・高湿度・強風・生理前ウィンドウ）の
  // 「その日」と「それ以外の日」で不調度を比較する（Welchのt検定・Cohenのd）
  const eventResults = EVENT_DEFS.map(ev => {
    const groupEvent = withScore.filter(ev.test).map(severity);
    const groupOther = withScore.filter(r => !ev.test(r)).map(severity);
    const stat = welchTTest(groupEvent, groupOther);
    return stat ? { ...ev, n1: groupEvent.length, n2: groupOther.length, stat } : null;
  }).filter(Boolean);

  // 相関5項目 + イベント比較を「同じ目的で行った検定群」とみなし、まとめてBenjamini-Hochberg法で補正する
  const allP = [...corrList.map(c => c.p), ...eventResults.map(e => e.stat.p)];
  const allAdj = benjaminiHochberg(allP);
  corrList.forEach((c, i) => { c.pAdj = allAdj[i]; });
  eventResults.forEach((e, i) => { e.pAdj = allAdj[corrList.length + i]; });

  // B3. 重回帰分析：気圧・気圧変化・湿度・気温・風速を同時にモデルへ入れ、他の要因を調整したうえでの関連を見る
  const regressionRows = withScore
    .filter(r => r.weather.pressure!=null && r.weather.pressureChange3h!=null && r.weather.humidity!=null && r.weather.temp!=null && r.weather.windSpeed!=null)
    .map(r => ({ pressure:r.weather.pressure, pressureChange3h:r.weather.pressureChange3h, humidity:r.weather.humidity, temp:r.weather.temp, wind:r.weather.windSpeed, y:severity(r) }));
  const regression = multipleRegression(regressionRows, REGRESSION_FACTORS.map(f => f.key));
  if (regression) {
    const regAdj = benjaminiHochberg(regression.results.map(r => r.p));
    regression.results.forEach((r, i) => {
      r.label = REGRESSION_FACTORS[i].label;
      r.pAdj = regAdj[i];
    });
  }
  // B3-2. leave-one-out交差検証（Q²）：重回帰モデルが記録データに過学習していないかの目安
  const loocv = regression ? computeLOOCVQ2(regressionRows, REGRESSION_FACTORS.map(f => f.key)) : null;
  // B3-3. VIF（分散拡大要因）：気圧と気圧変化のように要因同士が強く関連している場合の目安
  const vifList = regression ? computeVIF(regressionRows, REGRESSION_FACTORS.map(f => f.key)).map((v, i) => ({ ...v, label: REGRESSION_FACTORS[i].label })) : [];

  // B4. ラグ相関：気圧などの変化が数日遅れて体調に出ていないかを見る
  const lagResults = computeLagCorrelations(usable, withScore, useMood);
  // B5. 天気の値が記録全体の平均から大きく外れている記録（3σ超）を検出する
  const weatherOutliers = detectWeatherOutliers(usable);
  // B6. 要因別寄与度の時系列分解（直近14日、線形モデルにおけるSHAP相当の厳密な分解）
  const dayContribs = computeFactorContributions(usable, regression);

  // C. メモの言葉ミニ分析（頻出ワード×天気・気分）
  const memoWordStats = {};
  withMemo.forEach(r => {
    extractMemoKeywords(r.memo).forEach(w => {
      const bucket = memoWordStats[w] || (memoWordStats[w] = { count: 0, weatherList: [], moodList: [] });
      bucket.count++;
      if (r.weather && r.weather.status === 'ok') bucket.weatherList.push(r.weather);
      if (r.mood) bucket.moodList.push(r.mood);
    });
  });
  const moodAllRecords = records.filter(r => r.mood);
  const overallMoodAll = moodAllRecords.length ? moodAllRecords.reduce((s,r)=>s+r.mood,0)/moodAllRecords.length : null;
  const memoWordRows = Object.entries(memoWordStats)
    .filter(([,v]) => v.count >= 2)
    .map(([word, v]) => {
      const avgP = (overallPressure != null && v.weatherList.length >= 2)
        ? v.weatherList.reduce((s,w)=>s+w.pressure,0)/v.weatherList.length : null;
      const avgMood = (overallMoodAll != null && v.moodList.length >= 2)
        ? v.moodList.reduce((a,b)=>a+b,0)/v.moodList.length : null;
      return {
        word, count: v.count,
        pDiff: avgP != null ? avgP - overallPressure : null,
        moodDiff: avgMood != null ? avgMood - overallMoodAll : null,
      };
    })
    .sort((a,b) => b.count - a.count)
    .slice(0, 8);
  // D. 生理前ウィンドウと肌荒れ・お腹・腰などの関連
  // 自律神経は全身に働くため、生理前のホルモン変動が皮膚や消化器・腰まわりの症状として出ることがある
  const PERIOD_LINKED_WORDS = ['ニキビが出ている', '肌がかぶれている', '肌に赤みがある', 'かゆい', 'お腹', '背中・腰', '張る感じがする', '眠くて仕方ない'];
  function recordMentionsWord(r, word) {
    if (r.tags) {
      const tagWords = [...(r.tags.place||[]), ...(r.tags.feel||[]), ...(r.tags.mind||[])];
      if (tagWords.includes(word)) return true;
    }
    return !!(r.memo && extractMemoKeywords(r.memo).includes(word));
  }
  const periodInWindow = records.filter(r => isPreMenstrualWindow(r.dateKey));
  const periodOutWindow = records.filter(r => !isPreMenstrualWindow(r.dateKey));
  const periodLinkedResults = periodStartDates().length >= 1 ? PERIOD_LINKED_WORDS.map(word => {
    const x1 = periodInWindow.filter(r => recordMentionsWord(r, word)).length;
    const x2 = periodOutWindow.filter(r => recordMentionsWord(r, word)).length;
    const stat = twoProportionZTest(x1, periodInWindow.length, x2, periodOutWindow.length);
    return stat && (x1 > 0 || x2 > 0) ? { word, n1: periodInWindow.length, n2: periodOutWindow.length, stat } : null;
  }).filter(Boolean) : [];
  function periodWordText(row) {
    const { word, n1, n2, stat } = row;
    const sigText = stat.p != null && stat.p < 0.05 ? '統計的にも意味のありそうな差です' : 'この記録数ではまだ「意味がある」とまでは言い切れません';
    return `「${word}」は、生理前ウィンドウで${(stat.p1*100).toFixed(0)}%（${n1}件中）、それ以外で${(stat.p2*100).toFixed(0)}%（${n2}件中）の記録に出てきました。${sigText}（p=${stat.p!=null?stat.p.toFixed(3):'-'}）`;
  }

  function memoWordText(row) {
    const parts = [];
    if (row.pDiff != null && Math.abs(row.pDiff) >= 1.5) {
      parts.push(`気圧が${row.pDiff >= 0 ? '高め' : '低め'}の日に書かれていることが多いようです`);
    }
    if (row.moodDiff != null) {
      if (row.moodDiff <= -0.3) parts.push('この言葉が出てくる日は、気分が低めなことが多いようです');
      else if (row.moodDiff >= 0.3) parts.push('この言葉が出てくる日は、気分が良めなことが多いようです');
    }
    return parts.length ? parts.join('。') + '。' : 'まだはっきりした傾向はありませんが、記録が増えると見えてくるかもしれません。';
  }

  // 🧩 私のパターン：下の詳しい統計とは別に、スキャンしやすい「傾向」だけを短くまとめた要約。
  // 「あなたは○○タイプです」と断定はせず、「〜の傾向が見えてきました」の言い方に統一する
  function computeMorningCarryPattern() {
    const dayGroups = {};
    records.filter(r => r.mood && r.time).forEach(r => { (dayGroups[r.dateKey] = dayGroups[r.dateKey] || []).push(r); });
    const multiDay = Object.values(dayGroups).filter(list => list.length >= 2);
    let total = 0, carried = 0;
    multiDay.forEach(list => {
      const morning = list.filter(r => r.time < '12:00');
      const rest = list.filter(r => r.time >= '12:00');
      if (!morning.length || !rest.length) return;
      const mAvg = morning.reduce((s, r) => s + r.mood, 0) / morning.length;
      const rAvg = rest.reduce((s, r) => s + r.mood, 0) / rest.length;
      total++;
      if (mAvg <= 1.5 && rAvg <= 2) carried++;
    });
    return total >= 5 ? { total, carried } : null;
  }
  // 🌀×🌀 単独の要因ではなく「何が重なると崩れやすいか」を見る組み合わせパターン。
  // 単独の相関よりさらに件数が絞られるため確実性は下がるが、「あなたの場合、何が重なると
  // 調子を崩しやすいか」という、より実感に近い形で見せられるようにする
  function computeComboFactorPatterns() {
    if (withScore.length < 10) return [];
    const candidates = corrList.filter(c => c.r != null && Math.abs(c.r) >= 0.25 && FACTOR_ACCESSORS[c.key]);
    const combos = [];
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const a = candidates[i], b = candidates[j];
        const accA = FACTOR_ACCESSORS[a.key], accB = FACTOR_ACCESSORS[b.key];
        const subset = withScore.filter(r => accA(r) != null && accB(r) != null);
        if (subset.length < 10) continue;
        const sortedA = subset.map(accA).slice().sort((x, y) => x - y);
        const sortedB = subset.map(accB).slice().sort((x, y) => x - y);
        const medA = sortedA[Math.floor(sortedA.length / 2)];
        const medB = sortedB[Math.floor(sortedB.length / 2)];
        const isBadA = r => a.r > 0 ? accA(r) > medA : accA(r) < medA;
        const isBadB = r => b.r > 0 ? accB(r) > medB : accB(r) < medB;
        const both = subset.filter(r => isBadA(r) && isBadB(r));
        const others = subset.filter(r => !(isBadA(r) && isBadB(r)));
        if (both.length < 5 || others.length < 5) continue;
        const bothAvg = both.reduce((s, r) => s + severity(r), 0) / both.length;
        const othersAvg = others.reduce((s, r) => s + severity(r), 0) / others.length;
        if (bothAvg - othersAvg >= 0.6) {
          combos.push({
            text: `${a.label}${a.r > 0 ? '↑' : '↓'} ＋ ${b.label}${b.r > 0 ? '↑' : '↓'} が重なった日（${both.length}件）は、そうでない日よりも${scoreLabel}が強めに出ていました。`,
            diff: bothAvg - othersAvg,
          });
        }
      }
    }
    return combos.sort((x, y) => y.diff - x.diff).slice(0, 2);
  }
  // 🌿 逆に「これといった要因が重ならなかった日」は比較的安定していたか、という安心材料側の傾向
  function computeCalmDayPattern() {
    const meaningful = corrList.filter(c => c.r != null && Math.abs(c.r) >= 0.3 && FACTOR_ACCESSORS[c.key]);
    if (meaningful.length < 2 || withScore.length < 10) return null;
    const meds = meaningful.map(c => {
      const acc = FACTOR_ACCESSORS[c.key];
      const vals = withScore.map(acc).filter(v => v != null).slice().sort((x, y) => x - y);
      return { ...c, acc, med: vals[Math.floor(vals.length / 2)] };
    });
    const isCalm = r => meds.every(c => {
      const v = c.acc(r);
      if (v == null) return true;
      return c.r > 0 ? v <= c.med : v >= c.med;
    });
    const calmDays = withScore.filter(isCalm);
    const otherDays = withScore.filter(r => !isCalm(r));
    if (calmDays.length < 5 || otherDays.length < 5) return null;
    const calmAvg = calmDays.reduce((s, r) => s + severity(r), 0) / calmDays.length;
    const otherAvg = otherDays.reduce((s, r) => s + severity(r), 0) / otherDays.length;
    if (otherAvg - calmAvg < 0.5) return null;
    return { n: calmDays.length, factors: meds.map(c => c.label).join('・') };
  }

  const patternCards = [];
  if (withScore.length >= 5) {
    const strongestFactor = corrList.filter(c => c.r != null).sort((a, b) => Math.abs(b.r) - Math.abs(a.r))[0];
    if (strongestFactor && Math.abs(strongestFactor.r) >= 0.3) {
      patternCards.push({ title: `🌀 ${strongestFactor.label}に反応しやすいタイプ`, text: `${strongestFactor.label}が${strongestFactor.r > 0 ? '高い' : '低い'}日に、${scoreLabel}が強めに出る傾向が見えてきました（相関r=${strongestFactor.r.toFixed(2)}）。` });
    }
  }
  computeComboFactorPatterns().forEach((combo, i) => {
    patternCards.push({ title: i === 0 ? '🌀🌀 いくつか重なると崩れやすいタイプ' : '🌀🌀 もうひとつの組み合わせ', text: combo.text });
  });
  const calmPattern = computeCalmDayPattern();
  if (calmPattern) {
    patternCards.push({ title: '🌿 落ち着いている日も見えてきました', text: `${calmPattern.factors}が大きく崩れていない日（${calmPattern.n}件）は、比較的安定して過ごせているようです。` });
  }
  const morningPattern = computeMorningCarryPattern();
  if (morningPattern && morningPattern.carried / morningPattern.total >= 0.5) {
    patternCards.push({ title: '🌅 朝の状態がその後に影響しやすいタイプ', text: `朝の気分が低かった日は、その後も気分が低いまま推移することが多いようです（${morningPattern.total}日中${morningPattern.carried}日）。` });
  }
  if (weekdayStats && weekdayStats.rows.length >= 3) {
    const sortedDays = [...weekdayStats.rows].sort((a, b) => a.avg - b.avg);
    const best = sortedDays[0], worst = sortedDays[sortedDays.length - 1];
    if (worst.avg - best.avg >= 0.5) {
      patternCards.push({ title: '🗓️ 曜日で波があるタイプ', text: `${best.day}曜日は比較的落ち着いていて、${worst.day}曜日は不調度が高めになる傾向が見えてきました。` });
    }
  }
  const sigPeriod = periodLinkedResults.filter(row => row.stat.p != null && row.stat.p < 0.1).sort((a, b) => a.stat.p - b.stat.p)[0];
  if (sigPeriod) {
    patternCards.push({ title: '🌙 生理前に出やすい症状があるタイプ', text: `生理前ウィンドウでは「${escapeHtml(sigPeriod.word)}」の記録が増える傾向が見えてきました。` });
  }

  box.innerHTML = `
    <div class="result-card">
      <blockquote class="memo" style="margin-top:0;"><b>この分析の役割</b><br>ここで見られるのは「明日どうなりそうか」の短期的な心づもりです。長期的な経過や診断は、この分析ではなく医師にご相談ください。「経過・通院」タブに記録をためておくと、診察のときに振り返りやすくなります。</blockquote>
      <p class="note">この分析はあなた自身の記録だけを使った参考情報です。相関係数という統計的な指標で「関連の強さ」を数値化していますが、医学的な因果関係を証明するものではありません。件数が少ないと偶然の一致で数値が出ることもあるため、「〜かもしれない」程度に受け止めてください。</p>

      ${patternCards.length ? `
        <h3 style="margin-top:14px;">🧩 私のパターン（見えてきた傾向）</h3>
        <p class="note">下の詳しい統計を、スキャンしやすいように短くまとめたものです。「世間一般の正解」ではなく、あなた自身の記録だけから見える傾向 ＝ 自分の身体の取扱説明書のようなものです。断定ではなく「傾向」として受け止めてください。特に🌀🌀の組み合わせパターンは対象件数がさらに少なくなるため、単独の要因より確実性は下がります。「なんとなくの目安」くらいに見てください。</p>
        <ul class="rank">
          ${patternCards.map(c => `<li><div class="rank-head"><b>${c.title}</b></div><p class="note">${c.text}</p></li>`).join('')}
        </ul>
        <button type="button" class="btn-sub no-print" id="analysisToMyGuideBtn" style="margin-top:8px;">📋 「私の取扱説明書」タブで見やすくまとめて見る</button>
      ` : ''}

      <details class="card" style="padding:2px 0;">
        <summary style="padding:10px 16px; font-weight:600; font-size:13px;">📖 この数値、結局何？（用語の説明）</summary>
        <div style="margin:0 16px 14px; font-size:13px; line-height:1.7;">
          <p style="margin:0 0 8px;"><b>r（相関係数）</b>：2つのもの（例：気圧と体調）が同じように動く度合いを、-1〜+1の数字にしたものです。0に近いほど関連が薄く、±1に近いほど強く連動します。プラスなら「片方が高いほど、もう片方も高い」、マイナスなら「片方が高いほど、もう片方は低い」向きです。</p>
          <p style="margin:0 0 8px;"><b>95%信頼区間</b>：「本当の関連の強さは、だいたいこの範囲に収まっていそうです」という幅です。幅が狭いほど値の確からしさが高く、区間が0をまたいでいる場合は「関連なし」の可能性も残っています。</p>
          <p style="margin:0 0 8px;"><b>p値・統計的に有意</b>：今の記録で見えている関連が、単なる偶然でも起こりうる確率の目安です。慣習的にp&lt;0.05を「偶然にしては起こりにくい＝意味がありそう」の目安にしますが、記録数が少ないと偶然でも小さいp値が出ることがあるため、あくまで目安です。</p>
          <p style="margin:0 0 8px;"><b>効果量（Cohenのd）</b>：p値が「意味がありそうか」だけを見るのに対して、効果量は「差の大きさそのもの」を表します。p値が小さくても効果量が小さければ、実際の体感としては小さな差かもしれません。</p>
          <p style="margin:0 0 8px;"><b>重回帰分析・標準化係数β</b>：気圧・気温・湿度など複数の要因を同時に見て、「他の要因を一定と見なした場合、この要因だけがどれくらい体調と関連しているか」を数値にしたものです。単独の相関（r）より弱くなっていれば、他の要因と一緒に動いていただけかもしれません。</p>
          <p style="margin:0 0 8px;"><b>VIF（多重共線性の目安）</b>：気圧と気圧の変化のように、要因同士がお互いに強く連動していないかの目安です。値が大きい（目安10以上）要因は、他の要因と紛らわしく動いているため、β（標準化係数）の解釈に注意が必要です。</p>
          <p style="margin:0 0 8px;"><b>Q²（交差検証）</b>：記録の1件をわざと隠してモデルを作り直し、隠した1件をどれだけ言い当てられるかを全件で繰り返した結果です。「学習に使ったデータへの当てはまりの良さ（R²）」だけでなく「新しい日をどれだけ言い当てられそうか」を見るための目安で、記録データに合わせすぎていないかのチェックになります。</p>
          <p style="margin:0 0 8px;"><b>ラグ相関</b>：気圧の変化などが「その日」ではなく数日遅れて体調に出ていないかを、日付をずらして確認したものです。</p>
          <p style="margin:0;"><b>要因別寄与度</b>：重回帰の係数を使って、その日その日にどの要因がどれだけ不調寄り・好調寄りに効いていたかを分解したものです。新しい統計モデルではなく、上で計算した重回帰の結果の見せ方を変えているだけです。</p>
        </div>
      </details>

      <h3 style="margin-top:14px;">体調の推移（レイヤーを選んで表示）</h3>
      <p class="note">気分・体質チェック・問診のうち、記録がたまっているものを切り替えて見られます。上に出る絵文字は、その日の気象イベント（大雨・台風など）の目安です。</p>
      <div class="seg" id="analysisTrendSeg">
        ${Object.values(ANALYSIS_TREND_LAYERS).map(l => {
          const enabled = l.hasData(records);
          return `<button class="seg-btn ${analysisTrendLayer===l.key?'active':''}" data-layer="${l.key}" ${enabled?'':'disabled style="opacity:.4; cursor:not-allowed;"'}>${l.label}</button>`;
        }).join('')}
      </div>
      <p class="note" style="margin:8px 0 4px;">天気タブのグラフと同じ色で、天気の別レイヤーを重ねられます（露点・風のピークは1日ごとの記録には残っていないため出せません）</p>
      <div class="chips" id="analysisTrendOverlaySeg">
        <label class="chip ${analysisTrendOverlays.size===0?'on':''}" data-overlay="none">重ねない</label>
        ${Object.values(WEATHER_OVERLAY_LAYERS).filter(Boolean).map(o => `<label class="chip ${analysisTrendOverlays.has(o.key)?'on':''}" data-overlay="${o.key}">┄${o.label}</label>`).join('')}
      </div>
      <p class="note" style="margin:4px 0 0;">複数選べます（例：気圧と気温を同時に重ねる）</p>
      <div id="analysisTrendChartWrap"></div>

      ${weekdayStats && weekdayStats.rows.length >= 3 ? (() => {
        const sorted = [...weekdayStats.rows].sort((a, b) => a.avg - b.avg);
        const maxAvg = Math.max(...sorted.map(r => r.avg), 1);
        return `
        <h3 style="margin-top:18px;">🗓️ あなたの「本当に調子がいい曜日」ランキング</h3>
        <p class="note">記録${withScore.length}件のうち、曜日ごとの平均不調度を並べただけの、ちょっと遊び心のある集計です（他の要因は調整していません）。</p>
        <ul class="rank">
          ${sorted.map((r, i) => `
            <li>
              <div class="rank-head">
                <span class="medal">${i === 0 ? '😼' : i === sorted.length - 1 ? '🙀' : i + 1}</span>
                <b>${r.day}曜日</b>
                <span class="badge">${r.n}件</span>
              </div>
              <div class="diag-bar"><span class="diag-bar-label">不調度</span><div class="diag-bar-track"><div class="diag-bar-fill" style="width:${Math.min(100, (r.avg / maxAvg) * 100)}%"></div></div></div>
            </li>`).join('')}
        </ul>
        ${weekdayStats.weekdayVsWeekend ? `<p class="note" style="margin-top:6px;">${weekdayVsWeekendText(weekdayStats.weekdayVsWeekend)}</p>` : ''}
        <p class="note">※ あくまで記録にもとづく参考の遊び要素です。生活リズムやスケジュールなど、曜日と一緒に動く他の要因の影響は分けられていません。</p>
        `;
      })() : ''}

      ${severityHist ? `
        <h3 style="margin-top:18px;">📊 不調度の分布（山は1つ？　それとも2つ？）</h3>
        <p class="note">これまでの記録${withScore.length}件の不調度を、値の範囲ごとに数えただけの単純な集計です。山が1つのなだらかな形なら「まあまあの日」中心、山が2つ以上に分かれていれば「調子がいい日」「悪い日」がはっきり分かれている可能性があります。</p>
        <div class="card" style="padding:10px 8px;">${buildHistogramSVG(severityHist)}</div>
        <p class="note" style="margin:4px 0 0;">${histogramShapeText(severityHist)}</p>
      ` : ''}

      <h3 style="margin-top:16px;">体質別 天気傾向（記録${usable.length}件より）</h3>
      ${taishitsuRows.length ? `
        <ul class="rank">
          ${taishitsuRows.map(t => `
            <li>
              <div class="rank-head"><b>${t.name}</b><span class="badge">${t.n}件</span></div>
              <p class="note">この体質が記録された日の平均気圧は ${t.avgP.toFixed(0)}hPa（全体平均${overallPressure.toFixed(0)}hPaより${t.pDiff>=0?'高め':'低め'}）、平均気温は${t.avgT.toFixed(1)}℃（全体平均${overallTemp.toFixed(1)}℃より${t.tDiff>=0?'高め':'低め'}）</p>
              <div class="diag-bar"><span class="diag-bar-label">気圧差</span><div class="diag-bar-track"><div class="diag-bar-fill" style="width:${Math.min(100, Math.abs(t.pDiff)*10)}%"></div></div><span class="diag-bar-score">${t.pDiff>=0?'+':''}${t.pDiff.toFixed(1)}</span></div>
            </li>`).join('')}
        </ul>` : `<p class="note">体質チェック結果を含む記録が2件以上そろった体質はまだありません</p>`}

      ${tagRows.length ? `
        <h3 style="margin-top:16px;">よく選ぶ言葉と天気の関係</h3>
        <ul class="rank">
          ${tagRows.map(t => `
            <li>
              <div class="rank-head"><b>${escapeHtml(t.word)}</b><span class="badge">${t.n}件</span></div>
              <p class="note">この言葉を選んだ日の平均気圧は ${t.avgP.toFixed(0)}hPa（全体平均より${t.pDiff>=0?'高め':'低め'}）</p>
            </li>`).join('')}
        </ul>` : ''}

      <h3 style="margin-top:16px;">メモによく出てくる言葉</h3>
      ${withMemo.length < 3
        ? `<p class="note">メモ入りの記録があと${3-withMemo.length}件たまると、よく出てくる言葉を集めてお見せします</p>`
        : memoWordRows.length ? `
          <ul class="rank">
            ${memoWordRows.map(row => `
              <li>
                <div class="rank-head"><b>${escapeHtml(row.word)}</b><span class="badge">${row.count}件</span></div>
                <p class="note">${memoWordText(row)}</p>
              </li>`).join('')}
          </ul>
          <p class="note">※ 一言メモの中から、体調に関わりそうな言葉を機械的に拾って集計した、ゆるい目安です。書き方によっては拾えないこともあります。</p>
        ` : `<p class="note">メモの中に、体調に関する言葉（頭が重い・眠れない、など）がまだあまり見つかっていません。気になる言葉を書いてみると、ここに集まってきます。</p>`}

      <h3 style="margin-top:16px;">気象条件と体調の関連${withScore.length < 5 ? `<span class="badge">サンプル${withScore.length}件</span>` : ''}</h3>
      ${withScore.length >= 5 ? `
        <p class="note">指標：${scoreLabel}</p>
        <div class="diag-scores">
          ${corrList.map(c => `<div class="diag-bar"><span class="diag-bar-label">${c.label}</span><div class="diag-bar-track"><div class="diag-bar-fill" style="width:${c.r!=null?Math.abs(c.r)*100:0}%"></div></div></div><p class="note" style="margin:2px 0 8px;">${corrHedgedText(c)}</p>`).join('')}
        </div>
        <div class="card" style="padding:10px 8px; margin-top:8px;">${buildForestPlotSVG(corrList)}</div>
        <p class="note" style="margin:4px 0 0;">丸の位置が相関係数r、横線が95%信頼区間です。線が0をまたいでいない項目ほど、関連がはっきりしています（色つきの丸＝多重比較補正後も有意）。</p>

        ${shapeBins ? `
          <h3 style="margin-top:16px;">${escapeHtml(shapeFactor.label)}との関係は、直線的？（簡易チェック）</h3>
          <p class="note">相関係数rは「直線的にどれだけ関連しているか」しか見ないため、もっとも関連の強かった「${escapeHtml(shapeFactor.label)}」について、値を5つの区間に分けてそれぞれの不調度の平均をつないでみました。折れ線がまっすぐに近ければ直線的、途中で向きが変わっていれば、ある値を境に反応が変わっている（閾値のような）可能性があります。</p>
          <div class="card" style="padding:10px 8px;">${buildBinnedRelationshipSVG(shapeBins, shapeFactor.label)}</div>
          <p class="note" style="margin:4px 0 0;">${binnedRelationshipShapeText(shapeBins)}（区間ごとに5〜${Math.max(...shapeBins.map(b=>b.n))}件の平均。区間数が少ないため、あくまで簡易な目安です）</p>
        ` : ''}

        <div class="seg" id="analysisLenSeg" style="margin-top:10px;">
          <button class="seg-btn ${analysisLength==='short'?'active':''}" data-len="short">短め</button>
          <button class="seg-btn ${analysisLength==='medium'?'active':''}" data-len="medium">ふつう</button>
          <button class="seg-btn ${analysisLength==='long'?'active':''}" data-len="long">長め</button>
        </div>
        <blockquote class="memo" style="margin-top:8px;"><b>体調が悪くなった理由（考えられる要因）</b><br>${buildWeatherNarrative(corrList, analysisLength)}</blockquote>
        <blockquote class="memo"><b>なぜこの分析結果になったか</b><br>${buildMethodNarrative(analysisLength)}</blockquote>
        <button type="button" class="btn-sub no-print" id="analysisToTsutaeruBtn" style="margin-top:4px;">💌 この結果を「伝える」で使う</button>
        <p class="note" id="analysisToTsutaeruNote" style="margin:6px 0 0;">気力がない時に説明しやすいよう、この分析結果を「伝える」の文章に自動で添えます</p>

        ${eventResults.length ? `
          <h3 style="margin-top:16px;">大雨・台風・酷暑・生理前などイベント日との比較</h3>
          <p class="note">「その日」と「それ以外の日」で不調度を比較しています（Welchのt検定・効果量d）。台風や生理の記録がまだない場合はここに表示されません。</p>
          <ul class="rank">
            ${eventResults.slice().sort((a,b)=>Math.abs(b.stat.cohend||0)-Math.abs(a.stat.cohend||0)).map(e => `
              <li>
                <div class="rank-head"><b>${escapeHtml(e.label)}</b><span class="badge">${e.n1}件 / ${e.n2}件</span></div>
                <p class="note">${eventHedgedText(e)}</p>
              </li>`).join('')}
          </ul>
        ` : `<p class="note" style="margin-top:16px;">まだ大雨・台風・酷暑・生理前などのイベント日の記録が少ないため、イベント比較は表示できません。</p>`}

        ${periodLinkedResults.length ? `
          <h3 style="margin-top:16px;">生理前ウィンドウと肌荒れ・お腹・腰の症状</h3>
          <p class="note">自律神経は全身に働いているため、生理前のホルモン変動が肌荒れやお腹・腰の症状として出ることがあります。生理開始日の7日前までを「生理前ウィンドウ」として、それ以外の日と出現率を比べています。</p>
          <ul class="rank">
            ${periodLinkedResults.map(row => `<li><p class="note">${periodWordText(row)}</p></li>`).join('')}
          </ul>
        ` : ''}

        ${regression ? `
          <h3 style="margin-top:16px;">重回帰分析（他の気象要因を調整した関連）</h3>
          <p class="note">気圧・気圧変化・湿度・気温・風速を同時にモデルに入れ、それぞれ「他の要因を一定とみなした場合」の関連の強さ（標準化係数β）を計算しています。単独の相関と比べて弱まっていれば、他の要因と一緒に動いていただけ（交絡）の可能性があります。（有効な記録${regression.n}件、説明率R²=${regression.r2!=null?regression.r2.toFixed(2):'-'}）</p>
          <ul class="rank">
            ${regression.results.slice().sort((a,b)=>Math.abs(b.beta)-Math.abs(a.beta)).map(row => `
              <li><p class="note">${regressionRowText(row, corrList)}</p></li>`).join('')}
          </ul>
          ${regression.results.some(r=>r.ci) ? `
            <div class="card" style="padding:10px 8px; margin-top:8px;">${buildRegressionForestPlotSVG(regression)}</div>
            <p class="note" style="margin:4px 0 0;">丸の位置が標準化係数β、横線が95%信頼区間です。線が0をまたいでいない項目ほど、他の要因を調整した後でも関連がはっきりしています（色つきの丸＝多重比較補正後も有意）。</p>
          ` : ''}
          ${vifList.some(v=>v.vif!=null) ? `
            <p class="note" style="margin-top:8px;"><b>多重共線性の目安（VIF）</b>：${vifList.filter(v=>v.vif!=null).map(v=>`${v.label} ${v.vif.toFixed(1)}`).join('　')}${vifList.some(v=>v.vif!=null && v.vif>=10) ? '　→ 10以上の項目は、他の気象要因と強く連動しているため、係数の解釈には注意してください。' : '　→ いずれも目安の範囲内で、他の気象要因との強い連動は見られません。'}</p>
          ` : ''}
          ${loocv ? `
            <p class="note" style="margin-top:6px;"><b>交差検証（Q²＝過学習していないかの目安）</b>：1件を除いてモデルを作り直し、残した1件をどれだけ言い当てられるかを全件で繰り返した結果 Q²=${loocv.q2.toFixed(2)}（有効${loocv.n}件）。${loocv.q2 < 0 ? 'マイナスは、平均値で予測するのと大差ない、あるいはそれより悪いということです。記録が増えるとこの値も安定してきます。' : (regression.r2!=null && loocv.q2 < regression.r2 - 0.15) ? '学習に使ったデータへの当てはまり（R²）よりかなり低く、記録データに合わせすぎている（過学習気味の）可能性があります。' : '学習に使ったデータへの当てはまり（R²）と大きく変わらず、極端な過学習の兆候は見られません。'}</p>
            <div class="card" style="padding:10px 8px; margin-top:6px;">${buildCalibrationScatterSVG(loocv.points)}</div>
            <p class="note" style="margin:4px 0 0;">1件ずつ、その日を隠して作ったモデルでの予測（横）と、実際に記録された不調度（縦）を点にしています。点線は「予測どおりだった場合」の位置で、点が点線に近いほど、その日の予測が当たっていたことになります。</p>
          ` : `<p class="note" style="margin-top:6px;">交差検証（Q²）は、記録数がもう少し増えると表示できるようになります。</p>`}
        ` : `<p class="note" style="margin-top:16px;">気圧・気圧変化・湿度・気温・風速がすべてそろった記録がまだ少ないため、重回帰分析（交絡の調整）は表示できません。</p>`}

        ${lagResults.some(f => f.lagResults.some(x => x.r != null)) ? `
          <h3 style="margin-top:16px;">効果が出るまでの時間差（ラグ相関）</h3>
          <p class="note">気圧などの変化が「その日」ではなく数日遅れて体調に出ることがあるかを見ています。それぞれの日数ずらした時の関連の強さ（r）です。</p>
          <div class="pj-rank-list-wrap">
            ${lagResults.filter(f => f.lagResults.some(x => x.r != null)).map(f => {
              const best = f.lagResults.filter(x => x.r != null).sort((a,b) => Math.abs(b.r) - Math.abs(a.r))[0];
              return `<p class="note" style="margin:0 0 6px;"><b>${escapeHtml(f.label)}</b>：${f.lagResults.map(x => `${x.lag}日後 r=${x.r!=null?x.r.toFixed(2):'-'}`).join('　')}${best && Math.abs(best.r) >= 0.3 ? `　→ ${best.lag === 0 ? '当日' : `${best.lag}日後`}にもっとも関連が強いようです` : ''}</p>`;
            }).join('')}
          </div>
        ` : ''}

        ${dayContribs.length ? `
          <h3 style="margin-top:16px;">日ごとの要因別寄与度（直近${dayContribs.length}日）</h3>
          <p class="note">重回帰モデルの係数から、その日その日にどの要因がどれだけ不調寄り／好調寄りに効いていたかを分解しています。棒が上に伸びるほど不調寄り、下に伸びるほど好調寄りです。</p>
          <div class="card" style="padding:10px 8px;">${buildContributionTimelineSVG(dayContribs)}</div>
          <blockquote class="memo" style="margin-top:8px;">${escapeHtml(buildContributionStoryText(dayContribs, lagResults))}</blockquote>
        ` : ''}

        ${weatherOutliers.length ? `
          <h3 style="margin-top:16px;">数値が大きく外れている記録</h3>
          <p class="note">その要因の記録全体の平均から大きく外れた値（3σ超）です。天気APIの取得タイミングのズレなど、記録内容と天気がずれている可能性があります。</p>
          <ul class="pj-rank-list-wrap">${weatherOutliers.slice(0, 8).map(o => `<li class="note">${o.dateKey}：${escapeHtml(o.factor)} ${o.value.toFixed(1)}（平均から${o.z >= 0 ? '+' : ''}${o.z.toFixed(1)}σ）</li>`).join('')}</ul>
        ` : ''}

        ${regression ? `
          <h3 style="margin-top:16px;">気圧・気温・湿度・風速を変えてみるシミュレーター</h3>
          <p class="note">重回帰分析の結果をもとに、条件を変えると予測がどう動くかを試せます（有効な記録${regression.n}件のモデルにもとづく参考値です）。</p>
          <div class="card" id="whatIfCard" style="padding:12px 14px;"></div>
        ` : ''}

        <blockquote class="memo" style="margin-top:8px;"><b>この分析の限界</b><br>
          この分析はすべて観察研究であり、因果関係を証明するものではありません。記録数が少ないほど、偶然の一致で数値が動きやすくなります。
          自己申告の体調・気分にもとづくため、記録した日によって基準がぶれる可能性があります。天気以外にも睡眠・食事・ストレス・仕事の予定など、記録していない要因の影響（未測定交絡）は排除できません。
          複数の項目を同時に検定しているため偽陽性のリスクがあり、その対策としてBenjamini-Hochberg法による補正を行っていますが、根本的な解決ではありません。何より、これはあなた一人の記録にもとづく分析であり、他の人にそのまま当てはまるとは限りません。
          相関係数・重回帰のフォレストプロット・ラグ相関・要因別寄与度・シミュレーターは、いずれも上で計算している相関係数・重回帰の結果を別の見せ方で表示しているだけで、別の統計モデルを新たに作っているわけではありません。要因別寄与度は「係数×標準化した値」という単純な計算で、複雑な機械学習モデル特有の手法（ニューラルネットの勾配を使うIntegrated Gradients等）とは別物です。
          交差検証（Q²）とVIF（多重共線性の目安）だけは例外で、1件を除いた残りでモデルを何度も作り直す・気象要因同士を互いに予測し合うといった追加の計算を行っています。ただしQ²も記録数が少ないと安定しない値であり、「過学習していない」ことを証明するものではなく、あくまで目安です。Q²のキャリブレーション表示（予測 vs 実際）は、その計算結果を1件ずつ点にしているだけです。「直線的？（簡易チェック）」は区間ごとに平均を取っているだけの単純な集計で、GAMのような正式な非線形モデルではありません。区間の分け方を変えれば形も変わりうる、あくまで目安の図です。
        </blockquote>

        <div style="margin-top:14px;">
          <button class="btn-sub no-print" id="forecastBtn">🔮 明日の見通しを記録データと比較する（任意・位置情報を使います）</button>
          <div id="forecastResult"></div>
        </div>
      ` : `<p class="note">気分か体質チェックを含む記録があと${5-withScore.length}件そろうと、気象条件との関連を表示します</p>`}
    </div>
    ${outputBar('analysisView', '体調×気象 分析結果')}
  `;

  document.querySelectorAll('#analysisLenSeg .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => { analysisLength = btn.dataset.len; renderAnalysis(); });
  });

  document.querySelectorAll('#analysisTrendSeg .seg-btn').forEach(btn => {
    if (btn.disabled) return;
    btn.addEventListener('click', () => { analysisTrendLayer = btn.dataset.layer; renderAnalysisTrendChart(); });
  });
  document.querySelectorAll('#analysisTrendOverlaySeg .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.overlay;
      if (key === 'none') analysisTrendOverlays.clear();
      else if (analysisTrendOverlays.has(key)) analysisTrendOverlays.delete(key);
      else analysisTrendOverlays.add(key);
      renderAnalysisTrendChart();
    });
  });
  renderAnalysisTrendChart();

  const toTsutaeruBtn = document.getElementById('analysisToTsutaeruBtn');
  if (toTsutaeruBtn) toTsutaeruBtn.addEventListener('click', () => {
    tsutaeruState.includeData = true;
    LS.set('tsutaeru', tsutaeruState);
    renderTsutaeru();
    const box = document.getElementById('tsutaeruText');
    if (box && (!box.value || box.value === tsutaeruAutoText)) regenerateTsutaeruText();
    switchTab('tsutaeru');
    if (box) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  const toMyGuideBtn = document.getElementById('analysisToMyGuideBtn');
  if (toMyGuideBtn) toMyGuideBtn.addEventListener('click', () => switchTab('myguide'));

  renderWhatIfSimulator(regression);

  const forecastBtn = document.getElementById('forecastBtn');
  if (forecastBtn) forecastBtn.addEventListener('click', async () => {
    const out = document.getElementById('forecastResult');
    out.textContent = '取得中…';
    try {
      const coords = await getPosition();
      const { days } = await fetchForecastDays(coords.latitude, coords.longitude, 7);
      if (!days.length) { out.textContent = '予報を取得できませんでした。'; return; }
      // 個人の相関傾向との比較には「明日」の予報を使う（今日はすでに半分終わっているため）
      const fc = days[1] || days[0];
      const adv = computeForecastAdvisory(fc);
      if (!adv) { out.textContent = '比較できるだけの記録がまだありません。'; return; }

      out.innerHTML = `
        <h4 style="margin:10px 0 6px; font-size:13px;">明日の見通し（あなたの記録との比較）</h4>
        ${adv.fcAlerts.length ? `<p style="margin:0 0 6px;"><b>${adv.fcAlerts.join('　')}</b></p>` : ''}
        <p style="margin:0 0 6px;">${adv.advisory}</p>
        ${adv.factorLines.length
          ? `<ul style="margin:4px 0 0; padding-left:18px; font-size:12px;">${adv.factorLines.map(f => `<li><b>${f.label}</b>：${f.valText}程度の予報（${f.worse ? 'これまで体調が優れなかった日の傾向に近そうです' : 'これまで比較的落ち着いていた日の傾向に近そうです'}）</li>`).join('')}</ul>`
          : `<p class="note" style="margin:0;">これまでの記録では、明日の予報の要素と体調のはっきりした関連は見つかりませんでした。</p>`}
        <p class="note" style="margin:6px 0 0;">※ あなた自身の記録にもとづく参考情報・気象庁の公式予報ではありません。医学的な予測でもありません。</p>
        <button type="button" class="btn-link no-print" id="analysisWeatherJump" style="margin-top:8px;">🔮 週間の天気・時間ごとの予報を見る</button>
      `;
      const jump = document.getElementById('analysisWeatherJump');
      if (jump) jump.addEventListener('click', () => switchTab('weather'));
    } catch {
      out.textContent = '位置情報または天気情報を取得できませんでした。';
    }
  });
}

// ============================================================
// 伝える（テンプレート式 文章生成）
// ============================================================
// 初めて「伝える」を使う人には、記録データとの間に意味のある相関がすでにあるなら
// 「データを含める」を最初からONにしておく（「なぜか怠い」を説明する根拠として使ってほしいため）。
// 既存ユーザーが自分で選んだON/OFFの状態は、保存されたLSの値が優先されそのまま維持される。
const tsutaeruState = LS.get('tsutaeru', { when:null, degree:null, nrs:null, place:[], feel:[], mind:[], body:[], mode:'casual', includeData: !!computeTopObjectiveFinding(), includeCheck: false, includeIntake: false });
if (!Array.isArray(tsutaeruState.body)) tsutaeruState.body = [];
if (tsutaeruState.nrs === undefined) tsutaeruState.nrs = null;
if (!tsutaeruState.mode) tsutaeruState.mode = 'casual';
if (tsutaeruState.includeData === undefined) tsutaeruState.includeData = false;
if (tsutaeruState.includeCheck === undefined) tsutaeruState.includeCheck = false;
if (tsutaeruState.includeIntake === undefined) tsutaeruState.includeIntake = false;
let tsutaeruAutoText = '';

// 「ズキズキする」「締め付けられる感じ」のように、すでに用言で終わる表現に「です」を続けると
// 「するです」のような不自然な文になるため、語尾に応じて締めくくり方を変える
function naturalEnding(lastPhrase) {
  return /(する|感じ|よう)$/.test(lastPhrase) ? '。' : 'です。';
}

// 体質チェックで今いちばん近い体質を、伝える文章に添えるための一文にする
function checkResultSentence() {
  const ranked = getCheckRanking();
  if (!ranked.length) return null;
  const top = ranked[0];
  return `【体質チェック】「${top.name}」の傾向が近そうです（${top.count}/${top.total}件）。`;
}
// 問診で今いちばん近い体質を、伝える文章に添えるための一文にする
function intakeResultSentence() {
  const ranked = computeIntakeRanked();
  if (!ranked.length) return null;
  const top = ranked[0];
  return `【問診】「${top.name}」の傾向が近そうです（${top.score}点）。`;
}

function generateTsutaeruSentence(s) {
  const body = s.body || [];
  const checkLine = s.includeCheck ? checkResultSentence() : null;
  const intakeLine = s.includeIntake ? intakeResultSentence() : null;
  if (!s.place.length && !s.feel.length && !s.mind.length && !body.length) {
    if (checkLine || intakeLine) return [checkLine, intakeLine].filter(Boolean).join('\n');
    return '気になる言葉を選ぶと、ここに文章が自動で作られます。';
  }
  let text = '';
  if (s.when) text += s.when + '、';
  if (s.degree) text += s.degree;
  if (s.place.length && s.feel.length) {
    text += s.place.join('・') + 'が' + s.feel.join('・') + naturalEnding(s.feel[s.feel.length - 1]);
  } else if (s.place.length) {
    text += s.place.join('・') + 'の調子がよくないです。';
  } else if (s.feel.length) {
    text += '体が' + s.feel.join('・') + naturalEnding(s.feel[s.feel.length - 1]);
  }
  if (s.nrs != null) text += `つらさは10段階中${s.nrs}くらいです。`;
  if (s.mind.length) text += s.mind.join('・') + 'こともあります。';
  if (body.length) text += body.join('・') + 'です。';
  if (checkLine) text += '\n' + checkLine;
  if (intakeLine) text += '\n' + intakeLine;
  return text;
}

// ---------- 客観的サマリー（OPQRSTを参考にした構造化フォーマット） ----------
// 気力がない時でもタップだけで、部位・程度・性状・増悪寛解因子・随伴症状を整理して伝えられるようにする。
// 行データ（buildObjectiveRows）はテキスト生成と印刷レイアウトの両方から共通で使う。
function buildObjectiveRows(s) {
  const body = s.body || [];
  const rows = [];
  if (s.when) rows.push({ label: '経過', value: `${s.when}${s.when.endsWith('から') ? '' : 'から'}` });
  if (s.degree || s.nrs != null) {
    const nrsText = s.nrs != null ? `つらさ ${s.nrs}/10${s.degree ? '　' : ''}` : '';
    rows.push({ label: '程度', value: `${nrsText}${s.degree || ''}` });
  }
  if (s.place.length) rows.push({ label: '部位', value: s.place.join('・') });
  if (s.feel.length) rows.push({ label: '性状', value: s.feel.join('・') });
  const aggravating = body.includes('動くと悪化する');
  const relieving = body.includes('休むと少し楽になる');
  const factorText = [aggravating ? '動くと悪化' : '', relieving ? '休むと軽快' : ''].filter(Boolean).join('、');
  if (factorText) rows.push({ label: '増悪・寛解因子', value: factorText });
  const otherBody = body.filter(w => w !== '動くと悪化する' && w !== '休むと少し楽になる');
  const associated = [...s.mind, ...otherBody];
  if (associated.length) rows.push({ label: '随伴症状', value: associated.join('・') });
  return rows;
}
// 「私の取扱説明書」の傾向を、伝える用の一文に圧縮する（強い方から2つまで、断定を避ける言い方で）
function selfPatternsSentence() {
  if (typeof computeSelfPatterns !== 'function') return '';
  const p = computeSelfPatterns();
  if (!p || (!p.worsen.length && !p.stable.length)) return '';
  const parts = [];
  if (p.worsen.length) parts.push(`調子を崩しやすい条件：${p.worsen.slice(0, 2).join('、')}`);
  if (p.stable.length) parts.push(`比較的安定しやすい条件：${p.stable.slice(0, 2).join('、')}`);
  return `【自分の記録からの傾向（${p.n}件・断定ではありません）】${parts.join('／')}`;
}
function generateObjectiveSummary(s) {
  const rows = buildObjectiveRows(s);
  const checkLine = s.includeCheck ? checkResultSentence() : null;
  const intakeLine = s.includeIntake ? intakeResultSentence() : null;
  if (!rows.length && !checkLine && !intakeLine) return '気になる言葉を選ぶと、ここに客観的サマリーが自動で作られます。';
  let text = rows.map(r => `【${r.label}】${r.value}`).join('\n');
  if (checkLine) text += (text ? '\n' : '') + checkLine;
  if (intakeLine) text += (text ? '\n' : '') + intakeLine;
  if (s.includeData) {
    const obj = objectiveFindingSentence();
    if (obj) text += (text ? '\n' : '') + obj;
    const baseline = computeBaselineComparison();
    if (baseline) text += (text ? '\n' : '') + baseline;
    const selfPat = selfPatternsSentence();
    if (selfPat) text += (text ? '\n' : '') + selfPat;
  }
  return text;
}

// 予報1日分（明日など）が、これまでの記録の中の「不調が強かった日」の気象パターンにどれだけ近いかをまとめる。
// このサイトは医師の診察（長期的な経過）を前提に、あくまで明日の心づもりのための短期的な参考情報を出す、という
// 役割分担のもとで使う想定。分析タブの手動比較・天気タブの自動表示の両方から共通で使う。
function computeForecastAdvisory(fc) {
  if (!fc) return null;
  const usable = records.filter(r => r.weather && r.weather.status === 'ok');
  const moodRecords = usable.filter(r => r.mood);
  const useMood = moodRecords.length >= 5;
  const checkRecords = usable.filter(r => r.checkSnapshot && r.checkSnapshot.length);
  const withScore = useMood ? moodRecords : checkRecords;
  if (withScore.length < 5) return null;
  const severity = r => useMood ? (4 - r.mood) : r.checkSnapshot.reduce((s, x) => s + x.count, 0);

  const factorAccessor = {
    pressure: r => r.weather.pressure,
    pressureChange3h: r => r.weather.pressureChange3h,
    humidity: r => r.weather.humidity,
    temp: r => r.weather.temp,
    wind: r => r.weather.windSpeed,
  };
  const factorLabel = { pressure: '気圧', pressureChange3h: '気圧の変化（3時間）', humidity: '湿度', temp: '気温', wind: '風速' };
  const corrList = Object.keys(factorAccessor).map(key => {
    const accessor = factorAccessor[key];
    const subset = withScore.filter(r => accessor(r) != null);
    if (subset.length < 5) return { key, label: factorLabel[key], r: null, n: subset.length };
    return { key, label: factorLabel[key], r: pearson(subset.map(accessor), subset.map(severity)), n: subset.length };
  });

  // 記録の中で、この因子の値が「不調が強かった日寄り」か「落ち着いていた日寄り」かをforecastValと比較する
  function isCloserToWorseDay(key, forecastVal) {
    const accessor = factorAccessor[key];
    const subset = withScore.filter(r => accessor(r) != null);
    if (subset.length < 4 || forecastVal == null) return null;
    const vals = subset.map(r => ({ v: accessor(r), s: severity(r) })).sort((a, b) => a.s - b.s);
    const half = Math.max(1, Math.floor(vals.length / 2));
    const betterAvg = vals.slice(0, half).reduce((s, x) => s + x.v, 0) / half;
    const worseAvg = vals.slice(-half).reduce((s, x) => s + x.v, 0) / half;
    return Math.abs(forecastVal - worseAvg) < Math.abs(forecastVal - betterAvg);
  }

  const fcAlerts = [];
  if (fc.typhoonFlag) fcAlerts.push('🌀 台風接近の目安');
  if (fc.linearRainbandFlag) fcAlerts.push('🌊 線状降水帯の目安');
  else if (fc.heavyRainFlag) fcAlerts.push('⚠️ 大雨の目安');
  if (fc.pressureDropFlag) fcAlerts.push('📉 気圧急降下の目安');
  if (fc.extremeHeatFlag) fcAlerts.push('🥵 酷暑（猛暑日）の目安');
  if (fc.highHumidityFlag) fcAlerts.push('💦 高湿度の目安');
  if (fc.strongWindFlag && !fc.typhoonFlag) fcAlerts.push('🌬️ 強風の目安');

  const factorInfo = {
    pressure: { val: fc.pressure, unit: 'hPa', digits: 0 },
    pressureChange3h: { val: fc.pressureChange3h, unit: 'hPa/3h', digits: 1 },
    humidity: { val: fc.humidity, unit: '%', digits: 0 },
    temp: { val: fc.temp, unit: '℃', digits: 1 },
    wind: { val: fc.windSpeed, unit: 'm/s', digits: 1 },
  };
  const meaningful = corrList.filter(c => c.r != null && Math.abs(c.r) >= 0.3).sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  let worseCount = 0;
  const factorLines = meaningful.map(c => {
    const info = factorInfo[c.key];
    if (!info || info.val == null) return null;
    const worse = isCloserToWorseDay(c.key, info.val);
    if (worse == null) return null;
    if (worse) worseCount++;
    return { label: c.label, valText: `${info.val.toFixed(info.digits)}${info.unit}`, worse };
  }).filter(Boolean);

  let advisory;
  if (fcAlerts.length || worseCount >= 3) advisory = '🔴 少し気をつけて過ごしたい日かもしれません。予定にゆとりを持てるといいかもしれません。';
  else if (worseCount >= 1) advisory = '🟡 軽く気に留めておくと安心かもしれません。';
  else advisory = '🟢 これまでの記録からは、特に気になる要素はなさそうです。';

  return { fcAlerts, factorLines, advisory, worseCount };
}

// 「伝える」タブから、記録データの中でもっとも目立つ気象要因との関連を一行だけ取り出す（分析タブの簡易版）
function computeTopObjectiveFinding() {
  const usable = records.filter(r => r.weather && r.weather.status === 'ok');
  const moodRecords = usable.filter(r => r.mood);
  const useMood = moodRecords.length >= 5;
  const checkRecords = usable.filter(r => r.checkSnapshot && r.checkSnapshot.length);
  const withScore = useMood ? moodRecords : checkRecords;
  if (withScore.length < 5) return null;
  const severity = r => useMood ? (4 - r.mood) : r.checkSnapshot.reduce((s,x)=>s+x.count,0);
  const factors = [
    { label:'気圧', accessor:r=>r.weather.pressure },
    { label:'気圧の変化（3時間）', accessor:r=>r.weather.pressureChange3h },
    { label:'湿度', accessor:r=>r.weather.humidity },
    { label:'気温', accessor:r=>r.weather.temp },
    { label:'風速', accessor:r=>r.weather.windSpeed },
  ];
  const results = factors.map(f => {
    const subset = withScore.filter(r => f.accessor(r) != null);
    if (subset.length < 5) return null;
    const r = pearson(subset.map(f.accessor), subset.map(severity));
    if (r == null) return null;
    return { label: f.label, r, n: subset.length, p: pearsonPValue(r, subset.length) };
  }).filter(Boolean);
  if (!results.length) return null;
  const pAdjArr = benjaminiHochberg(results.map(x => x.p));
  results.forEach((x, i) => { x.pAdj = pAdjArr[i]; });
  const sorted = results.filter(x => Math.abs(x.r) >= 0.3).sort((a,b) => Math.abs(b.r) - Math.abs(a.r));
  return sorted.length ? sorted[0] : null;
}
function objectiveFindingSentence() {
  const top = computeTopObjectiveFinding();
  if (!top) return null;
  const dir = top.r > 0 ? '高い' : '低い';
  const sig = (top.pAdj != null && top.pAdj < 0.05) ? '統計的に有意' : '参考程度・有意水準には未達';
  return `【参考データ】本人の記録（${top.n}件）では、${top.label}が${dir}日に体調不良を感じやすい傾向（相関係数 r=${top.r.toFixed(2)}、${sig}）。`;
}

// 任意のstateオブジェクトに対して単一/複数選択チップを描画する汎用ヘルパー
// （「伝える」タブと記録フォームの簡易ピッカーの両方から使う）
function renderWordChips(state, groupKey, containerId, multi, onChange) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = TSUTAERU_WORDS[groupKey].map(w => {
    const on = multi ? state[groupKey].includes(w) : state[groupKey] === w;
    return `<label class="chip ${on?'on':''}" data-val="${escapeHtml(w)}">${w}</label>`;
  }).join('');
  el.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', e => {
      e.preventDefault();
      const val = chip.dataset.val;
      if (multi) {
        const set = new Set(state[groupKey]);
        set.has(val) ? set.delete(val) : set.add(val);
        state[groupKey] = [...set];
      } else {
        state[groupKey] = (state[groupKey] === val) ? null : val;
      }
      onChange();
    });
  });
}

function regenerateTsutaeruText() {
  const text = tsutaeruState.mode === 'objective' ? generateObjectiveSummary(tsutaeruState) : generateTsutaeruSentence(tsutaeruState);
  tsutaeruAutoText = text;
  document.getElementById('tsutaeruText').value = text;
}

// 0〜10のNRS（つらさの自己評価スケール）を単一選択のチップとして描画する
function renderNrsChips(state, containerId, onChange) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Array.from({ length: 11 }, (_, i) => i).map(n =>
    `<label class="chip ${state.nrs === n ? 'on' : ''}" data-val="${n}">${n}</label>`
  ).join('');
  el.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', e => {
      e.preventDefault();
      const val = Number(chip.dataset.val);
      state.nrs = (state.nrs === val) ? null : val;
      onChange();
    });
  });
}

function renderTsutaeru() {
  const onChange = () => {
    LS.set('tsutaeru', tsutaeruState);
    renderTsutaeru();
    // 手動編集中でなければ（前回の自動生成文のままなら）自動で作り直す
    const box = document.getElementById('tsutaeruText');
    if (!box.value || box.value === tsutaeruAutoText) regenerateTsutaeruText();
  };
  renderWordChips(tsutaeruState, 'when', 'twWhen', false, onChange);
  renderWordChips(tsutaeruState, 'degree', 'twDegree', false, onChange);
  renderNrsChips(tsutaeruState, 'twNrs', onChange);
  renderWordChips(tsutaeruState, 'place', 'twPlace', true, onChange);
  renderWordChips(tsutaeruState, 'feel', 'twFeel', true, onChange);
  renderWordChips(tsutaeruState, 'mind', 'twMind', true, onChange);
  renderWordChips(tsutaeruState, 'body', 'twBody', true, onChange);

  document.querySelectorAll('#tsutaeruModeSeg .seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === tsutaeruState.mode);
  });
  const includeToggle = document.getElementById('tsutaeruIncludeDataToggle');
  if (includeToggle) {
    includeToggle.hidden = tsutaeruState.mode !== 'objective';
    includeToggle.classList.toggle('on', tsutaeruState.includeData);
  }
  // 体質チェック・問診の結果は、それぞれ実際に結果がある時だけトグルを出す（モードは問わない）
  const includeCheckToggle = document.getElementById('tsutaeruIncludeCheckToggle');
  if (includeCheckToggle) {
    includeCheckToggle.hidden = getCheckRanking().length === 0;
    includeCheckToggle.classList.toggle('on', tsutaeruState.includeCheck);
  }
  const includeIntakeToggle = document.getElementById('tsutaeruIncludeIntakeToggle');
  if (includeIntakeToggle) {
    includeIntakeToggle.hidden = computeIntakeRanked().length === 0;
    includeIntakeToggle.classList.toggle('on', tsutaeruState.includeIntake);
  }

  const box = document.getElementById('tsutaeruText');
  if (!box.value) regenerateTsutaeruText();

  const jump = document.getElementById('tsutaeruResultJump');
  if (jump) {
    const hasWords = !!(tsutaeruState.when || tsutaeruState.degree || tsutaeruState.nrs != null || tsutaeruState.place.length || tsutaeruState.feel.length || tsutaeruState.mind.length || tsutaeruState.body.length);
    jump.hidden = !hasWords;
  }
  renderTsutaeruCareSuggest();
}

document.querySelectorAll('#tsutaeruModeSeg .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    tsutaeruState.mode = btn.dataset.mode;
    LS.set('tsutaeru', tsutaeruState);
    renderTsutaeru();
    regenerateTsutaeruText();
  });
});
document.getElementById('tsutaeruIncludeDataToggle').addEventListener('click', () => {
  tsutaeruState.includeData = !tsutaeruState.includeData;
  LS.set('tsutaeru', tsutaeruState);
  renderTsutaeru();
  regenerateTsutaeruText();
});
document.getElementById('tsutaeruIncludeCheckToggle').addEventListener('click', () => {
  tsutaeruState.includeCheck = !tsutaeruState.includeCheck;
  LS.set('tsutaeru', tsutaeruState);
  renderTsutaeru();
  regenerateTsutaeruText();
});
document.getElementById('tsutaeruIncludeIntakeToggle').addEventListener('click', () => {
  tsutaeruState.includeIntake = !tsutaeruState.includeIntake;
  LS.set('tsutaeru', tsutaeruState);
  renderTsutaeru();
  regenerateTsutaeruText();
});

// 「伝える」で選ぶ言葉 → 近そうなタイプ別セルフケアの対応表（キーワードのゆらぎに頼らず、意味で対応づける）
const WORD_TO_CARETYPE = {
  '重い': ['慢性痛タイプ', '冷えタイプ'],
  'だるい': ['慢性疲労タイプ'],
  '痛い': ['慢性痛タイプ'],
  '冷える': ['冷えタイプ'],
  'ほてる': ['女性ホルモンタイプ'],
  'ズキズキする': ['慢性痛タイプ'],
  'フラフラする': ['自律神経タイプ'],
  '張る感じがする': ['胃腸タイプ'],
  '力が入らない': ['慢性疲労タイプ'],
  'こわばる': ['慢性痛タイプ'],
  'かゆい': ['アトピー・皮膚トラブルタイプ'],
  '吐き気がする': ['胃腸タイプ'],
  '熱っぽい': ['自律神経タイプ'],
  '息苦しい': ['自律神経タイプ'],
  '光がつらい': ['自律神経タイプ'],
  '音がつらい': ['自律神経タイプ'],
  'においがつらい': ['自律神経タイプ'],
  '触れられるのもつらい': ['慢性痛タイプ', '自律神経タイプ'],
  'イライラする': ['自律神経タイプ', '気を使いすぎタイプ'],
  '涙が出やすい': ['気を使いすぎタイプ'],
  '不安になる': ['自律神経タイプ'],
  'やる気が出ない': ['慢性疲労タイプ'],
  '考えがまとまらない': ['慢性疲労タイプ'],
  '眠れない': ['不眠タイプ'],
  '眠くて仕方ない': ['胃腸タイプ', '慢性疲労タイプ'],
  'ぼーっとする': ['慢性疲労タイプ'],
  '誰とも話したくない': ['気を使いすぎタイプ'],
  '気分の波が激しい': ['女性ホルモンタイプ'],
  '緊張しやすい': ['自律神経タイプ'],
  '集中できない': ['慢性疲労タイプ'],
  '食欲がない': ['胃腸タイプ'],
  '食べ過ぎてしまう': ['過食・甘いもの依存タイプ'],
  '寝ても疲れが取れない': ['慢性疲労タイプ'],
  'すぐ横になりたくなる': ['慢性疲労タイプ'],
  '動くと悪化する': ['慢性痛タイプ'],
  '休むと少し楽になる': ['慢性痛タイプ'],
  'ニキビが出ている': ['アトピー・皮膚トラブルタイプ', '女性ホルモンタイプ'],
  '肌がかぶれている': ['アトピー・皮膚トラブルタイプ', '自律神経タイプ'],
  '肌に赤みがある': ['アトピー・皮膚トラブルタイプ', '自律神経タイプ'],
};

// 選んだ言葉（どんな感じ？・気持ちの面は？・体の状態）から、近そうなタイプ別セルフケアを提案する
function renderTsutaeruCareSuggest() {
  const box = document.getElementById('tsutaeruCareSuggest');
  if (!box) return;
  const words = [...tsutaeruState.feel, ...tsutaeruState.mind, ...tsutaeruState.body];
  const names = Array.from(new Set(words.flatMap(w => WORD_TO_CARETYPE[w] || [])));
  const matches = names.map(n => CARE_TYPE.find(c => c.name === n)).filter(Boolean).slice(0, 3);
  if (!matches.length) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  box.innerHTML = `
    <div class="card" style="padding:14px 16px;">
      <label style="display:block; font-weight:600; font-size:13px; margin-bottom:8px;">選んだ言葉から、近そうなセルフケア</label>
      <div class="chips">
        ${matches.map(c => `<button type="button" class="chip no-print" data-care-type="${escapeHtml(c.name)}">${escapeHtml(c.name)}</button>`).join('')}
      </div>
    </div>
  `;
  box.querySelectorAll('[data-care-type]').forEach(btn => {
    btn.addEventListener('click', () => goToCareType(btn.dataset.careType));
  });
}

// ---------- 場面プリセット（いつから・どのくらい を場面に合わせて初期設定） ----------
const TSUTAERU_PRESETS = {
  hospital: { when: 'ここ1週間くらい', degree: 'かなり', mode: 'objective' },
  family: { when: '今日', degree: 'まあまあ', mode: 'casual' },
  work: { when: 'ここ2〜3日', degree: '少し', mode: 'casual' },
};
document.querySelectorAll('#tsutaeruPresets [data-preset]').forEach(el => {
  el.addEventListener('click', () => {
    const preset = TSUTAERU_PRESETS[el.dataset.preset];
    if (!preset) return;
    tsutaeruState.when = preset.when;
    tsutaeruState.degree = preset.degree;
    tsutaeruState.mode = preset.mode;
    LS.set('tsutaeru', tsutaeruState);
    renderTsutaeru();
    regenerateTsutaeruText();
    document.getElementById('twPlace').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});

// ---------- 症状を言葉にする（今日どのくらい動けるかを短く言語化する） ----------
// 「伝える」の症状ワード（痛い・だるい等）とは別に、「起き上がりにくい」「長時間続けられない」といった
// “できる／できない”の程度を短い説明文にする。学校・家族などにそのまま渡せる長さを狙う
let capacityState = { body: [], life: [], time: [] };
function generateCapacitySentence(s) {
  if (!s.body.length && !s.life.length && !s.time.length) return '';
  let text = '';
  if (s.time.length) text += s.time.join('・') + '、';
  if (s.body.length) text += '身体が' + s.body.join('・') + naturalEnding(s.body[s.body.length - 1]);
  else if (s.time.length) text = text.replace(/、$/, 'の体調です。');
  if (s.life.length) {
    text += s.life.length > 1
      ? s.life.slice(0, -1).join('、') + '、' + s.life[s.life.length - 1] + 'ことがあります。'
      : s.life[0] + 'ことがあります。';
  }
  return text;
}
function renderCapacityCard() {
  const el = document.getElementById('capacityCard');
  if (!el) return;
  el.innerHTML = `
    <label style="display:block; font-weight:700; font-size:14px; margin-bottom:4px;">📝 今日の状態を言葉にする</label>
    <p class="note" style="margin:0 0 10px;">「だるい」だけでは伝わりにくい、今日どのくらい動けるかを短い文章にします。学校・家族・医療機関にそのまま伝えられます。</p>
    <div class="q" style="margin:0 0 8px;"><label>身体</label><div class="chips" id="capBody"></div></div>
    <div class="q" style="margin:0 0 8px;"><label>生活</label><div class="chips" id="capLife"></div></div>
    <div class="q" style="margin:0 0 10px;"><label>時間</label><div class="chips" id="capTime"></div></div>
    <textarea id="capacityText" rows="3" readonly style="width:100%; padding:10px; font-size:14px; border:1px solid var(--border); border-radius:8px; font-family:inherit; background:var(--surface-2);"></textarea>
    <div class="output-bar no-print" style="margin-top:8px;">
      <button class="btn-out" id="capacityCopy">📤 共有・コピー</button>
    </div>
  `;
  const onChange = () => {
    renderCapacityChips();
    document.getElementById('capacityText').value = generateCapacitySentence(capacityState) || '身体・生活・時間のタグを選ぶと、ここに文章が自動で作られます。';
  };
  renderCapacityChips(onChange);
  document.getElementById('capacityText').value = generateCapacitySentence(capacityState) || '身体・生活・時間のタグを選ぶと、ここに文章が自動で作られます。';
  document.getElementById('capacityCopy').addEventListener('click', () => shareText(document.getElementById('capacityText').value, '今日の状態'));
  function renderCapacityChips(onChangeCb) {
    const cb = onChangeCb || onChange;
    ['body', 'life', 'time'].forEach(group => {
      const containerId = group === 'body' ? 'capBody' : group === 'life' ? 'capLife' : 'capTime';
      const container = document.getElementById(containerId);
      container.innerHTML = CAPACITY_WORDS[group].map(w => `<label class="chip ${capacityState[group].includes(w) ? 'on' : ''}" data-cap="${escapeHtml(w)}">${w}</label>`).join('');
      container.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', e => {
          e.preventDefault();
          const val = chip.dataset.cap;
          const set = new Set(capacityState[group]);
          set.has(val) ? set.delete(val) : set.add(val);
          capacityState[group] = [...set];
          cb();
        });
      });
    });
  }
}

// ---------- 体調の取扱説明書 ----------
// 「私の場合」の箇条書きを1つだけ書いておくと、相手（学校・医療機関・家族・友達）に合わせて
// 長さ・トーンを変えたテキストを自動で組み立てる。健康な人との認識のずれを埋める説明を、毎回ゼロから
// 考えなくて済むようにするのが狙い
let torisetsuState = LS.get('torisetsu', { points: [] });
if (!Array.isArray(torisetsuState.points)) torisetsuState.points = [];
function saveTorisetsuState() { LS.set('torisetsu', torisetsuState); }
const TORISETSU_AUDIENCES = [
  { key: 'school', label: '🏫 学校（30秒版）', intro: '私の場合、', outro: '', joiner: '。', short: true },
  { key: 'hospital', label: '🏥 医療機関', intro: '私の体調について、いくつか傾向があります。', outro: '記録も残しているので、参考にしていただけると助かります。', joiner: '。', short: false },
  { key: 'family', label: '👪 家族', intro: '私の体調について、知っておいてほしいことがあります。', outro: '', joiner: '。', short: false },
  { key: 'friend', label: '🧑‍🤝‍🧑 友達', intro: '体調のことで、わかっておいてほしいことがあって。', outro: 'それだけ知っててもらえるとうれしいな。', joiner: '。', short: false },
];
function buildTorisetsuText(audienceKey) {
  const aud = TORISETSU_AUDIENCES.find(a => a.key === audienceKey);
  const points = torisetsuState.points.filter(p => p.trim());
  if (!aud || !points.length) return '';
  const usePoints = aud.short ? points.slice(0, 2) : points;
  const body = usePoints.map(p => p.trim().replace(/[。.]$/, '')).join(aud.joiner) + aud.joiner;
  if (aud.intro.endsWith('、')) return [aud.intro + body, aud.outro].filter(Boolean).join('\n');
  return [aud.intro, body, aud.outro].filter(Boolean).join('\n');
}
function renderTorisetsuCard() {
  const el = document.getElementById('torisetsuCard');
  if (!el) return;
  el.innerHTML = `
    <label style="display:block; font-weight:700; font-size:14px; margin-bottom:4px;">🩷 私の取扱説明書</label>
    <p class="note" style="margin:0 0 10px;">「私の場合」の特徴を箇条書きにしておくと、相手に合わせた説明文を自動で作ります。</p>
    <div id="torisetsuPoints"></div>
    <div style="display:flex; gap:6px; margin-top:6px;">
      <input type="text" id="torisetsuInput" placeholder="例：朝の状態で一日の活動量が変わります" style="flex:1; padding:8px; font-size:13px; border:1px solid var(--border); border-radius:8px; font-family:inherit;" />
      <button type="button" class="btn-sub" id="torisetsuAdd">追加</button>
    </div>
    <label style="display:block; font-weight:600; font-size:13px; margin:16px 0 8px;">相手に合わせて見る</label>
    <div class="seg" id="torisetsuAudienceSeg">
      ${TORISETSU_AUDIENCES.map((a, i) => `<button class="seg-btn ${i === 0 ? 'active' : ''}" data-aud="${a.key}">${a.label}</button>`).join('')}
    </div>
    <textarea id="torisetsuText" rows="4" readonly style="width:100%; padding:10px; font-size:14px; border:1px solid var(--border); border-radius:8px; font-family:inherit; background:var(--surface-2); margin-top:8px;"></textarea>
    <div class="output-bar no-print" style="margin-top:8px;">
      <button class="btn-out" id="torisetsuCopy">📤 共有・コピー</button>
    </div>
  `;
  const pointsBox = document.getElementById('torisetsuPoints');
  pointsBox.innerHTML = torisetsuState.points.map((p, i) => `
    <div style="display:flex; align-items:center; gap:6px; margin:0 0 6px;">
      <span class="note" style="flex:1;">・${escapeHtml(p)}</span>
      <button type="button" class="btn-link no-print" data-tori-del="${i}">削除</button>
    </div>`).join('');
  pointsBox.querySelectorAll('[data-tori-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      torisetsuState.points.splice(Number(btn.dataset.toriDel), 1);
      saveTorisetsuState();
      renderTorisetsuCard();
    });
  });
  document.getElementById('torisetsuAdd').addEventListener('click', () => {
    const input = document.getElementById('torisetsuInput');
    const text = input.value.trim();
    if (!text) return;
    torisetsuState.points.push(text);
    saveTorisetsuState();
    renderTorisetsuCard();
  });
  let currentAud = TORISETSU_AUDIENCES[0].key;
  const updateText = () => { document.getElementById('torisetsuText').value = buildTorisetsuText(currentAud) || '上に「私の場合」を1つ以上追加すると、ここに説明文が作られます。'; };
  document.querySelectorAll('#torisetsuAudienceSeg .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentAud = btn.dataset.aud;
      document.querySelectorAll('#torisetsuAudienceSeg .seg-btn').forEach(b => b.classList.toggle('active', b === btn));
      updateText();
    });
  });
  updateText();
  document.getElementById('torisetsuCopy').addEventListener('click', () => shareText(document.getElementById('torisetsuText').value, '体調の取扱説明書'));
}

// ---------- 記録フォーム内のミニ版「伝える」ピッカー ----------
// 「伝える」タブと語彙をそろえる（食欲がない、等の言葉がこちらだけ選べない、ということがないように）
function emptyRfWordState() { return { when: null, degree: null, nrs: null, place: [], feel: [], mind: [], body: [] }; }
let rfWordState = emptyRfWordState();

function renderRecordWordPicker() {
  const onChange = () => renderRecordWordPicker();
  renderWordChips(rfWordState, 'when', 'rfWhen', false, onChange);
  renderWordChips(rfWordState, 'degree', 'rfDegree', false, onChange);
  renderNrsChips(rfWordState, 'rfNrs', onChange);
  renderWordChips(rfWordState, 'place', 'rfPlace', true, onChange);
  renderWordChips(rfWordState, 'feel', 'rfFeel', true, onChange);
  renderWordChips(rfWordState, 'mind', 'rfMind', true, onChange);
  renderWordChips(rfWordState, 'body', 'rfBody', true, onChange);
}
function resetRecordWordPicker() {
  rfWordState = emptyRfWordState();
  renderRecordWordPicker();
}
function rfHasAnyWord() {
  return !!(rfWordState.when || rfWordState.degree || rfWordState.nrs != null ||
    rfWordState.place.length || rfWordState.feel.length || rfWordState.mind.length || rfWordState.body.length);
}
document.getElementById('rfInsert').addEventListener('click', () => {
  if (!rfHasAnyWord()) return;
  const sentence = generateTsutaeruSentence(rfWordState);
  const memoBox = document.getElementById('recordMemo');
  memoBox.value = memoBox.value.trim() ? memoBox.value.trim() + ' ' + sentence : sentence;
  memoBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  memoBox.focus();
});

// ---------- 「なぜ今つらい？」要因の整理（原因を1つに決めず、可能性を整理するだけのチェックリスト） ----------
const FACTOR_CHECKLIST = ['気象変化', '睡眠', '疲労', '活動量', '食事', '水分', '周期', 'ストレス', 'その他'];
let factorChecklistState = new Set();
function renderFactorChecklist() {
  const el = document.getElementById('factorChecklist');
  if (!el) return;
  el.innerHTML = FACTOR_CHECKLIST.map(f => `<label class="chip ${factorChecklistState.has(f) ? 'on' : ''}" data-factor="${f}">${f}</label>`).join('');
  el.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', e => {
      e.preventDefault();
      const val = chip.dataset.factor;
      factorChecklistState.has(val) ? factorChecklistState.delete(val) : factorChecklistState.add(val);
      renderFactorChecklist();
    });
  });
}
renderFactorChecklist();
document.getElementById('factorInsert').addEventListener('click', () => {
  if (!factorChecklistState.size) return;
  const list = [...factorChecklistState];
  const sentence = list.length === 1
    ? `今日の状態を一言で表すと「${list[0]}の影響がありそう」`
    : `今日の状態を一言で表すと「${list.join('＋')}が重なっている可能性」`;
  const memoBox = document.getElementById('recordMemo');
  memoBox.value = memoBox.value.trim() ? memoBox.value.trim() + ' ' + sentence : sentence;
  memoBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  memoBox.focus();
});

document.getElementById('tsutaeruRegen').addEventListener('click', regenerateTsutaeruText);

document.getElementById('resetTsutaeru').addEventListener('click', (e) => {
  confirmClick(e.currentTarget, 'もう一度押すとクリア', () => {
    tsutaeruState.when = null; tsutaeruState.degree = null; tsutaeruState.nrs = null;
    tsutaeruState.place = []; tsutaeruState.feel = []; tsutaeruState.mind = []; tsutaeruState.body = [];
    tsutaeruState.mode = 'casual'; tsutaeruState.includeData = false;
    tsutaeruState.includeCheck = false; tsutaeruState.includeIntake = false;
    LS.set('tsutaeru', tsutaeruState);
    renderTsutaeru();
    regenerateTsutaeruText();
  });
});

document.getElementById('tsutaeruCopy').addEventListener('click', () => {
  shareText(document.getElementById('tsutaeruText').value, '体調メモ');
});

document.getElementById('tsutaeruToRecord').addEventListener('click', () => {
  switchTab('record');
  openRecordFormUI();
  document.getElementById('recordMemo').value = document.getElementById('tsutaeruText').value;
});

// ---------- 聞き取りまちがいのマイ辞書 ----------
// 音声認識は同じ言葉を同じように間違って聞き取ることが多いため、
// 一度直した言い換えを覚えておいて次からは自動で当てはめる（元の文章は書き換えない・別枠で保持する）
let voiceDict = LS.get('voiceDict', []);
function saveVoiceDict() { LS.set('voiceDict', voiceDict); }
function applyVoiceDict(text) {
  let result = text;
  voiceDict.forEach(({ from, to }) => { if (from) result = result.split(from).join(to); });
  return result;
}
function renderVoiceDictList() {
  const el = document.getElementById('voiceDictList');
  if (!el) return;
  el.innerHTML = voiceDict.length
    ? voiceDict.map((d, i) => `
      <li style="display:flex; align-items:center; gap:6px; margin-bottom:6px; font-size:13px;">
        <span>${escapeHtml(d.from)} → ${escapeHtml(d.to)}</span>
        <button type="button" class="btn-link no-print" data-idx="${i}" style="margin-left:auto;">削除</button>
      </li>`).join('')
    : '<li class="note">まだ登録されていません</li>';
  el.querySelectorAll('[data-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      voiceDict.splice(Number(btn.dataset.idx), 1);
      saveVoiceDict();
      renderVoiceDictList();
    });
  });
}
document.getElementById('voiceDictAdd').addEventListener('click', () => {
  const fromEl = document.getElementById('voiceDictFrom');
  const toEl = document.getElementById('voiceDictTo');
  const from = fromEl.value.trim(), to = toEl.value.trim();
  if (!from || !to) return;
  voiceDict.push({ from, to });
  saveVoiceDict();
  renderVoiceDictList();
  fromEl.value = ''; toEl.value = '';
});
renderVoiceDictList();

// ---------- 話し言葉の書き直し（フィラー除去・話し言葉→書き言葉の言い換え） ----------
// 単に句点を足すだけでは「編集された感」が薄いため、ここでは実際に語句を削除・置換して
// 読みやすい文章に書き直す。ただし内容を推測で書き換えることはせず、
// 「意味を持たないつなぎ言葉を削る」「話し言葉の言い回しを対応する書き言葉に変える」という
// 機械的でルールが明確な変換だけを行う（症状名の「ズキズキ」等の反復語はフィラーではないため対象外）。
const SPOKEN_FILLERS = [
  'えーっと', 'えっと', 'えーと', 'んーっと', 'んーと', 'うーんと', 'あのー', 'あの',
  'そのー', 'その', 'まぁ', 'まあ', 'なんかその', 'なんか', 'なんていうか', 'なんつーか',
  'ちょっとその', 'ちょっと', 'やっぱ', 'やっぱり', 'こう',
];
const SPOKEN_TO_WRITTEN = [
  [/なんですけど/g, 'ですが'], [/なんだけど/g, 'だが'], [/んですけど/g, 'ですが'], [/んだけど/g, 'だが'],
  [/ってゆうか|っていうか|というか/g, '、'],
  [/みたいな感じで|みたいな感じ|って感じで|って感じ/g, ''],
  [/みたいな/g, 'のような'],
  [/んですよね|んですよ|んです/g, 'です'],
  [/、+/g, '、'], // フィラー除去で連続した読点をまとめる
];
function rewriteSegments(segments) {
  const seen = [];
  segments.forEach(raw => {
    let s = raw.trim();
    if (!s) return;
    // 直前と全く同じ発言（言い直し・繰り返し）は1つにまとめる
    if (seen.length && seen[seen.length - 1] === s) return;
    seen.push(s);
  });
  const rewritten = seen.map(s => {
    let text = s;
    SPOKEN_FILLERS.forEach(f => { text = text.split(f).join(''); });
    SPOKEN_TO_WRITTEN.forEach(([pattern, to]) => { text = text.replace(pattern, to); });
    return text.replace(/^、+/, '').replace(/、+$/, '').trim();
  }).filter(Boolean);
  return rewritten.length ? rewritten.join('。') + '。' : '';
}

// ---------- 「声でそのまま伝える」音声入力（Web Speech API が使える端末のみ） ----------
// 体調が悪いと文字を打つこと自体がつらいため、話すだけで済むようにする。
// continuous + interimResults にすることで、ブラウザの音声認識エンジンが検出した「確定区間」＝自然な間ごとに
// 区切りを検出できる。その確定区間ごとにフィラー除去・話し言葉の言い換えを行ってから句点でつなぎ直す
// （内容を推測で作文するのではなく、話した語句の中から不要な部分だけを機械的に取り除く）。
// 元の書き起こし（rawSegments）は常にそのまま保持し、上書きしない。
(() => {
  const micBtn = document.getElementById('tsutaeruMicBtn');
  if (!micBtn) return;
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) { micBtn.hidden = true; return; }
  const statusEl = document.getElementById('tsutaeruMicStatus');
  const resultBox = document.getElementById('tsutaeruVoiceResult');
  const rawBox = document.getElementById('tsutaeruRawVoice');
  const cleanedBox = document.getElementById('tsutaeruCleanedVoice');
  let recognizing = false;
  let recognizer = null;
  let rawSegments = [];

  function updateBoxes(interim) {
    rawBox.value = rawSegments.join(' ');
    const rewritten = rewriteSegments(rawSegments);
    const cleaned = applyVoiceDict(rewritten);
    cleanedBox.value = cleaned;
    resultBox.hidden = rawSegments.length === 0;
    const diffEl = document.getElementById('tsutaeruVoiceDiff');
    if (diffEl) {
      const rawLen = rawBox.value.length, cleanedLen = cleaned.length;
      diffEl.textContent = rawLen ? `元: ${rawLen}文字 → 整えた文章: ${cleanedLen}文字（フィラー除去・話し言葉の言い換え・重複発言の統合を自動で行っています）` : '';
    }
    if (statusEl) statusEl.textContent = recognizing ? ('聞いています…' + (interim || '')) : (rawSegments.length ? '認識が終わりました。内容を確認してから下のボタンで反映してください' : '');
  }

  micBtn.addEventListener('click', () => {
    if (recognizing) { if (recognizer) recognizer.stop(); return; }
    rawSegments = [];
    recognizer = new SpeechRecognitionCtor();
    recognizer.lang = 'ja-JP';
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 1;
    recognizer.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) rawSegments.push(transcript);
        else interim += transcript;
      }
      updateBoxes(interim);
    };
    recognizer.onstart = () => { recognizing = true; micBtn.textContent = '⏺️ 停止する'; updateBoxes(); };
    recognizer.onend = () => { recognizing = false; micBtn.textContent = '🎙️ 話しはじめる'; updateBoxes(); };
    recognizer.onerror = (e) => {
      recognizing = false; micBtn.textContent = '🎙️ 話しはじめる';
      if (statusEl) statusEl.textContent = e.error === 'not-allowed' ? 'マイクの利用が許可されていません' : '音声認識でエラーが起きました';
    };
    recognizer.start();
  });

  document.getElementById('tsutaeruUseCleanedText').addEventListener('click', () => {
    document.getElementById('tsutaeruText').value = cleanedBox.value;
    tsutaeruAutoText = ''; // 自動生成文と異なる値にして、チップ操作で上書きされないようにする
  });

  document.getElementById('tsutaeruApplyVoiceTags').addEventListener('click', () => {
    // extractMemoKeywords（MEMO_KEYWORDS）は「いつ・どのくらい」を含まないメモ分析専用の辞書のため、
    // ここではTSUTAERU_WORDSの全グループに対して直接マッチングする
    const text = rawBox.value + ' ' + cleanedBox.value;
    const findAll = group => TSUTAERU_WORDS[group].filter(w => text.includes(w));
    ['place', 'feel', 'mind', 'body'].forEach(group => {
      findAll(group).forEach(w => {
        if (!tsutaeruState[group].includes(w)) tsutaeruState[group].push(w);
      });
    });
    const whenFound = findAll('when')[0];
    if (whenFound) tsutaeruState.when = whenFound;
    const degreeFound = findAll('degree')[0];
    if (degreeFound) tsutaeruState.degree = degreeFound;
    LS.set('tsutaeru', tsutaeruState);
    renderTsutaeru();
    regenerateTsutaeruText();
    const jump = document.getElementById('tsutaeruResultJump');
    if (jump) jump.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
})();

// ---------- 伝えた内容の軽量な履歴（「普段との比較」に使う） ----------
// 伝える文章を実際に使った（保存・コピー）タイミングだけを、つらさ(NRS)と選んだ言葉つきで記録しておく。
// これにより「今回は普段と比べてどうか」を、あなた自身の記録だけから客観的に示せるようになる。
let tsutaeruHistory = LS.get('tsutaeruHistory', []);
function logTsutaeruUsage() {
  tsutaeruHistory.push({
    date: todayKey(),
    nrs: tsutaeruState.nrs,
    place: [...tsutaeruState.place], feel: [...tsutaeruState.feel],
    mind: [...tsutaeruState.mind], body: [...tsutaeruState.body],
  });
  if (tsutaeruHistory.length > 200) tsutaeruHistory = tsutaeruHistory.slice(-200);
  LS.set('tsutaeruHistory', tsutaeruHistory);
}
// 今回のつらさ・選んだ言葉が、これまでの「伝える」利用履歴と比べてどうかを一文にする
function computeBaselineComparison() {
  if (tsutaeruHistory.length < 3) return null;
  const lines = [];
  const nrsHistory = tsutaeruHistory.filter(h => h.nrs != null).map(h => h.nrs);
  if (tsutaeruState.nrs != null && nrsHistory.length >= 3) {
    const avg = nrsHistory.reduce((a,b) => a+b, 0) / nrsHistory.length;
    const lower = nrsHistory.filter(n => n < tsutaeruState.nrs).length;
    const topPct = 100 - Math.round((lower / nrsHistory.length) * 100);
    lines.push(`【普段との比較】これまでの記録（${nrsHistory.length}件）の平均的なつらさは${avg.toFixed(1)}/10でした。今回（${tsutaeruState.nrs}/10）は、これまでの中でも上位${Math.max(1,topPct)}%程度の強さです。`);
  }
  const currentWords = [...new Set([...tsutaeruState.place, ...tsutaeruState.feel])];
  const wordCounts = currentWords.map(w => ({
    w, count: tsutaeruHistory.filter(h => [...h.place, ...h.feel].includes(w)).length,
  })).filter(x => x.count >= 2).sort((a,b) => b.count - a.count);
  if (wordCounts.length) {
    const top = wordCounts[0];
    const rate = Math.round((top.count / tsutaeruHistory.length) * 100);
    lines.push(`「${top.w}」はこれまでの記録の${rate}%（${top.count}/${tsutaeruHistory.length}件）で選ばれている、あなたにとって出やすい症状のようです。`);
  }
  return lines.length ? lines.join('\n') : null;
}
document.getElementById('tsutaeruCopy').addEventListener('click', logTsutaeruUsage);

// ---------- 結果へのジャンプボタン ----------
document.getElementById('intakeResultJump').addEventListener('click', () => {
  document.getElementById('intakeResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.getElementById('checkResultJump').addEventListener('click', () => {
  document.getElementById('checkResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.getElementById('tsutaeruResultJump').addEventListener('click', () => {
  document.getElementById('tsutaeruText').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// ---------- 表現辞典（国語辞典のように引ける「しっくりくる言葉」の辞書） ----------
// EXPRESSION_DICTはTSUTAERU_WORDS.feelより具体的・比喩的な感覚表現を部位ごとに持つ辞典。
// 問診（A1/A6/A7）は体質スコア判定用の高速チェックのまま残し、こちらは意味・使い方まで
// 引ける深掘り版として別に育てる（役割の重複を避けるため、問診側はさわらない）。
// ここで選んだ言葉は「伝える」の part（部位）・feel（感じ方）・mind（気持ち）へそのまま合流する。
let exprDictState = { search: '', cat: 'all', selected: new Set(), expanded: new Set(), openCats: new Set() };

function exprDictKey(cat, word) { return `${cat}::${word}`; }

// 国語辞典のように、カテゴリ内は見出し語の五十音順で並べる
function sortEntriesGojuon(entries) {
  return [...entries].sort((a, b) => a.w.localeCompare(b.w, 'ja'));
}

function renderExprDictCats() {
  const el = document.getElementById('exprDictCats');
  if (!el) return;
  const cats = ['all', ...Object.keys(EXPRESSION_DICT)];
  el.innerHTML = cats.map(c => {
    const label = c === 'all' ? 'すべて' : c;
    const on = exprDictState.cat === c;
    return `<label class="chip ${on ? 'on' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(label)}</label>`;
  }).join('');
  el.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      exprDictState.cat = chip.dataset.cat;
      renderExprDictCats();
      renderExprDictResults();
    });
  });
}

// 1件分を、見出し語・意味・使用例をそなえた辞書エントリー風のカードとして描画する
function exprDictEntryHtml(cat, entry) {
  const key = exprDictKey(cat, entry.w);
  const on = exprDictState.selected.has(key);
  return `<div class="dict-entry${on ? ' selected' : ''}" data-key="${escapeHtml(key)}">
    <div class="dict-head"><b class="dict-word">${escapeHtml(entry.w)}</b>${entry.common ? '<span class="dict-tag">よく使う</span>' : ''}</div>
    <p class="dict-mean">${escapeHtml(entry.mean)}</p>
    <p class="dict-ex">例：${escapeHtml(entry.ex)}</p>
  </div>`;
}

function renderExprDictResults() {
  const box = document.getElementById('exprDictResults');
  if (!box) return;
  const q = exprDictState.search.trim();
  const cats = exprDictState.cat === 'all' ? Object.keys(EXPRESSION_DICT) : [exprDictState.cat];

  if (q) {
    // 検索中はカテゴリの垣根を越えて、見出し語・意味・例文のどこかに一致した語を五十音順にまとめて出す
    const hits = [];
    cats.forEach(cat => {
      EXPRESSION_DICT[cat].forEach(entry => {
        if (cat.includes(q) || entry.w.includes(q) || entry.mean.includes(q) || entry.ex.includes(q)) hits.push({ cat, entry });
      });
    });
    hits.sort((a, b) => a.entry.w.localeCompare(b.entry.w, 'ja'));
    box.innerHTML = hits.length
      ? `<div class="card dict-list" style="padding:4px 16px 12px;">${hits.map(h => `<div class="dict-cat-tag">${escapeHtml(h.cat)}</div>${exprDictEntryHtml(h.cat, h.entry)}`).join('')}</div>`
      : `<p class="note" style="margin:12px 16px;">見つかりませんでした。別の言葉で検索してみてください。</p>`;
  } else {
    // 情報量が多くても迷わないよう、カテゴリごとに折りたたみ＋「よく使う語」を先に見せ、
    // 残りは「もっと見る」を押した人だけが広げて眺められるようにする
    box.innerHTML = cats.map(cat => {
      const sorted = sortEntriesGojuon(EXPRESSION_DICT[cat]);
      const commonEntries = sorted.filter(e => e.common);
      const isExpanded = exprDictState.expanded.has(cat);
      const shown = isExpanded ? sorted : commonEntries;
      const restCount = sorted.length - commonEntries.length;
      return `<details class="card sym" data-cat="${escapeHtml(cat)}" ${exprDictState.openCats.has(cat) ? 'open' : ''}>
        <summary><b>${escapeHtml(cat)}</b><span class="badge">${sorted.length}</span></summary>
        <div class="dict-list">${shown.map(e => exprDictEntryHtml(cat, e)).join('')}</div>
        ${!isExpanded && restCount > 0 ? `<button type="button" class="btn-link dict-more" data-cat="${escapeHtml(cat)}" style="margin:4px 16px 12px;">▼ ほかの${restCount}語も見る</button>` : ''}
      </details>`;
    }).join('');
    box.querySelectorAll('details[data-cat]').forEach(det => {
      det.addEventListener('toggle', () => {
        if (det.open) exprDictState.openCats.add(det.dataset.cat); else exprDictState.openCats.delete(det.dataset.cat);
      });
    });
    box.querySelectorAll('.dict-more').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        exprDictState.expanded.add(btn.dataset.cat);
        exprDictState.openCats.add(btn.dataset.cat);
        renderExprDictResults();
      });
    });
  }

  box.querySelectorAll('.dict-entry[data-key]').forEach(el => {
    el.addEventListener('click', () => {
      const key = el.dataset.key;
      if (exprDictState.selected.has(key)) exprDictState.selected.delete(key); else exprDictState.selected.add(key);
      el.classList.toggle('selected');
      renderExprDictActionBar();
    });
  });
  renderExprDictActionBar();
}

function renderExprDictActionBar() {
  const bar = document.getElementById('exprDictActionBar');
  const countEl = document.getElementById('exprDictSelectedCount');
  if (!bar || !countEl) return;
  const n = exprDictState.selected.size;
  bar.hidden = n === 0;
  countEl.textContent = `${n}件選択中`;
}

// 選んだ表現を「伝える」の状態に合流させ、伝えるタブへ移動する
// （「こころ」カテゴリはmindへ、それ以外は部位をplaceへ・言葉をfeelへ追加する）
function sendExprDictSelectionToTsutaeru() {
  if (!exprDictState.selected.size) return;
  const feelSet = new Set(tsutaeruState.feel);
  const placeSet = new Set(tsutaeruState.place);
  const mindSet = new Set(tsutaeruState.mind);
  exprDictState.selected.forEach(key => {
    const sep = key.indexOf('::');
    const cat = key.slice(0, sep), phrase = key.slice(sep + 2);
    if (cat === 'こころ') mindSet.add(phrase);
    else { feelSet.add(phrase); placeSet.add(cat); }
  });
  tsutaeruState.feel = [...feelSet];
  tsutaeruState.place = [...placeSet];
  tsutaeruState.mind = [...mindSet];
  LS.set('tsutaeru', tsutaeruState);
  exprDictState.selected.clear();
  renderExprDictResults();
  renderTsutaeru();
  const box = document.getElementById('tsutaeruText');
  if (box && (!box.value || box.value === tsutaeruAutoText)) regenerateTsutaeruText();
  switchTab('tsutaeru');
  if (box) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderExpressionDict() {
  renderExprDictCats();
  renderExprDictResults();
}

document.getElementById('exprDictSearch').addEventListener('input', (e) => {
  exprDictState.search = e.target.value;
  renderExprDictResults();
});
document.getElementById('exprDictSendBtn').addEventListener('click', sendExprDictSelectionToTsutaeru);
document.getElementById('tsutaeruDictJump').addEventListener('click', () => switchTab('exprdict'));

// ---------- 経過・通院（あとから思い出せない情報を残すページ） ----------
const historyMemoBox = document.getElementById('historyMemo');
if (historyMemoBox) {
  historyMemoBox.value = LS.get('historyMemo', '');
  historyMemoBox.addEventListener('input', () => { LS.set('historyMemo', historyMemoBox.value); });
}

// 「今は簡単に言えるのに、過去のことは思い出せない」を防ぐため、質問ごとに小さく区切って答えられるようにする。
// いつから・症状・変化に加えて、実際の問診で必ず聞かれる項目（きっかけ・試したこと・診断歴・服薬・生活への影響・最もつらかった時）も含めている。
const HISTORY_QUESTIONS = [
  { key: 'onset', label: 'いつから、どんなきっかけで始まりましたか?', placeholder: '例）2024年3月頃、引っ越しのストレスが重なった時期から' },
  { key: 'symptoms', label: '主な症状を教えてください', placeholder: '例）頭痛、めまい、朝起きられない' },
  { key: 'course', label: '症状はこれまでどう変化してきましたか?（良くなった／悪くなった／波がある、など）', placeholder: '例）最初の半年は月1回程度だったが、ここ3ヶ月は週2〜3回に増えている' },
  { key: 'trigger', label: '悪化・改善のきっかけに心当たりはありますか?', placeholder: '例）雨の前や生理前に悪化しやすい。休むと少し楽になる' },
  { key: 'tried', label: 'これまで試したこと・その効果', placeholder: '例）市販の頭痛薬は一時的に効くが、根本的には変わらない' },
  { key: 'diagnosis', label: '診断名・通院歴（あれば）', placeholder: '例）内科で「自律神経失調症の疑い」と言われたことがある' },
  { key: 'medication', label: '服薬・治療中のもの', placeholder: '例）◯◯（薬名）を朝夕2回、△年から継続' },
  { key: 'impact', label: '日常生活（仕事・学校・家事など）への影響', placeholder: '例）ひどい日は仕事を休むことがある（月1〜2回程度）' },
  { key: 'worst', label: '一番つらかった時のことを教えてください', placeholder: '例）2025年の夏、1週間以上起き上がれなかった' },
];
let historyQA = LS.get('historyQA', {});
function renderHistoryQuestionnaire() {
  const el = document.getElementById('historyQuestionnaire');
  if (!el) return;
  el.innerHTML = HISTORY_QUESTIONS.map(q => `
    <div class="q" style="margin:0 0 14px;">
      <label style="display:block; font-weight:600; font-size:13px; margin-bottom:6px;">${escapeHtml(q.label)}</label>
      <textarea data-hq="${q.key}" rows="2" placeholder="${escapeHtml(q.placeholder)}" style="width:100%; padding:8px; font-size:13px; border:1px solid var(--border); border-radius:8px; font-family:inherit;">${escapeHtml(historyQA[q.key] || '')}</textarea>
    </div>`).join('');
  el.querySelectorAll('[data-hq]').forEach(box => {
    box.addEventListener('input', () => {
      historyQA[box.dataset.hq] = box.value;
      LS.set('historyQA', historyQA);
    });
  });
}

function renderHospitalVisitList() {
  const el = document.getElementById('hospitalVisitList');
  if (!el) return;
  const sorted = [...hospitalDays].sort();
  if (!sorted.length) {
    el.innerHTML = '<p class="note">まだ通院日が記録されていません。カレンダーや記録フォームの「🏥 通院」で日付をマークすると、ここに一覧が表示されます。</p>';
    return;
  }
  el.innerHTML = `<ul class="rank">${sorted.map(d => {
    const dayRecords = records.filter(r => r.dateKey === d);
    const memoText = dayRecords.map(r => r.memo).filter(Boolean).join(' / ');
    return `<li><div class="rank-head"><b>${d}</b></div>${memoText ? `<p class="note">${escapeHtml(memoText)}</p>` : ''}</li>`;
  }).join('')}</ul>`;
}

// 記録に出てくる言葉ごとの出現状況（回数・全体に対する割合・月ごとの推移）を集計する共通ヘルパー
function wordOfRecord(r) {
  const words = new Set();
  if (r.memo) extractMemoKeywords(r.memo).forEach(w => words.add(w));
  if (r.tags) [...(r.tags.place || []), ...(r.tags.feel || []), ...(r.tags.mind || []), ...(r.tags.body || [])].forEach(w => words.add(w));
  return words;
}
function monthlyTrendText(sorted, word) {
  const byMonth = {};
  sorted.forEach(r => {
    const month = r.dateKey.slice(0, 7);
    const b = byMonth[month] || (byMonth[month] = { total: 0, hit: 0 });
    b.total++;
    if (wordOfRecord(r).has(word)) b.hit++;
  });
  const months = Object.keys(byMonth).sort();
  if (months.length < 2) return null;
  return months.map(m => `${m}: ${Math.round(byMonth[m].hit / byMonth[m].total * 100)}%（${byMonth[m].hit}/${byMonth[m].total}日）`).join('　');
}

// 質問への回答（本人の申告）と、記録データからの自動集計（客観的な裏付け）を組み合わせて、
// 医療者にも渡せるレベルの経過まとめを作る。回答が空の質問はまとめから省く。
function generateHistorySummary() {
  const sections = [];
  const qaFilled = HISTORY_QUESTIONS.filter(q => historyQA[q.key] && historyQA[q.key].trim());

  if (!records.length && !qaFilled.length) {
    return '記録も質問への回答もまだありません。まずは「記録」タブでの記録か、上の質問への回答から始めてみてください。';
  }

  if (qaFilled.length) {
    sections.push('■ 本人の申告');
    qaFilled.forEach(q => sections.push(`【${q.label.replace(/[?？].*$/, '')}】${historyQA[q.key].trim()}`));
  }

  if (records.length) {
    const sorted = [...records].sort((a, b) => (a.dateKey + a.time).localeCompare(b.dateKey + b.time));
    const first = sorted[0], last = sorted[sorted.length - 1];
    const spanDays = daysBetweenKeys(first.dateKey, last.dateKey);
    sections.push('■ 記録データからの裏付け');
    sections.push(`【記録期間】${first.dateKey}から記録を始め、直近は${last.dateKey}まで（約${Math.max(1, Math.round(spanDays / 30))}か月、記録${sorted.length}件）。`);

    const stats = {};
    sorted.forEach(r => { wordOfRecord(r).forEach(w => { stats[w] = (stats[w] || 0) + 1; }); });
    const topWords = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (topWords.length) sections.push(`【記録に出てくる主な言葉】${topWords.map(([w, c]) => `${w}（${c}回、記録の${Math.round(c / sorted.length * 100)}%）`).join('、')}`);

    // 症状の流れ：一番多い言葉の、月ごとの出現率の推移（増えているか減っているかが一目でわかる）
    if (topWords.length) {
      const [topWord] = topWords[0];
      const trend = monthlyTrendText(sorted, topWord);
      if (trend) sections.push(`【「${topWord}」の月ごとの推移】${trend}`);
    }

    // 直近30日 とそれ以前で気分を比較する
    const cutoff = addDaysToKey(last.dateKey, -30);
    const recent = sorted.filter(r => r.dateKey > cutoff);
    const earlier = sorted.filter(r => r.dateKey <= cutoff);
    if (recent.length >= 3 && earlier.length >= 3) {
      const moodAvg = arr => { const m = arr.filter(r => r.mood); return m.length ? m.reduce((s, r) => s + r.mood, 0) / m.length : null; };
      const recentMood = moodAvg(recent), earlierMood = moodAvg(earlier);
      if (recentMood != null && earlierMood != null) {
        const diff = recentMood - earlierMood;
        sections.push(Math.abs(diff) >= 0.3
          ? `【直近の気分の変化】直近30日間の気分は、それ以前と比べて${diff > 0 ? 'やや良い' : 'やや不調な'}傾向です（直近平均${recentMood.toFixed(1)} / 以前${earlierMood.toFixed(1)}、1=つらい〜3=元気）。`
          : `【直近の気分の変化】直近30日間の気分は、それ以前と比べて大きな変化は見られません。`);
      }
    }

    const hospitalSorted = [...hospitalDays].sort();
    if (hospitalSorted.length) {
      const intervals = [];
      for (let i = 1; i < hospitalSorted.length; i++) intervals.push(daysBetweenKeys(hospitalSorted[i - 1], hospitalSorted[i]));
      const avgInterval = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : null;
      sections.push(`【通院】記録されている通院日は${hospitalSorted.length}回（${hospitalSorted[0]}〜${hospitalSorted[hospitalSorted.length - 1]}）${avgInterval != null ? `、平均間隔は約${avgInterval.toFixed(0)}日` : ''}。`);
    }

    const avgCycle = averageCycleLength();
    if (avgCycle != null) sections.push(`【生理周期】記録された周期の平均は約${avgCycle.toFixed(0)}日です。`);

    // 気象条件との関連（分析タブ・印刷機能と同じ統計エンジンを再利用）
    const weatherStats = computePrintWeatherStats(sorted);
    if (weatherStats) {
      const meaningful = weatherStats.corrList.filter(c => c.r != null && Math.abs(c.r) >= 0.3).sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
      if (meaningful.length) sections.push(`【気象条件との関連】${corrHedgedText(meaningful[0])}`);
    }
  }

  return sections.join('\n');
}
const generateHistorySummaryBtn = document.getElementById('generateHistorySummaryBtn');
if (generateHistorySummaryBtn) {
  generateHistorySummaryBtn.addEventListener('click', () => {
    const text = generateHistorySummary();
    document.getElementById('historySummaryResult').innerHTML = `<blockquote class="memo" style="white-space:pre-wrap;">${escapeHtml(text)}</blockquote>
      <p class="note" style="margin:6px 0 0;">※ 上半分は本人の申告、下半分は記録データからの自動集計です。内容を確認し、必要に応じて上の経過メモに書き写して調整してください。</p>`;
  });
}

// ============================================================
// タイマー（時間を管理するだけでなく、今日の体調に合わせて「できる量」を無理なく区切るためのもの）
// ------------------------------------------------------------
// 一般的なPomodoroは「時間管理」が中心だが、このサイトでは「今日の自分を運用する」ことを主眼にする。
// 体調が良い日は長め、しんどい日は短め、途中でやめても失敗ではない、達成率も出さない、
// 連続記録（ストリーク）も作らない——という思想を、25分/5分という型そのものより優先する。
// 型自体に強い科学的根拠があるわけではなく、休憩は自己調整の方が疲労が少なかったという報告もある。
// 作業の合間に別の課題を挟むと持続的な注意（Vigilance）の低下が抑えられたという報告や、休憩中に
// 画面から離れて景色を眺める「柔らかい注意」が回復に役立つとする注意回復理論（ART）も踏まえている。
// ============================================================

// 登録テーマ（常設リスト）：{id, name, weight:'light'|'normal'|'heavy'}
let pomoThemes = LS.get('pomoThemes', []);
if (!Array.isArray(pomoThemes)) pomoThemes = [];
function savePomoThemes() { LS.set('pomoThemes', pomoThemes); }
const POMO_WEIGHT_LABEL = { light: '🟢 軽い', normal: '🟡 普通', heavy: '🔴 重い' };

// 今日選んだテーマ（登録テーマのidの一部・順番あり）。日をまたいでも自動では消さない（変えたければ設定で変えられる）
let pomoTodayThemeIds = LS.get('pomoTodayThemeIds', []);
if (!Array.isArray(pomoTodayThemeIds)) pomoTodayThemeIds = [];
function savePomoTodayThemeIds() { LS.set('pomoTodayThemeIds', pomoTodayThemeIds); }
let pomoTodayThemeIndex = 0; // 今日のテーマの中で今どれをやっているか（保存はしない＝開き直したら先頭から）
function pomoTodayThemes() { return pomoTodayThemeIds.map(id => pomoThemes.find(t => t.id === id)).filter(Boolean); }
function pomoCurrentTheme() { const list = pomoTodayThemes(); return list.length ? list[pomoTodayThemeIndex % list.length] : null; }
function pomoNextTheme() { const list = pomoTodayThemes(); return list.length > 1 ? list[(pomoTodayThemeIndex + 1) % list.length] : null; }

const pomoState = LS.get('pomodoro', { workMin: 25, breakMin: 5, longBreakMin: 15, cyclesUntilLongBreak: 4, preset: 'standard', chime: true, notify: true });
if (pomoState.workMin == null) pomoState.workMin = 25;
if (pomoState.breakMin == null) pomoState.breakMin = 5;
if (pomoState.longBreakMin == null) pomoState.longBreakMin = 15;
if (pomoState.cyclesUntilLongBreak == null) pomoState.cyclesUntilLongBreak = 4;
if (!pomoState.preset) pomoState.preset = 'standard';
if (pomoState.chime == null) pomoState.chime = true;
if (pomoState.notify == null) pomoState.notify = true;
function savePomoState() { LS.set('pomodoro', pomoState); }

// 体調別プリセット。「25分集中しなきゃ」というプレッシャーにならないよう、短い設定も正式なモードとして扱う
const POMO_PRESETS = {
  standard: { label: '🍅 標準', work: 25, brk: 5, longBrk: 15 },
  gentle: { label: '☁️ やさしく', work: 10, brk: 5, longBrk: 10 },
  minimal: { label: '🌱 ちょっとだけ', work: 5, brk: 3, longBrk: 5 },
  custom: { label: '⚙️ 自分で設定', work: null, brk: null, longBrk: null },
};
function pomoApplyPreset(key) {
  pomoState.preset = key;
  const p = POMO_PRESETS[key];
  if (p && p.work != null) { pomoState.workMin = p.work; pomoState.breakMin = p.brk; pomoState.longBreakMin = p.longBrk; }
  savePomoState();
  if (pomoRuntime.status !== 'running') startPomoPhase(pomoRuntime.phase);
  renderPomodoroTab();
}
// 「今日はどれくらい動けそう？」は、プリセットを強制はせず、選びやすいように寄せるだけ
const POMO_CONDITIONS = [
  { key: 'normal', label: 'いつも通り', preset: 'standard' },
  { key: 'little', label: '少ししんどい', preset: 'gentle' },
  { key: 'much', label: 'かなりしんどい', preset: 'minimal' },
  { key: 'tiny', label: 'とりあえず少しだけ', preset: 'minimal' },
];

// 今日の作業記録（テーマ別の分数）。日付が変わったら自動でリセットする
let pomoDayLog = LS.get('pomoDayLog', { dateKey: todayKey(), entries: [], moodOut: null, memo: '' });
if (pomoDayLog.dateKey !== todayKey()) pomoDayLog = { dateKey: todayKey(), entries: [], moodOut: null, memo: '' };
function savePomoDayLog() { LS.set('pomoDayLog', pomoDayLog); }
// 「達成率」は出さない。25分中7分しかできなかった、ではなく「今日は7分できた」として残す
function pomoLogMinutes(themeName, minutes) {
  if (minutes <= 0) return;
  const rounded = Math.round(minutes * 10) / 10;
  const existing = pomoDayLog.entries.find(e => e.themeName === themeName);
  if (existing) existing.minutes += rounded; else pomoDayLog.entries.push({ themeName, minutes: rounded });
  savePomoDayLog();
  pomoMarkDayActive();
}
// 「連続記録」は作らない（体調が悪い日に休むことが失敗になってしまうため）。代わりに今月できた日数だけ残す
let pomoMonthDays = LS.get('pomoMonthDays', { monthKey: todayKey().slice(0, 7), days: [] });
function pomoMarkDayActive() {
  const mk = todayKey().slice(0, 7);
  if (pomoMonthDays.monthKey !== mk) pomoMonthDays = { monthKey: mk, days: [] };
  if (!pomoMonthDays.days.includes(todayKey())) pomoMonthDays.days.push(todayKey());
  LS.set('pomoMonthDays', pomoMonthDays);
}

// 実行中の状態はあえて保存しない（タブを開き直したら停止状態から始まる想定）。
// 経過時間はブラウザタブがバックグラウンドで間引かれても正確なままにするため、
// 「残り秒数」を毎回引き算するのではなく「終了予定時刻」からの逆算で求める（一時停止中はpausedの残り秒数を保持）。
// status: idle（未開始）｜ running（計測中）｜ paused（一時停止中）
const pomoRuntime = {
  status: 'idle', phase: 'work', endTimestamp: null,
  remainingSec: pomoState.workMin * 60, totalSec: pomoState.workMin * 60, phaseStartSec: pomoState.workMin * 60,
  cycleCount: 0, timerId: null, tip: '',
};
function pomoCurrentRemaining() {
  if (pomoRuntime.status === 'running' && pomoRuntime.endTimestamp != null) {
    return Math.max(0, Math.round((pomoRuntime.endTimestamp - Date.now()) / 1000));
  }
  return pomoRuntime.remainingSec;
}
function pomoElapsedThisPhaseMin() { return Math.max(0, (pomoRuntime.phaseStartSec - pomoCurrentRemaining()) / 60); }

// 通知音の代わりに、外部ファイルを使わずWeb Audio APIで短いチャイムを鳴らす
function playPomoChime() {
  if (!pomoState.chime) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1108].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.34);
    });
  } catch { /* AudioContextが使えない環境では音なしで続行 */ }
}
function requestPomoNotifyPermission() {
  if (pomoState.notify && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
}
function notifyPomoPhase(title, body) {
  if (!pomoState.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(title, { body, icon: 'icon.svg' }); } catch { /* 通知の生成に失敗しても続行 */ }
}

// 休憩ヒントは注意回復理論（ART）寄りだが、「休憩中にも○○しなきゃ」とタスク化しないよう、
// 「何もしなくてOK」を対等な選択肢として含める
const POMO_BREAK_TIPS = [
  '画面から少し離れて、遠くや窓の外を眺めてみよう',
  '飲み物をひとくち',
  '一度立ち上がってみよう',
  '肩の力を抜いてみよう',
  '目を閉じてみよう',
  '好きな音楽を聴いてもOK',
  '何もしなくてOK',
];
function pickBreakTip() { return POMO_BREAK_TIPS[Math.floor(Math.random() * POMO_BREAK_TIPS.length)]; }

function pomoPhaseSeconds(phase) {
  if (phase === 'work') return pomoState.workMin * 60;
  if (phase === 'break') return pomoState.breakMin * 60;
  return pomoState.longBreakMin * 60;
}
function pomoPhaseLabel(phase) {
  if (phase === 'work') return '集中中';
  if (phase === 'break') return '休憩';
  return '長めの休憩';
}
function startPomoPhase(phase) {
  pomoRuntime.phase = phase;
  pomoRuntime.totalSec = pomoPhaseSeconds(phase);
  pomoRuntime.remainingSec = pomoRuntime.totalSec;
  pomoRuntime.phaseStartSec = pomoRuntime.totalSec;
  pomoRuntime.tip = phase !== 'work' ? pickBreakTip() : '';
  // 実行中に自動で次のフェーズへ移る場合は、動かしたままendTimestampだけ引き直す
  if (pomoRuntime.status === 'running') pomoRuntime.endTimestamp = Date.now() + pomoRuntime.totalSec * 1000;
  renderPomoTick();
}
// 集中フェーズが終わる（自然終了・スキップ・今日はここまで、いずれの場合も）たびに、
// 「予定していた時間」ではなく「実際にかかった時間」をそのテーマの記録として残す
function pomoFinishWorkPhase() {
  const theme = pomoCurrentTheme();
  if (theme) pomoLogMinutes(theme.name, pomoElapsedThisPhaseMin());
}
function pomoTransitionToNext() {
  if (pomoRuntime.phase === 'work') {
    pomoFinishWorkPhase();
    pomoRuntime.cycleCount++;
    playPomoChime();
    const isLong = pomoRuntime.cycleCount % pomoState.cyclesUntilLongBreak === 0;
    notifyPomoPhase(isLong ? '☁️ ここから長めの休憩' : '🍅 集中時間が終わりました', isLong ? 'いったん作業のことを離れよう' : '休憩しましょう');
    startPomoPhase(isLong ? 'longBreak' : 'break');
  } else {
    if (pomoTodayThemes().length > 1) pomoTodayThemeIndex = (pomoTodayThemeIndex + 1) % pomoTodayThemes().length;
    playPomoChime();
    const nextTheme = pomoCurrentTheme();
    notifyPomoPhase('🌱 休憩終了', nextTheme ? `次は「${nextTheme.name}」です` : '集中していきましょう');
    startPomoPhase('work');
  }
  renderPomodoroTab();
}
function pomoTick() {
  if (pomoCurrentRemaining() <= 0) { pomoTransitionToNext(); return; }
  renderPomoTick();
}
function startPomoInterval() {
  if (pomoRuntime.status === 'running') return;
  pomoRuntime.status = 'running';
  pomoRuntime.endTimestamp = Date.now() + pomoRuntime.remainingSec * 1000;
  if (!pomoRuntime.timerId) pomoRuntime.timerId = setInterval(pomoTick, 250);
  renderPomoTick();
}
// 一時停止は「残り時間をpausedRemainingとして保持するだけ」の別状態にする。
// 再開時はそこから新しい終了予定時刻を作り直すので、一時停止中にどれだけ経っても勝手には進まない
function pausePomoInterval() {
  pomoRuntime.remainingSec = pomoCurrentRemaining();
  pomoRuntime.status = 'paused';
  pomoRuntime.endTimestamp = null;
  if (pomoRuntime.timerId) { clearInterval(pomoRuntime.timerId); pomoRuntime.timerId = null; }
  renderPomoTick();
}
// 「今日はここまで」：完遂を前提にしない。押した時点までの時間を記録して、静かに終える
function pomoEndDay() {
  if (pomoRuntime.phase === 'work' && pomoRuntime.status !== 'idle') pomoFinishWorkPhase();
  pausePomoInterval();
  pomoRuntime.status = 'idle';
  pomoRuntime.cycleCount = 0;
  pomoRuntime.phase = 'work';
  pomoRuntime.totalSec = pomoPhaseSeconds('work');
  pomoRuntime.remainingSec = pomoRuntime.totalSec;
  pomoTodayThemeIndex = 0;
  renderPomodoroTab();
  renderPomoEndDayView(true);
}

function renderPomoTick() {
  const timeEl = document.getElementById('pomoTimeText');
  if (!timeEl) return; // タイマータブ未初期化時は何もしない
  const remaining = pomoCurrentRemaining();
  timeEl.textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;

  const phaseLabelEl = document.getElementById('pomoPhaseLabel');
  if (phaseLabelEl) phaseLabelEl.textContent = pomoPhaseLabel(pomoRuntime.phase) + (pomoRuntime.status === 'paused' ? '（一時停止中）' : '');

  const themeLabelEl = document.getElementById('pomoThemeLabel');
  if (themeLabelEl) { const cur = pomoCurrentTheme(); themeLabelEl.textContent = cur ? cur.name : ''; }

  const ring = document.getElementById('pomoRingFill');
  if (ring) {
    const circumference = 2 * Math.PI * 86;
    const progress = pomoRuntime.totalSec > 0 ? remaining / pomoRuntime.totalSec : 0;
    ring.setAttribute('stroke-dasharray', `${circumference}`);
    ring.setAttribute('stroke-dashoffset', `${circumference * (1 - progress)}`);
    ring.setAttribute('stroke', pomoRuntime.phase === 'work' ? 'var(--accent)' : '#7fae70');
  }

  const startBtn = document.getElementById('pomoStartPause');
  if (startBtn) startBtn.textContent = pomoRuntime.status === 'running' ? '一時停止' : (pomoRuntime.status === 'idle' ? '開始' : '再開');
}

function renderPomoConditionCard() {
  const el = document.getElementById('pomoConditionCard');
  if (!el) return;
  if (pomoRuntime.status !== 'idle') { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = `
    <label style="display:block; font-weight:600; font-size:13px; margin-bottom:8px;">今日はどれくらい動けそう？</label>
    <div class="chips" id="pomoConditionChips">
      ${POMO_CONDITIONS.map(c => `<label class="chip ${pomoState.lastCondition === c.key ? 'on' : ''}" data-cond="${c.key}" data-preset="${c.preset}">${c.label}</label>`).join('')}
    </div>
    <p class="note" style="margin:8px 0 0;">選ぶと下の時間の目安が変わります。強制ではないので、いつでも変えられます。</p>`;
  el.querySelectorAll('[data-cond]').forEach(chip => {
    chip.addEventListener('click', () => {
      pomoState.lastCondition = chip.dataset.cond;
      savePomoState();
      pomoApplyPreset(chip.dataset.preset);
    });
  });
}
function renderPomoNextThemeCard() {
  const el = document.getElementById('pomoNextThemeCard');
  if (!el) return;
  const cur = pomoCurrentTheme(), next = pomoNextTheme();
  if (!cur) { el.innerHTML = '<p class="note" style="margin:0;">テーマを登録すると、集中タイムごとに次のテーマを提案します（下の「⚙️ 設定」→「今日のテーマ」）</p>'; return; }
  el.innerHTML = `
    <p class="note" style="margin:0 0 2px;">今</p>
    <p style="margin:0 0 ${next ? '8px' : '0'}; font-weight:600;">${POMO_WEIGHT_LABEL[cur.weight] || ''} ${escapeHtml(cur.name)}</p>
    ${next ? `<p class="note" style="margin:0 0 2px;">次</p><p style="margin:0; font-weight:600;">${POMO_WEIGHT_LABEL[next.weight] || ''} ${escapeHtml(next.name)}</p>` : ''}`;
}
function renderPomoBreakTipCard() {
  const el = document.getElementById('pomoBreakTipCard');
  if (!el) return;
  if (pomoRuntime.phase === 'work') { el.hidden = true; return; }
  el.hidden = false;
  const isLong = pomoRuntime.phase === 'longBreak';
  el.innerHTML = `
    <label style="display:block; font-weight:600; font-size:13px; margin-bottom:4px;">${isLong ? '🌙 回復モード' : '☁️ 休憩中'}</label>
    <p style="margin:0;">${escapeHtml(pomoRuntime.tip)}</p>
    <p class="note" style="margin:6px 0 0;">できそうなら、くらいで大丈夫。次の準備をしなくてもOKです。</p>`;
}
function renderPomoTodayLog() {
  const el = document.getElementById('pomoTodayLogCard');
  if (!el) return;
  const total = pomoDayLog.entries.reduce((s, e) => s + e.minutes, 0);
  const fmt = m => (m % 1 ? m.toFixed(1) : String(m));
  el.innerHTML = `
    <label style="display:block; font-weight:600; font-size:13px; margin-bottom:6px;">今日の記録</label>
    ${pomoDayLog.entries.length ? `
      <ul style="list-style:none; padding:0; margin:0 0 6px;">
        ${pomoDayLog.entries.map(e => `<li style="display:flex; justify-content:space-between; font-size:13px; padding:3px 0;"><span>${escapeHtml(e.themeName)}</span><span>${fmt(e.minutes)}分</span></li>`).join('')}
      </ul>
      <p style="margin:0; font-weight:700;">合計　${fmt(total)}分</p>
    ` : `<p class="note" style="margin:0;">まだ今日の記録はありません</p>`}
    <p class="note" style="margin:8px 0 0;">今月、取り組んだ日：${pomoMonthDays.days.length}日</p>`;
}
function renderPomoEndDayView(show) {
  const timerView = document.getElementById('pomoTimerView');
  const endView = document.getElementById('pomoEndDayView');
  if (!timerView || !endView) return;
  if (!show) { timerView.hidden = false; endView.hidden = true; return; }
  timerView.hidden = true;
  endView.hidden = false;
  const total = pomoDayLog.entries.reduce((s, e) => s + e.minutes, 0);
  const fmt = m => (m % 1 ? m.toFixed(1) : String(m));
  endView.innerHTML = `
    <p style="font-size:17px; font-weight:700; margin:0 0 4px;">🌙 今日の作業を終了しました</p>
    <p class="note" style="margin:0 0 14px;">今日はここまででOK。次はここから続けられます。</p>
    <p class="note" style="margin:0 0 4px;">作業した時間</p>
    <p style="font-size:26px; font-weight:700; margin:0 0 14px;">${fmt(total)}分</p>
    ${pomoDayLog.entries.length ? `<ul style="list-style:none; padding:0; margin:0 0 14px; text-align:left; display:inline-block;">${pomoDayLog.entries.map(e => `<li style="font-size:13px; margin-bottom:4px;">${escapeHtml(e.themeName)}　${fmt(e.minutes)}分</li>`).join('')}</ul>` : ''}
    <p class="note" style="margin:0 0 8px;">今日の感覚は？</p>
    <div class="mood-picker" id="pomoMoodOutPicker" style="justify-content:center; margin-bottom:10px;">
      <button type="button" class="mood-btn ${pomoDayLog.moodOut === 'good' ? 'on' : ''}" data-mood="good">😽<span>できた</span></button>
      <button type="button" class="mood-btn ${pomoDayLog.moodOut === 'mid' ? 'on' : ''}" data-mood="mid">🐱<span>まあまあ</span></button>
      <button type="button" class="mood-btn ${pomoDayLog.moodOut === 'hard' ? 'on' : ''}" data-mood="hard">😿<span>しんどかった</span></button>
    </div>
    <textarea id="pomoEndMemo" rows="2" placeholder="メモ（任意）" style="width:100%; padding:8px; font-size:13px; border:1px solid var(--border); border-radius:8px; font-family:inherit; margin-bottom:10px;">${escapeHtml(pomoDayLog.memo || '')}</textarea>
    <button type="button" class="btn-sub" id="pomoBackToTimerBtn" style="font-size:12px;">続ける</button>`;
  endView.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      pomoDayLog.moodOut = btn.dataset.mood;
      savePomoDayLog();
      endView.querySelectorAll('.mood-btn').forEach(b => b.classList.toggle('on', b === btn));
    });
  });
  const memoEl = document.getElementById('pomoEndMemo');
  if (memoEl) memoEl.addEventListener('change', () => { pomoDayLog.memo = memoEl.value.trim(); savePomoDayLog(); });
  const backBtn = document.getElementById('pomoBackToTimerBtn');
  if (backBtn) backBtn.addEventListener('click', () => renderPomoEndDayView(false));
}

function renderPomoPresetChips() {
  const el = document.getElementById('pomoPresetChips');
  if (!el) return;
  el.innerHTML = Object.entries(POMO_PRESETS).map(([key, p]) => `<label class="chip ${pomoState.preset === key ? 'on' : ''}" data-preset-key="${key}">${p.label}</label>`).join('');
  el.querySelectorAll('[data-preset-key]').forEach(chip => {
    chip.addEventListener('click', () => pomoApplyPreset(chip.dataset.presetKey));
  });
  const customWrap = document.getElementById('pomoCustomTimeFields');
  if (customWrap) {
    customWrap.hidden = pomoState.preset !== 'custom';
    if (pomoState.preset === 'custom') {
      customWrap.innerHTML = `
        <div class="q" style="margin:0;"><label>集中（分）</label><input type="number" id="pomoWorkMin" min="3" max="90" value="${pomoState.workMin}" style="width:70px; padding:8px; font-size:13px; border:1px solid var(--border); border-radius:8px; font-family:inherit;" /></div>
        <div class="q" style="margin:0;"><label>休憩（分）</label><input type="number" id="pomoBreakMin" min="1" max="60" value="${pomoState.breakMin}" style="width:70px; padding:8px; font-size:13px; border:1px solid var(--border); border-radius:8px; font-family:inherit;" /></div>
        <div class="q" style="margin:0;"><label>長い休憩（分）</label><input type="number" id="pomoLongBreakMin" min="1" max="60" value="${pomoState.longBreakMin}" style="width:70px; padding:8px; font-size:13px; border:1px solid var(--border); border-radius:8px; font-family:inherit;" /></div>`;
      ['pomoWorkMin', 'pomoBreakMin', 'pomoLongBreakMin'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
          pomoState.workMin = Math.max(3, Math.min(90, Number(document.getElementById('pomoWorkMin').value) || 25));
          pomoState.breakMin = Math.max(1, Math.min(60, Number(document.getElementById('pomoBreakMin').value) || 5));
          pomoState.longBreakMin = Math.max(1, Math.min(60, Number(document.getElementById('pomoLongBreakMin').value) || 15));
          savePomoState();
          if (pomoRuntime.status !== 'running') startPomoPhase(pomoRuntime.phase);
          renderPomoPresetChips();
        });
      });
    }
  }
  const noteEl = document.getElementById('pomoPresetNote');
  if (noteEl) noteEl.textContent = `${pomoState.workMin}分 → ${pomoState.breakMin}分 の繰り返し（${pomoState.cyclesUntilLongBreak}回ごとに${pomoState.longBreakMin}分の長め休憩）。型そのものに強い科学的根拠があるわけではないので、合う長さに調整してください。`;
}
function renderPomoTodayThemePicker() {
  const el = document.getElementById('pomoTodayThemePicker');
  if (!el) return;
  if (!pomoThemes.length) { el.innerHTML = '<span class="note">まず下の「登録テーマ」に追加してください</span>'; return; }
  el.innerHTML = pomoThemes.map(t => `<label class="chip ${pomoTodayThemeIds.includes(t.id) ? 'on' : ''}" data-today-id="${escapeHtml(t.id)}">${escapeHtml(t.name)}</label>`).join('');
  el.querySelectorAll('[data-today-id]').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.todayId;
      if (pomoTodayThemeIds.includes(id)) pomoTodayThemeIds = pomoTodayThemeIds.filter(x => x !== id);
      else pomoTodayThemeIds.push(id);
      savePomoTodayThemeIds();
      pomoTodayThemeIndex = 0;
      renderPomodoroTab();
    });
  });
}
function renderPomoThemeList() {
  const el = document.getElementById('pomoThemeList');
  if (!el) return;
  if (!pomoThemes.length) { el.innerHTML = '<p class="note">まだ登録がありません</p>'; return; }
  el.innerHTML = pomoThemes.map(t => `
    <div style="display:flex; align-items:center; gap:8px; padding:6px 0; border-top:1px dashed var(--border);">
      <span style="flex:1; font-size:13px;">${escapeHtml(t.name)}</span>
      <span class="note" style="font-size:11px;">${POMO_WEIGHT_LABEL[t.weight] || ''}</span>
      <button type="button" class="btn-link no-print" data-del-theme="${escapeHtml(t.id)}" style="font-size:11px;">✕</button>
    </div>`).join('');
  el.querySelectorAll('[data-del-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.delTheme;
      pomoThemes = pomoThemes.filter(t => t.id !== id);
      pomoTodayThemeIds = pomoTodayThemeIds.filter(x => x !== id);
      savePomoThemes(); savePomoTodayThemeIds();
      pomoTodayThemeIndex = 0;
      renderPomodoroTab();
    });
  });
}
function renderPomoToggles() {
  const chimeEl = document.getElementById('pomoChimeToggle');
  const notifyEl = document.getElementById('pomoNotifyToggle');
  if (chimeEl) chimeEl.classList.toggle('on', pomoState.chime);
  if (notifyEl) notifyEl.classList.toggle('on', pomoState.notify);
}
function renderPomodoroTab() {
  renderPomoTick();
  renderPomoConditionCard();
  renderPomoNextThemeCard();
  renderPomoBreakTipCard();
  renderPomoTodayLog();
  renderPomoPresetChips();
  renderPomoTodayThemePicker();
  renderPomoThemeList();
  renderPomoToggles();
}

document.getElementById('pomoStartPause').addEventListener('click', () => {
  requestPomoNotifyPermission();
  if (pomoRuntime.status === 'running') pausePomoInterval(); else startPomoInterval();
  renderPomodoroTab();
});
document.getElementById('pomoReset').addEventListener('click', () => {
  pausePomoInterval();
  pomoRuntime.status = 'idle';
  pomoRuntime.cycleCount = 0;
  pomoTodayThemeIndex = 0;
  startPomoPhase('work');
  renderPomodoroTab();
});
document.getElementById('pomoSkip').addEventListener('click', () => pomoTransitionToNext());
document.getElementById('pomoEndDayBtn').addEventListener('click', () => pomoEndDay());
document.getElementById('pomoThemeAddBtn').addEventListener('click', () => {
  const nameEl = document.getElementById('pomoThemeNameInput');
  const weightEl = document.getElementById('pomoThemeWeightInput');
  const name = nameEl.value.trim();
  if (!name) return;
  pomoThemes.push({ id: 't' + Date.now(), name, weight: weightEl.value });
  savePomoThemes();
  nameEl.value = '';
  renderPomodoroTab();
});
document.getElementById('pomoThemeNameInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('pomoThemeAddBtn').click(); }
});
document.getElementById('pomoChimeToggle').addEventListener('click', () => { pomoState.chime = !pomoState.chime; savePomoState(); renderPomoToggles(); });
document.getElementById('pomoNotifyToggle').addEventListener('click', () => {
  pomoState.notify = !pomoState.notify;
  savePomoState();
  if (pomoState.notify) requestPomoNotifyPermission();
  renderPomoToggles();
});

// ============================================================
// ことばのおまもり（旧：伝える練習／言い返しトレーニング）
// ------------------------------------------------------------
// 「わかった気になって一方的に決めつけてくる相手」に、自分の認識を手放さずに言葉を返す練習。
// 目的は3つ：①その場で返す ②自分の状態を説明する ③会話を終わらせる・境界線を引く。
// 「正しい返答を教える」のではなく「自分の認識を手放さずに会話する練習をする」という位置づけなので、
// 評価は「言い負かせたか」ではなく「自分を守れたか」にする（下のチェックリスト）。
// データを引用できる項目は、分析タブと同じ集計ロジック・チャート部品をそのまま再利用し、
// この機能のためだけの新しい統計は作らない。「医学的に証明された」とは言わず、あくまで本人の記録の傾向として出す。
// ============================================================
const TS_ITEMS = [
  { id: 'kinosei', line: '気のせいじゃない？', audience: ['家族', '友達'], dataKey: 'pressureChange3h',
    quick: 'うーん、私はそうは思ってないかな',
    explain: { soft: 'そう見えるかもしれないけど、私は影響を感じてるかな', neutral: '私も最初は気のせいかなって思ってたけど、そうじゃなかったみたい', firm: '気のせいだけでは片付けにくいかな。実際に困ってることだから、そこは分けて考えてほしいな' },
    boundary: 'そう思うのは自由だけど、私は自分の体調をそういうふうには考えてないかな' },
  { id: 'minna', line: 'みんな疲れるよ', audience: ['家族', '友達', '職場'], dataKey: null,
    quick: '疲れることはあるよね',
    explain: { soft: 'そうだよね。ただ、私の場合はちょっと程度が違うかな', neutral: '疲れること自体は分かってるよ。でも、私の場合は生活に影響するくらいになることがあるんだ', firm: '同じ「疲れ」でも、できることがかなり変わるんだ。そこは分けて考えてもらえるとうれしいな' },
    boundary: 'みんなが疲れることと、私が今困ってることは別かな' },
  { id: 'joukyou', line: '今の状況わかってる？', audience: ['家族', '友達', '職場', '先生'], dataKey: null,
    quick: '分かってるよ',
    explain: { soft: '自分でもどういう状態なのか、ちゃんと把握しようとしてるよ', neutral: '自分でも考えてるよ。何も考えずに過ごしてるわけじゃないんだ', firm: '誰よりも自分がこの状態と向き合ってるから、分かってないなんてことはないよ' },
    boundary: '自分のことだから、自分でもちゃんと考えてる。そこは任せてほしいな' },
  { id: 'itsunaoru', line: 'いつなおるの？', audience: ['家族', '友達', '職場', '先生', '医療関係者'], dataKey: null,
    quick: '私もいつか知りたいな',
    explain: { soft: 'いつまでって、今ははっきり分からないみたい', neutral: '治る時期を決められる感じではなくて、今は体調を見ながら過ごしてる', firm: 'いつ治るかは分からないから、今できることを考えてるんだ' },
    boundary: 'いつ治るかを聞かれるとちょっと焦るから、今どう過ごすかの話をしてもらえると助かるな' },
  { id: 'undou', line: '運動したほうがいいよ', audience: ['家族', '友達', '職場'], dataKey: null,
    quick: 'できるときはやってるよ',
    explain: { soft: 'ありがとう。今は無理しない範囲でやってるよ', neutral: '運動したほうがいいのは分かってる。でも、体調によってできる量が違うんだ', firm: '運動すれば解決する、という感じではないんだ' },
    boundary: 'そこは体調を見ながら自分で決めたいな' },
  { id: 'byouin', line: '病院行けば？', audience: ['家族', '友達', '職場'], dataKey: null,
    quick: 'そこは考えてるよ',
    explain: { soft: 'そうだよね。病院にも相談してるよ', neutral: '病院には相談してるけど、すぐ原因が分かるものでもないみたいで、今は記録もしながら様子を見てるところかな', firm: '病院に行くことと、毎日の体調をどう過ごすかは別の問題かな。そこも自分で工夫してるよ' },
    boundary: 'そこはもう考えてるから、今は別のことを相談してもらえるとうれしいな' },
  { id: 'kangaesugi', line: '考えすぎじゃない？', audience: ['家族', '友達'], dataKey: 'pressureChange3h',
    quick: 'そう見えるかもしれないけど、ちょっと違うかな',
    explain: { soft: '考えすぎに見えるかもしれないけど、私の中では大事なことだから、続けさせてほしいな', neutral: '気にしすぎというより、自分なりに向き合ってる感じかな', firm: '考えすぎじゃなくて、私にとっては必要なことなんだ' },
    boundary: '心配してくれてありがとう。でも、これは私にとって大事なことだから、続けさせてほしいな' },
  { id: 'gakkou', line: '学校くらい行けるでしょ', audience: ['先生', '学校関係者', '家族'], dataKey: null,
    quick: '行けたら行きたいんだけどな',
    explain: { soft: '行きたい気持ちはあるよ。ただ、その日の体調でかなり変わるかな', neutral: '行ける日もあるけど、同じように過ごせない日もあるんだ', firm: 'その日の体調を見て判断させてもらえるとうれしいな' },
    boundary: '「行ける・行けない」を一日単位で決めつけずに、その日の状態を見てもらいたいな' },
  { id: 'genkisou', line: '元気そうに見えるけど', audience: ['家族', '友達', '職場', '先生'], dataKey: null,
    quick: 'そう見えるよね〜',
    explain: { soft: '見た目には出にくいんだよね', neutral: '元気そうに見えても、その日の体調は結構違うかな', firm: '普通に話せるときでも、ずっと元気というわけではないんだ' },
    boundary: '見た目だけでは分からない部分だから、しんどいって言ったときは信じてもらえるとうれしいな' },
  { id: 'wakai', line: '若いんだから大丈夫でしょ', audience: ['家族', '友達', '医療関係者'], dataKey: null,
    quick: '若さは、あんまり関係ないみたい',
    explain: { soft: '若いから大丈夫とは限らないみたいで、実際にできないことがあるんだ', neutral: '年齢と体調は、必ずしも一致しないみたいだよ', firm: '若さは理由にならないよ。実際に困ってることがあるんだ' },
    boundary: 'そう言われる気持ちも分かるけど、今のつらさは今のつらさとして聞いてもらえるとうれしいな' },
  { id: 'sabori', line: 'サボりたいだけなんじゃないの？', audience: ['職場', '学校関係者'], dataKey: 'pressureChange3h',
    quick: 'サボりたいわけじゃないよ',
    explain: { soft: 'できるなら普通にやりたいかな', neutral: 'やりたくないというより、やりたいけど体がついてこない感じかな', firm: 'できることなら今まで通りやりたいよ。でも、体調によってできる量が変わるんだ' },
    boundary: 'やる気があるかどうかと、今できるかどうかは別かな' },
  { id: 'mukashi', line: '前は普通にできてたじゃん', audience: ['家族', '友達'], dataKey: null,
    quick: 'そうなんだけど、今は違うんだ',
    explain: { soft: '私も前みたいにできたらいいんだけどね', neutral: '前はできてたけど、今は体調によってできることが変わるみたい', firm: '前にできたことだけで、今できるかは判断しないでほしいな' },
    boundary: '前の自分と比べられるより、今の状態を見てもらえるとうれしいな' },
  { id: 'kensa', line: '検査したら異常なかったんでしょ？', audience: ['家族', '職場', '医療関係者'], dataKey: null,
    quick: '検査には映らないタイプみたいなんだ',
    explain: { soft: '検査だと分かりにくいタイプの不調らしくて、ちょっと伝わりにくいんだよね', neutral: 'この手の不調は、まだ検査や研究自体があまり進んでないみたいで、「異常なし」が「平気」とは限らないんだ', firm: '検査に映らないだけで、しんどいことは事実としてあるんだ' },
    boundary: '検査の結果と、実際の体調は別の話として聞いてもらえるとうれしいな' },
  { id: 'amae', line: '甘えてるだけなんじゃないの？', audience: ['家族', '職場', '学校関係者'], dataKey: null,
    quick: '甘えたいわけじゃないよ',
    explain: { soft: '自分でもできるようになりたいとは思ってるよ', neutral: 'やりたい気持ちはあるけど、体調がついてこないことがあるんだ', firm: 'やる気がないわけじゃないよ' },
    boundary: '甘えって言われるとつらいから、その言い方はやめてほしいな' },
  { id: 'kimochiyou', line: '気の持ちようだよ', audience: ['家族', '友達', '職場'], dataKey: null,
    quick: '気持ちだけではどうにもならないこともあるよ',
    explain: { soft: '前向きにはなりたいけど、それだけで体調が変わるわけじゃないんだ', neutral: '気持ちの問題だけじゃなくて、身体の調子も関係してると思ってる', firm: '気の持ちようだけで片付けられることじゃないから' },
    boundary: '前向きになれって言われるより、今の状態をそのまま聞いてもらえると助かるな' },
  { id: 'minna_sonna', line: 'みんなそんなもんだよ', audience: ['家族', '友達', '職場'], dataKey: null,
    quick: 'そういうこともあるよね',
    explain: { soft: 'そうだよね。でも、私の場合はちょっと困るくらいなんだ', neutral: 'みんなにもあることなのは分かってるよ。ただ、程度がかなり違うかな', firm: '同じようなことでも、生活への影響は人によって違うと思うな' },
    boundary: 'みんなにあることだからって、私も大丈夫とは限らないかな' },
  { id: 'yamaikara', line: '病は気からだよ', audience: ['家族', '友達', '職場'], dataKey: null,
    quick: '気持ちは大事だよね',
    explain: { soft: '前向きでいたいとは思ってるよ', neutral: '気持ちで変わる部分もあると思うけど、体のつらさまで全部それで説明するのは難しいかな', firm: 'できるだけ前向きに過ごしてるよ。それでも体調が悪くなることはあるかな' },
    boundary: '気持ちの問題だけとして扱われると、ちょっと違うかな' },
  { id: 'dekiru_hanni', line: '無理しなくていいから、できることはやろう', audience: ['家族', '友達'], dataKey: null,
    quick: 'うん、できる範囲ではやってるよ',
    explain: { soft: 'できることはやりたいと思ってるよ', neutral: 'ありがとう。でも、その「できる範囲」も日によってかなり変わるんだ', firm: 'できることを増やすより、まず今できる量に合わせてもらえるとうれしいな' },
    boundary: '無理しないことも必要だから、その日の状態を見て決めたいかな' },
  { id: 'muri_demo_dekiru', line: '無理しなくていいよ。でも○○はできるよね？', audience: ['家族', '友達', '職場'], dataKey: null,
    quick: '無理しない範囲で考えたいな',
    explain: { soft: 'できることならやりたいんだけど、その日の体調を見て決めるしかできない身体なの', neutral: '無理しなくていいと言ってくれてありがとう。ただ、できるかどうかは体調次第なんだ', firm: '無理しないでと言われたあとに、できるよねと言われると、結局無理しなきゃいけない感じだよね' },
    boundary: '今は「できる前提」ではなく、その日の状態を見て判断させてもらえると助かるな' },
  { id: 'muri_ganbarou', line: '無理しないでね。でも、頑張ろう！', audience: ['家族', '友達', '職場', '学校関係者'], dataKey: null,
    quick: 'できる範囲でやるね',
    explain: { soft: 'ありがとう。頑張りすぎないようにするね', neutral: '頑張ることより、できる範囲でやりたいな', firm: '今は頑張る量を増やすより、無理しないことを優先したいんだ' },
    boundary: '応援してもらえるのはうれしいけど、頑張ることを前提にされるとちょっときついかな' },
  { id: 'dekiterujan', line: 'でも○○はできてるじゃん', audience: ['家族', '友達', '職場'], dataKey: null,
    quick: 'できることもあるよ',
    explain: { soft: 'できることはできるんだけど、それ以外ができないこともあるんだ', neutral: '一つできたからって、全部できるわけではないみたい', firm: 'できたことだけで、全部を判断しないでほしい' },
    boundary: 'できたことも含めて、今の自分を見てほしいな' },
  { id: 'kinishisugi', line: '気にしすぎるから余計に悪くなるんじゃない？', audience: ['家族', '友達'], dataKey: null,
    quick: 'そうかな〜？',
    explain: { soft: '気にしすぎないようにはしてるよ〜', neutral: '気にしすぎてないよ〜', firm: '自分のことだから必要以上に気にしなくて大丈夫' },
    boundary: 'その話をすると自分のせいみたいに感じるから、今はそこを責めないでほしいな' },
  { id: 'futsuha', line: '普通は○○するでしょ', audience: ['家族', '友達', '職場', '学校関係者'], dataKey: null,
    quick: '普通ができない日もあるんだ',
    explain: { soft: 'そうするのが普通なのは分かってるよ', neutral: '普通ならできることでも、今は難しいことがあるんだ', firm: '今の自分は普通じゃないから' },
    boundary: '普通がどうかより、今の自分がどうできるかで考えさせてくれると助かるな' },
  { id: 'ganbareba', line: '頑張ればできるんじゃない？', audience: ['家族', '友達', '職場', '学校関係者'], dataKey: null,
    quick: '頑張ればできる、という感じでもないみたい',
    explain: { soft: '私もできるならやりたいんだけど、頑張るだけではどうにもならないことがあるんだ', neutral: '頑張ればできる日もあるけど、その分あとで動けなくなることもあるから、調整してるんだ', firm: '頑張る量を増やせばいいわけじゃないから' },
    boundary: 'どこまで頑張るかは、自分の体調を見て決めたいな' },
];
const TS_AUDIENCES = ['家族', '友達', '職場', '先生', '医療関係者', '学校関係者', 'その他'];
const TS_CHECKLIST_LABELS = ['自分の状態を否定しなかった', '相手の意見と自分の認識を分けられた', '自分の希望を伝えられた', '必要以上に説明しなかった', '会話を終わらせられた'];

let tsCustom = LS.get('tsCustom', []);
if (!Array.isArray(tsCustom)) tsCustom = [];
function saveTsCustom() { LS.set('tsCustom', tsCustom); }
function tsAllPhraseItems() { return [...TS_ITEMS, ...tsCustom]; }
function tsItemQuickText(it) { return it.custom ? (it.next || it.wanted || '（まだ考え中）') : it.quick; }

let tsArmorIds = LS.get('tsArmorIds', []);
if (!Array.isArray(tsArmorIds)) tsArmorIds = [];
function saveTsArmor() { LS.set('tsArmorIds', tsArmorIds); }

// 「今日できたこと」は日付が変わると空にリセットされていた＝実質その場かぎりで保存されて
// いなかった。日付が変わる瞬間に、チェックが1つでも入っていれば過去ログへ残してから
// リセットするようにして、記録として保存され続けるようにする
let tsChecklistLog = LS.get('tsChecklistLog', []); // [{dateKey, checked}]
function saveTsChecklistLog() { LS.set('tsChecklistLog', tsChecklistLog); }
let tsChecklist = LS.get('tsChecklist', { dateKey: todayKey(), checked: [false, false, false, false, false], pointAwarded: false });
if (tsChecklist.dateKey !== todayKey()) {
  if (tsChecklist.checked.some(Boolean)) {
    tsChecklistLog.push({ dateKey: tsChecklist.dateKey, checked: tsChecklist.checked });
    if (tsChecklistLog.length > 200) tsChecklistLog = tsChecklistLog.slice(-200);
    saveTsChecklistLog();
  }
  tsChecklist = { dateKey: todayKey(), checked: [false, false, false, false, false], pointAwarded: false };
}
function saveTsChecklist() { LS.set('tsChecklist', tsChecklist); }

let tsCoreMessages = LS.get('tsCoreMessages', ['', '', '']);
if (!Array.isArray(tsCoreMessages) || tsCoreMessages.length !== 3) tsCoreMessages = ['', '', ''];
function saveTsCoreMessages() { LS.set('tsCoreMessages', tsCoreMessages); }

let tsMode = 'quick';
let tsAudienceFilter = 'all';
let tsSearchQuery = '';
let tsSelectedId = null;
let tsToneLevel = 1;
let tsNewCouldnt = false;
let tsNewAudienceSelected = null;

// ---------- 今日の武装 ----------
function tsAddToArmor(id) {
  if (tsArmorIds.includes(id)) return;
  if (tsArmorIds.length >= 3) tsArmorIds.shift();
  tsArmorIds.push(id);
  saveTsArmor();
  renderTsArmorCard();
  renderTsArmorPicker();
}
function tsRemoveFromArmor(id) {
  tsArmorIds = tsArmorIds.filter(x => x !== id);
  saveTsArmor();
  renderTsArmorCard();
  renderTsArmorPicker();
}
function renderTsArmorCard() {
  const el = document.getElementById('tsArmorCard');
  if (!el) return;
  const items = tsArmorIds.map(id => tsAllPhraseItems().find(it => it.id === id)).filter(Boolean);
  if (!items.length) {
    el.innerHTML = `<label style="display:block; font-weight:600; font-size:13px; margin-bottom:4px;">🛡️ 今日の武装</label><p class="note" style="margin:0;">まだ何も選んでいません。「ことばを備える」から、今日困りそうな一言を3つまで選んでおけます。</p>`;
    return;
  }
  el.innerHTML = `
    <label style="display:block; font-weight:600; font-size:13px; margin-bottom:8px;">🛡️ 今日の武装</label>
    <ul style="margin:0; padding:0; list-style:none;">
      ${items.map((it, i) => `<li style="${i < items.length - 1 ? 'margin-bottom:10px;' : ''}"><b>${i + 1}. ${escapeHtml(it.line)}</b><p class="note" style="margin:4px 0 0;">→ ${escapeHtml(tsItemQuickText(it))}</p></li>`).join('')}
    </ul>`;
}
function renderTsArmorPicker() {
  const el = document.getElementById('tsArmorPicker');
  if (!el) return;
  el.innerHTML = tsAllPhraseItems().map(it => `<label class="chip ${tsArmorIds.includes(it.id) ? 'on' : ''}" data-armor-id="${escapeHtml(it.id)}">${escapeHtml(it.line)}</label>`).join('');
  el.querySelectorAll('[data-armor-id]').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.armorId;
      if (tsArmorIds.includes(id)) tsRemoveFromArmor(id); else tsAddToArmor(id);
    });
  });
}

// ---------- 今日できたこと（言い負かせたかではなく、自分を守れたかを見る） ----------
function renderTsChecklistCard() {
  const el = document.getElementById('tsChecklistCard');
  if (!el) return;
  el.innerHTML = `
    <label style="display:block; font-weight:600; font-size:13px; margin-bottom:8px;">✅ 今日できたこと</label>
    ${TS_CHECKLIST_LABELS.map((label, i) => `
      <label class="chip ${tsChecklist.checked[i] ? 'on' : ''}" data-check-idx="${i}" style="display:flex; align-items:center; gap:6px; width:100%; margin-bottom:6px;">
        <span>${tsChecklist.checked[i] ? '☑' : '☐'}</span>${label}
      </label>`).join('')}
    <p class="note" style="margin:6px 0 0;">「うまく言い返せたか」ではなく「自分を守れたか」で見る記録です。</p>
    ${tsChecklistLog.length ? `<p class="note" style="margin:4px 0 0;">これまでに${tsChecklistLog.length}日分、記録が残っています。</p>` : ''}`;
  el.querySelectorAll('[data-check-idx]').forEach(chip => {
    chip.addEventListener('click', () => {
      const idx = Number(chip.dataset.checkIdx);
      tsChecklist.checked[idx] = !tsChecklist.checked[idx];
      // 何か1つでもチェックが入った日は、1日1回だけがんばったねポイントを贈る
      if (!tsChecklist.pointAwarded && tsChecklist.checked.some(Boolean) && typeof addGanbattaPoints === 'function') {
        tsChecklist.pointAwarded = true;
        addGanbattaPoints(1, 'ts-checklist', '今日できたことを記録した', tsChecklist.dateKey);
      }
      saveTsChecklist();
      renderTsChecklistCard();
    });
  });
}

// ---------- 言えなかったことの復習バナー（6〜10日後に、もう一度練習しませんかと出す） ----------
function renderTsReviewBanner() {
  const el = document.getElementById('tsReviewBanner');
  if (!el) return;
  const now = Date.now();
  const due = tsCustom.filter(c => c.couldntSay && !c.reviewed && (now - c.createdAt) >= 6 * 86400000 && (now - c.createdAt) <= 10 * 86400000);
  if (!due.length) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `
    <p style="margin:0 0 6px; font-weight:600; font-size:13px;">📖 ${due.length}件、もう一度練習してみますか？</p>
    <p class="note" style="margin:0 0 8px;">${due.map(d => `「${escapeHtml(d.line)}」`).join('　')}</p>
    <button type="button" class="btn-sub no-print" id="tsReviewBtn">練習する</button>
    <button type="button" class="btn-link no-print" id="tsReviewDismiss" style="margin-left:8px;">今回はスキップ</button>`;
  document.getElementById('tsReviewBtn').addEventListener('click', () => {
    due.forEach(d => d.reviewed = true);
    saveTsCustom();
    el.hidden = true;
    tsSwitchMode('practice');
  });
  document.getElementById('tsReviewDismiss').addEventListener('click', () => {
    due.forEach(d => d.reviewed = true);
    saveTsCustom();
    el.hidden = true;
  });
}

// ---------- ⚡今すぐ返す／🛡️しっかり伝える：検索して選ぶ＋詳細パネル ----------
function tsFilteredItems() {
  const q = tsSearchQuery.trim();
  return tsAllPhraseItems().filter(it => {
    if (tsAudienceFilter !== 'all' && !(it.audience || []).includes(tsAudienceFilter)) return false;
    if (q && !it.line.includes(q)) return false;
    return true;
  });
}
function renderTsAudienceFilter() {
  const el = document.getElementById('tsAudienceFilter');
  if (!el) return;
  const opts = ['すべて', ...TS_AUDIENCES];
  el.innerHTML = opts.map(a => {
    const val = a === 'すべて' ? 'all' : a;
    return `<label class="chip ${tsAudienceFilter === val ? 'on' : ''}" data-af="${escapeHtml(val)}">${escapeHtml(a)}</label>`;
  }).join('');
  el.querySelectorAll('[data-af]').forEach(chip => {
    chip.addEventListener('click', () => {
      tsAudienceFilter = chip.dataset.af;
      renderTsAudienceFilter();
      renderTsPhraseList();
    });
  });
}
function renderTsPhraseList() {
  const el = document.getElementById('tsPhraseList');
  if (!el) return;
  const items = tsFilteredItems();
  if (!items.length) { el.innerHTML = '<span class="note">見つかりませんでした。「ことばを備える」から自分の言葉を追加できます</span>'; return; }
  el.innerHTML = items.map(it => `<label class="chip ${tsSelectedId === it.id ? 'on' : ''}" data-id="${escapeHtml(it.id)}">${escapeHtml(it.line)}</label>`).join('');
  el.querySelectorAll('[data-id]').forEach(chip => {
    chip.addEventListener('click', () => selectTsItem(chip.dataset.id));
  });
}
function selectTsItem(id) {
  tsSelectedId = id;
  tsToneLevel = 1;
  renderTsPhraseList();
  renderTsDetail();
  // 言葉の一覧は長いため、選んだ直後に返し方のパネルが画面外のままにならないよう表示位置まで送る
  const wrap = document.getElementById('tsDetailWrap');
  if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function tsQuickLogCouldntSay(item) {
  // custom:true にしないと、一覧・詳細パネルの表示分岐（quick/explain/boundaryを持つ組み込み項目か、
  // wanted/nextだけを持つ自作項目か）が崩れて undefined を escapeHtml に渡すことになるため必ず true にする
  tsCustom.push({ id: 'c' + Date.now(), line: item.line, custom: true, linkedId: item.id, couldntSay: true, wanted: '', next: '', audience: item.audience || [], createdAt: Date.now(), reviewed: false });
  saveTsCustom();
  const btn = document.getElementById('tsCouldntSayBtn');
  if (btn) { btn.textContent = '登録しました'; btn.disabled = true; }
}
// 「言えた」を、できたことアルバムの記録として残す。既存のdekitaLogの仕組み（褒め方・
// がんばったねポイント・マスコットの反応）をそのまま使う。テキストに「言えた」を含めているため
// classifyDekitaText側の分類でも自然に'told'（伝えられた）に入る
function tsQuickLogSaidIt(item) {
  const text = `「${item.line}」と言われたとき、「${tsItemQuickText(item)}」と言えた`;
  const category = classifyDekitaText(text);
  const { merged, praise } = buildDekitaResponse(text, category);
  const dateKey = todayKey();
  dekitaLog.push({ id: String(Date.now()), dateKey, text, praise, category, merged, at: Date.now() });
  if (dekitaLog.length > 500) dekitaLog = dekitaLog.slice(-500);
  saveDekitaLog();
  playDekitaReaction(text, praise, category, merged);
  if (!ganbattaDekitaDates.has(dateKey)) {
    ganbattaDekitaDates.add(dateKey);
    saveGanbattaDekitaDates();
    addGanbattaPoints(1, 'dekita', '言葉のおまもりで言えた', dateKey);
  }
}
// 「ことばのおまもり」に、実際に記録したメモをそのまま差し込むための記録を1件取得する。
// 単純に一番新しい記録を出すと、体調が悪い日ほどメモが「だるい」のような一言だけになりがちで、
// 手がかりのない記録がたまたま最新というだけで表示され続けてしまう。そこで直近14日の中から、
// 気象の裏付けがある、または内容にある程度の分量がある記録を優先して選ぶ
function getTsRecordEcho() {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 14);
  const cutoffKey = todayKey(cutoff);
  const candidates = records
    .filter(r => r.memo && r.memo.trim() && r.dateKey >= cutoffKey)
    .sort((a, b) => (b.dateKey + b.time).localeCompare(a.dateKey + a.time)); // 新しい順
  if (!candidates.length) return null;
  const withEvidence = candidates.find(r => tsRecordEchoWeatherNote(r.weather) || r.memo.trim().length >= 8);
  return withEvidence || candidates[0];
}
// 📝記録エコーの一言と🌏記録からの傾向、両方で同じ言い回しを使うための共通の名前一覧。
// ここを1箇所にまとめておくことで、「気圧が大きく崩れるなど」のような、どの記録エコーの
// 一言とも対応しない曖昧な総称に流れてしまうのを防ぐ。
// 気象庁の警報級（台風・大雨など）の判定に加えて、そこまで極端ではない日常レベルの変化
// （気圧の軽い低下・気温の高さ・湿度の高さ・風の強さ・雨）も見る。気象に弱い人がつらいのは
// 警報が出る日に限らないため、気圧だけでなく複数の指標から「それっぽい理由」を拾えるようにする
const TS_WEATHER_FLAGS = [
  { test: w => w.pressureDropFlag, label: '気圧が3時間で急降下していた日' },
  { test: w => w.linearRainbandFlag, label: '線状降水帯の目安が出ていた日' },
  { test: w => w.typhoonFlag, label: '台風の目安が出ていた日' },
  { test: w => w.heavyRainFlag, label: '大雨の目安が出ていた日' },
  { test: w => w.extremeHeatFlag, label: '猛暑日の目安が出ていた日' },
];
const TS_MILD_WEATHER_CHECKS = [
  { test: w => w.pressureChange3h != null && w.pressureChange3h < 0, label: '気圧が下がり気味だった日' },
  { test: w => w.dayMaxTemp != null && w.dayMaxTemp >= 30, label: '気温が高めだった日' },
  { test: w => w.dayMaxHumidity != null && w.dayMaxHumidity >= 70, label: '湿度が高めだった日' },
  { test: w => w.dayMaxWind != null && w.dayMaxWind >= 6, label: '風がやや強めだった日' },
  { test: w => w.precipitation != null && w.precipitation > 0, label: '雨が降っていた日' },
];
// 「サボりじゃなく理由がある」を言葉だけでなく裏付けられるよう、その記録の時の気象条件で
// 目立つものがあれば一言添える（証明ではなく「それっぽい理由」として使えれば十分、という考え方）
function tsRecordEchoWeatherNote(w) {
  if (!w || w.status !== 'ok') return '';
  const hit = [...TS_WEATHER_FLAGS, ...TS_MILD_WEATHER_CHECKS].find(f => f.test(w));
  return hit ? `${hit.label}でした。` : '';
}
function tsRecordEchoHtml(recordEcho) {
  if (!recordEcho) return '';
  const weatherNote = tsRecordEchoWeatherNote(recordEcho.weather);
  return `
    <div class="card" style="padding:12px 14px; margin-bottom:10px; background:var(--accent-soft);">
      <label style="display:block; font-weight:600; font-size:12.5px; margin-bottom:6px;">📝 直近の記録から（そのまま伝えてもOK）</label>
      <p style="margin:0;">${escapeHtml(recordEcho.dateKey)}${recordEcho.mood ? ' ' + moodEmoji(recordEcho.mood) : ''}「${escapeHtml(recordEcho.memo)}」</p>
      ${weatherNote ? `<p class="note" style="margin:6px 0 0;">🌏 ${weatherNote}気のせいではなく、それっぽい理由があったということです。</p>` : ''}
    </div>`;
}
// できたことアルバムの記録を、返す言葉を考えているまさにその場でも見られるようにする。
// 🌱を付けた記録を優先しつつ、付け忘れていても空にはせず、直近の記録で3件まで埋める
function tsUsableReplyHtml() {
  if (!dekitaLog.length) return '';
  const flagged = [...dekitaLog].reverse().filter(e => e.usableReply);
  const others = [...dekitaLog].reverse().filter(e => !e.usableReply);
  const picked = [...flagged, ...others].slice(0, 3);
  if (!picked.length) return '';
  return `
    <div class="card" style="padding:12px 14px; margin-bottom:10px; background:var(--accent-soft);">
      <label style="display:block; font-weight:600; font-size:12.5px; margin-bottom:6px;">🌱 最近はこれを頑張ったよ</label>
      ${picked.map(e => `<p style="margin:0 0 8px;">${escapeHtml(e.text)}</p>`).join('')}
      <p class="note" style="margin:6px 0 0 0;">聞かれたときは、そのまま言ってもいいし、少し変えて使ってもいいです。</p>
    </div>`;
}
// 1件のメモに頼る記録エコーは、体調が悪い日ほど手がかりが薄くなるという弱点がある。
// そこで、常に自動で記録される「気分（1〜3）」と「気象データ」だけを使い、複数の記録を
// 束ねた傾向を短い文章で示す（グラフにはしない＝一目で読めることを優先する）。
// 対象項目を絞らず全項目で使えるようにし、「ことばのおまもり」と記録の結びつきを太くする
// 5種類の気象フラグをまとめて「気象が荒れた日」と総称すると、実際に一番効いている要因が
// 何なのかがぼやける。フラグごとに集計し、記録エコーと同じ具体的な名前で、一番件数の多い
// 要因だけを報告する（複数の弱い傾向を混ぜて薄める、ということをしない）。
// このサイトは分析の正確さを競う場所ではなく、日々寄り添う場所なので、「統計的に意味がある
// 傾向」を証明できるまで出し惜しみしない。2件、しかもそのうち1件でも「つらい」と重なって
// いれば、「前にもこういうことがあったね」というくらいの気持ちで十分に出す
// checksの中から、条件を満たす記録が一番多い項目を1つだけ選ぶ（複数の弱い傾向を混ぜて薄めない）
function tsBestWeatherEvidence(usable, checks) {
  let best = null;
  checks.forEach(c => {
    const flagged = usable.filter(r => c.test(r.weather));
    if (flagged.length < 2) return;
    const flaggedBad = flagged.filter(r => r.mood === 1).length;
    if (flaggedBad < 1) return; // 一度も「つらい」と重なっていない要因は出さない
    if (!best || flagged.length > best.roughN) {
      best = { label: c.label, roughN: flagged.length, roughBadN: flaggedBad };
    }
  });
  return best;
}
function computeTsWeatherPatternInsight() {
  const usable = records.filter(r => r.mood && r.weather && r.weather.status === 'ok');
  if (usable.length < 3) return null;
  // まず警報級（台風・大雨など）を優先して探し、見つからなければ日常レベルの変化まで広げる
  const best = tsBestWeatherEvidence(usable, TS_WEATHER_FLAGS) || tsBestWeatherEvidence(usable, TS_MILD_WEATHER_CHECKS);
  if (!best) return null;
  return { ...best, totalN: usable.length };
}
function tsWeatherPatternHtml() {
  const insight = computeTsWeatherPatternInsight();
  if (!insight) return '';
  return `
    <div class="card" style="padding:12px 14px; margin-bottom:10px; background:var(--accent-soft);">
      <label style="display:block; font-weight:600; font-size:12.5px; margin-bottom:6px;">🌏 記録からの傾向</label>
      <p style="margin:0;">${insight.label}（${insight.roughN}件）のうち、${insight.roughBadN}件は「つらい」と記録していました（振り返った全${insight.totalN}件のうち）。</p>
      <p class="note" style="margin:6px 0 0;">気のせいではなく、それっぽい理由があったということです。証明ではなく、あくまで自分の記録から見えている、ゆるやかな目安です。</p>
    </div>`;
}
function renderTsDetail() {
  const wrap = document.getElementById('tsDetailWrap');
  if (!wrap) return;
  const item = tsAllPhraseItems().find(it => it.id === tsSelectedId);
  if (!item) { wrap.innerHTML = ''; return; }
  const recordEcho = getTsRecordEcho();

  if (item.custom) {
    wrap.innerHTML = `
      <div class="result-card">
        <p class="note" style="margin:0 0 6px;">こう言われたら…</p>
        <p style="font-size:17px; font-weight:700; margin:0 0 12px;">「${escapeHtml(item.line)}」</p>
        ${item.next ? `<p style="margin:0 0 8px;"><b>次に言うなら：</b>${escapeHtml(item.next)}</p>` : ''}
        ${item.wanted ? `<p class="note" style="margin:0;">本当は言いたかったこと：${escapeHtml(item.wanted)}</p>` : ''}
        ${(!item.next && !item.wanted) ? `<p class="note" style="margin:0;">まだ自分の言葉を登録していません。「ことばを備える」から書き足せます</p>` : ''}
      </div>
      ${tsRecordEchoHtml(recordEcho)}`;
    return;
  }

  const toneKeys = ['soft', 'neutral', 'firm'];
  const toneLabels = ['やわらかく', 'ふつうに', 'はっきり'];
  const explainText = item.explain[toneKeys[tsToneLevel]];

  wrap.innerHTML = `
    <div class="result-card">
      <p class="note" style="margin:0 0 6px;">こう言われたら…</p>
      <p style="font-size:17px; font-weight:700; margin:0 0 14px;">「${escapeHtml(item.line)}」</p>

      <div class="card" style="padding:12px 14px; margin-bottom:10px;">
        <label style="display:block; font-weight:600; font-size:12.5px; margin-bottom:6px;">🌱 まずはひとこと（3秒で言える一言）</label>
        <p style="margin:0;">${escapeHtml(item.quick)}</p>
      </div>

      <div class="card" style="padding:12px 14px; margin-bottom:10px;">
        <label style="display:block; font-weight:600; font-size:12.5px; margin-bottom:8px;">🌷 しっかり伝える</label>
        <div style="display:flex; align-items:center; gap:8px; font-size:11px; color:var(--ink-sub); margin-bottom:6px;">
          <span>やわらかく</span><input type="range" id="tsToneSlider" min="0" max="2" value="${tsToneLevel}" style="flex:1;" /><span>はっきり</span>
        </div>
        <p class="note" style="margin:0 0 4px;">${toneLabels[tsToneLevel]}バージョン</p>
        <p style="margin:0;">${escapeHtml(explainText)}</p>
      </div>

      ${tsWeatherPatternHtml()}
      ${tsRecordEchoHtml(recordEcho)}
      ${tsUsableReplyHtml()}

      <div class="card" style="padding:12px 14px; margin-bottom:10px;">
        <label style="display:block; font-weight:600; font-size:12.5px; margin-bottom:6px;">🌙 ここは譲らない</label>
        <p style="margin:0;">${escapeHtml(item.boundary)}</p>
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button type="button" class="btn-link no-print" id="tsAddArmorBtn">🛡️ 今日の武装に追加</button>
        <button type="button" class="btn-link no-print" id="tsSaidItBtn">😌 言えた！アルバムに書く</button>
        <button type="button" class="btn-link no-print" id="tsCouldntSayBtn">😶 言えなかった…登録する</button>
      </div>
    </div>`;

  const slider = document.getElementById('tsToneSlider');
  if (slider) slider.addEventListener('input', () => { tsToneLevel = Number(slider.value); renderTsDetail(); });
  const armorBtn = document.getElementById('tsAddArmorBtn');
  if (armorBtn) armorBtn.addEventListener('click', () => tsAddToArmor(item.id));
  const saidItBtn = document.getElementById('tsSaidItBtn');
  if (saidItBtn) saidItBtn.addEventListener('click', () => { tsQuickLogSaidIt(item); saidItBtn.disabled = true; saidItBtn.textContent = '📮 アルバムに書いたよ'; });
  const couldntBtn = document.getElementById('tsCouldntSayBtn');
  if (couldntBtn) couldntBtn.addEventListener('click', () => tsQuickLogCouldntSay(item));
}
document.getElementById('tsSearch').addEventListener('input', (e) => { tsSearchQuery = e.target.value; renderTsPhraseList(); });

// ---------- 🧠練習する：フラッシュカード ----------
// 際限なく続くと憂鬱になるという指摘を受け、1ラウンドを区切って「今日はここまで」と
// 明示的に終われるようにしている（続けたい場合だけ「もう5問」で自分から次を選ぶ）
const TS_FLASH_ROUND_SIZE = 5;
let tsFlashOrder = [];
let tsFlashIdx = 0;
let tsFlashRevealed = false;
function shuffleTsFlash() {
  const n = TS_ITEMS.length;
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  tsFlashOrder = order.slice(0, TS_FLASH_ROUND_SIZE);
  tsFlashIdx = 0; tsFlashRevealed = false;
}
function renderTsFlashCard() {
  const card = document.getElementById('tsFlashCard');
  const controls = document.getElementById('tsFlashControls');
  if (!card) return;
  if (!tsFlashOrder.length) shuffleTsFlash();
  if (tsFlashIdx >= tsFlashOrder.length) {
    if (controls) controls.hidden = true;
    card.innerHTML = `
      <p style="font-size:15px; font-weight:700; margin:0 0 10px;">🌷 今日はここまで。おつかれさま。</p>
      <p class="note" style="margin:0 0 14px;">${TS_FLASH_ROUND_SIZE}問、練習しました。</p>
      <button type="button" class="btn-sub" id="tsFlashMore">🔄 もう${TS_FLASH_ROUND_SIZE}問</button>
    `;
    const moreBtn = document.getElementById('tsFlashMore');
    if (moreBtn) moreBtn.addEventListener('click', () => { shuffleTsFlash(); renderTsFlashCard(); });
    return;
  }
  if (controls) controls.hidden = false;
  const item = TS_ITEMS[tsFlashOrder[tsFlashIdx]];
  card.innerHTML = `
    <p class="note" style="margin:0 0 4px;">${tsFlashIdx + 1} / ${tsFlashOrder.length}</p>
    <p class="note" style="margin:0 0 6px;">こう言われたら…</p>
    <p style="font-size:17px; font-weight:700; margin:0 0 14px;">「${escapeHtml(item.line)}」</p>
    ${tsFlashRevealed
      ? `<div class="result-card" style="text-align:left; margin:0;"><p class="note" style="margin:0 0 4px;">こう返せます</p><p style="margin:0;">${escapeHtml(item.explain.neutral)}</p></div>`
      : `<p class="note">文章を丸暗記しなくても大丈夫。キーワードだけ思い出してみてください：「受け止める → 自分の場合は → 記録では → だから」</p>`}
  `;
  const revealBtn = document.getElementById('tsFlashReveal');
  if (revealBtn) revealBtn.textContent = tsFlashRevealed ? '隠す' : '答えを見る';
}
document.getElementById('tsFlashReveal').addEventListener('click', () => { tsFlashRevealed = !tsFlashRevealed; renderTsFlashCard(); });
document.getElementById('tsFlashNext').addEventListener('click', () => { tsFlashIdx++; tsFlashRevealed = false; renderTsFlashCard(); });

// ---------- 📖言葉を備える：私が伝えたいこと・武装の設定・自分の言葉を追加 ----------
function renderTsCoreMessages() {
  const el = document.getElementById('tsCoreMessages');
  if (!el) return;
  el.innerHTML = tsCoreMessages.map((v, i) => `
    <div class="q" style="margin:0 0 8px;">
      <label>${i + 1}</label>
      <input type="text" data-core-idx="${i}" value="${escapeHtml(v)}" placeholder="例：症状がある／日によって程度が変わる／外からは分かりにくい" style="width:100%; padding:8px; font-size:13px; border:1px solid var(--border); border-radius:8px; font-family:inherit;" />
    </div>`).join('');
  el.querySelectorAll('[data-core-idx]').forEach(inp => {
    inp.addEventListener('change', () => { tsCoreMessages[Number(inp.dataset.coreIdx)] = inp.value.trim(); saveTsCoreMessages(); });
  });
}
function renderTsNewAudience() {
  const el = document.getElementById('tsNewAudience');
  if (!el) return;
  el.innerHTML = TS_AUDIENCES.map(a => `<label class="chip ${tsNewAudienceSelected === a ? 'on' : ''}" data-a="${escapeHtml(a)}">${escapeHtml(a)}</label>`).join('');
  el.querySelectorAll('[data-a]').forEach(chip => {
    chip.addEventListener('click', () => { tsNewAudienceSelected = tsNewAudienceSelected === chip.dataset.a ? null : chip.dataset.a; renderTsNewAudience(); });
  });
}
// 「できたことアルバム」で🌱を付けた記録を、備える画面でも見返せるようにする。
// アルバムに書いたその場では「返しに使える」と気づかないことも多いので、ここでは
// 新しい入力欄は作らず、アルバム側で後から🌱を付け外しできる仕組みと連動させている
function renderTsPrepareUsableList() {
  const el = document.getElementById('tsPrepareUsableCard');
  if (!el) return;
  const entries = dekitaLog.filter(e => e.usableReply).slice(-10).reverse();
  el.innerHTML = `
    <label style="display:block; font-weight:600; font-size:13px; margin-bottom:6px;">🌱 アルバムから使えそうな言葉</label>
    <p class="note" style="margin:0 0 10px;">できたことアルバムに書いた中で、「返しにも使えそう」を付けたものです。何か聞かれたときに、そのまま言ってもいいし、少し変えて使ってもいいです。</p>
    ${entries.length
      ? entries.map(e => `<p class="note" style="margin:0 0 8px; padding:8px 10px; border:1px solid var(--border); border-radius:8px; white-space:pre-wrap;">${escapeHtml(e.text)}</p>`).join('')
      : `<p class="note" style="margin:0;">まだありません。「できたことアルバム」で書いたことに🌱を付けると、ここに出てきます。</p>`}
  `;
}
function renderTsPrepareList() {
  const el = document.getElementById('tsPrepareList');
  if (!el) return;
  const items = tsAllPhraseItems();
  el.innerHTML = items.map(it => `
    <details class="card">
      <summary><b>${escapeHtml(it.line)}</b>${(it.audience && it.audience.length) ? `<span class="kana">（${it.audience.map(a => escapeHtml(a)).join('・')}）</span>` : ''}</summary>
      <div style="margin:0 16px 14px;">
        ${it.custom
          ? `${it.next ? `<p style="margin:0 0 8px;"><b>次に言うなら：</b>${escapeHtml(it.next)}</p>` : ''}${it.wanted ? `<p class="note" style="margin:0 0 8px;">本当は言いたかったこと：${escapeHtml(it.wanted)}</p>` : ''}<button type="button" class="btn-link no-print" data-del-id="${escapeHtml(it.id)}">この項目を削除</button>`
          : `<p style="margin:0 0 6px;"><b>⚡</b> ${escapeHtml(it.quick)}</p><p style="margin:0 0 6px;"><b>🛡️</b> ${escapeHtml(it.explain.neutral)}</p><p style="margin:0;"><b>🔴</b> ${escapeHtml(it.boundary)}</p>`}
      </div>
    </details>`).join('');
  el.querySelectorAll('[data-del-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      tsCustom = tsCustom.filter(x => x.id !== btn.dataset.delId);
      saveTsCustom();
      renderTsPrepareList();
      renderTsPhraseList();
    });
  });
}
document.getElementById('tsNewCouldntChip').addEventListener('click', (e) => {
  tsNewCouldnt = !tsNewCouldnt;
  e.currentTarget.classList.toggle('on', tsNewCouldnt);
});
document.getElementById('tsAddBtn').addEventListener('click', () => {
  const lineEl = document.getElementById('tsNewLine');
  const wantedEl = document.getElementById('tsNewWanted');
  const nextEl = document.getElementById('tsNewNext');
  const line = lineEl.value.trim();
  if (!line) return;
  tsCustom.push({
    id: 'c' + Date.now(), line, custom: true, couldntSay: tsNewCouldnt,
    wanted: wantedEl.value.trim(), next: nextEl.value.trim(),
    audience: tsNewAudienceSelected ? [tsNewAudienceSelected] : [],
    createdAt: Date.now(), reviewed: false,
  });
  saveTsCustom();
  lineEl.value = ''; wantedEl.value = ''; nextEl.value = '';
  tsNewCouldnt = false;
  document.getElementById('tsNewCouldntChip').classList.remove('on');
  tsNewAudienceSelected = null;
  renderTsNewAudience();
  renderTsPrepareList();
  renderTsPhraseList();
});

// ---------- モード切り替え（🌱まずはひとこと／🧠練習する／📖ことばを備える） ----------
// 「まずはひとこと」と「しっかり伝える」は別モードにせず1つにまとめている。
// 詳細パネル内の「もっと詳しく話す？」で🌷しっかり伝えるまで展開できるので、モードを分ける必要がなかった
function tsSwitchMode(mode) {
  tsMode = mode;
  document.querySelectorAll('#tsModeSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.getElementById('tsBrowseView').hidden = mode !== 'quick';
  document.getElementById('tsPracticeView').hidden = mode !== 'practice';
  document.getElementById('tsPrepareView').hidden = mode !== 'prepare';
  if (mode === 'practice') { renderTsFlashCard(); }
  if (mode === 'prepare') { renderTsChecklistCard(); renderTsCoreMessages(); renderTsArmorPicker(); renderTsPrepareUsableList(); renderTsPrepareList(); renderTsNewAudience(); }
}
document.querySelectorAll('#tsModeSeg .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => tsSwitchMode(btn.dataset.mode));
});

function renderKaeshiTab() {
  renderTsReviewBanner();
  renderTsArmorCard();
  renderTsChecklistCard();
  renderTsAudienceFilter();
  renderTsPhraseList();
  shuffleTsFlash();
}

// マスコットの素材を一時的に出す/出さないの切り替え。falseにしておけば画像ファイルは消さずに
// 「今は使わない」だけにできる。また使いたくなったらここをtrueに戻すだけでいい
// （現在：正面がmascot-normal.pngに差し替わったのに合わせ、後ろ姿・目をつむるは
// 　プロポーションが正面とうまく揃っていないため、いったん非表示にしている。
// 　ほおピンク（mascot-normal-blush.png）はサイト方針として恒久的に非表示）
const MASCOT_POSE_ENABLED = { back: false, blink: false };
// 立った状態→座り(sit-left/sit-right)の間をつなぐ中割り画像が無く、ポーズが唐突に切り替わって
// 不自然に見えるため、座る行動そのものをいったん無効化する（座り画像自体は消さない。
// trueに戻せばいつでも復活できる）
const MASCOT_SIT_ENABLED = false;
// 「急に引き返す」「急にくるっと向きを変える」は、予告なく方向転換して不自然に見えるため無効化。
// trueに戻せばいつでも復活できる
const MASCOT_ABRUPT_TURNS_ENABLED = false;

// トトノエ～ルの一言集。「頑張れ」型の励ましは使わず、そばにいる／おつかれさま、の温度に寄せる。
// initSiteMascot（ひとことを言うとき）とhookMascotReactions（記録・診断・タイマーから呼ぶとき）の
// 両方から参照するので、あえてどちらのIIFEの外＝トップレベルに置いている
// 口調の方針：応援団＋天気予報＋小動物。「がんばれ」「大丈夫」を安易に言わない。
// 体調を断定しない（「〜かも」「〜みたい」どまり）。短文。同じ場面でも複数候補からランダムに選ぶ。
const MASCOT_LINES = {
  idle: ['てくてく……', 'ちゃんといるよ〜', 'ここ、通ります', 'おじゃましま〜す', '今日もぼちぼち', 'なんかいい感じ', 'ただいま巡回中', 'どこ行こうかな', 'こっちこっち', '今日もよろしくね', 'ちゃんと見てるよ'],
  whimsy: ['……あ', '……なんでもない', 'ここ、居心地いい', '……ふふ', '見つかった', '何してるの?', 'トトノエ～ルです', 'ちゃんと仕事してます', 'たぶん', 'てくてくには理由がある', 'ひとやすみ……?'],
  greet: ['こんにちは〜', 'きょうもよろしくね'],
  morning: ['おはよう〜。今日の調子、どうかな?', 'おはよう。まずは空模様を見てみよ', '今日も一日、ぼちぼちいこ〜', '起きた? えらい', '今日の作戦、考えよっか', '今日の自分、どんな感じかな'],
  night: ['今日もおつかれさま', '今日の記録、残しておく?', '明日の自分に、ひとこと残しとく?', 'そろそろ店じまい?', '明日は明日の作戦でいこ', 'おやすみ準備、できた?'],
  save: ['記録できたね◎', '今日の分、残せたよ', 'ちゃんと書けたね', '教えてくれてありがとう', 'なるほど、今日はこんな感じか〜'],
  lowEnergy: ['今日はしんどい日なんだね', '今日は省エネモードでもいいよ', 'できること、少なくても大丈夫', '100%を出せない日もあるよ', '今日は「できないこと」より「できたこと」を見よ', 'しんどい日は、作戦変更', '今日は10%しか動けない? じゃあ10%でいこう'],
  diagnosis: ['見えてきたね', 'おつかれさま', 'ここまで、よく答えたね'],
  weatherStress: ['今日はちょっと気象変化が大きそう', '今日はいつもより、様子見してもいいかも', 'お天気、ちょっと落ち着かないね', '気象の変化、気にしておこうかな', '今日はいきなり全力じゃなくてもいいかも'],
  weatherPattern: ['あれ? このへん、似てるかも', '「なんとなく」を記録してみると、何か見えるかも', '今日の不調、天気も一緒に見てみる?'],
  accomplish: ['おっ', 'できたね', 'ひとつ進んだ', 'いいね', 'ちゃんと前に進んでる', 'ナイス判断', 'いいペース', 'その調子……いや、無理はしないでね'],
  nothingDay: ['今日は生存ポイント獲得', '明日の自分にバトンタッチしよ', 'また明日、考えよ', '本日の営業、終了です'],
  timerStart: ['じゃ、いってみよ', 'いってらっしゃい〜', '集中モード、ぽちっ', '応援係になります'],
  timerDuring: ['まだいるよ〜', '順調?', 'あとちょっと', 'ちゃんと休憩もあるからね'],
  timerToBreak: ['おつかれさま!', 'ひと区切りついたね', '休憩いこ', 'はい、休憩!', '画面からちょっと離れよ〜', '遠くを見てみよ', '目も休ませよ', 'いったん、ぼーっとしよ'],
  timerToWork: ['さ、ぼちぼちいこうか'],
  timerLong: ['そろそろ休憩してもいい時間かも', 'ずっと頑張らなくても大丈夫', '休憩も予定のうち', 'ちょっと伸びよ〜'],
  kaeshiOpen: ['よし、今日はちょっとおまもり持っとこ', '「ことばのおまもり」、いってみよ', '言いたいこと、言葉にしてみよ', '萎縮する前に、ひとこと考えておこ', '今日のトトノエ～ルは応援団'],
  kaeshiTip: ['言い返すんじゃなくて、自分を守る練習だよ', '我慢しすぎなくていいよ', '相手を攻撃しなくても、自分のことは守れるよ', 'その言葉、ちょっと困るよね', '「違う」と思ったら、違うって言っていいよ', 'ちゃんと説明できなくても大丈夫', 'まずは一言、返してみよ', '完璧な返答じゃなくていい', 'これなら言えそう？', 'うまく言えなくてもだいじょうぶ。まずは一言でいいよ'],
  tab: ['ここ見るんだ', 'どれどれ〜'],
  approach: ['ちょっと聞いて〜', 'こっちこっち'],
  actionBack: ['巡回してきます', 'ちょっと見てきます'],
  actionSit: ['ちょっと休憩', 'ひとやすみ〜'],
  actionLie: ['今日はここまで……', 'ごろん……'],
  enterScreen: ['おまたせ', 'こんにちは'],
  exitScreen: ['またね〜', '行ってきます', '通りまーす!'],
  ambient: ['……みてた?', '今日もここにいるよ', '無理しすぎないでね', 'ひとつずつでいいよ', 'そばにいるよ'],
  officialAlert: ['気象庁から警報が出てるみたい、気をつけて', '外、ちょっと荒れてるかも', '警報が出てるよ。無理しないでね', '念のため、記録タブも見ておいて'],
  // がんばったねポイント用。「予報が外れた＝身体が頑張った」と断定はせず、原因を決めつけない言い方に絞る
  pointsRecord: ['🌷 今日の体調を記録したね', '🐱 今日もちゃんと記録できたね', '記録、残せたね〜'],
  pointsBetter: ['🌷 今日は予報より元気に過ごせたね', '💖 今日はうまく乗り切れた日だったね', '🐱 今日はいい意味で予想外だったね', '✨ 今日は思ったより元気だったね〜', '🐱 身体が予想以上にがんばったよ〜'],
};
// 記録・診断・タイマー・警報など「機能に紐づく一言」はそのまま話す。徘徊中の雑談・相槌・
// 挨拶・移動時のひとことなど「業務に関係ない一言」は、ユーザーの希望でいったん話さないようにする。
// 削除はしていない（MASCOT_LINESの中身はそのまま）ので、mascotCasualSpeechEnabledをtrueに戻せば復活する
const MASCOT_LINE_CASUAL = new Set(['idle', 'whimsy', 'greet', 'tab', 'approach', 'actionBack', 'actionSit', 'actionLie', 'enterScreen', 'exitScreen', 'ambient']);
let mascotCasualSpeechEnabled = false;
function pickMascotLine(key) {
  if (MASCOT_LINE_CASUAL.has(key) && !mascotCasualSpeechEnabled) return '';
  const arr = MASCOT_LINES[key];
  return arr ? arr[Math.floor(Math.random() * arr.length)] : '';
}
// 時間帯によって、起動時の第一声を「おはよう系」「夜系」「ふつうの挨拶」で切り替える
function pickGreetBucket() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 21 || h < 4) return 'night';
  return 'greet';
}

// ---------- サイトマスコット：画面を自由に歩き回り、たまにひとこと話す小さな相棒 ----------
// 基本方針：「基本的にずっとどこかを歩いている」＋「基本の向きは斜め（顔が見えてかわいい）」。
// 左右の真横向きは、方向が変わった直後の一瞬だけ使う「切り替えポーズ」という位置づけにする。
// 素材：正面・右向き・左向き・斜め右・斜め左・後ろ姿・目をつむる・
// 座り右・座り左・寝そべり・立つ手あげにっこり・両手あげ(ryouteage)。
// ・水平の横断を主体に、垂直の横断は「正面で近づく／後ろ姿で遠ざかる」奥行き移動として使う
// ・速度／停止時間／出現位置／方向転換のタイミングにランダム性を持たせて機械的に見せない
// ・入力欄にフォーカスがある間は、その入力欄の高さ帯を避けて歩く（操作の邪魔はしない）
// ・本体はpointer-events:noneなので、万一ボタン等の上を通ってもクリックは奪わない
// ・体調記録が「つらい」の日や集中タイマー中は、止まりはしないがゆっくり・控えめな歩調にする
// ・感情表現は周囲に浮かぶ♡やキラキラ＋吹き出しのひとことで行う（頑張れ、とは言わない）
// ・OSの「アニメーションを減らす」設定では、常時横断はせず定位置で控えめに佇む
(function initSiteMascot() {
  const root = document.getElementById('siteMascot');
  const body = document.getElementById('mascotBody');
  const shadow = document.getElementById('mascotShadow');
  const img = document.getElementById('mascotImg');
  const ghost = document.getElementById('mascotImgGhost');
  const fx = document.getElementById('mascotFx');
  const bubble = document.getElementById('mascotBubble');
  const bubbleText = document.getElementById('mascotBubbleText');
  if (!root || !body || !shadow || !img || !fx) return;

  const POSES = {
    front: 'mascot-normal.png',
    // mascot-left.png / mascot-right.png（真横向きの静止コマ）はサイト方針として非表示。
    // 横向きが必要な場面では、代わりに左-lf/右-lf（歩行中割り）を使う
    back: 'mascot-back.png',
    blink: 'mascot-blink.png',
    'diag-left': 'mascot-diag-left.png',
    'diag-right': 'mascot-diag-right.png',
    'left-rf': 'mascot-left-rf.png',   // 左向き・右足前（歩行サイクル用の中割り）
    'left-lf': 'mascot-left-lf.png',   // 左向き・左足前
    'right-rf': 'mascot-right-rf.png', // 右向き・右足前
    'right-lf': 'mascot-right-lf.png', // 右向き・左足前
    'sit-left': 'mascot-sit-left.png',
    'sit-right': 'mascot-sit-right.png',
    lie: 'mascot-lie.png',
    // mascot-wave / mascot-wave1〜3.png（従来の手振りコマ）はサイト方針として恒久的に非表示。
    // ryouteage.pngは長らく「両手あげ・改良版」として使っていたが、実際は胴体が上下に
    // 潰れたように短いプロポーションで描かれた不良素材だった（頭の大きさはmascot-normalと
    // ほぼ同じなのに、首から腰までの長さだけが明らかに短い）。位置合わせ（平行移動）では
    // 直せない描画そのものの歪みだったため、ryouteage.pngの使用をやめ、プロポーションが
    // mascot-normalとほぼ一致することを実測済みのmascot-joy.png（doDoubleJoyBeatの
    // 「ばんざーい」でも使っている）に統一する
    wave: 'mascot-joy.png',
    tilt: 'mascot-tilt.png',       // 首かしげ：動きに変化をつけて生き物らしく見せる役目
    joy: 'mascot-joy.png',         // 両手上げ：喜んだ瞬間に使う
    point: 'mascot-point.png',     // 指させし・手振り兼用
    surprise: 'mascot-surprise.png', // 目見開き：驚いた瞬間に使う
  };
  // 後方宙返り：他のポーズ画像と違い、この11コマは正規化されておらず、1コマの中に
  // キャラクターが小さく描かれている。大きさは常にmascot-normal相当（FLIP_SCALE）。
  // 位置は「1コマ目だけ」mascot-normalと実測バウンディングボックスを比較して、ぴったり
  // 重なる補正量を算出（FLIP_ANCHOR_START）。宙返りの終わりは、ユーザー提供の参考画像
  // 「後方宙返り　軌跡　これにして.png」を実測して求めている。この参考画像は1〜11コマ目を
  // ほぼ等倍のまま重ねたもので、1コマ目（mascot-normalと重なる）が画像の右側、11コマ目が
  // 左側に来る向きで描かれている。参考画像上のpx距離は、ソース画像の幅700px＝コンテナ幅100%
  // という比率（object-fit:containの基準）で%に変換した（横-112.86%・縦の頂点の高さ31.14%）。
  // 変換後、実際に11個の点を参考画像へ重ねて可視の弧とぴったり一致することを確認済み
  const FLIP_FRAME_COUNT = 11;
  const FLIP_SCALE = 1.559;
  // 11コマ目(着地)からmascot-normalへクロスフェードする瞬間、大きさ・位置がぴったり重なる
  // ようにするための補正値。後方宙返り11.png と mascot-normal.png を実際にキャンバスへ
  // object-fit:containと同じロジックで描画し、それぞれのキャラクターの不透明ピクセルの
  // バウンディングボックス中心を実測して算出した（見た目上、着地の瞬間に大きさが変わって
  // 見える／位置がずれて見える、という2つの不具合が実際に確認されたための再計測）。
  // scaleはキャラの高さの比、x/yはscale適用後に中心を一致させるための平行移動量(%)
  const FLIP_LANDING_SCALE = 1.5904;
  const FLIP_LANDING_ALIGN = { x: 11.73, y: 10.98 };
  const FLIP_ANCHOR_START = { x: -30.14, y: 17.60 }; // 1コマ目→mascot-normalへの補正量（%）
  const FLIP_ANCHOR_END = { x: -30.14 - 112.86, y: 17.60 }; // 参考画像実測：1→11コマ目の相対移動ぶん（11コマ目は左側）
  const FLIP_RY = 31.14; // 縦の盛り上がりの高さ（%・参考画像の頂点位置から実測）
  const FLIP_LATE_SPREAD = 1.0; // 7〜10コマ目の盛り上がりの倍率（1.0=補正なし）
  const FLIP_POSES = [];
  const FLIP_OFFSETS = [];
  for (let i = 1; i <= FLIP_FRAME_COUNT; i++) {
    const key = 'flip' + i;
    POSES[key] = `後方宙返り　${i}.png`;
    FLIP_POSES.push(key);
    const t = (i - 1) / (FLIP_FRAME_COUNT - 1);
    const theta = Math.PI * t; // 0→π：ちょうど半円ぶん
    const mult = i >= 7 ? FLIP_LATE_SPREAD : 1;
    const baseX = FLIP_ANCHOR_START.x + (FLIP_ANCHOR_END.x - FLIP_ANCHOR_START.x) * t; // 均等間隔
    const baseY = FLIP_ANCHOR_START.y + (FLIP_ANCHOR_END.y - FLIP_ANCHOR_START.y) * t;
    FLIP_OFFSETS.push({
      x: +baseX.toFixed(2),
      y: +(baseY - FLIP_RY * Math.sin(theta) * mult).toFixed(2),
    });
  }
  // 宙返り中、影(#mascotShadow)はimgと別要素なので何もしないとその場に置き去りになる。
  // 影は接地面にいる想定なので縦方向は動かさず、横方向だけimgのx移動に追従させ、
  // 盛り上がる（高く跳ぶ）タイミングほど小さく＝地面から離れて見えるようスケールを絞る。
  // 影のCSS上の幅は58%（.site-mascot-shadowのwidth）なので、imgのx%（100%基準）と
  // 同じ実ピクセル移動量にするには 100/58 倍して影自身の%基準に変換する必要がある
  const SHADOW_WIDTH_PCT = 58; // .site-mascot-shadow { width: 58%; } と合わせる
  const FLIP_SHADOW_OFFSETS = FLIP_OFFSETS.map((o, idx) => {
    const t = idx / (FLIP_FRAME_COUNT - 1);
    const theta = Math.PI * t;
    return {
      x: +(o.x * (100 / SHADOW_WIDTH_PCT)).toFixed(2),
      scale: +(1 - 0.35 * Math.sin(theta)).toFixed(3),
    };
  });
  // 全ポーズ画像はキャラクターの大きさ・接地位置を実測して正規化済み（mascot-originals-backup/に
  // 元画像を保管）なので、以前のようなポーズごとのCSS scale補正は不要。読み込み待ちでポーズ切替が
  // 一瞬止まらないよう、起動時に全ポーズ画像をブラウザキャッシュへ先読みしておく
  Object.values(POSES).forEach(src => { const pre = new Image(); pre.src = src; });
  // 一度乗ったら次のupdateFacingに割り込まれたくない「今まさに演じている最中」のポーズ
  // （歩行サイクルの中割り(-rf/-lf)は毎回のhopで積極的に上書きしたいので、あえてHELD扱いにしない）
  const HELD_POSES = new Set(['blink', 'back', 'wave', 'tilt', 'joy', 'point', 'surprise', 'sit-left', 'sit-right', 'lie', ...FLIP_POSES]);
  // 左右それぞれの歩行サイクル：斜め（つなぎ）→右足前→斜め→左足前……の繰り返し
  const WALK_CYCLE = {
    left: ['diag-left', 'left-rf', 'diag-left', 'left-lf'],
    right: ['diag-right', 'right-rf', 'diag-right', 'right-lf'],
  };
  let walkCycleStep = 0;
  let pose = 'front';
  // ポーズ切替のクロスフェード：直前のフレームをゴースト画像に固定表示したまま新フレームへ差し替え、
  // ゴースト側だけをふわっとフェードアウトさせる（img.srcの瞬間切替＝紙芝居的な見た目を避ける）
  function setPose(p) {
    if (pose === p) return;
    const prevPose = pose;
    pose = p;
    const nextSrc = POSES[p] || POSES.front;
    // 後方宙返り(flip1〜11)はimg側だけにtransform(位置・大きさ)を上書きしているため、
    // ゴースト側にその補正がかからないまま前のコマを薄く重ねてしまうと、宙返り中に
    // 「大きさ調整前の絵」がチラつく。宙返りに入る/出る瞬間はクロスフェードそのものを行わない
    const isFlipTransition = p.indexOf('flip') === 0 || prevPose.indexOf('flip') === 0;
    if (!reduceMotion && ghost && img.src && !isFlipTransition) {
      ghost.style.transition = 'none';
      ghost.src = img.src;
      ghost.style.opacity = '1';
      void ghost.offsetWidth; // reflow：transition:noneを確実に反映させてから戻す
      ghost.style.transition = 'opacity .15s linear';
      ghost.style.opacity = '0';
    } else if (ghost) {
      ghost.style.transition = 'none';
      ghost.style.opacity = '0';
    }
    img.src = nextSrc;
  }
  // 歩行中の見た目の向き。基本は斜め（顔が見えてかわいい）を軸に、歩行サイクル（斜め→右足前→斜め→左足前…）
  // を1歩＝1回のupdateFacing呼び出しごとに進める。まばたき・後ろ姿・座る・寝そべる・手をあげるなどの
  // 一時ポーズが終わった後は必ずこの向き（斜め）へ戻る
  let facingPose = 'diag-right';
  let facingSide = 'right';   // 'left' | 'right'（斜め・真横共通の左右軸）
  // 斜め右→斜め左のように、向きが一瞬で入れ替わって見えていた（別々の横断が続けて始まると、
  // 前の横断の終わりと次の横断の始まりで進行方向が逆になることがあるため）。向きが変わる瞬間は
  // 必ず正面をワンクッション挟んでから新しい向きの斜めへ入る。首かしげ等の一時ポーズ中は対象外
  let turningThroughFront = false;
  function updateFacing(dx, dy) {
    const adx = Math.abs(dx), ady = Math.abs(dy || 0);
    if (adx < 4 && ady < 4) return;
    if (crossing && crossing.deep) {
      // 垂直中心の横断＝奥行き移動：奥へ進むなら後ろ姿、手前へ来るなら正面
      // （後ろ姿を出さない設定の間は、奥へ進むときも正面のまま拡縮だけで奥行きを表現する）
      facingPose = (dy > 0 && MASCOT_POSE_ENABLED.back) ? 'back' : 'front';
      if (!HELD_POSES.has(pose)) setPose(facingPose);
      return;
    }
    if (adx >= 4) {
      const newSide = dx < 0 ? 'left' : 'right';
      if (newSide !== facingSide) {
        facingSide = newSide;
        walkCycleStep = 0;
        facingPose = facingSide === 'left' ? 'diag-left' : 'diag-right';
        if (!HELD_POSES.has(pose) && !turningThroughFront) {
          turningThroughFront = true;
          setPose('front');
          setTimeout(() => {
            turningThroughFront = false;
            if (!HELD_POSES.has(pose)) setPose(facingPose);
          }, 170);
        }
        return;
      }
    }
    facingPose = facingSide === 'left' ? 'diag-left' : 'diag-right';
    if (!turningThroughFront && !HELD_POSES.has(pose)) {
      const seq = WALK_CYCLE[facingSide];
      setPose(seq[walkCycleStep % seq.length]);
      walkCycleStep++;
    }
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HEADER_SAFE = 140; // headerの全幅背景＋右上ボタンの高さぶんは縦の移動範囲から必ず除外する

  // サイト方針でいったん一時停止：クリックしていないのにハート・キラキラ・ひとことが出る、という
  // フィードバックを受けて、記録保存・診断完了・タイマー・呼ぶ、などの「機能に紐づく反応」を
  // 全部いったん黙らせる。できたよ！アルバムの反応（mascotReact({essential:true, ...})）だけは対象外。
  // trueに戻せばすぐ元の賑やかさに復活できる
  let mascotExpressionPaused = true;

  let energy = 'normal';   // 'low'（しんどい日）| 'normal' | 'good'（元気な日）
  let typing = false;      // 入力欄にフォーカス中はその高さ帯を避ける
  let typingRect = null;
  let curLeft = 0, curBottom = 0; // ビューポート左端／下端からの現在位置(px)。画面外もあり得る
  let crossing = null;     // 現在の横断: { from, to, speed }
  let hopTimer = null;
  let lastReversalAt = 0, lastTurnAroundAt = 0;
  let lastInteractionAt = Date.now(); // 長く放置されたら寝る、操作されたら起きるための時計
  let idleSleeping = false;           // 放置がきっかけで寝ている最中かどうか
  let sleepWakeTimer = null;
  let lastApproachDir = null;         // ほめほめ係に呼ばれて中央へ歩いてきたときの向き（'left'|'right'）。
                                       // 反応後に歩行再開するとき、この向きを引き継いで逆走(Uターン)しないようにする

  const nowMs = () => Date.now();

  // 長時間の放置をきっかけに寝ている最中にユーザーが操作したら、その場で「……ん？」と起きる
  function markInteraction() {
    lastInteractionAt = nowMs();
    if (!idleSleeping) return;
    idleSleeping = false;
    clearTimeout(sleepWakeTimer);
    setPose('front');
    if (mascotCasualSpeechEnabled) ambientSay('……ん？');
    setTimeout(() => {
      const dir = (facingPose === 'left' || facingPose === 'diag-left') ? 'left' : 'right';
      setMotion('bouncing');
      setTimeout(() => {
        setMotion(null);
        startWalkFacing(dir, () => {
          hopTimer = setTimeout(startCrossing, 120 + Math.random() * 150);
        });
      }, 420);
    }, 850);
  }
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
    window.addEventListener(evt, markInteraction, { passive: true });
  });

  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
      typing = true;
      typingRect = t.getBoundingClientRect();
    }
  });
  document.addEventListener('focusout', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
      typing = false;
      typingRect = null;
    }
  });

  function activeTab() {
    const tabEl = document.querySelector('.tab.active');
    return tabEl ? tabEl.dataset.tab : '';
  }
  // 集中タイマー中・診断回答中は「止まる」のではなく、歩調をゆっくり・控えめにする
  function computeCalm() {
    const focusedOnWork = (typeof pomoRuntime !== 'undefined') && pomoRuntime.status === 'running' && pomoRuntime.phase === 'work';
    const answering = activeTab() === 'intake' || activeTab() === 'check';
    return focusedOnWork || answering;
  }
  // タイマーが「休憩中」かどうか（休憩中はたまにちょっと眠そうな一コマを挟む）
  function computeOnBreak() {
    return typeof pomoRuntime !== 'undefined' && pomoRuntime.status === 'running' && pomoRuntime.phase !== 'work' && activeTab() === 'pomodoro';
  }
  // 今日いちばん新しい気分の記録から、動きの強さを決める（「頑張れ」ではなく省エネで寄り添う）
  function computeEnergy() {
    try {
      if (typeof energySaveMode !== 'undefined' && energySaveMode) return 'low';
      if (typeof records === 'undefined' || typeof todayKey !== 'function') return 'normal';
      const tk = todayKey();
      const todays = records.filter(r => r.dateKey === tk && r.mood).sort((a, b) => String(a.time).localeCompare(String(b.time)));
      if (!todays.length) return 'normal';
      const latest = todays[todays.length - 1].mood;
      if (latest === 1) return 'low';
      if (latest === 3) return 'good';
      return 'normal';
    } catch { return 'normal'; }
  }

  function bounds() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const mSize = vw <= 640 ? 72 : 100; // 前より一回り小さく
    const maxY = Math.max(0, vh - HEADER_SAFE - mSize);
    return { vw, vh, mSize, maxY };
  }

  // 通常はcurBottomにもとづく控えめな遠近（上にいるほど少し小さく）。
  // 奥行き移動(crossing.deep)の最中は、正面で近づく／後ろ姿で遠ざかるのがはっきり分かるよう
  // 拡大縮小の振れ幅をかなり大きくする（doEncounterなど、位置ベースでない一時的な拡大はdepthValで直接指定）
  function ambientDepth() {
    const b = bounds();
    const t = Math.min(1, Math.max(0, curBottom) / Math.max(1, b.maxY));
    if (crossing && crossing.deep) return 1.42 - 0.78 * t; // 近い時1.42倍・遠い時0.64倍、とかなりメリハリをつける
    // 前は0.26の振れ幅で、上下に動くたびにけっこう目立つ拡大縮小が常に乗っていた（歩いて画面を
    // 横切るだけでもズームし続けているように見え、酔いやすさの一因になっていたはず）。
    // 遠近感の手がかりとしては残しつつ、常時のズーム量をかなり控えめにする
    return 1 - 0.1 * t;
  }

  // ---- 描画位置のなめらかな補間（requestAnimationFrame） ----
  // curLeft/curBottomは「今どこを目指しているか」という論理位置で、doHopのたびに一歩分だけ
  // 瞬時に進む（従来通り）。実際に画面に描く位置(renderX/Y/Depth)はここに向けて毎フレーム
  // 指数関数的に追従させることで、一歩ごとにCSS transitionをやり直す時のカクつきをなくし、
  // ホップの区切りをまたいでも速度が連続したなめらかな動きになる
  let renderX = 0, renderY = 0, renderDepth = 1, depthTarget = 1;
  function applyPosition(_durMsUnused, depthVal) {
    depthTarget = typeof depthVal === 'number' ? depthVal : ambientDepth();
  }
  function applyPositionInstant() {
    depthTarget = ambientDepth();
    renderX = curLeft; renderY = curBottom; renderDepth = depthTarget;
    root.style.setProperty('--mx', renderX.toFixed(2) + 'px');
    root.style.setProperty('--my', (-renderY).toFixed(2) + 'px');
    root.style.setProperty('--depth', renderDepth.toFixed(3));
  }
  // 「呼ぶ」「見に行く」などで目的地へ一気にジャンプさせる系の歩行は、curLeft/curBottomを
  // 一瞬で書き換えるとrenderLoopの追従(k=0.24)がすぐ追いついてしまい、脚だけ動いて実際には
  // 進んでいない「その場足踏み」に見えてしまう。論理位置そのものをdurationぶんかけて動かすことで、
  // 歩行アニメの尺と実際の移動を一致させる
  function tweenPosition(toX, toY, duration, onDone) {
    const fromX = curLeft, fromY = curBottom;
    const start = nowMs();
    (function step() {
      const t = Math.min(1, (nowMs() - start) / duration);
      curLeft = fromX + (toX - fromX) * t;
      curBottom = fromY + (toY - fromY) * t;
      if (t < 1) requestAnimationFrame(step);
      else if (onDone) onDone();
    })();
  }
  function renderLoop() {
    // 毎フレームの追従率。小さいほどゆったり滑らかに、大きいほどキビキビ。
    // 前は0.13で、1歩(約350ms)の間に約94%までしか追いつけず「ジャンプ→急減速」を
    // 繰り返して見えていた（歩いているというよりスライドして見える一因）。追従を強めて、
    // 1歩の内側でほぼ完全に追いつくようにする
    const k = 0.24;
    renderX += (curLeft - renderX) * k;
    renderY += (curBottom - renderY) * k;
    renderDepth += (depthTarget - renderDepth) * k;
    if (Math.abs(curLeft - renderX) < 0.05) renderX = curLeft;
    if (Math.abs(curBottom - renderY) < 0.05) renderY = curBottom;
    if (Math.abs(depthTarget - renderDepth) < 0.001) renderDepth = depthTarget;
    root.style.setProperty('--mx', renderX.toFixed(2) + 'px');
    root.style.setProperty('--my', (-renderY).toFixed(2) + 'px');
    root.style.setProperty('--depth', renderDepth.toFixed(3));
    requestAnimationFrame(renderLoop);
  }

  // durationMsを渡すと（歩行時）、bob用アニメーションの長さをその歩幅の実時間に合わせて再生し直す。
  // これにより、脚の絵（diag→足前→diag→足前…）の切り替わりタイミングと上下バウンスの山谷が同期する
  function setMotion(cls, durationMs) {
    ['walking', 'swaying', 'bouncing', 'poyon', 'anticipate'].forEach(c => { body.classList.remove(c); shadow.classList.remove(c); });
    if (durationMs) {
      body.style.animationDuration = durationMs + 'ms';
      shadow.style.animationDuration = durationMs + 'ms';
    } else {
      // 明示的に解除しないと、歩行時に指定した長さがidle時の呼吸アニメにも残ってしまう
      body.style.animationDuration = '';
      shadow.style.animationDuration = '';
    }
    if (cls) {
      void body.offsetWidth; // reflow：同じクラスが連続してもアニメーションを確実に再始動させる
      body.classList.add(cls); shadow.classList.add(cls);
    }
  }

  function spawnFx(kind, count) {
    // サイト方針でハート・キラキラは一切表示しない（呼び出し元は消さずに残しているので、
    // 復活させたくなったらこの1行を消すだけでいい）
    if (kind === 'heart' || kind === 'spark') return;
    if (reduceMotion && kind !== 'heart') return; // 控えめ設定ではキラキラ・zzzは出さず、ハートの一瞬のフェードだけ残す
    const n = count || (1 + Math.floor(Math.random() * 3));
    for (let i = 0; i < n; i++) {
      const el = document.createElement('span');
      el.className = kind === 'heart' ? 'mascot-heart' : kind === 'z' ? 'mascot-z' : 'mascot-spark';
      if (kind === 'heart' && Math.random() < 0.4) el.classList.add('filled');
      if (kind === 'spark') el.textContent = Math.random() < 0.5 ? '✦' : '✧';
      if (kind === 'z') el.textContent = 'z';
      const size = kind === 'heart' ? (12 + Math.random() * 10) : kind === 'z' ? (11 + Math.random() * 6) : (9 + Math.random() * 6);
      el.style.fontSize = size.toFixed(1) + 'px';
      el.style.left = (8 + Math.random() * 58) + '%';
      el.style.top = (-4 + Math.random() * 28) + '%';
      el.style.setProperty('--fx-x', (Math.random() * 16 - 8).toFixed(1) + 'px');
      el.style.animationDelay = Math.floor(Math.random() * 180) + 'ms';
      fx.appendChild(el);
      setTimeout(() => el.remove(), 2200);
    }
  }

  // トトノエ～ルのひとこと（吹き出し）。マスコットが画面外にいるときは、次に画面内へ戻った瞬間に出す
  let bubbleHideTimer = null;
  let queuedSay = null;
  function isOnScreen() {
    const b = bounds();
    return curLeft > -b.mSize * 0.6 && curLeft < b.vw - b.mSize * 0.4
      && curBottom > -b.mSize * 0.6 && curBottom < b.maxY + b.mSize * 0.6;
  }
  function showBubbleNow(text, holdMs) {
    if (!bubble || !bubbleText || !text) return;
    bubbleText.textContent = text;
    const b = bounds();
    const rel = (curLeft + b.mSize / 2) / b.vw;
    bubble.classList.remove('align-left', 'align-right');
    if (rel < 0.22) bubble.classList.add('align-left');
    else if (rel > 0.78) bubble.classList.add('align-right');
    bubble.classList.add('show');
    clearTimeout(bubbleHideTimer);
    bubbleHideTimer = setTimeout(() => bubble.classList.remove('show'), holdMs || 2200);
  }
  function mascotSay(text, holdMs) {
    if (isOnScreen()) showBubbleNow(text, holdMs);
    else queuedSay = { text, holdMs };
  }
  window.mascotSay = mascotSay;
  // 「今しゃべったばかり」の間は、雑談・その場のひとこと系のセリフは重ねて出さない
  // （記録・診断・タイマーなどの大事な一言はmascotSayを直接呼ぶので、このクールダウンの影響を受けない）
  let ambientSayCooldownUntil = 0;
  function ambientSay(text) {
    if (!text || nowMs() < ambientSayCooldownUntil) return;
    ambientSayCooldownUntil = nowMs() + 7000 + Math.random() * 5000;
    mascotSay(text);
  }

  // ノーマル→両手上げ の2コマ。はっきり喜んだ瞬間（元気な日の記録保存、など）に使う
  function doJoyBeat(holdMs) {
    setPose('front');
    setTimeout(() => {
      setPose('joy');
      setTimeout(() => { if (pose === 'joy') setPose(facingPose); }, holdMs || 1100);
    }, 120);
  }
  window.mascotJoy = doJoyBeat;

  // ノーマル→目見開き の2コマ。びっくりした瞬間（呼ばれた直後、など）に使う
  function doSurpriseBeat(holdMs) {
    setPose('front');
    setTimeout(() => {
      setPose('surprise');
      setTimeout(() => { if (pose === 'surprise') setPose('front'); }, holdMs || 500);
    }, 90);
  }
  window.mascotSurprise = doSurpriseBeat;

  // ノーマル（こっちを向く）→首かしげ の2コマ。クリックされた時の反応用。
  // ハート・キラキラ・セリフのような演出は挟まず、身体の反応だけにとどめる。
  // 呼び出し側でhopTimerを止めているので、この間は歩みも止まったまま
  function doTiltBeat(holdMs, onDone) {
    setPose('front');
    setTimeout(() => {
      setPose('tilt');
      setTimeout(() => { if (pose === 'tilt') setPose(facingPose); if (onDone) onDone(); }, holdMs || 900);
    }, 220);
  }

  // クリック反応その3：見つけた！ 驚いてから指を差す（今までバラバラだった「驚く」「指差す」を続けて見せる）
  function doNoticeBeat(onDone) {
    setPose('front');
    setTimeout(() => {
      setPose('surprise');
      setTimeout(() => {
        setPose('point');
        setTimeout(() => { if (pose === 'point') setPose(facingPose); if (onDone) onDone(); }, 650);
      }, 480);
    }, 220);
  }

  // ほめほめ係だけの特別演出：5回に1回、両手あげ(joy)を「ばんざーい！ばんざーい！」と
  // 2回連続で見せる（クリック反応では使わない。playDekitaReaction経由のmascotReactのみ）
  function doDoubleJoyBeat(onDone) {
    setPose('front');
    setTimeout(() => {
      setPose('joy');
      setTimeout(() => {
        setPose('front');
        setTimeout(() => {
          setPose('joy');
          setTimeout(() => {
            if (pose === 'joy') setPose('front');
            setTimeout(() => { if (pose === 'front') setPose(facingPose); if (onDone) onDone(); }, 450); // 2回目のばんざーいの後にも一拍あける
          }, 700);
        }, 450); // 1回目と2回目のばんざーいの間に一拍あける
      }, 700);
    }, 120);
  }

  // クリックされた時の反応その2：後方宙返り。首かしげ(doTiltBeat)と同じ立ち位置の反応で、
  // FLIP_POSES(flip1〜flip11)を順番に表示する。位置はFLIP_OFFSETSの弧、大きさはFLIP_SCALEで
  // 上書きするため、CSSの transition を切ってから適用し（切らないと.2sで後追いして間延びする）。
  // 11コマ目は参考画像の軌跡どおりmascot-normalの位置からは離れた場所に着地する。以前はここで
  // 素のmascot-normal（'front'・transformなし）に切り替えてCSSの.2s easeでふわっと定位置（＝
  // 宙返りを始めた場所）へ戻していたが、「せっかく着地した場所からまた出発地点へ戻ってしまう」
  // という見え方になっていた。着地時点の見た目の画面位置を実測し、その分だけ論理位置
  // (curLeft/curBottom)を進めてから位置(translate)ぶんのtransformを外すことで、着地した場所に
  // そのまま立たせる。
  //
  // 大きさ(scale)は位置とは切り離して扱う。宙返り中はFLIP_SCALEでimgの箱ごと1.559倍に拡大して
  // 表示しているため（元絵のキャラクターが小さく描かれている分の補正）、位置の確定と同時に
  // scaleも瞬時に1へ戻すと、箱の大きさが一瞬でガクッと縮んで見えてしまう（実際に確認された
  // 「宙返り後に急にマスコットが小さくなる」不具合）。かといってscaleそのものを連続的に1.559→1へ
  // 補間すると、今度はキャラクターがみるみる縮んでいく動きとして目立ってしまう（これも実際に
  // 確認済み：「ひゅ～んと緩やかに小さくなった」）。大きさが変わること自体を「動き」として見せず、
  // 他のポーズ切り替えと同じ仕組み（ゴースト画像を上に重ねてopacityだけフェードアウトさせる
  // クロスフェード）で、「絵がふわっと入れ替わった」だけに見せる。着地コマ(FLIP_SCALE適用済み)
  // をゴースト側に固定表示し、本体側は最初から等身大の歩行ポーズに切り替えてしまうことで、
  // scaleの値そのものを連続的に動かさずに大きさの変化をなじませる
  function doBackflipBeat(onDone) {
    const frameMs = 120;
    let i = 0;
    // imgには.site-mascot-imgのCSSで`transition: transform .2s ease`と`:active{transform:scale(.94)}`
    // が乗っている（つまんで動かせる感触を出すため）。指を離した直後（:active解除）はブラウザが
    // すでに「.94→通常」への.2s eased遷移を開始していることがあり、その直後に1フレーム目で
    // transitionをnoneにしてもreflowを挟まないと反映が間に合わず、1フレーム目のtransform
    // （通常→FLIP_SCALE=1.559倍）そのものがなだらかに.2sかけてアニメーションしてしまい、
    // 「宙返りの始めに一瞬大きくなってすぐ戻る」ように見える不具合になる（実際にスマホで確認された）。
    // PCではタイミングの違いから目立たなかった。void img.offsetWidthで強制的にreflowさせ、
    // transition:noneを確実に反映させてから1フレーム目のtransformを適用する
    img.style.transition = 'none';
    void img.offsetWidth;
    // 影のCSSアニメ（呼吸など、常時transformを上書きし続ける）を止め、毎フレームのinline指定を
    // 反映させる。止めないとアニメ側が優先されてしまい、下でshadow.style.transformを書き換えても
    // 見た目に反映されず「影だけその場に取り残される」ことになる
    shadow.style.animation = 'none';
    (function nextFrame() {
      setPose(FLIP_POSES[i]);
      // 実機のflipdebugログ（getComputedStyleの実測）ではsx/sy/depthとも常に正しい値
      // (1.559 / 0.93等)のまま一切ぶれていなかった。それでも見た目だけ一瞬大きくなる＝
      // CSSOM上は正しいのに実際に描画されたピクセルだけが違う、GPU合成側の問題
      // （[[feedback-mascot-gpu-3d-squish]]と同じ種類の不具合）と判断。歩行ポーズ(正方形の
      // 画像)から宙返り1コマ目(700x600・縦横比が違う画像)へimg.srcが切り替わる瞬間、
      // object-fit:containの再計算がまだ済んでいない縦横比のままtransformだけ先に
      // 適用されるコマ落ちが起きている可能性が高いため、src切り替えの直後にreflowを
      // 挟んで確定させてからtransformを適用する
      void img.offsetWidth;
      const o = FLIP_OFFSETS[i];
      img.style.transform = `translate(${o.x}%, ${o.y}%) scale(${FLIP_SCALE})`;
      const so = FLIP_SHADOW_OFFSETS[i];
      shadow.style.transform = `translateX(-50%) translateX(${so.x}%) scale(${so.scale})`;
      i++;
      if (i < FLIP_POSES.length) setTimeout(nextFrame, frameMs);
      else setTimeout(() => {
        const landed = img.getBoundingClientRect(); // まだ最終コマのtransform(位置+大きさ)が乗った状態の見た目位置
        // 基準にするのは単なる「transformなし」ではなく、mascot-normalとキャラクターの大きさ・
        // 中心がぴったり重なるよう実測校正したtransform(FLIP_LANDING_SCALE / FLIP_LANDING_ALIGN)。
        // 後方宙返り11.pngとmascot-normal.pngを実際にcanvasへobject-fit:containと同じロジックで
        // 描画し、不透明ピクセルのバウンディングボックス中心を比較して算出した値（「着地の瞬間に
        // 大きさが変わって見える／ぴったり重ならない」という実際に確認された不具合の原因が、
        // 単純なtransformなし＝mascot-normalとの間にもともと大きさ・位置のズレがあったこと
        // だったため）。この同じtransformを、位置の測定・ゴーストの見た目の両方に使うことで、
        // 「フェード開始時の見た目」「フェード先のmascot-normal」「着地位置」の3つを一致させる
        const homeTransform = `translate(${FLIP_LANDING_ALIGN.x}%, ${FLIP_LANDING_ALIGN.y}%) scale(${FLIP_LANDING_SCALE})`;
        img.style.transform = homeTransform; // transitionはまだ'none'のままなので瞬時に反映される
        const home = img.getBoundingClientRect();
        const dx = (landed.left + landed.width / 2) - (home.left + home.width / 2);
        const dy = (landed.top + landed.height / 2) - (home.top + home.height / 2);
        const b = bounds();
        curLeft = Math.min(b.vw - b.mSize * 0.3, Math.max(-b.mSize * 0.3, curLeft + dx));
        curBottom = Math.min(b.maxY, Math.max(0, curBottom - dy));
        applyPositionInstant();
        shadow.style.transform = ''; // 影の制御をCSS（setMotionのクラス切り替え）へ返す
        shadow.style.animation = '';
        // 位置はここで確定。大きさの変化は、ゴーストに「着地コマ(実測校正済みtransform)」を
        // 固定表示させたままフェードアウトし、その裏で本体を最初から等身大の歩行ポーズに
        // しておくことで、scale自体をアニメーションさせずになじませる（setPose内蔵のクロス
        // フェードは宙返り関連の切り替え(isFlipTransition)だとスキップされる仕様のため、ここでは
        // 使わず、ゴーストの表示・状態(pose変数)の更新・本体img.srcの切り替えを直接行う）
        if (ghost && !reduceMotion) {
          ghost.style.transition = 'none';
          ghost.src = img.src; // まだ後方宙返り11コマ目のまま
          ghost.style.transform = homeTransform; // 実測校正済み：mascot-normalと大きさ・位置がぴったり重なる
          ghost.style.opacity = '1';
          void ghost.offsetWidth; // reflow
        }
        img.style.transform = '';
        void img.offsetWidth; // reflowを挟んでtransform:''を確定させてからtransitionを戻す（順序が逆だと今度は着地時にtransformの変化がアニメーションして見えてしまう）
        img.style.transition = ''; // CSSの`transition: transform .2s ease`(つまんだ時の縮み等)を復帰させる
        // 着地した瞬間は歩行ポーズ(facingPose)へ直接つなげず、いったん正面向き('front')にする。
        // 宙返り直後は体の向きが定まっていない状態なので、そこから斜め歩行の「足を踏み出した
        // 途中」のポーズへいきなり切り替わると、「なぜこの姿勢に？」という繋がりの悪さが出る
        // （実際に確認された不具合：「ポーズ自体が変」）。「着地してこちらを向く→向き直って
        // 歩き出す」という一拍を挟むことで、着地からのポーズのつながりを自然にする。
        // 'front'は経由するが、以前問題になった「正面のまま長く止まって見える」こととは別物：
        // ここでの'front'表示はbouncingの一拍(400ms)だけで、そのあとはsetPose(facingPose)の
        // 通常のクロスフェードでそのまま歩行の向きへ滑らかに移る
        //
        // 歩き出す向きは、宙返り前にどちらを向いていたか(facingPose)ではなく、必ず左向きに
        // 揃える。後方宙返りの11コマは反転画像を持たない固定の絵で、常に画面の左方向へ
        // 動く軌道になっている（FLIP_OFFSETSが常に負方向＝左）。そのため宙返り前に右向きに
        // 歩いていた場合、そのままfacingPoseを引き継ぐと「右へ歩いていた→宙返りで左へ動く→
        // 着地後また右へ歩き出す」という向きのジグザグになり、クロスフェードをどれだけ滑らかに
        // しても不自然さが残っていた（実際に確認された不具合）。宙返りの移動方向と歩き出す
        // 向きを一致させることで、一連の動きが同じ左方向への流れとして繋がるようにする
        facingSide = 'left';
        facingPose = 'diag-left';
        walkCycleStep = 0;
        pose = 'front'; // クロスフェードは自前で行うのでsetPoseは呼ばない
        img.src = POSES.front;
        if (ghost && !reduceMotion) {
          // ゴーストはopacityだけをフェードさせ、大きさ(scale(FLIP_SCALE))はフェード中ずっと固定する。
          // ここでtransformも一緒に1へ戻すと、フェードしながら縮んでいく「大きい影が縮む」動きが
          // 本体(既に等身大)と重なって見えてしまい、結局「大きくなったり小さくなったりする」ように
          // 見えてしまう（実際に確認された不具合）。フェードが終わったらtransformもまとめて片付ける
          ghost.style.transition = 'opacity .2s ease';
          ghost.style.opacity = '0';
          setTimeout(() => { ghost.style.transform = ''; ghost.style.transition = ''; }, 220);
        } else if (ghost) {
          ghost.style.transition = 'none';
          ghost.style.opacity = '0';
          ghost.style.transform = '';
        }
        // 着地の衝撃を「ぽよん」と弾む動き（つまんで離した時などと同じbouncing）で一拍見せてから
        // 歩き出す。位置が決まった直後にいきなり歩行ポーズの絵へ差し替えるだけだと、静止画が
        // パッと入れ替わっただけのように見えて不自然だったため、「着地の勢いを受け止める→
        // 向き直って歩き出す」という間をはさむ
        setMotion('bouncing');
        setTimeout(() => {
          setMotion(null);
          if (pose === 'front') setPose(facingPose); // 正面から歩行の向きへ、通常のクロスフェードでなじませる
          if (onDone) onDone();
        }, 400);
      }, 260);
    })();
  }

  // ノーマル→両手あげ(ryouteage) の一連の「手を振る」シーケンス。
  // lingerMsを指定すると、両手あげの後すぐ横を向いて歩き出すのではなく、
  // 一度ノーマル（正面）に戻って少し「まだこっちを見ている」間を置いてから向き直る
  function doWaveSequence(onDone, holdMs, lingerMs) {
    setPose('front');
    setTimeout(() => {
      setPose('wave');
      setTimeout(() => {
        if (lingerMs) {
          setPose('front');
          setTimeout(() => { if (pose === 'front') setPose(facingPose); if (onDone) onDone(); }, lingerMs);
        } else {
          setPose(facingPose);
          if (onDone) onDone();
        }
      }, holdMs || 900);
    }, 120);
  }

  // ノーマル→首かしげ の2コマ。「休めた」系の記録用。休むことも立派、というニュアンスで使う。
  // 以前はmascot-lie（寝そべり）だったが、禁止リストの画像は一切使わない方針に合わせて変更
  function doRestBeat(holdMs) {
    setPose('front');
    setTimeout(() => {
      setPose('tilt');
      setTimeout(() => { if (pose === 'tilt') setPose(facingPose); }, holdMs || 1000);
    }, 150);
  }

  // ちょっと嬉しい瞬間の複合リアクション（保存・診断完了・タイマー区切り・クリック等から呼ばれる）
  // 大きめの出来事は両手あげ(ryouteage)で一連の動作を見せる、軽い出来事は♡だけ。歩行は止めない
  function mascotReact({ heart = true, spark = false, motion = 'poyon', wave = false, joy = false, rest = false, say = null, essential = false, doubleWaveChance = 0, onDone = null } = {}) {
    if (!essential && mascotExpressionPaused) return; // 一時停止中：できたよ！アルバム以外の反応は何もしない
    setMotion(null);
    void body.offsetWidth; // 同じアニメーションが連続しても再始動できるようにする
    // poyon/bouncingはscaleX/scaleYが非対称に動くスクワッシュ&ストレッチ演出で、その最中に
    // 両手あげ(wave/joy)の絵へ切り替わると、ちょうどそのタイミングだけ本当に縦横比が崩れて
    // 見える（デバッグ計測で実測：切り替わった瞬間にscaleX=1.026/scaleY=0.951等になっていた）。
    // 両手あげ自体がもう十分に大きな見た目の変化なので、wave/joyのときはこの土台の
    // スクワッシュ演出を重ねない
    if (!reduceMotion && !wave && !joy) setMotion(motion === 'bounce' ? 'bouncing' : 'poyon');
    // ほめほめ係(playDekitaReaction)だけがdoubleWaveChanceを渡してくる。その確率で、
    // いつもの両手あげ1回ではなく「ばんざーい！ばんざーい！」と2回連続で見せる
    const doubleBanzai = wave && !reduceMotion && doubleWaveChance > 0 && Math.random() < doubleWaveChance;
    if (joy && !reduceMotion) {
      doJoyBeat(1100);
    } else if (doubleBanzai) {
      doDoubleJoyBeat();
    } else if (wave && !reduceMotion) {
      doWaveSequence(null, null, 1000);
    } else if (rest && !reduceMotion) {
      doRestBeat(1000);
    } else {
      setPose('front');
    }
    if (heart) spawnFx('heart', 1 + Math.floor(Math.random() * 2));
    if (spark) setTimeout(() => spawnFx('spark', 1 + Math.floor(Math.random() * 2)), 260);
    if (say) mascotSay(say);
    const total = reduceMotion ? 50 : (doubleBanzai ? 2500 : wave ? 2100 : joy ? 1300 : rest ? 1150 : 900);
    setTimeout(() => { setMotion(null); if (!wave && !joy && !rest && pose === 'front') setPose(facingPose); if (onDone) onDone(); }, total);
  }
  window.mascotReact = mascotReact;
  window.isMascotExpressionPaused = () => mascotExpressionPaused;

  if (reduceMotion) {
    // 「アニメーションを減らす」設定：常時横断はせず、右下の定位置で控えめに佇む
    const b = bounds();
    curLeft = b.vw - 14 - b.mSize;
    curBottom = 14;
    applyPositionInstant();
    let clickCooldown = 0;
    img.addEventListener('click', () => {
      if (nowMs() < clickCooldown) return;
      clickCooldown = nowMs() + 1200;
      doTiltBeat();
    });
    return;
  }

  // 速度3段階：のんびり・ふつう・急ぎ。1回の横断の間はだいたい同じ速度を保つ。
  // 1コマ350ms（ふつう）を基準に据え、そこから軽く振れる範囲にとどめている
  // （実際に見本で速度を試してもらい、350msが一番自然に見えるという結果から調整）
  function pickSpeedTier() {
    const r = Math.random();
    const tier = r < 0.22 ? { name: 'fast', hopDist: 62, hopDur: 300 }
      : r < 0.78 ? { name: 'normal', hopDist: 46, hopDur: 350 }
      : { name: 'slow', hopDist: 30, hopDur: 460 };
    return tier;
  }
  // 小走り：呼ばれた時など「急いで駆けてくる」演出専用の速い足取り（1コマ250ms）。
  // 通常のランダム歩行では選ばれない、明示的に呼び出す用の特別な速度
  const RUN_TIER = { name: 'run', hopDist: 85, hopDur: 250 };

  // 入力中の欄の高さ帯を避けつつ、横断する高さ(Y)を選ぶ
  function pickLaneY(b) {
    let y = Math.random() * b.maxY;
    if (typing && typingRect) {
      const loTop = b.vh - typingRect.bottom, hiTop = b.vh - typingRect.top;
      const lo = Math.min(loTop, hiTop) - 36, hi = Math.max(loTop, hiTop) + 36;
      if (y > lo && y < hi) y = (hi + 50 < b.maxY) ? hi + 50 : Math.max(0, lo - 50);
    }
    return Math.min(b.maxY, Math.max(0, y));
  }

  // 次に歩く経路の始点(画面外)と終点(画面外)を決める。水平85%・斜め（画面の隅から隅へ）15%。
  // 以前あった「正面で近づく／後ろ姿で遠ざかる」奥行き移動は、向きの切り替わりが唐突で
  // 違和感が強いというフィードバックを受けて廃止した（deepという概念自体をもう作らない）。
  // 「画面外」は必ずビューポートの本当の外（vh基準）にする。maxYはヘッダーを避けるための内側の
  // 安全境界にすぎないので、そこを基準にすると実際には画面内（ヘッダー付近）で止まってしまう
  function pickCrossingEndpoints() {
    const b = bounds();
    const off = b.mSize + 30;
    const offAbove = b.vh + off; // 上方向の「画面外」＝ビューポート最上部のさらに外（curBottomがvhを超える＝画面上端より上）
    const r = Math.random();
    let from, to;
    if (r < 0.85) {
      const leftToRight = Math.random() < 0.5;
      const y = pickLaneY(b);
      from = { x: leftToRight ? -off : b.vw + off, y };
      to = { x: leftToRight ? b.vw + off : -off, y: Math.min(b.maxY, Math.max(0, y + (Math.random() * 2 - 1) * b.maxY * 0.12)) };
    } else {
      const corners = [
        [{ x: -off, y: -off }, { x: b.vw + off, y: offAbove }],
        [{ x: b.vw + off, y: -off }, { x: -off, y: offAbove }],
        [{ x: -off, y: offAbove }, { x: b.vw + off, y: -off }],
        [{ x: b.vw + off, y: offAbove }, { x: -off, y: -off }],
      ];
      [from, to] = corners[Math.floor(Math.random() * corners.length)];
    }
    return { from, to, deep: false };
  }

  // pickCrossingEndpoints()のtoは常に画面外の左端(-off付近)か右端(vw+off付近)のどちらか。
  // dirで指定した向き（'left'=左へ進む、'right'=右へ進む）に合うtoが出るまで選び直す。
  // 真横・斜めどちらの経路が選ばれても構わないが、水平方向だけは逆走(Uターン)させない
  function pickContinuingEndpoint(dir, fromX) {
    let picked = pickCrossingEndpoints();
    for (let i = 0; i < 8; i++) {
      const movingRight = picked.to.x > fromX;
      if ((dir === 'right') === movingRight) break;
      picked = pickCrossingEndpoints();
    }
    return picked;
  }

  function startCrossing() {
    energy = computeEnergy();
    root.classList.toggle('energy-low', energy === 'low');
    const { from, to, deep } = pickCrossingEndpoints();
    curLeft = from.x; curBottom = from.y;
    crossing = { from, to, speed: pickSpeedTier(), deep };
    applyPositionInstant();
    updateFacing(to.x - curLeft, to.y - curBottom);
    scheduleHop(150);
  }

  function scheduleHop(delay) {
    clearTimeout(hopTimer);
    hopTimer = setTimeout(doHop, delay);
  }

  function calmFactor() {
    // 集中タイマー中・診断回答中・しんどい日は、止めずにテンポだけ落とす
    let f = 1;
    if (computeCalm()) f *= 1.7;
    if (energy === 'low') f *= 1.5;
    return f;
  }

  // 急に思い直したように少し引き返してから、また元の目的地へ向かう（20〜30歩に1回程度・説明なしの唐突な反転）
  function doReversal() {
    lastReversalAt = nowMs();
    const dx0 = crossing.to.x - curLeft, dy0 = crossing.to.y - curBottom;
    const dist0 = Math.hypot(dx0, dy0) || 1;
    const backDist = crossing.speed.hopDist * (2 + Math.random() * 2);
    const bx = curLeft - dx0 / dist0 * backDist, by = curBottom - dy0 / dist0 * backDist;
    updateFacing(bx - curLeft, by - curBottom);
    curLeft = bx; curBottom = by;
    const dur = crossing.speed.hopDur * calmFactor() * 1.05;
    applyPosition(dur);
    setMotion('walking');
    setTimeout(() => setMotion(null), dur * 0.9);
    scheduleHop(dur + 300 + Math.random() * 300);
  }

  // 座り/寝そべり/接近から起きて再び歩き出す瞬間は、真横へいきなり切り替えず
  // 「（タメ）→正面→斜め→足前」の順でなじませてから歩き出す。動き出す方向と逆にほんの一瞬
  // 沈み込む「アンティシペーション」を挟むと、歩き出しに勢いがついて見える（アニメ12原則の1つ）。
  // 呼び出し側が直後にsetMotion()を呼ぶと、このアンティシペーションのクラスがまだ乗っている途中で
  // 上書き・削除されてしまい（連続したclassList操作がぶつかる)、タメが一瞬も見えずに終わる・
  // 前のモーション（座りからの「むくっ」等）と衝突する、という不具合があったため、
  // 「イントロが完全に終わってから呼び出し側の処理を続ける」onReadyコールバックに統一した
  function startWalkFacing(dir, onReady) {
    const diag = dir === 'left' ? 'diag-left' : 'diag-right';
    const seq = WALK_CYCLE[dir];
    if (!reduceMotion) setMotion('anticipate');
    else setMotion(null);
    setTimeout(() => {
      setMotion(null);
      setPose('front');
      setTimeout(() => {
        setPose(diag);
        setTimeout(() => {
          facingSide = dir; facingPose = diag;
          setPose(seq[1]); // 斜めの次は、その向きの「〜足前」から歩行サイクルに合流する
          walkCycleStep = 2;
          if (onReady) onReady();
        }, 210);
      }, 190);
    }, 160);
  }

  // まばたきは必ず「正面→まばたき→正面」のワンセットで行う。歩いている向き(斜め/真横)の
  // まま急に目を閉じることはしない（その場合はいったん正面に戻ってからまばたきする）。
  // MASCOT_POSE_ENABLED.blinkがfalseの間は、まばたき画像自体を出さないので何もしない
  function blinkSet(holdMs) {
    if (!MASCOT_POSE_ENABLED.blink) return;
    setPose('front');
    setTimeout(() => {
      setPose('blink');
      setTimeout(() => setPose('front'), holdMs || (170 + Math.random() * 110));
    }, 150);
  }

  // 目的地に着く前に、その場でくるっと(向き→斜め→後ろ姿→反対の斜め→反対向き)振り返って来た方向へ戻る。
  // 追加した斜め絵を使うことで、後ろ姿を挟む一瞬が「パッ」ではなく「くるっ」と自然に見える
  function doTurnAroundAndHeadBack() {
    lastTurnAroundAt = nowMs();
    const wasRight = facingPose === 'right' || facingPose === 'diag-right';
    const mid = MASCOT_POSE_ENABLED.back ? 'back' : 'front';
    const seq = wasRight ? ['diag-right', mid, 'diag-left'] : ['diag-left', mid, 'diag-right'];
    const stepMs = 210;
    // swayingのCSSアニメは既定1.1秒だが、この振り向きは420msで終わるため、アニメ半ばで
    // setMotion(null)によって突然リセットされ「パキッ」と見えていた。実際の所要時間に
    // 合わせてanimation-durationを指定し、回転がちょうど収まるところで終わるようにする
    setMotion('swaying', stepMs * 2);
    setPose(seq[0]);
    setTimeout(() => {
      setPose(seq[1]);
      if (MASCOT_POSE_ENABLED.back && Math.random() < 0.3) ambientSay(pickMascotLine('actionBack'));
      setTimeout(() => {
        setPose(seq[2]);
        facingPose = wasRight ? 'diag-left' : 'diag-right';
        setMotion(null);
        crossing.to = { x: crossing.from.x, y: Math.min(bounds().maxY, Math.max(0, curBottom + (Math.random() * 2 - 1) * 60)) };
        scheduleHop(220);
      }, stepMs);
    }, stepMs);
  }

  // 歩行中に立ち止まって、こっちをじっと見る、またはひと呼吸まばたきしてから同じ横断を続ける。
  // 左右へのちら見・振り向きはしない（方向転換は、画面端まで歩いて行って次の横断が
  // 始まる時だけにする。首かしげ(tilt)はクリックされた時専用の反応）
  function doLookAround() {
    if (MASCOT_POSE_ENABLED.blink && Math.random() < 0.3) {
      blinkSet();
    } else {
      // ぷらぷら揺れる（swaying）のは、正面を向いている時だけにする。横向きのまま揺らすと
      // 傾いて倒れそうに見えて不自然だったため
      setMotion('swaying');
      setPose('front'); // こっちを向いて、じっと見つめてくる一コマ
      setTimeout(() => { if (pose === 'front') setPose(facingPose); }, 600 + Math.random() * 500);
    }
    if (Math.random() < 0.22) ambientSay(pickMascotLine(Math.random() < 0.5 ? 'idle' : 'whimsy'));
    const pause = (900 + Math.random() * 1400) * calmFactor();
    setTimeout(() => setMotion(null), pause * 0.6);
    scheduleHop(pause);
  }

  // 横断が終わった直後、歩き直す前に少しこっちを見てから次の横断へ（気まぐれな一呼吸）
  function doGlanceThenStart() {
    if (MASCOT_POSE_ENABLED.blink && Math.random() < 0.3) {
      blinkSet();
    } else {
      // ぷらぷら揺れるのは正面向きの時だけ（理由はdoLookAround参照）
      setMotion('swaying');
      setPose('front'); // こっちを向いて、じっと見つめてくる一コマ
      setTimeout(() => { if (pose === 'front') setPose(facingPose); }, 550 + Math.random() * 450);
    }
    if (Math.random() < 0.22) ambientSay(pickMascotLine(Math.random() < 0.5 ? 'idle' : 'whimsy'));
    const pause = (900 + Math.random() * 1300) * calmFactor();
    setTimeout(() => setMotion(null), pause * 0.6);
    hopTimer = setTimeout(startCrossing, pause);
  }

  // 横断が終わった場所で、ちょこんと座って一休み。「疲れて倒れた」ではなく気ままな小休止
  function doSitRest() {
    setMotion('bouncing');
    const dir = (facingPose === 'left' || facingPose === 'diag-left') ? 'left' : 'right';
    setTimeout(() => { setMotion(null); setPose(dir === 'left' ? 'sit-left' : 'sit-right'); }, 160);
    if (Math.random() < 0.4) setTimeout(() => ambientSay(pickMascotLine('actionSit')), 500);
    const restDur = (2200 + Math.random() * 2600) * calmFactor();
    setTimeout(() => {
      setMotion('bouncing'); // むくっ、と立ち上がる
      setTimeout(() => {
        setMotion(null);
        startWalkFacing(dir, () => {
          hopTimer = setTimeout(startCrossing, 120 + Math.random() * 150);
        });
      }, 400);
    }, restDur);
  }

  // レア：横断が終わった場所でごろんと寝そべる。ここぞという時だけの特別な休憩。
  // fromIdle=trueのときは「長く放置されたので寝落ちした」扱いにして、長めに寝て、
  // ユーザーが操作した瞬間にmarkInteraction()側からいつでも起こされるようにする
  // 以前はここでmascot-lie（寝そべり）に切り替えていたが、禁止リストの画像は一切使わない
  // 方針に合わせて正面に立ったままにした。Zの演出も、寝そべる絵がないまま出すと
  // 「なぜZが出るのか」と不自然に見えるとの指摘を受け、あわせて廃止した
  function doLieDown(fromIdle) {
    setMotion('bouncing');
    const dir = (facingPose === 'left' || facingPose === 'diag-left') ? 'left' : 'right';
    setTimeout(() => { setMotion(null); setPose('front'); }, 180);
    if (fromIdle) { idleSleeping = true; }
    if (!fromIdle && Math.random() < 0.5) setTimeout(() => ambientSay(pickMascotLine('actionLie')), 500);
    const restDur = fromIdle ? (7000 + Math.random() * 5000) : (3600 + Math.random() * 3200) * calmFactor();
    sleepWakeTimer = setTimeout(() => {
      idleSleeping = false;
      setMotion('bouncing'); // むくっ
      setTimeout(() => {
        setMotion(null);
        startWalkFacing(dir, () => {
          hopTimer = setTimeout(startCrossing, 120 + Math.random() * 150);
        });
      }, 420);
    }, restDur);
  }

  // 歩きながら「あ、見つけた」♡（移動そのものは止めない。表情は変えず、ハートだけで表現する）
  function miniHeartEvent() {
    if (mascotExpressionPaused) return;
    spawnFx('heart', 1);
    if (Math.random() < 0.4) setTimeout(() => spawnFx('spark', 1), 200);
  }

  // レア：画面中ほどまでこっちを向いて近づいてきて、目が合ったようにひとことハート→
  // 少し恥ずかしそうにさっと離れていく。正面画像を「近づく」演出として使う唯一の場所。
  // 近づくほど大きく見せる（かなり大胆に拡大してよい、という方針）
  // 「ちょっと見てくる」：今いる場所からいったん画面の上のほうまで歩いていき、ちょこんと指して
  // （指さし手振り兼用のpointポーズを使う）一言添えてから、また元の気ままな徘徊に戻る。
  // 天気タブを開いた時などに使う
  function doGuideCheck(say) {
    if (mascotExpressionPaused) return; // 一時停止中：わざわざ歩いて見せに行くほどの用事は今はない
    clearTimeout(hopTimer);
    crossing = null;
    const b = bounds();
    const targetX = Math.min(b.vw - b.mSize - 10, Math.max(10, b.vw * (0.2 + Math.random() * 0.6) - b.mSize / 2));
    const targetY = Math.min(b.maxY, b.maxY * (0.7 + Math.random() * 0.2));
    const dist = Math.hypot(targetX - curLeft, targetY - curBottom);
    const walkDur = (500 + Math.min(1400, dist * 3)) * calmFactor();
    const dir = curLeft < targetX ? 'right' : 'left';
    startWalkFacing(dir, () => {
      setMotion('walking');
      tweenPosition(targetX, targetY, walkDur, () => {
        setMotion(null);
        setPose('point'); // 指さし
        if (say) mascotSay(say, 2600);
        setTimeout(() => {
          setPose(facingPose);
          hopTimer = setTimeout(startCrossing, 600 + Math.random() * 400);
        }, 2300);
      });
    });
  }
  window.mascotGuideCheck = doGuideCheck;

  function doEncounter() {
    const b = bounds();
    const targetX = Math.min(b.vw - b.mSize - 10, Math.max(10, b.vw * 0.5 - b.mSize / 2 + (Math.random() * 2 - 1) * b.vw * 0.18));
    const targetY = Math.min(b.maxY, Math.max(b.maxY * 0.2, b.maxY * 0.5 + (Math.random() * 2 - 1) * b.maxY * 0.25));
    const dist = Math.hypot(targetX - curLeft, targetY - curBottom);
    const walkDur = (500 + Math.min(1400, dist * 3)) * calmFactor();
    const dir = curLeft < targetX ? 'right' : 'left';
    setPose(dir === 'right' ? 'diag-right' : 'diag-left');
    setMotion('walking');
    tweenPosition(targetX, targetY, walkDur, () => {
      setMotion(null);
      setPose('front');
      applyPosition(650, ambientDepth() + 0.42); // かなり大きく＝ぐっと近づいた感じ
      setTimeout(() => {
        setMotion('poyon');
        spawnFx('heart', 1);
        mascotSay(pickMascotLine('approach'));
        setTimeout(() => setMotion(null), 700);
      }, 680);
      const holdDur = 2000 + Math.random() * 1000;
      setTimeout(() => {
        applyPosition(500); // 通常の遠近に戻す
        const flee = Math.random() < 0.5 ? 'left' : 'right';
        startWalkFacing(flee, () => {
          hopTimer = setTimeout(startCrossing, 120 + Math.random() * 150);
        });
      }, 680 + holdDur);
    });
  }

  // 横断が終わった瞬間の「次に何をするか」：休憩中はほぼ座る/寝そべる、長く放置されていたら
  // 寝落ちしやすくする（ユーザーが操作するとmarkInteraction側から起こしにいく）、それ以外はいろいろ混ぜる
  function finishCrossing() {
    crossing = null;
    const onBreak = computeOnBreak();
    const idleLong = (nowMs() - lastInteractionAt) > 75000;
    const r = Math.random();
    if (onBreak) {
      if (r < 0.32) { doLieDown(); return; }
      if (MASCOT_SIT_ENABLED) { doSitRest(); return; }
      doGlanceThenStart();
      return;
    }
    if (idleLong && r < 0.55) { doLieDown(true); return; }  // 長く放置：寝落ちしやすく
    if (!mascotExpressionPaused && r < 0.07) { doEncounter(); return; } // レア：目が合う・近づいてくる（急に近づいて見えるため、一時停止中は行わない）
    if (r < 0.16) { doLieDown(); return; }              // レア：寝そべる
    if (MASCOT_SIT_ENABLED && r < 0.47) { doSitRest(); return; } // よくある：座って一休み
    if (r < 0.68) { doGlanceThenStart(); return; }      // キョロキョロしてすぐ次へ
    const pause = (500 + Math.random() * 1000) * calmFactor(); // 何事もなく、すぐ次の横断へ
    hopTimer = setTimeout(startCrossing, pause);
  }

  function doHop() {
    if (!crossing) return;
    const onBreak = computeOnBreak();
    const dx0 = crossing.to.x - curLeft, dy0 = crossing.to.y - curBottom;
    const dist0 = Math.hypot(dx0, dy0);
    if (dist0 < 24) { finishCrossing(); return; }

    if (onBreak && MASCOT_POSE_ENABLED.blink && Math.random() < 0.03) {
      // 休憩中のちょっと眠そうな一コマも、まばたきは正面からのワンセットで行う
      setMotion('swaying');
      setPose('front');
      setTimeout(() => {
        setPose('blink');
        spawnFx('z', 1);
        setTimeout(() => { setPose('front'); setMotion(null); }, 1400);
      }, 150);
      scheduleHop(1850);
      return;
    }
    if (!crossing.deep) {
      if (MASCOT_ABRUPT_TURNS_ENABLED && nowMs() - lastReversalAt > 4500 && Math.random() < 0.035) { doReversal(); return; }
      if (MASCOT_ABRUPT_TURNS_ENABLED && nowMs() - lastTurnAroundAt > 6000 && dist0 < Math.max(bounds().vw, bounds().vh) * 0.4 && Math.random() < 0.12) { doTurnAroundAndHeadBack(); return; }
      if (Math.random() < 0.08) { doLookAround(); return; } // こっちを向いてくれる頻度を上げるため、少し多めに
      if (Math.random() < 0.025) miniHeartEvent();
      if (Math.random() < 0.02) ambientSay(pickMascotLine(Math.random() < 0.5 ? 'idle' : 'whimsy'));
    }

    const wasOnScreen = isOnScreen();
    // 歩幅・歩調のばらつきを抑える（前は±20%/±8.5%だったが、歩くたびに速さが変わって見えて
    // 落ち着かないというフィードバックを受けて、1回の横断内ではほぼ一定の歩調になるよう縮小）
    const step = Math.min(dist0, crossing.speed.hopDist * (0.94 + Math.random() * 0.12));
    updateFacing(dx0, dy0);
    curLeft += dx0 / dist0 * step;
    const b = bounds();
    curBottom = Math.min(b.vh + b.mSize + 60, Math.max(-(b.mSize + 60), curBottom + dy0 / dist0 * step));
    // 真横（水平）方向に近い移動ほど、同じ歩幅の全量がそのまま横方向の速さに直結してしまい、
    // 斜めに歩くときより体感的に速く見えてしまう。水平成分の割合に応じて所要時間を少し延ばし、
    // 真横移動のときだけ気持ち遅く感じるように揃える
    const horizRatio = dist0 > 0 ? Math.abs(dx0) / dist0 : 0;
    // 斜め移動（コーナー間や縦揺れの大きい横断）は今まで通りの速さのまま、ほぼ真横のときだけ
    // わずかに遅くする。しきい値0.9未満（斜め移動はだいたいここに収まる）は一切遅くしない
    const horizSlow = Math.max(0, (horizRatio - 0.9) / 0.1);
    const hopDur = crossing.speed.hopDur * calmFactor() * (0.98 + Math.random() * 0.04) * (1 + horizSlow * 0.06);
    applyPosition(hopDur);
    setMotion('walking', hopDur); // bobの上下動を、この一歩の実時間ちょうどに合わせて再生する
    setTimeout(() => { if (crossing) setMotion(null); }, hopDur * 0.9);
    scheduleHop(hopDur);

    const nowOnScreen = isOnScreen();
    if (queuedSay && nowOnScreen) { const q = queuedSay; queuedSay = null; showBubbleNow(q.text, q.holdMs); }
    else if (!wasOnScreen && nowOnScreen && Math.random() < 0.1) ambientSay(pickMascotLine('enterScreen'));
    else if (wasOnScreen && !nowOnScreen && Math.random() < 0.1) ambientSay(pickMascotLine('exitScreen'));
  }

  // 「呼ぶ」：画面のどこにいても、いったん歩み寄って中央付近まで来て振り向く
  // 歩行サイクルを、指定した速さ・向きでdurationMsの間だけ回し続ける（callOverの「小走り」用）
  function runLegCycle(dir, durationMs, frameMs) {
    const seq = WALK_CYCLE[dir];
    let step = 2; // startWalkFacingが「斜め→足前」まで進めている続きから
    const startAt = nowMs();
    (function tick() {
      if (nowMs() - startAt >= durationMs || pose === 'front') return; // 到着後front化したら止める
      setPose(seq[step % seq.length]);
      step++;
      setTimeout(tick, frameMs);
    })();
  }
  // 「おいで」：今いる位置に関わらず、画面の端でまずこっちを向いてから、歩いて近づいてくる。
  // 完全に画面の外から始めると「見てから動く」の“見て”の部分が見えないので、端のすぐ内側
  // （見える位置）に登場させ、まず正面でこっちを見せてから歩き出す
  // onArriveを渡すと、到着後は「呼んだ〜？」の定型セリフではなく、そのコールバックに差し替わる
  // （できたよ！アルバムの保存時など、マスコットの反応を必ず見える位置で見せたい場面から使う）
  function callOver(onArrive) {
    clearTimeout(hopTimer);
    crossing = null;
    const b = bounds();
    const targetX = b.vw / 2 - b.mSize / 2;
    const targetY = b.maxY * 0.4;
    // 今いた側に近い画面端をいったん出口＝入口にする（同じ側から出入りする方が自然に見えるため）
    const dir = curLeft < b.vw / 2 ? 'right' : 'left';
    lastApproachDir = dir;
    curLeft = dir === 'right' ? 10 : b.vw - b.mSize - 10;
    curBottom = targetY;
    applyPositionInstant();
    // 呼び寄せている間は主役として見せる場面なので、通常の奥行き演出（高い位置にいるほど
    // 遠近感で小さく見せる）による縮小をかけない。呼び寄せ〜反応〜一拍の間ずっと等身大のまま
    // 見せる（実際に「万歳の後ずっと縮んで見える」不具合として確認された：targetYが画面の
    // 4割の高さにあるため、ambientDepth()がここに常に約0.96倍の縮小をかけ続けていた）
    depthTarget = 1;
    renderDepth = 1;
    root.style.setProperty('--depth', '1');
    setMotion('swaying');
    setPose('front'); // まず正面でこっちを見る
    setTimeout(() => {
      setMotion(null);
      const dist = Math.hypot(targetX - curLeft, targetY - curBottom);
      // 普段の歩行（normal tier: 46px/350ms）と同じペースで歩かせる。以前は長距離だと
      // 3200msの上限でクランプしていたため、画面が広いと普段より速い「ぴゅーっ」とした
      // 移動に見えていた。上限は設けず、距離なりの時間を掛けて普段どおりの速さで歩かせる
      const walkDur = Math.max(700, dist * (350 / 46)) * calmFactor();
      startWalkFacing(dir, () => {
        setMotion('walking', 350); // てくてく：小走りにはしない、普段どおりの歩調
        setTimeout(() => runLegCycle(dir, walkDur - 380, 350), 380);
        tweenPosition(targetX, targetY, walkDur, () => {
          setMotion(null);
          if (onArrive) { onArrive(); return; }
          setPose('surprise'); // 呼ばれてびっくり
          setTimeout(() => {
            setPose('front');
            if (!mascotExpressionPaused) mascotSay('呼んだ〜？', 2200);
          }, 400);
          // ここでstartCrossing()を呼ぶと、curLeft/curBottomを画面外のランダムな地点へ
          // 瞬時に書き換えてしまい（普段は「画面外から入場してくる」演出の一部として自然だが、
          // ここでは画面中央に呼び寄せた直後にワープして消えたように見えてしまう不具合になる：
          // 実際に「おいでを押すと真ん中に来たあと消える」として確認された）。ほめほめ係の
          // 反応後(resumeIdleWalk)と同じく、今いる場所から新しい行き先へ歩き出させる
          hopTimer = setTimeout(resumeIdleWalk, 2400);
        });
      });
    }, 650 + Math.random() * 250);
  }
  window.mascotCallOver = callOver;
  // callOver(onArrive)はonArrive実行後に歩行を再開させない（crossingを止めたまま呼び出し元に
  // 任せる設計）。ほめほめ係(playDekitaReaction)はonArriveでmascotReactを呼ぶだけで、その後
  // 誰も歩行を再開させていなかったため、両手あげ演出のあと横を向いたまま止まって見えていた
  // （実際に確認された不具合）。反応が終わったタイミングでこれを呼び、歩行を再開させる。
  // startCrossing()をそのまま呼ぶと「今いる場所」を無視して画面外のランダムな開始地点へ
  // 瞬間移動してしまい（普段は画面外から入場してくる演出の一部として自然だが、ここでは
  // 呼び寄せた直後の画面中央から急に消えたように見えてしまう不具合になった）、後方宙返り
  // 着地後(onBackflipDone)と同じやり方で、行き先(to)だけ新しく選び、今いる位置から歩き出す。
  // ここでupdateFacing()を呼んで先に向きを変えてしまうと、両手あげの後すでにfacingPoseへ
  // 向き直ったばかりのタイミングで、間髪入れずもう一度（今度は新しい横断の行き先へ）向きが
  // 変わってしまい、「一拍置いて正面を見せたのに、そのあとすぐそっぽを向く」ように見えて
  // しまっていた（実際に確認された不具合）。向きの更新はdoHopの最初の一歩に任せ、ここでは
  // 歩き出しの予約だけする
  function resumeIdleWalk() {
    if (crossing) return;
    // ほめほめ係に呼ばれて歩いてきた向きがあれば、それを引き継いで逆走(Uターン)しない。
    // 例：左から右へ歩いてきて褒められたら、そのあとも左から右へしか進まない
    const { to } = lastApproachDir
      ? pickContinuingEndpoint(lastApproachDir, curLeft)
      : pickCrossingEndpoints();
    lastApproachDir = null;
    crossing = { from: { x: curLeft, y: curBottom }, to, speed: pickSpeedTier(), deep: false };
    hopTimer = setTimeout(doHop, 300 + Math.random() * 300);
  }
  window.mascotResumeIdle = resumeIdleWalk;

  // 「またね」：こっちを向いて手を振ったら、せりふなしですぐ今いる側に近い画面端へ歩いて抜けていき、
  // しばらく（15〜30秒）経ってからまた出てくる
  function sayBye() {
    clearTimeout(hopTimer);
    crossing = null;
    const b = bounds();
    const goRight = curLeft > b.vw / 2;
    const dir = goRight ? 'right' : 'left';
    doWaveSequence(() => {
      startWalkFacing(dir, () => {
        const targetX = goRight ? b.vw + b.mSize + 40 : -(b.mSize + 40);
        const dist = Math.abs(targetX - curLeft);
        const walkDur = Math.max(420, Math.min(1400, dist * 4)) * calmFactor();
        setMotion('walking', 350);
        tweenPosition(targetX, curBottom, walkDur, () => {
          hopTimer = setTimeout(startCrossing, 15000 + Math.random() * 15000);
        });
      });
    }, 500);
  }
  window.mascotSayBye = sayBye;

  // 「いっしょに◯日目」：ゲーム的な数値化はせず、日付が変わるたびに緩く数えるだけの記録
  const togetherDates = new Set(LS.get('mascotTogetherDates', []));
  togetherDates.add(todayKey());
  LS.set('mascotTogetherDates', [...togetherDates]);
  function togetherDaysLine() {
    const n = togetherDates.size;
    return n >= 2 ? `いっしょに${n}日目だね` : null;
  }

  startCrossing();
  requestAnimationFrame(renderLoop);
  setTimeout(() => {
    if (mascotExpressionPaused) return;
    const greet = pickMascotLine(pickGreetBucket());
    const together = Math.random() < 0.25 ? togetherDaysLine() : null;
    mascotSay(together || greet, 2400);
  }, 1500);

  // 「撫でる」：数秒マウスを乗せたままにすると、ふにゃっと一瞬なじむだけの控えめな反応
  // （ほお赤らめ・セリフは無し。触れられたことに気づく程度の、身体の反応だけにとどめる）
  let petTimer = null, petted = false;
  img.addEventListener('mouseenter', () => {
    petted = false;
    petTimer = setTimeout(() => {
      petted = true;
      setMotion('poyon');
      setTimeout(() => setMotion(null), 500);
    }, 900);
  });
  img.addEventListener('mouseleave', () => { clearTimeout(petTimer); });

  // 「つまんで動かす」：押したまま一定距離動かすとドラッグ開始とみなし、つままれてびっくりした
  // ポーズのままカーソルにそのままついてくる。離した場所へふわっと着地して、そこからまた自分で
  // 歩き出す（画面外へワープして戻ってくる、ということはしない）。動かした距離が閾値未満なら
  // 通常のクリック（首かしげ）として扱う
  let dragPointerId = null, dragging = false, dragStartX = 0, dragStartY = 0, justDragged = false;
  let lastTapHandledAt = 0; // スマホのタップをpointerup側で処理した直後、合成clickの二重発火を防ぐ
  const DRAG_THRESHOLD = 6;
  img.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    dragPointerId = e.pointerId;
    dragging = false;
    dragStartX = e.clientX; dragStartY = e.clientY;
  });
  img.addEventListener('pointermove', (e) => {
    if (dragPointerId == null || e.pointerId !== dragPointerId) return;
    if (!dragging) {
      if (Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) < DRAG_THRESHOLD) return;
      dragging = true;
      justDragged = true;
      try { img.setPointerCapture(dragPointerId); } catch {}
      clearTimeout(hopTimer);
      clearTimeout(petTimer);
      if (idleSleeping) { idleSleeping = false; clearTimeout(sleepWakeTimer); }
      crossing = null;
      setMotion(null);
      setPose('surprise'); // つままれてびっくり
      root.classList.add('held');
    }
    const b = bounds();
    curLeft = e.clientX - b.mSize / 2;
    curBottom = (window.innerHeight - e.clientY) - b.mSize / 2;
    applyPositionInstant();
  });
  function endMascotDrag(e) {
    if (dragPointerId == null || (e && e.pointerId !== dragPointerId)) return;
    const wasDragging = dragging;
    const pointerType = e ? e.pointerType : null;
    dragPointerId = null;
    dragging = false;
    if (!wasDragging) {
      // ドラッグにならなかった＝タップ／クリック。タッチ・ペンはブラウザがclickイベントを
      // 確実に合成してくれるとは限らない（見つけた！等の反応がスマホでは起きなかった不具合）
      // ため、ここで直接クリック反応を起こす。マウスは従来通りclickイベント任せにして、
      // 二重に反応が起きないようにする
      if (pointerType === 'touch' || pointerType === 'pen') {
        lastTapHandledAt = nowMs();
        triggerMascotClickReaction();
      }
      return;
    }
    root.classList.remove('held');
    lastInteractionAt = nowMs();
    // 置いた場所がだいたい画面の範囲に収まるよう軽く補正してから、ふわっと着地
    const b = bounds();
    curLeft = Math.min(b.vw - b.mSize * 0.3, Math.max(-b.mSize * 0.3, curLeft));
    curBottom = Math.min(b.maxY, Math.max(0, curBottom));
    applyPositionInstant();
    setPose('front');
    setMotion('bouncing');
    setTimeout(() => setMotion(null), 420);
    const endpoints = pickCrossingEndpoints();
    crossing = { from: { x: curLeft, y: curBottom }, to: endpoints.to, speed: pickSpeedTier(), deep: false };
    scheduleHop(500 + Math.random() * 400); // 着地して少し落ち着いてから、また歩き出す
  }
  img.addEventListener('pointerup', endMascotDrag);
  img.addEventListener('pointercancel', endMascotDrag);

  // クリックへの反応は、ハート・キラキラ・セリフのような演出を挟まず、
  // 「こっちを向いて首をかしげる」（たまに「後方宙返り」）という身体の反応だけにとどめる。
  // 反応している間は歩みも止め（hopTimerを止めるだけで、行き先=crossingは覚えたまま）、
  // 反応が終わってからも少し間を置いてから、覚えていた続きを歩き出す
  let clickCooldown = 0;
  // 後方宙返りは着地の一拍まで含めると1860ms前後かかるのに対し、clickCooldownは1200msしかなく、
  // その間にもう一度タップされると前の宙返りがまだ動いている最中に次の反応が二重に始まっていた。
  // 2つのnextFrameループが同じimg.style.transformを取り合い、片方の着地処理でtransitionが
  // 元に戻る(''になる)タイミングともう片方が生の座標を書き込むタイミングが重なると、CSSの
  // .2s easeトランジションが挟まって「一瞬すごく大きくなる」ように見えていた（実際にスマホの
  // 画面録画で確認：宙返りの始めと終わり、両方でタイミングが重なると大きくなっていた）。
  // clickCooldownを長くするより、反応中は新しい反応を一切受け付けないほうが確実
  let reactionBusy = false;
  let lastClickReactionType = null; // 直前と同じ反応が連続しないようにする
  function triggerMascotClickReaction() {
    if (reactionBusy || nowMs() < clickCooldown || petted) { petted = false; return; }
    clickCooldown = nowMs() + 1200;
    reactionBusy = true;
    clearTimeout(hopTimer);
    setMotion(null);
    const onReactionDone = () => {
      reactionBusy = false;
      // 奥行き移動中(crossing.deep)の横断をそのまま再開すると、反応で止まっていた間
      // depthTargetが更新されずに固まっていたぶん、再開した瞬間に一気に追いついて
      // 「ぴゅん」と一瞬大きくなって見える。奥行き移動は打ち切って、新しい横断の
      // 判断からやり直す（＝そのまま自然に、普段どおりの動きに戻す）
      if (crossing && crossing.deep) {
        crossing = null;
        hopTimer = setTimeout(startCrossing, 200 + Math.random() * 200);
      } else if (crossing) {
        scheduleHop(300 + Math.random() * 250);
      }
    };
    // 後方宙返りは着地の瞬間に位置(curLeft/curBottom)そのものを着地点へ動かすため、宙返り前に
    // 覚えていたcrossing.to（横断の目的地）を素通り・通り過ぎてしまっていることがある。その状態で
    // 古いcrossingをそのまま再開すると、doHopが目的地までの向きを計算し直した瞬間に「向きが
    // 反転した」と判定してしまい、ついさっき歩いていたのと逆方向へ急に切り替わって見える
    // （実際に確認された「今まで左に進んでいたのに急に右に行く」「切り替えが急で雑」という不具合）。
    // 位置を動かさない首かしげ(doTiltBeat)では起きない問題なので、後方宙返りの時だけ、古い
    // crossingを引き継がず、着地した場所を基準に新しい横断先を選び直す。
    // ここでstartCrossing()を呼んではいけない：startCrossing()はcurLeft/curBottomを
    // 画面外のランダムな開始地点へ強制的に書き換える関数（＝普段「画面外から入場してくる」
    // 演出のためのもの）なので、呼んだ瞬間に着地地点を無視してマスコットが画面外へワープし、
    // 次の一歩が来るまで「消えた」ように見えてしまう（実際に確認された不具合）。
    // pickCrossingEndpoints()で行き先(to)だけを新しく選び、fromは着地した今の位置のまま使う
    const onBackflipDone = () => {
      reactionBusy = false;
      // pickCrossingEndpoints()はto（行き先）を左右どちらにもランダムに選ぶため、たまたま
      // 現在地より右を選んだ場合、直後のupdateFacingが「向きが変わった」と判定して、
      // 着地時にせっかく左向き(diag-left)へ揃えたのを右向きへまた切り替えてしまっていた
      // （実際に確認された不具合）。宙返りの移動方向＝左と矛盾しないよう、行き先は
      // 必ず現在地より左（画面外の左側）になるよう揃える
      const { to } = pickCrossingEndpoints();
      const b = bounds();
      const forcedTo = to.x > curLeft ? { x: -(b.mSize + 30), y: to.y } : to;
      crossing = { from: { x: curLeft, y: curBottom }, to: forcedTo, speed: pickSpeedTier(), deep: false };
      updateFacing(forcedTo.x - curLeft, forcedTo.y - curBottom);
      scheduleHop(300 + Math.random() * 250);
    };
    // 後方宙返り60%・首かしげ20%・見つけた！20%を基本の重みにしつつ、直前と同じ反応は
    // 候補から除いて選び直す（＝2回連続で同じ動きにはならない）
    const REACTION_CHOICES = [
      { type: 'backflip', weight: 60, run: () => doBackflipBeat(onBackflipDone) },
      { type: 'tilt', weight: 20, run: () => doTiltBeat(900, onReactionDone) },
      { type: 'notice', weight: 20, run: () => doNoticeBeat(onReactionDone) },
    ];
    const pool = REACTION_CHOICES.filter(c => c.type !== lastClickReactionType);
    const totalWeight = pool.reduce((sum, c) => sum + c.weight, 0);
    let roll = Math.random() * totalWeight;
    let chosen = pool[pool.length - 1];
    for (const c of pool) {
      if (roll < c.weight) { chosen = c; break; }
      roll -= c.weight;
    }
    lastClickReactionType = chosen.type;
    chosen.run();
  }
  img.addEventListener('click', () => {
    if (justDragged) { justDragged = false; return; } // 今のはドラッグだったので、反応はしない
    if (nowMs() - lastTapHandledAt < 500) return; // タッチのタップはpointerup側で処理済み（合成clickの二重発火を防ぐ）
    triggerMascotClickReaction();
  });
})();

(function bindMascotCallButtons() {
  const callBtn = document.getElementById('mascotCallBtn');
  const byeBtn = document.getElementById('mascotByeBtn');
  if (callBtn) callBtn.addEventListener('click', () => { if (typeof window.mascotCallOver === 'function') window.mascotCallOver(); });
  if (byeBtn) byeBtn.addEventListener('click', () => { if (typeof window.mascotSayBye === 'function') window.mascotSayBye(); });
})();

// マスコットのリアクションを、既存の機能（記録保存・診断結果・タイマー）にそっと結びつける。
// 元の関数の動作は変えず、呼び出し後に一瞬だけ mascotReact() を差し込むだけ。
(function hookMascotReactions() {
  if (typeof window.mascotReact !== 'function') return;

  if (typeof saveRecords === 'function') {
    const _saveRecords = saveRecords;
    saveRecords = function (...args) {
      const ret = _saveRecords.apply(this, args);
      // 保存した気分が「つらい」だったときは、褒めるより先に「省エネでいいよ」の言葉にする。
      // 「元気」だったときは、はっきり喜ぶ両手上げのポーズを使う
      const latest = (typeof records !== 'undefined' && records.length) ? records[records.length - 1] : null;
      if (latest && latest.mood === 3) {
        mascotReact({ heart: true, spark: true, motion: 'poyon', joy: true, say: pickMascotLine('accomplish') });
      } else {
        const say = (latest && latest.mood === 1) ? pickMascotLine('lowEnergy') : pickMascotLine(Math.random() < 0.5 ? 'save' : 'accomplish');
        mascotReact({ heart: true, spark: true, motion: 'poyon', wave: true, say });
      }
      // 「今日の体調を記録した」こと自体に、1日1回だけがんばったねポイントを贈る
      // （予報との答え合わせとは別枠。良し悪しではなく、記録したことそのものへの合図）
      if (latest && latest.mood && latest.dateKey === todayKey() && typeof addGanbattaPoints === 'function'
          && typeof ganbattaRecordDates !== 'undefined' && !ganbattaRecordDates.has(latest.dateKey)) {
        ganbattaRecordDates.add(latest.dateKey);
        saveGanbattaRecordDates();
        addGanbattaPoints(1, 'record', '今日の体調を記録した', latest.dateKey);
      }
      return ret;
    };
  }

  // 体質チェック・問診は「回答するたびに」ではなく、結果が初めて出た瞬間だけ反応する
  if (typeof renderCheckResult === 'function') {
    const _renderCheckResult = renderCheckResult;
    renderCheckResult = function (...args) {
      const box = document.getElementById('checkResult');
      const wasHidden = !box || box.hidden;
      const ret = _renderCheckResult.apply(this, args);
      if (wasHidden && box && !box.hidden) mascotReact({ heart: true, spark: true, motion: 'poyon', wave: true, say: pickMascotLine('diagnosis') });
      return ret;
    };
  }
  if (typeof renderIntakeResult === 'function') {
    const _renderIntakeResult = renderIntakeResult;
    renderIntakeResult = function (...args) {
      const box = document.getElementById('intakeResult');
      const wasHidden = !box || box.hidden;
      const ret = _renderIntakeResult.apply(this, args);
      if (wasHidden && box && !box.hidden) mascotReact({ heart: true, spark: true, motion: 'poyon', wave: true, say: pickMascotLine('diagnosis') });
      return ret;
    };
  }

  if (typeof startPomoInterval === 'function') {
    const _startPomoInterval = startPomoInterval;
    startPomoInterval = function (...args) {
      const ret = _startPomoInterval.apply(this, args);
      if (pomoRuntime.phase === 'work') mascotReact({ heart: true, spark: false, motion: 'bounce', say: pickMascotLine('timerStart') });
      return ret;
    };
  }
  // 集中フェーズ→休憩フェーズなら「おつかれさま／ひとやすみ」、休憩→集中フェーズなら「さ、いこうか」
  if (typeof pomoTransitionToNext === 'function') {
    const _pomoTransitionToNext = pomoTransitionToNext;
    pomoTransitionToNext = function (...args) {
      const wasWork = pomoRuntime.phase === 'work';
      const ret = _pomoTransitionToNext.apply(this, args);
      mascotReact({ heart: true, spark: true, motion: 'poyon', wave: true, say: pickMascotLine(wasWork ? 'timerToBreak' : 'timerToWork') });
      return ret;
    };
  }
  // 「今日はここまで」で終える日も、責めずに送り出す
  if (typeof pomoEndDay === 'function') {
    const _pomoEndDay = pomoEndDay;
    pomoEndDay = function (...args) {
      const ret = _pomoEndDay.apply(this, args);
      if (typeof window.mascotSay === 'function' && !window.isMascotExpressionPaused()) window.mascotSay(pickMascotLine('nothingDay'), 2600);
      return ret;
    };
  }
  // ことばのおまもりで練習モードに入ったら、伝え方のコツを一言
  if (typeof tsSwitchMode === 'function') {
    const _tsSwitchMode = tsSwitchMode;
    tsSwitchMode = function (mode, ...rest) {
      const ret = _tsSwitchMode.apply(this, [mode, ...rest]);
      if (mode === 'practice' && typeof window.mascotSay === 'function' && !window.isMascotExpressionPaused() && Math.random() < 0.5) {
        window.mascotSay(pickMascotLine('kaeshiTip'), 2400);
      }
      return ret;
    };
  }
  // タイマーが集中フェーズのまま長く続いていたら、たまに「休憩してもいい時間かも」を挟む
  if (typeof pomoRuntime !== 'undefined') {
    let timerLongShownFor = null;
    setInterval(() => {
      if (typeof window.mascotReact !== 'function' || typeof pomoRuntime === 'undefined') return;
      if (pomoRuntime.status !== 'running' || pomoRuntime.phase !== 'work') return;
      if (window.isMascotExpressionPaused()) return;
      const elapsed = typeof pomoElapsedThisPhaseMin === 'function' ? pomoElapsedThisPhaseMin() : 0;
      if (elapsed > 20 && timerLongShownFor !== pomoRuntime.cycleCount) {
        timerLongShownFor = pomoRuntime.cycleCount;
        window.mascotSay(pickMascotLine('timerLong'), 2600);
      } else if (Math.random() < 0.12) {
        window.mascotSay(pickMascotLine('timerDuring'), 2000);
      }
    }, 45000);
  }

  // タブを切り替えたときも、たまに小さく手をあげる（毎回だとうるさいので確率＋間隔を制限）。
  // 「ことばのおまもり」タブだけは特別扱いして、専用のセリフで応援団モードに入る
  if (typeof switchTab === 'function') {
    const _switchTab = switchTab;
    let lastTabWaveAt = 0;
    switchTab = function (name, ...rest) {
      const ret = _switchTab.apply(this, [name, ...rest]);
      const now = Date.now();
      if (name === 'kaeshi') {
        if (now - lastTabWaveAt > 8000) {
          lastTabWaveAt = now;
          mascotReact({ heart: true, spark: false, motion: 'bounce', wave: true, say: pickMascotLine('kaeshiOpen') });
        }
      } else if (now - lastTabWaveAt > 5000 && Math.random() < 0.35) {
        lastTabWaveAt = now;
        mascotReact({ heart: false, spark: false, motion: 'bounce', wave: true, say: Math.random() < 0.4 ? pickMascotLine('tab') : null });
      }
      return ret;
    };
  }
})();

// ---------- init ----------
renderWeatherTab();
if (typeof checkWeatherAlert === 'function') checkWeatherAlert(); // 起動時（天気タブが最初のタブ）にも、許可済みなら静かに1回チェックする
renderIntake();
renderCheck();
renderDict();
renderRef();
renderColumn();
renderCare();
renderCalendar();
renderTsutaeru();
renderCapacityCard();
renderTorisetsuCard();
renderExpressionDict();
renderHospitalVisitList();
renderPomodoroTab();
renderHistoryQuestionnaire();

// ============================================================
// スマホ(Android)の絵文字をパソコン(Windows)寄りの見た目に近づける（Twemoji）。
// パソコン側の見た目は今まで通り変えない（Windows標準の絵文字フォントのまま）。
// タッチ操作が主（スマホ・タブレット）の端末だけTwemoji画像に置き換える。
// ページの中身は絶えず再描画されるので、MutationObserverで新しく増えたテキストにも
// 自動で反映されるようにする（呼び出し側で個別にparseし直す手間をなくす）
// ============================================================
(function unifyEmojiRendering() {
  if (typeof window.twemoji === 'undefined') return;
  if (!USE_FLUENT_EMOJI) return; // パソコンは何もしない
  let pending = null;
  function parseNow() {
    pending = null;
    try {
      window.twemoji.parse(document.body, {
        className: 'twemoji-icon',
        callback: function (icon, options) {
          if (FLUENT_EMOJI_CODES.has(icon)) return 'assets/emoji/fluent/' + icon + '.png';
          return 'assets/emoji/72x72/' + icon + '.png';
        }
      });
    } catch {}
  }
  function scheduleParse() {
    if (pending) return;
    pending = setTimeout(parseNow, 200);
  }
  parseNow();
  const observer = new MutationObserver(scheduleParse);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
})();

renderKaeshiTab();