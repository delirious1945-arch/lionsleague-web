import {
  predictAverage,
  simulateScenario,
  requiredDoubleRate,
  requiredSetupDarts,
  estimateSetupDartsFromLegs,
  averageBand,
} from '../src/lib/whatIfEngine';

console.log('--- Testing What-If Engine (TS) ---');

const pred = predictAverage(18.0, 0.25);
console.log('predictAverage(18, 0.25):', pred);
if (Math.abs((pred.average || 0) - 68.32) > 0.05) {
  throw new Error(`Average mismatch: expected ~68.32, got ${pred.average}`);
}

const scen = simulateScenario(18.0, 0.20, 0.25, -2.0);
console.log('simulateScenario delta avg:', scen.delta_average, 'delta darts:', scen.delta_darts_per_leg);
if (!scen.valid) throw new Error('Scenario failed');

const reqRate = requiredDoubleRate(60.0, 18.0);
console.log('requiredDoubleRate(60, 18):', reqRate.required_double_rate);
if (Math.abs((reqRate.required_double_rate || 0) - 0.1418) > 0.001) {
  throw new Error(`Double rate mismatch: ${reqRate.required_double_rate}`);
}

const reqSetup = requiredSetupDarts(60.0, 0.20);
console.log('requiredSetupDarts(60, 0.20):', reqSetup.max_setup_darts);
if (Math.abs((reqSetup.max_setup_darts || 0) - 20.05) > 0.05) {
  throw new Error(`Setup darts mismatch: ${reqSetup.max_setup_darts}`);
}

// Test estimateSetupDartsFromLegs
const dummyLegs = Array(15).fill([
  { score: 60, rest_score: 441 },
  { score: 100, rest_score: 341 },
  { score: 60, rest_score: 281 },
  { score: 100, rest_score: 181 },
  { score: 50, rest_score: 131 }, // score_before = 131 + 50 = 181 > 170 (visit 5)
  { score: 40, rest_score: 91 },  // score_before = 91 + 40 = 131 <= 170 -> reached! visitsBefore = 5 (15 darts)
]);
const est = estimateSetupDartsFromLegs(dummyLegs);
console.log('estimateSetupDartsFromLegs:', est);
if (!est.sufficient || est.setup_darts_mean !== 15) {
  throw new Error('Estimate failed');
}

console.log('✅ ALL WHAT-IF ENGINE TESTS PASSED!');
