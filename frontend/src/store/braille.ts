import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  LETTER_MAP,
  textToBrailleTokens,
  brailleToChars,
  dotsToUnicode,
  type BrailleToken,
  type ReverseMatch,
} from '../utils/braille'
import type { LearnMode } from '../types'

export const useBrailleStore = defineStore('braille', () => {
  const inputText = ref('')
  const brailleTokens = ref<BrailleToken[]>([])
  const learnMode = ref<LearnMode>('charToBraille')
  const quizChar = ref('')
  const selectedDots = ref<number[]>([])
  // 圆点反查独立于训练模式的选择，状态保存在 store 中，切换标签页不丢失
  const reverseDots = ref<number[]>([])
  const score = ref({ correct: 0, total: 0 })
  const history = ref<{ input: string; correct: boolean }[]>([])

  const brailleUnicode = computed(() =>
    brailleTokens.value.map(t => dotsToUnicode(t.dots)).join('')
  )

  const unknownChars = computed(() =>
    brailleTokens.value.filter(t => t.kind === 'unknown').map(t => t.raw)
  )

  // 反查结果随 reverseDots 实时更新
  const reverseMatches = computed<ReverseMatch[]>(() => brailleToChars(reverseDots.value))

  function translate() {
    brailleTokens.value = textToBrailleTokens(inputText.value)
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

  function toggleReverseDot(dot: number) {
    const idx = reverseDots.value.indexOf(dot)
    if (idx >= 0) reverseDots.value.splice(idx, 1)
    else reverseDots.value.push(dot)
  }

  function clearReverseDots() {
    reverseDots.value = []
  }

  function checkQuizAnswer() {
    const expected = [...(LETTER_MAP[quizChar.value] || [])].sort().join(',')
    const actual = [...selectedDots.value].sort().join(',')
    const correct = expected === actual
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
    let out = '盲文翻译输出\n\n'
    for (const t of brailleTokens.value) {
      if (t.kind === 'space') {
        out += '空格 → （空字符格）\n'
      } else if (t.kind === 'unknown') {
        out += `⚠ 未收录符号 [${t.raw}] → 保留原字符，无盲文图形\n`
      } else {
        const setLabel = t.kind === 'digit' ? '数字' : '字母'
        out += `[${setLabel}] ${t.raw} → [${t.dots.join(',')}] ${dotsToUnicode(t.dots)}\n`
      }
    }
    const missing = [...new Set(unknownChars.value)]
    if (missing.length) out += `\n未收录符号：${missing.join(' ')}\n`
    return out
  }

  return {
    inputText, brailleTokens, learnMode, quizChar, selectedDots, reverseDots,
    score, history, brailleUnicode, unknownChars, reverseMatches,
    translate, generateQuiz, toggleDot, toggleReverseDot, clearReverseDots,
    checkQuizAnswer, resetScore, exportPDF
  }
})
