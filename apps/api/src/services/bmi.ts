type UnitSystem = 'us' | 'metric';

const US_BMI_FACTOR = 703;
const CM_PER_METER = 100;
const ROUNDING_FACTOR = 100;

export function computeBmi(weight: number, height: number, unitSystem: UnitSystem): number {
  let bmi: number;

  if (unitSystem === 'us') {
    bmi = (weight / (height * height)) * US_BMI_FACTOR;
  } else {
    const heightM = height / CM_PER_METER;
    bmi = weight / (heightM * heightM);
  }

  return Math.round(bmi * ROUNDING_FACTOR) / ROUNDING_FACTOR;
}
