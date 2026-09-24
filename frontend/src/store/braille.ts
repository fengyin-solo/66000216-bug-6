import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { LETTER_MAP, textToBraille, reverseLookup, dotsToUnicode, NUMBER_SIGN_DOTS } from '../utils/braille'
import type { LearnMode, BrailleCellData, ReverseResult } from '../types'

export const useBrailleStore = defineStore('braille', () => {
  const inputText = ref('')
  const brailleOutput = ref<BrailleCellData[]>([])
  const learnMode = ref<LearnMode>('charToBraille')
  const quizChar = ref('')
  // 训练模式用的圆点选择
  const selectedDots = ref<number[]>([])
  // 反查模式独立的圆点状态，切换标签页后仍然保留
  const reverseDots = ref<number[]>([])
  const score = ref({ correct: 0, total: 0 })
  const history = ref<{ input: string; correct: boolean }[]>([])

  const brailleUnicode = computed(() =>
    // 未收录符号在 Unicode 行以 ? 占位，避免与真空格混淆
    brailleOutput.value.map(c => (c.kind === 'unknown' ? '?' : dotsToUnicode(c.dots))).join('')
  )

  const unknownCount = computed(() =>
    brailleOutput.value.filter(c => c.kind === 'unknown').length
  )

  function translate() {
    brailleOutput.value = textToBraille(inputText.value)
  }

  function reverseTranslate(): ReverseResult {
    return reverseLookup(reverseDots.value)
  }

  function toggleReverseDot(dot: number) {
    const idx = reverseDots.value.indexOf(dot)
    if (idx >= 0) reverseDots.value.splice(idx, 1)
    else reverseDots.value.push(dot)
  }

  function clearReverseDots() {
    reverseDots.value = []
  }

  function generateQuiz() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    quizChar.value = chars[Math.floor(Math.random() * chars.length)]
    selectedDots.value = []
  }

  function toggleDot(dot: number) {
    const idx = selectedDots.value.indexOf(dot)
    if (idx >= 0) selectedDots.value.splice(idx, 1)
    else selectedDots.value.push(dot)
  }

  function checkQuizAnswer() {
    const correct = JSON.stringify([...selectedDots.value].sort()) === JSON.stringify([...(LETTER_MAP[quizChar.value] || [])].sort())
    score.value.total++
    if (correct) score.value.correct++
    history.value.unshift({ input: quizChar.value, correct })
    if (navigator.vibrate) navigator.vibrate(correct ? 100 : [100, 50, 100])
    generateQuiz()
  }

  function resetScore() {
    score.value = { correct: 0, total: 0 }
    history.value = []
  }

  function exportPDF(): string {
    const cells = brailleOutput.value.length
      ? brailleOutput.value
      : textToBraille(inputText.value)
    let out = '盲文翻译输出\n\n'
    for (const cell of cells) {
      if (cell.kind === 'space') {
        out += '空格\n'
      } else if (cell.kind === 'unknown') {
        out += `未收录：「${cell.source}」（原字符保留，无盲文图形）\n`
      } else {
        const setLabel = cell.kind === 'digit' ? '数字套' : '字母套'
        out += `${cell.source} [${setLabel}] → [${cell.dots.join(',')}] ${dotsToUnicode(cell.dots)}\n`
      }
    }
    if (cells.some(c => c.kind === 'digit')) {
      out += `\n注：数字串书写时需在前面加数字符号 [${NUMBER_SIGN_DOTS.join(',')}] ${dotsToUnicode(NUMBER_SIGN_DOTS)}\n`
    }
    return out
  }

  return {
    inputText, brailleOutput, learnMode, quizChar, selectedDots, reverseDots,
    score, history, brailleUnicode, unknownCount,
    translate, reverseTranslate, toggleReverseDot, clearReverseDots,
    generateQuiz, toggleDot, checkQuizAnswer, resetScore, exportPDF
  }
})
