/** Arithmetic expressions accept only numbers, named inputs and the four arithmetic operators. */
export function evaluateExpression(expression: string, inputs: Record<string, number>) {
  const compact = expression.replace(/\s/g, '')
  if (!compact || compact.length > 120) throw new Error('Введите формулу длиной до 120 символов.')
  const tokens = compact.match(/\d+(?:\.\d+)?|[A-Z]+|[+*/()-]/g) ?? []
  if (tokens.join('') !== compact) throw new Error('Формула содержит недопустимые символы.')
  let cursor = 0

  function operand(): number {
    const token = tokens[cursor++]
    if (token === '(') {
      const value = sum()
      if (tokens[cursor++] !== ')') throw new Error('Закройте скобку в формуле.')
      return value
    }
    if (token === '-') return -operand()
    if (token && /^\d/.test(token)) return Number(token)
    if (token && Object.hasOwn(inputs, token)) return inputs[token]
    throw new Error('Допустимые переменные: ' + Object.keys(inputs).join(', ') + '.')
  }

  function product() {
    let value = operand()
    while (['*', '/'].includes(tokens[cursor])) {
      const operator = tokens[cursor++]
      const right = operand()
      if (operator === '/' && right === 0) throw new Error('Деление на ноль.')
      value = operator === '*' ? value * right : value / right
    }
    return value
  }

  function sum() {
    let value = product()
    while (['+', '-'].includes(tokens[cursor])) {
      const operator = tokens[cursor++]
      const right = product()
      value = operator === '+' ? value + right : value - right
    }
    return value
  }

  const result = sum()
  if (cursor !== tokens.length || !Number.isFinite(result) || result < 0) {
    throw new Error('Формула должна давать конечное неотрицательное значение.')
  }
  return result
}

export function tryExpression(expression: string, inputs: Record<string, number>) {
  try {
    return evaluateExpression(expression, inputs)
  } catch {
    return null
  }
}
