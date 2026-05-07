export const calculatorSelectors = {
  digits: {
    '0': ['~0', 'id=com.google.android.calculator:id/digit_0', 'id=com.android.calculator2:id/digit_0'],
    '1': ['~1', 'id=com.google.android.calculator:id/digit_1', 'id=com.android.calculator2:id/digit_1'],
    '2': ['~2', 'id=com.google.android.calculator:id/digit_2', 'id=com.android.calculator2:id/digit_2'],
    '3': ['~3', 'id=com.google.android.calculator:id/digit_3', 'id=com.android.calculator2:id/digit_3'],
    '4': ['~4', 'id=com.google.android.calculator:id/digit_4', 'id=com.android.calculator2:id/digit_4'],
    '5': ['~5', 'id=com.google.android.calculator:id/digit_5', 'id=com.android.calculator2:id/digit_5'],
    '6': ['~6', 'id=com.google.android.calculator:id/digit_6', 'id=com.android.calculator2:id/digit_6'],
    '7': ['~7', 'id=com.google.android.calculator:id/digit_7', 'id=com.android.calculator2:id/digit_7'],
    '8': ['~8', 'id=com.google.android.calculator:id/digit_8', 'id=com.android.calculator2:id/digit_8'],
    '9': ['~9', 'id=com.google.android.calculator:id/digit_9', 'id=com.android.calculator2:id/digit_9']
  },
  operators: {
    add: ['~plus', '~add', 'id=com.google.android.calculator:id/op_add', 'id=com.android.calculator2:id/op_add'],
    subtract: ['~minus', '~subtract', 'id=com.google.android.calculator:id/op_sub', 'id=com.android.calculator2:id/op_sub'],
    multiply: ['~multiply', 'id=com.google.android.calculator:id/op_mul', 'id=com.android.calculator2:id/op_mul'],
    divide: ['~divide', 'id=com.google.android.calculator:id/op_div', 'id=com.android.calculator2:id/op_div']
  },
  equals: ['~equals', 'id=com.google.android.calculator:id/eq', 'id=com.android.calculator2:id/eq'],
  clear: ['~clear', '~Clear', 'id=com.google.android.calculator:id/clr', 'id=com.android.calculator2:id/clr', 'id=com.google.android.calculator:id/del'],
  result: [
    'id=com.google.android.calculator:id/result_final',
    'id=com.google.android.calculator:id/result',
    'id=com.android.calculator2:id/result',
    'id=com.android.calculator2:id/formula'
  ]
} as const;

export type Digit = keyof typeof calculatorSelectors.digits;
export type Operator = keyof typeof calculatorSelectors.operators;
