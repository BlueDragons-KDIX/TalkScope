/**
 * 類似度計算の検証スクリプト。
 * 実行: cd Frontend && bun run src/app/utils/verifySimilarity.ts
 */

import {
  MOCK_DIM,
  getMockTermVector,
  getMockThemeVector,
  getMockConversationVector,
  cosineSimilarity,
  similarityToScore,
} from './mockVectors';

const dim = MOCK_DIM;
const theme = getMockThemeVector(dim);
const conv = getMockConversationVector(dim);

function run() {
  console.log('=== 類似度算出の検証 ===\n');
  console.log('・用語ベクトルは主題/会話のブレンドで生成しているため、用語ごとに類似度が異なります。');
  console.log('・コサイン類似度は -1〜1、スコアは 0〜1 であることを確認します。\n');

  const termIds = ['用語A', '用語B', '専門用語', 'キーワード', 'テスト'];
  let ok = true;

  for (const id of termIds) {
    const termVec = getMockTermVector(id, dim);
    const themeSim = cosineSimilarity(termVec, theme);
    const convSim = cosineSimilarity(termVec, conv);
    const themeScore = similarityToScore(themeSim);
    const convScore = similarityToScore(convSim);

    if (themeSim < -1 || themeSim > 1 || convSim < -1 || convSim > 1) {
      console.error(`❌ ${id}: 類似度が -1〜1 の範囲外 (theme=${themeSim}, conv=${convSim})`);
      ok = false;
    }
    if (themeScore < 0 || themeScore > 1 || convScore < 0 || convScore > 1) {
      console.error(`❌ ${id}: スコアが 0〜1 の範囲外`);
      ok = false;
    }

    console.log(`${id}:`);
    console.log(`  主題との類似度 ${themeSim.toFixed(4)} → スコア ${themeScore.toFixed(4)}`);
    console.log(`  会話との類似度 ${convSim.toFixed(4)} → スコア ${convScore.toFixed(4)}`);
    console.log('');
  }

  // 同一入力で再計算して結果が同じか
  const termVecA = getMockTermVector('用語A', dim);
  const themeSimA2 = cosineSimilarity(termVecA, theme);
  const themeSimA1 = cosineSimilarity(getMockTermVector('用語A', dim), theme);
  if (Math.abs(themeSimA1 - themeSimA2) > 1e-10) {
    console.error('❌ 同一用語で再計算した類似度が一致しません');
    ok = false;
  } else {
    console.log('✓ 同一用語で再計算した類似度は一致');
  }

  // 主題と同じ単語を term にしたときの類似度（モックでは主題ベクトルは固定のため 1 にはならない）
  const sameAsTheme = '機械学習';
  const sameTermVec = getMockTermVector(sameAsTheme, dim);
  const sameSim = cosineSimilarity(sameTermVec, theme);
  const sameScore = similarityToScore(sameSim);
  console.log(`--- 主題と同じ単語（例: "${sameAsTheme}"）を用語にした場合 ---`);
  console.log(`  現状のモック: 主題ベクトルは主題テキストに依存しない固定ベクトルのため、同じ単語でも類似度は 1 になりません。`);
  console.log(`  コサイン類似度: ${sameSim.toFixed(4)} → スコア: ${sameScore.toFixed(4)}\n`);

  if (ok) console.log('✓ 検証完了: 類似度・スコアは仕様どおりの範囲で算出されています。');
  else console.log('\n❌ 検証で不具合がありました。');
  process.exit(ok ? 0 : 1);
}

run();
