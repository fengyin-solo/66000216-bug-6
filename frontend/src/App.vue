<template>
  <div class="min-h-screen p-4 flex flex-col gap-4 max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold text-purple-400">盲文翻译与触觉学习器</h1>

    <div class="flex gap-2 flex-wrap">
      <button v-for="t in tabs" :key="t.id" @click="activeTab = t.id"
        class="px-4 py-2 rounded text-sm"
        :class="activeTab === t.id ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'">
        {{ t.label }}
      </button>
    </div>

    <!-- Translate -->
    <div v-if="activeTab === 'translate'" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-gray-900 rounded-xl p-4">
        <h3 class="text-purple-300 font-bold mb-2">文本输入</h3>
        <textarea v-model="store.inputText" @input="store.translate()"
          class="w-full h-32 bg-gray-800 rounded p-3 text-white resize-none" placeholder="输入英文文本..." />
        <div class="mt-2 text-xs text-gray-500">支持 A-Z 字母与 0-9 数字；其余符号将原样保留并标记为未收录。</div>
      </div>
      <div class="bg-gray-900 rounded-xl p-4">
        <h3 class="text-purple-300 font-bold mb-2">盲文输出</h3>
        <div class="text-4xl tracking-wider text-purple-300 min-h-16 break-all">{{ store.brailleUnicode }}</div>
        <div v-if="store.unknownCount > 0"
          class="mt-2 text-xs text-red-400">
          ⚠ 有 {{ store.unknownCount }} 个未收录符号，下方红框格中保留了原字符（Unicode 行以 ? 占位）。
        </div>
        <div class="flex flex-wrap gap-2 mt-3">
          <div v-for="(cell, i) in store.brailleOutput" :key="i"
            class="flex flex-col items-center rounded-lg p-1 border"
            :class="cell.kind === 'unknown'
              ? 'border-red-500 bg-red-950/40'
              : 'border-gray-700'">
            <BrailleCell :dots="cell.dots" :size="36" />
            <span class="text-xs mt-0.5 font-mono"
              :class="cell.kind === 'unknown' ? 'text-red-400 font-bold'
                : cell.kind === 'space' ? 'text-gray-500'
                : 'text-purple-300'">
              <template v-if="cell.kind === 'space'">␠</template>
              <template v-else>{{ cell.source }}</template>
            </span>
            <span class="text-[10px] leading-tight text-center"
              :class="cell.kind === 'unknown' ? 'text-red-400' : 'text-gray-500'">
              {{ kindLabel(cell.kind) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Reverse lookup -->
    <div v-if="activeTab === 'reverse'" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-gray-900 rounded-xl p-4 flex flex-col items-center gap-4">
        <h3 class="text-purple-300 font-bold">圆点反查</h3>
        <div class="text-sm text-gray-400">点击下方 6 点阵选择圆点，右侧分别给出字母套与数字套的匹配结果</div>
        <div class="grid grid-cols-2 gap-2 p-4 bg-gray-800 rounded-xl">
          <button v-for="d in 6" :key="d" @click="store.toggleReverseDot(d)"
            class="w-14 h-14 rounded-full border-2 transition-all"
            :class="store.reverseDots.includes(d) ? 'bg-purple-500 border-purple-400 scale-110' : 'bg-gray-700 border-gray-600 hover:border-purple-400'">
            <span class="text-xs">{{ d }}</span>
          </button>
        </div>
        <div class="flex items-center gap-3">
          <BrailleCell :dots="store.reverseDots" :size="48" />
          <div class="text-sm text-gray-400">
            当前圆点：<span class="text-purple-300 font-mono">{{ sortedReverseDots.length ? sortedReverseDots.join(', ') : '（未选择）' }}</span>
          </div>
        </div>
        <button @click="store.clearReverseDots()" class="text-xs text-gray-400 hover:text-red-400 underline">清空圆点</button>
      </div>

      <div class="bg-gray-900 rounded-xl p-4">
        <h3 class="text-purple-300 font-bold mb-3">反查结果</h3>
        <template v-if="!sortedReverseDots.length">
          <div class="text-gray-500 text-sm">尚未选择任何圆点。</div>
        </template>
        <template v-else>
          <!-- 字母套与数字套命中同一组圆点时，两套都要报出来 -->
          <div v-if="reverseResult.letter && reverseResult.digit"
            class="mb-3 p-3 rounded-lg bg-purple-950/40 border border-purple-700 text-sm text-purple-200">
            这组圆点在两套字符中各对应一个符号：
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-lg p-4 flex flex-col items-center gap-2 border-2"
              :class="reverseResult.letter ? 'border-purple-600 bg-gray-800' : 'border-gray-800 bg-gray-800/40 opacity-60'">
              <div class="text-xs text-gray-400">字母套</div>
              <div class="text-5xl font-bold" :class="reverseResult.letter ? 'text-purple-400' : 'text-gray-600'">
                {{ reverseResult.letter ?? '—' }}
              </div>
              <div v-if="reverseResult.letter" class="text-xs text-gray-500">
                与数字 {{ reverseResult.digit }} 共用同一图形
              </div>
              <div v-else class="text-xs text-gray-500">字母套无此图形</div>
            </div>
            <div class="rounded-lg p-4 flex flex-col items-center gap-2 border-2"
              :class="reverseResult.digit ? 'border-sky-600 bg-gray-800' : 'border-gray-800 bg-gray-800/40 opacity-60'">
              <div class="text-xs text-gray-400">数字套</div>
              <div class="text-5xl font-bold" :class="reverseResult.digit ? 'text-sky-400' : 'text-gray-600'">
                {{ reverseResult.digit ?? '—' }}
              </div>
              <div v-if="reverseResult.digit" class="text-xs text-gray-500">
                与字母 {{ reverseResult.letter }} 共用同一图形
              </div>
              <div v-else class="text-xs text-gray-500">数字套无此图形</div>
            </div>
          </div>
          <div v-if="!reverseResult.letter && !reverseResult.digit"
            class="mt-3 text-sm text-red-400">
            ⚠ 该圆点组合尚未收录，字母套与数字套均无对应符号。
          </div>
          <div class="mt-3 text-xs text-gray-500">
            提示：实际盲文中数字前需加数字符号 ⠼（点 3-4-5-6），与字母区分。
          </div>
        </template>
      </div>
    </div>

    <!-- Learn -->
    <div v-if="activeTab === 'learn'" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-gray-900 rounded-xl p-4 flex flex-col items-center gap-4">
        <h3 class="text-purple-300 font-bold">猜盲文</h3>
        <div v-if="!store.quizChar">
          <button @click="store.generateQuiz()" class="bg-purple-500 px-6 py-3 rounded-lg text-lg hover:bg-purple-400">
            开始训练
          </button>
        </div>
        <div v-else class="flex flex-col items-center gap-3">
          <div class="text-7xl font-bold text-purple-400">{{ store.quizChar }}</div>
          <div class="text-sm text-gray-400">点击下方 6 点阵选择对应盲文</div>
          <div class="grid grid-cols-2 gap-2 p-4 bg-gray-800 rounded-xl">
            <button v-for="d in 6" :key="d" @click="store.toggleDot(d)"
              class="w-14 h-14 rounded-full border-2 transition-all"
              :class="store.selectedDots.includes(d) ? 'bg-purple-500 border-purple-400 scale-110' : 'bg-gray-700 border-gray-600 hover:border-purple-400'">
              <span class="text-xs">{{ d }}</span>
            </button>
          </div>
          <button @click="store.checkQuizAnswer()" class="bg-purple-500 px-6 py-2 rounded hover:bg-purple-400">确认</button>
        </div>
      </div>
      <div class="bg-gray-900 rounded-xl p-4">
        <div class="flex justify-between mb-2">
          <h3 class="text-purple-300 font-bold">统计</h3>
          <button @click="store.resetScore()" class="text-red-400 text-xs hover:underline">重置</button>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center mb-3">
          <div class="bg-gray-800 rounded p-2">
            <div class="text-2xl font-bold text-green-400">{{ store.score.correct }}</div>
            <div class="text-xs text-gray-400">正确</div>
          </div>
          <div class="bg-gray-800 rounded p-2">
            <div class="text-2xl font-bold text-red-400">{{ store.score.total - store.score.correct }}</div>
            <div class="text-xs text-gray-400">错误</div>
          </div>
          <div class="bg-gray-800 rounded p-2">
            <div class="text-2xl font-bold text-purple-400">{{ store.score.total ? Math.round(store.score.correct / store.score.total * 100) : 0 }}%</div>
            <div class="text-xs text-gray-400">正确率</div>
          </div>
        </div>
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div v-for="(h, i) in store.history.slice(0, 20)" :key="i"
            class="flex justify-between bg-gray-800 rounded p-2 text-sm"
            :class="h.correct ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'">
            <span>{{ h.input }}</span><span>{{ h.correct ? '✓' : '✗' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Reference -->
    <div v-if="activeTab === 'ref'" class="flex flex-col gap-4">
      <!-- 字母区 -->
      <div class="bg-gray-900 rounded-xl p-4">
        <h3 class="text-purple-300 font-bold mb-1">字母套 A-Z</h3>
        <p class="text-xs text-gray-500 mb-3">其中 A-J 与数字套 1-0 共用同一组圆点图形，格内已标注对应的数字。</p>
        <div class="grid grid-cols-6 md:grid-cols-9 lg:grid-cols-[repeat(13,minmax(0,1fr))] gap-3">
          <div v-for="ch in letterOrder" :key="'L' + ch" class="flex flex-col items-center">
            <div class="text-xl font-bold text-purple-400">{{ ch }}</div>
            <BrailleCell :dots="letterMap[ch]" :size="30" />
            <div class="text-[10px] text-gray-500">{{ letterMap[ch].join(',') }}</div>
            <div v-if="letterSharedDigit[ch]" class="text-[10px] text-sky-400">同数字 {{ letterSharedDigit[ch] }}</div>
          </div>
        </div>
      </div>

      <!-- 数字区 -->
      <div class="bg-gray-900 rounded-xl p-4">
        <h3 class="text-sky-300 font-bold mb-1">数字套 1-9, 0</h3>
        <p class="text-xs text-gray-500 mb-3">
          数字与字母 A-J 共用图形，格内标注对应的字母；书写数字串时须在前面加数字符号 ⠼（点 3-4-5-6）。
        </p>
        <div class="flex flex-wrap gap-4 items-start">
          <div class="flex flex-col items-center mr-2">
            <div class="text-xl font-bold text-amber-400">⠼</div>
            <BrailleCell :dots="numberSignDots" :size="30" />
            <div class="text-[10px] text-amber-400 mt-0.5">数字符号</div>
            <div class="text-[10px] text-gray-500">{{ numberSignDots.join(',') }}</div>
          </div>
          <div v-for="ch in digitOrder" :key="'D' + ch" class="flex flex-col items-center">
            <div class="text-xl font-bold text-sky-400">{{ ch }}</div>
            <BrailleCell :dots="digitMap[ch]" :size="30" />
            <div class="text-[10px] text-gray-500">{{ digitMap[ch].join(',') }}</div>
            <div class="text-[10px] text-purple-400">同字母 {{ digitSharedLetter[ch] }}</div>
          </div>
        </div>
      </div>
    </div>

    <button @click="doExport" class="bg-green-700 px-4 py-2 rounded self-start hover:bg-green-600 text-sm">
      导出翻译文本
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBrailleStore } from './store/braille'
import {
  LETTER_MAP, DIGIT_MAP, LETTER_ORDER, DIGIT_ORDER, NUMBER_SIGN_DOTS,
} from './utils/braille'
import type { CellKind } from './types'
import BrailleCell from './components/BrailleCell.vue'

const store = useBrailleStore()
const letterMap = LETTER_MAP
const digitMap = DIGIT_MAP
const letterOrder = LETTER_ORDER
const digitOrder = DIGIT_ORDER
const numberSignDots = NUMBER_SIGN_DOTS

// 共用图形的双向标注：字母 ↔ 数字
const letterSharedDigit: Record<string, string> = {
  A: '1', B: '2', C: '3', D: '4', E: '5',
  F: '6', G: '7', H: '8', I: '9', J: '0',
}
const digitSharedLetter: Record<string, string> =
  Object.fromEntries(Object.entries(letterSharedDigit).map(([l, d]) => [d, l]))

const sortedReverseDots = computed(() => [...store.reverseDots].sort((a, b) => a - b))
const reverseResult = computed(() => store.reverseTranslate())

function kindLabel(kind: CellKind): string {
  switch (kind) {
    case 'letter': return '字母套'
    case 'digit': return '数字套'
    case 'space': return '空格'
    case 'unknown': return '未收录'
  }
}

const tabs = [
  { id: 'translate', label: '翻译模式' },
  { id: 'reverse', label: '圆点反查' },
  { id: 'learn', label: '训练模式' },
  { id: 'ref', label: '速查表' },
]
const activeTab = ref('translate')

function doExport() {
  const text = store.exportPDF()
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'braille-output.txt'
  a.click()
}
</script>
