import { $, expect } from '@wdio/globals';
import { calculatorSelectors, Digit, Operator } from '../support/calculatorSelectors';

export class CalculatorScreen {
  async clear() {
    const clearButton = await this.findFirstAvailable(calculatorSelectors.clear, false);

    if (clearButton) {
      await clearButton.click();
    }
  }

  async calculate(leftValue: string, operator: Operator, rightValue: string) {
    await this.clear();
    await this.typeNumber(leftValue);
    await this.tapOperator(operator);
    await this.typeNumber(rightValue);
    await this.tapEquals();
  }

  async expectResult(expectedResult: string) {
    const result = await this.findFirstAvailable(calculatorSelectors.result);
    await expect(result).toHaveText(expect.stringContaining(expectedResult));
  }

  private async typeNumber(value: string) {
    for (const digit of value.split('') as Digit[]) {
      await this.tapDigit(digit);
    }
  }

  private async tapDigit(digit: Digit) {
    const digitButton = await this.findFirstAvailable(calculatorSelectors.digits[digit]);
    await digitButton!.click();
  }

  private async tapOperator(operator: Operator) {
    const operatorButton = await this.findFirstAvailable(calculatorSelectors.operators[operator]);
    await operatorButton!.click();
  }

  private async tapEquals() {
    const equalsButton = await this.findFirstAvailable(calculatorSelectors.equals);
    await equalsButton!.click();
  }

  private async findFirstAvailable(selectors: readonly string[], failWhenMissing = true) {
    for (const selector of selectors) {
      const element = await $(selector);

      if (await element.isExisting()) {
        return element;
      }
    }

    if (failWhenMissing) {
      throw new Error('No Android calculator element found for selectors: ' + selectors.join(', '));
    }

    return undefined;
  }
}

export const calculatorScreen = new CalculatorScreen();
