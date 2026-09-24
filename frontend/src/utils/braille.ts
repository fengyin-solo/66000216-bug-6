import type { BrailleCellData, CellKind, ReverseResult } from '../types'

// English Braille Grade 1 —— 字母套（A-Z）
export const LETTER_MAP: Record<string, number[]> = {
  'A': [1], 'B': [1,2], 'C': [1,4], 'D': [1,4,5], 'E': [1,5],
  'F': [1,2,4], 'G': [1,2,4,5], 'H': [1,2,5], 'I': [2,4], 'J': [2,4,5],
  'K': [1,3], 'L': [1,2,3], 'M': [1,3,4], 'N': [1,3,4,5], 'O': [1,3,5],
  'P': [1,2,3,4], 'Q': [1,2,3,4,5], 'R': [1,2,3,5], 'S': [2,3,4], 'T': [2,3,4,5],
  'U': [1,3,6], 'V': [1,2,3,6], 'W': [2,4,5,6], 'X': [1,3,4,6], 'Y': [1,3,4,5,6], 'Z': [1,3,5,6],
}

// English Braille Grade 1 —— 数字套（1-9, 0）
// 与 A-J 共用同一套圆点图形，实际书写时数字串前需加数字符号 ⠼（点 3-4-5-6）
export const DIGIT_MAP: Record<string, number[]> = {
  '1': [1], '2': [1,2], '3': [1,4], '4': [1,4,5], '5': [1,5],
  '6': [1,2,4], '7': [1,2,4,5], '8': [1,2,5], '9': [2,4], '0': [2,4,5],
}

// 数字符号（number sign）：数字串前缀，本身不对应任何字母/数字
export const NUMBER_SIGN_DOTS: number[] = [3, 4, 5, 6]

export const LETTER_ORDER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
export const DIGIT_ORDER = ['1','2','3','4','5','6','7','8','9','0']

// Dot positions in 2x3 grid (col, row): 1=(0,0), 2=(0,1), 3=(0,2), 4=(1,0), 5=(1,1), 6=(1,2)
export const DOT_POSITIONS: Record<number, [number, number]> = {
  1: [0, 0], 2: [0, 1], 3: [0, 2],
  4: [1, 0], 5: [1, 1], 6: [1, 2],
}

function dotsKey(dots: number[]): string {
  return [...new Set(dots)].sort((a, b) => a - b).join(',')
}

function findInMap(dots: number[], map: Record<string, number[]>): string | null {
  const key = dotsKey(dots)
  for (const ch of Object.keys(map)) {
    if (dotsKey(map[ch]) === key) return ch
  }
  return null
}

/**
 * 圆点反查：字母套与数字套分别匹配，互不覆盖。
 * 同一组圆点（如点 1）会同时命中字母 A 与数字 1，两套结果各自给出。
 */
export function reverseLookup(dots: number[]): ReverseResult {
  return {
    letter: findInMap(dots, LETTER_MAP),
    digit: findInMap(dots, DIGIT_MAP),
  }
}

function classify(ch: string): CellKind {
  if (ch === ' ') return 'space'
  if (ch in LETTER_MAP) return 'letter'
  if (ch in DIGIT_MAP) return 'digit'
  return 'unknown'
}

/**
 * 文本 → 盲文格序列。
 * - 字母按字母套、数字按数字套分别配对；
 * - 尚未收录的符号标记为 unknown 并保留原字符，不再伪装成空格。
 */
export function textToBraille(text: string): BrailleCellData[] {
  return text.split('').map(ch => {
    const upper = ch.toUpperCase()
    const kind = classify(upper)
    const dots =
      kind === 'letter' ? [...LETTER_MAP[upper]] :
      kind === 'digit' ? [...DIGIT_MAP[ch]] :
      []
    return { source: ch, dots, kind }
  })
}

export function dotsToUnicode(dots: number[]): string {
  if (!dots.length) return '⠀'
  let code = 0x2800
  for (const d of dots) code += Math.pow(2, d - 1)
  return String.fromCodePoint(code)
}
