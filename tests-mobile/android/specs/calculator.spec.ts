import { describe, it } from 'mocha';
import { calculatorScreen } from '../screens/CalculatorScreen';

describe('Android Calculator', () => {
  it('MOB-001 - deve validar soma', async () => {
    await calculatorScreen.calculate('2', 'add', '3');
    await calculatorScreen.expectResult('5');
  });

  it('MOB-002 - deve validar subtracao', async () => {
    await calculatorScreen.calculate('9', 'subtract', '4');
    await calculatorScreen.expectResult('5');
  });

  it('MOB-003 - deve validar multiplicacao', async () => {
    await calculatorScreen.calculate('6', 'multiply', '7');
    await calculatorScreen.expectResult('42');
  });

  it('MOB-004 - deve validar divisao', async () => {
    await calculatorScreen.calculate('8', 'divide', '2');
    await calculatorScreen.expectResult('4');
  });
});
