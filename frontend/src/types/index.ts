export interface BrailleChar {
  char: string
  dots: number[]  // 1-6 active dots
  unicode: string
}

export type LearnMode = 'charToBraille' | 'brailleToChar' | 'dictation'

// 一个待译字符的归类：字母套 / 数字套 / 空格 / 尚未收录
export type CellKind = 'letter' | 'digit' | 'space' | 'unknown'

export interface BrailleCellData {
  source: string        // 原始字符（保留大小写与未收录符号）
  dots: number[]        // 1-6 凸起圆点；未收录与空格均为空
  kind: CellKind
}

// 圆点反查结果：字母套与数字套分别给出命中
export interface ReverseResult {
  letter: string | null
  digit: string | null
}
