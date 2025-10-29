/**
 * Update AI Weights Script
 *
 * Phase 10: Adaptive Learning
 *
 * 기능:
 * - analyze-accuracy-enhanced.ts 실행
 * - 최적화 결과 검증
 * - 가중치 파일 업데이트
 * - 변경 이력 기록
 * - Git 커밋 (선택)
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import type { AIWeightsSnapshot, WeightChangeHistory } from '../src/types/domain/aiWeights';

const DATA_DIR = path.join(process.cwd(), 'data');
const WEIGHTS_DIR = path.join(DATA_DIR, 'ai-weights');
const ANALYSIS_DIR = path.join(DATA_DIR, 'analysis');

/**
 * 분석 실행
 */
async function runAnalysis(): Promise<any> {
  console.log('🔄 Running accuracy analysis...\n');

  try {
    execSync('tsx scripts/analyze-accuracy-enhanced.ts', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
  } catch (error) {
    throw new Error('Analysis failed');
  }

  // 결과 로드
  const resultPath = path.join(ANALYSIS_DIR, 'latest-optimization.json');
  const result = JSON.parse(await fs.readFile(resultPath, 'utf-8'));

  return result;
}

/**
 * 현재 가중치 로드
 */
async function loadCurrentWeights(): Promise<AIWeightsSnapshot | null> {
  const latestPath = path.join(WEIGHTS_DIR, 'latest.json');

  try {
    const data = await fs.readFile(latestPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * 변경 이력 로드
 */
async function loadHistory(): Promise<WeightChangeHistory> {
  const historyPath = path.join(WEIGHTS_DIR, 'history.json');

  try {
    const data = await fs.readFile(historyPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      history: [],
      latest: null as any,
      initial: null as any,
    };
  }
}

/**
 * 가중치 업데이트
 */
async function updateWeights(analysisResult: any): Promise<void> {
  const { optimization, dataRange } = analysisResult;

  // 새로운 스냅샷 생성
  const version = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const snapshot: AIWeightsSnapshot = {
    version,
    updatedAt: new Date().toISOString(),
    weights: optimization.newWeights,
    performance: optimization.expectedPerformance,
    analysisPeriod: {
      from: dataRange.from,
      to: dataRange.to,
      days: dataRange.days,
    },
    changeReason: optimization.reason,
  };

  // 이전 가중치와 비교
  const current = await loadCurrentWeights();
  if (current) {
    const improvement = calculateImprovement(current.performance, snapshot.performance);
    snapshot.performance.improvement = improvement;

    console.log('\n📊 Performance Comparison:');
    console.log(`Temperature: ${improvement.temperature > 0 ? '+' : ''}${improvement.temperature.toFixed(1)}%`);
    console.log(`Wind Speed:  ${improvement.windSpeed > 0 ? '+' : ''}${improvement.windSpeed.toFixed(1)}%`);
    console.log(`Humidity:    ${improvement.humidity > 0 ? '+' : ''}${improvement.humidity.toFixed(1)}%`);
    console.log(`Overall:     ${improvement.overall > 0 ? '+' : ''}${improvement.overall.toFixed(1)}%`);
  }

  // 디렉토리 생성
  await fs.mkdir(WEIGHTS_DIR, { recursive: true });

  // 1. latest.json 업데이트
  const latestPath = path.join(WEIGHTS_DIR, 'latest.json');
  await fs.writeFile(latestPath, JSON.stringify(snapshot, null, 2));
  console.log(`\n✅ Updated: ${latestPath}`);

  // 2. 버전별 파일 저장
  const versionPath = path.join(WEIGHTS_DIR, `${version}.json`);
  await fs.writeFile(versionPath, JSON.stringify(snapshot, null, 2));
  console.log(`✅ Saved: ${versionPath}`);

  // 3. 이력 업데이트
  const history = await loadHistory();
  history.history.push(snapshot);
  history.latest = snapshot;
  if (!history.initial) {
    history.initial = snapshot;
  }

  const historyPath = path.join(WEIGHTS_DIR, 'history.json');
  await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
  console.log(`✅ Updated: ${historyPath}`);
}

/**
 * 개선율 계산
 */
function calculateImprovement(
  oldPerf: any,
  newPerf: any
): { temperature: number; windSpeed: number; humidity: number; overall: number } {
  const tempImprovement = ((oldPerf.customAI.temperatureMAE - newPerf.customAI.temperatureMAE) / oldPerf.customAI.temperatureMAE) * 100;
  const windImprovement = ((oldPerf.customAI.windSpeedMAE - newPerf.customAI.windSpeedMAE) / oldPerf.customAI.windSpeedMAE) * 100;
  const humidityImprovement = ((oldPerf.customAI.humidityMAE - newPerf.customAI.humidityMAE) / oldPerf.customAI.humidityMAE) * 100;
  const overallImprovement = ((newPerf.customAI.overallScore - oldPerf.customAI.overallScore) / oldPerf.customAI.overallScore) * 100;

  return {
    temperature: Math.round(tempImprovement * 10) / 10,
    windSpeed: Math.round(windImprovement * 10) / 10,
    humidity: Math.round(humidityImprovement * 10) / 10,
    overall: Math.round(overallImprovement * 10) / 10,
  };
}

/**
 * Git 커밋 (선택)
 */
async function commitChanges(version: string): Promise<void> {
  const shouldCommit = process.env.AUTO_COMMIT === 'true';

  if (!shouldCommit) {
    console.log('\n⏭️  Skipping Git commit (AUTO_COMMIT not enabled)');
    return;
  }

  try {
    console.log('\n📝 Committing changes...');

    execSync('git add data/ai-weights/', { stdio: 'inherit' });
    execSync(`git commit -m "chore: auto-update AI weights ${version}"`, { stdio: 'inherit' });

    console.log('✅ Changes committed');
  } catch (error) {
    console.warn('⚠️  Git commit failed (might be no changes)');
  }
}

/**
 * 알림 발송 (선택)
 */
async function sendNotification(analysisResult: any): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('\n⏭️  Skipping notification (no webhook configured)');
    return;
  }

  const { optimization } = analysisResult;
  const message = {
    text: `🤖 AI Weights Updated!

✅ Status: ${optimization.recommended ? 'Recommended' : 'Not Recommended'}
📊 Confidence: ${(optimization.confidence * 100).toFixed(0)}%
📈 Expected Overall Score: ${optimization.expectedPerformance.customAI.overallScore}/100

Temperature MAE: ${optimization.expectedPerformance.customAI.temperatureMAE}°C
Wind Speed MAE: ${optimization.expectedPerformance.customAI.windSpeedMAE} m/s

Reason: ${optimization.reason}
    `,
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (response.ok) {
      console.log('\n✅ Notification sent');
    } else {
      console.warn('\n⚠️  Notification failed');
    }
  } catch (error) {
    console.warn('\n⚠️  Notification error:', error);
  }
}

/**
 * 메인 실행
 */
async function main() {
  console.log('🚀 AI Weights Update Process');
  console.log('==============================\n');

  try {
    // 1. 분석 실행
    const analysisResult = await runAnalysis();

    // 2. 권장 여부 확인
    if (!analysisResult.optimization.recommended) {
      console.log('\n⚠️  Update not recommended:');
      console.log(`   ${analysisResult.optimization.reason}`);
      console.log('\n   Weights will NOT be updated.');
      process.exit(0);
    }

    // 3. 가중치 업데이트
    console.log('\n📝 Updating weights...');
    await updateWeights(analysisResult);

    // 4. Git 커밋
    const version = new Date().toISOString().split('T')[0];
    await commitChanges(version);

    // 5. 알림 발송
    await sendNotification(analysisResult);

    console.log('\n✨ Update completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  }
}

main();
