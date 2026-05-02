import { SCORE_WEIGHT } from "./modules/config.js";
import { normalizeToken, tokenize } from "./modules/text-utils.js";
import { buildTermWeightScore } from "./modules/scorers/tf-scorer.js";
import { buildStructureScore } from "./modules/scorers/structure-scorer.js";
import { buildPhraseScore } from "./modules/scorers/phrase-scorer.js";
import { buildSemanticScore } from "./modules/scorers/semantic-scorer.js";
import { combineScores } from "./modules/scorers/combine-scores.js";

const transcriptInput = document.querySelector("#transcriptInput");
const highlightView = document.querySelector("#highlightView");
const scoreTableBody = document.querySelector("#scoreTable tbody");
const startBtn = document.querySelector("#startBtn");
const stopBtn = document.querySelector("#stopBtn");
const analyzeBtn = document.querySelector("#analyzeBtn");
const sampleBtn = document.querySelector("#sampleBtn");
const statusText = document.querySelector("#statusText");
const langSelect = document.querySelector("#langSelect");
const keywordInput = document.querySelector("#keywordInput");
const tfidfToggle = document.querySelector("#tfidfToggle");
const termWeightCol = document.querySelector("#termWeightCol");

let recognition = null;

function setStatus(message) {
  statusText.textContent = message;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function normalizeForDisplay(value) {
  return normalizeToken(value).replace(/\s+/g, "");
}

function buildTokenDisplayScoreMap(scoreRows) {
  if (!scoreRows.length) return new Map();
  const totals = scoreRows.map((row) => row.total);
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  const denom = max - min || 1;
  const map = new Map();
  for (const row of scoreRows) {
    map.set(normalizeForDisplay(row.token), (row.total - min) / denom);
  }
  return map;
}

function buildCharacterScores(text, scoreRows) {
  const charScores = new Array(text.length).fill(0);
  const scoreMap = buildTokenDisplayScoreMap(scoreRows);

  const entries = [...scoreMap.entries()]
    .filter(([token, score]) => token.length >= 2 && score > 0)
    .sort((a, b) => b[0].length - a[0].length);

  const lowerText = text.toLowerCase();
  for (const [token, score] of entries) {
    let startAt = 0;
    while (startAt < lowerText.length) {
      const idx = lowerText.indexOf(token, startAt);
      if (idx < 0) break;
      for (let i = idx; i < Math.min(idx + token.length, charScores.length); i += 1) {
        charScores[i] = Math.max(charScores[i], score);
      }
      startAt = idx + token.length;
    }
  }
  return charScores;
}

function renderHighlight(text, scoreRows) {
  const charScores = buildCharacterScores(text, scoreRows);
  let html = "";

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "\n") {
      html += "<br />";
      continue;
    }
    const score = charScores[i];
    if (score <= 0) {
      html += escapeHtml(ch);
      continue;
    }
    const alpha = (0.1 + score * 0.78).toFixed(3);
    const weight = Math.round(460 + score * 360);
    html += `<span class="token" style="background: rgba(255,126,63,${alpha}); font-weight: ${weight};">${escapeHtml(
      ch
    )}</span>`;
  }

  highlightView.innerHTML = html;
}

function renderTable(scoreRows) {
  scoreTableBody.innerHTML = scoreRows
    .slice(0, 40)
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.token)}</td>
        <td>${row.total.toFixed(3)}</td>
        <td>${row.tf.toFixed(3)}</td>
        <td>${row.structure.toFixed(3)}</td>
        <td>${row.semantic.toFixed(3)}</td>
        <td>${row.phrase.toFixed(3)}</td>
      </tr>
    `
    )
    .join("");
}

async function analyzeText() {
  const text = transcriptInput.value.trim();
  const keyword = keywordInput.value.trim() || "IT";
  if (!text) {
    setStatus("解析する文字起こしテキストを入力してください");
    return;
  }

  setStatus("解析中...");
  const tokens = tokenize(text);
  if (!tokens.length) {
    setStatus("有効な単語を抽出できませんでした");
    return;
  }

  const useTfIdf = Boolean(tfidfToggle?.checked);
  const termWeightResult = buildTermWeightScore(text, tokens, useTfIdf);
  if (termWeightCol) termWeightCol.textContent = termWeightResult.modeLabel;
  const structure = buildStructureScore(text, tokens);
  const phrase = buildPhraseScore(text, tokens);
  const semantic = await buildSemanticScore(tokens, keyword, {
    onStatus: setStatus,
    text,
  });

  const scoreRows = combineScores(
    tokens,
    {
      tf: termWeightResult.scoreMap,
      structure,
      semantic,
      phrase,
    },
    SCORE_WEIGHT
  );

  renderHighlight(text, scoreRows);
  renderTable(scoreRows);
  setStatus(
    `解析完了: ${scoreRows.length}語 / 分野キーワード "${keyword}" / ${termWeightResult.modeLabel}`
  );
}

function setupSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    setStatus("このブラウザはWeb Speech APIに対応していません");
    startBtn.disabled = true;
    stopBtn.disabled = true;
    return;
  }

  recognition = new SR();
  recognition.lang = langSelect.value;
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    setStatus("録音中...");
    startBtn.disabled = true;
    stopBtn.disabled = false;
  };

  recognition.onresult = (event) => {
    let finalText = "";
    let interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText += transcript;
      else interimText += transcript;
    }
    if (finalText) {
      transcriptInput.value = `${transcriptInput.value} ${finalText}`.trim();
    }
    setStatus(interimText ? `録音中(途中): ${interimText}` : "録音中...");
  };

  recognition.onerror = (event) => {
    setStatus(`音声認識エラー: ${event.error}`);
  };

  recognition.onend = () => {
    startBtn.disabled = false;
    stopBtn.disabled = true;
    setStatus("録音停止");
  };
}

startBtn.addEventListener("click", () => {
  if (!recognition) return;
  recognition.lang = langSelect.value;
  recognition.start();
});

stopBtn.addEventListener("click", () => {
  if (!recognition) return;
  recognition.stop();
});

analyzeBtn.addEventListener("click", () => {
  analyzeText().catch((err) => {
    console.error(err);
    setStatus(`解析エラー: ${err.message}`);
  });
});

sampleBtn.addEventListener("click", () => {
  transcriptInput.value = [
    "本日の議題はクラウド基盤の運用改善です。",
    "私たちはログ分析の自動化を進め、障害検知の精度を上げたいです。",
    "特にITチームはセキュリティ監査とデータ保護の対応を優先します。",
    "次のスプリントでAPI監視と運用ダッシュボードの実装を開始します。",
  ].join("");
  setStatus("サンプル文を投入しました。解析を実行します...");
  analyzeText().catch((err) => {
    console.error(err);
    setStatus(`解析エラー: ${err.message}`);
  });
});

setupSpeechRecognition();
setStatus("準備完了: テキスト入力または録音開始");
