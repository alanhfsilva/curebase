import { describe, it, expect } from 'vitest';
import { computeBmi } from '../services/bmi.js';

describe('computeBmi', () => {
  describe('US formula: (weight_lb / height_in²) × 703', () => {
    it('computes BMI for 150 lbs, 65 inches', () => {
      const bmi = computeBmi(150, 65, 'us');
      // (150 / 65²) × 703 = (150 / 4225) × 703 = 0.03550... × 703 = 24.96
      expect(bmi).toBeCloseTo(24.96, 1);
    });

    it('computes BMI for 85 lbs, 54 inches', () => {
      const bmi = computeBmi(85, 54, 'us');
      // (85 / 2916) × 703 = 20.49
      expect(bmi).toBeCloseTo(20.49, 1);
    });

    it('computes BMI at lower US boundary (50 lbs, 20 in)', () => {
      const bmi = computeBmi(50, 20, 'us');
      // (50 / 400) × 703 = 87.88
      expect(bmi).toBeCloseTo(87.88, 1);
    });
  });

  describe('Metric formula: weight_kg / (height_cm / 100)²', () => {
    it('computes BMI for 70 kg, 170 cm', () => {
      const bmi = computeBmi(70, 170, 'metric');
      // 70 / (1.7)² = 70 / 2.89 = 24.22
      expect(bmi).toBeCloseTo(24.22, 1);
    });

    it('computes BMI for 90 kg, 180 cm', () => {
      const bmi = computeBmi(90, 180, 'metric');
      // 90 / (1.8)² = 90 / 3.24 = 27.78
      expect(bmi).toBeCloseTo(27.78, 1);
    });
  });

  describe('rounding', () => {
    it('rounds to 2 decimal places', () => {
      const bmi = computeBmi(150, 65, 'us');
      const decimalPlaces = bmi.toString().split('.')[1]?.length ?? 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });
});
