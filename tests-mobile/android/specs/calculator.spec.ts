import { describe, it } from 'mocha';
import { calculatorScreen } from '../screens/CalculatorScreen';
import { saveMobileScreenshot } from '../support/mobileEvidence';

describe('Android Calculator', () => {
  it('MOB-001 - deve validar soma', async () => {
    await calculatorScreen.calculate('2', 'add', '3');
    await calculatorScreen.expectResult('5');
    await saveMobileScreenshot('MOB-001 - soma com sucesso');
  });

  it('MOB-002 - deve validar subtracao', async () => {
    await calculatorScreen.calculate('9', 'subtract', '4');
    await calculatorScreen.expectResult('5');
    await saveMobileScreenshot('MOB-002 - subtracao com sucesso');
  });

  it('MOB-003 - deve validar multiplicacao', async () => {
    await calculatorScreen.calculate('6', 'multiply', '7');
    await calculatorScreen.expectResult('42');
    await saveMobileScreenshot('MOB-003 - multiplicacao com sucesso');
  });

  it('MOB-004 - deve validar divisao', async () => {
    await calculatorScreen.calculate('8', 'divide', '2');
    await calculatorScreen.expectResult('4');
    await saveMobileScreenshot('MOB-004 - divisao com sucesso');
  });
});
