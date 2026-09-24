// English Braille Grade 1 mapping
// 字母与数字虽然共用同一套圆点图形，但在盲文中属于两套独立的字符集，
// 必须分开维护，反查时分别标注出处。

export const LETTER_MAP: Record<string, number[]> = {
  'A': [1], 'B': [1,2], 'C': [1,4], 'D': [1,4,5], 'E': [1,5],
  'F': [1,2,4], 'G': [1,2,4,5], 'H': [1,2,5], 'I': [2,4], 'J': [2,4,5],
  'K': [1,3], 'L': [1,2,3], 'M': [1,3,4], 'N': [1,3,4,5], 'O': [1,3,5],
  'P': [1,2,3,4], 'Q': [1,2,3,4,5], 'R': [1,2,3,5], 'S': [2,3,4], 'T': [2,3,4,5],
  'U': [1,3,6], 'V': [1,2,3,6], 'W': [2,4,5,6], 'X': [1,3,4,6], 'Y': [1,3,4,5,6], 'Z': [1,3,5,6],
}

// 数字 1-0 对应字母 A-J 的图形（Grade 1 中数字前需加数字符 ⠼）
export const DIGIT_MAP: Record<string, number[]> = {
  '1': [1], '2': [1,2], '3': [1,4], '4': [1,4,5], '5': [1,5],
  '6': [1,2,4], '7': [1,2,4,5], '8': [1,2,5], '9': [2,4], '0': [2,4,5],
}

// 数字符（number sign），数字序列前缀，供速查表展示
export const NUMBER_SIGN: { symbol: string; dots: number[] } = {
  symbol: '⠼', dots: [3, 4, 5, 6],
}

export interface BrailleEntry {
  char: string
  set: 'letter' | 'digit'
  dots: number[]
}

// Dot positions in 2x3 grid (col, row): 1=(0,0), 2=(0,1), 3=(0,2), 4=(1,0), 5=(1,1), 6=(1,2)
export const DOT_POSITIONS: Record<number, [number, number]> = {
  1: [0, 0], 2: [0, 1], 3: [0, 2],
  4: [1, 0], 5: [1, 1], 6: [1, 2],
}

export type BrailleSet = 'letter' | 'digit' | 'space'
export type TokenKind = 'letter' | 'digit' | 'space' | 'unknown'

export interface BrailleToken {
  kind: TokenKind
  raw: string       // 保留原始字符（包括未收录符号）
  dots: number[]
}

export interface ReverseMatch {
  char: string
  set: BrailleSet
  dots: number[]
}

export function normalizeDots(dots: number[]): number[] {
  return [...new Set(dots)].sort((a, b) => a - b)
}

export function sameDots(a: number[], b: number[]): boolean {
  return normalizeDots(a).join(',') === normalizeDots(b).join(',')
}

function findInMap(map: Record<string, number[]>, dots: number[]): string | undefined {
  for (const [char, d] of Object.entries(map)) {
    if (sameDots(d, dots)) return char
  }
  return undefined
}

/** 在另一套字符集中查找共用同一图形的字符，用于速查表交叉标注 */
export function findSharedChar(set: 'letter' | 'digit', dots: number[]): string | undefined {
  return set === 'letter'
    ? findInMap(DIGIT_MAP, dots)
    : findInMap(LETTER_MAP, dots)
}

/**
 * 文本转盲文：逐字符产出 token。
 * - 字母、数字分别归入各自字符集；
 * - 空格产出空白格（与未收录符号区分开）；
 * - 未收录符号标记为 unknown 并保留原字符。
 */
export function textToBrailleTokens(text: string): BrailleToken[] {
  return text.split('').map(c => {
    // 所有空白字符（空格、换行、制表符等）统一产出空白格
    if (/\s/.test(c)) {
      return { kind: 'space', raw: c, dots: [] }
    }
    const upper = c.toUpperCase()
    if (upper in LETTER_MAP) {
      return { kind: 'letter', raw: c, dots: [...LETTER_MAP[upper]] }
    }
    if (c in DIGIT_MAP) {
      return { kind: 'digit', raw: c, dots: [...DIGIT_MAP[c]] }
    }
    // 其余一律为未收录符号，保留原字符
    return { kind: 'unknown', raw: c, dots: [] }
  })
}

/**
 * 圆点反查：同一组圆点可能同时命中字母与数字（共用图形），
 * 返回全部命中结果并标注各自属于哪一套字符集。
 */
export function brailleToChars(dots: number[]): ReverseMatch[] {
  const matches: ReverseMatch[] = []
  if (dots.length === 0) {
    matches.push({ char: ' ', set: 'space', dots: [] })
    return matches
  }
  const letter = findInMap(LETTER_MAP, dots)
  if (letter !== undefined) matches.push({ char: letter, set: 'letter', dots: [...dots] })
  const digit = findInMap(DIGIT_MAP, dots)
  if (digit !== undefined) matches.push({ char: digit, set: 'digit', dots: [...dots] })
  return matches
}

export function dotsToUnicode(dots: number[]): string {
  if (!dots.length) return '⠀'
  let code = 0x2800
  for (const d of dots) code += Math.pow(2, d - 1)
  return String.fromCodePoint(code)
}
