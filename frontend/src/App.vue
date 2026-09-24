<template>
  <div class="min-h-screen p-4 flex flex-col gap-4 max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold text-purple-400">盲文翻译与触觉学习器</h1>

    <div class="flex gap-2">
      <button v-for="t in tabs" :key="t.id" @click="activeTab = t.id"
        class="px-4 py-2 rounded text-sm"
        :class="activeTab === t.id ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'">
        {{ t.label }}
      </button>
    </div>

    <!-- Translate -->
    <div v-if="activeTab === 'translate'" class="grid grid-cols-2 gap-4">
      <div class="bg-gray-900 rounded-xl p-4">
        <h3 class="text-purple-300 font-bold mb-2">文本输入</h3>
        <textarea v-model="store.inputText" @input="store.translate()"
          class="w-full h-32 bg-gray-800 rounded p-3 text-white resize-none" placeholder="输入英文文本..." />
      </div>
      <div class="bg-gray-900 rounded-xl p-4">
        <h3 class="text-purple-300 font-bold mb-2">盲文输出</h3>
        <div class="text-4xl tracking-wider h-16 leading-relaxed break-all">
          <template v-for="(t, i) in store.brailleTokens" :key="i">
            <span v-if="t.kind === 'unknown'" class="text-red-400" :title="`未收录符号：${t.raw}`">
              ⟨{{ t.raw }}⟩
            </span>
            <span v-else>{{ dotsToUnicode(t.dots) }}</span>
          </template>
        </div>

        <!-- 未收录符号提示：与空格明确区分 -->
        <div v-if="store.unknownChars.length"
          class="mt-2 p-2 rounded bg-red-950/60 border border-red-700 text-red-300 text-sm">
          ⚠ 以下符号尚未收录，已保留原字符且无盲文图形：
          <span v-for="(c, i) in uniqueUnknown" :key="i"
            class="inline-block mx-1 px-1.5 py-0.5 rounded bg-red-900 font-mono text-red-200">{{ c }}</span>
        </div>

        <div class="flex flex-wrap gap-2 mt-3">
          <div v-for="(t, i) in store.brailleTokens" :key="i"
            class="flex flex-col items-center gap-0.5"
            :class="t.kind === 'unknown' ? 'p-1 rounded border-2 border-dashed border-red-500 bg-red-950/40' : ''">
            <BrailleCell :dots="t.dots" :size="40"
              :class="t.kind === 'unknown' ? 'opacity-60' : ''" />
            <span class="text-xs font-mono leading-tight"
              :class="legendClass(t.kind)">
              {{ legendText(t) }}
            </span>
          </div>
        </div>
        <div class="flex gap-3 mt-2 text-xs text-gray-500">
          <span><span class="text-purple-300">字母</span> / <span class="text-amber-300">数字</span></span>
          <span>␠ = 原文本中的空格</span>
          <span class="text-red-400">⟨…⟩ = 未收录符号（保留原字符）</span>
        </div>
      </div>
    </div>

    <!-- Reverse lookup: 圆点反查 -->
    <div v-if="activeTab === 'reverse'" class="bg-gray-900 rounded-xl p-4">
      <h3 class="text-purple-300 font-bold mb-2">圆点反查</h3>
      <p class="text-sm text-gray-400 mb-4">选择圆点，查询它们在盲文中对应的字符。字母与数字共用同一图形时会分别列出并标注出处。</p>
      <div class="grid grid-cols-2 gap-6">
        <div class="flex flex-col items-center gap-4">
          <div class="grid grid-cols-2 gap-2 p-4 bg-gray-800 rounded-xl">
            <button v-for="d in 6" :key="d" @click="store.toggleReverseDot(d)"
              class="w-14 h-14 rounded-full border-2 transition-all"
              :class="store.reverseDots.includes(d) ? 'bg-purple-500 border-purple-400 scale-110' : 'bg-gray-700 border-gray-600 hover:border-purple-400'">
              <span class="text-xs">{{ d }}</span>
            </button>
          </div>
          <div class="text-5xl text-purple-300">{{ dotsToUnicode(store.reverseDots) }}</div>
          <button @click="store.clearReverseDots()"
            class="text-xs text-gray-400 hover:text-gray-200 underline">清空圆点</button>
        </div>

        <div class="flex flex-col gap-3">
          <h4 class="text-sm font-bold text-gray-300">反查结果</h4>

          <!-- 空白格：空格 -->
          <template v-if="store.reverseDots.length === 0">
            <div class="bg-gray-800 rounded-lg p-3 text-gray-300">
              当前未选择任何圆点，对应一个<strong>空白格（空格）</strong>。
            </div>
          </template>

          <template v-else>
            <div v-for="m in store.reverseMatches" :key="m.set"
              class="bg-gray-800 rounded-lg p-3 flex items-center gap-3"
              :class="m.set === 'digit' ? 'border-l-4 border-amber-400' : 'border-l-4 border-purple-400'">
              <BrailleCell :dots="m.dots" :size="36" />
              <div>
                <div class="text-2xl font-bold"
                  :class="m.set === 'digit' ? 'text-amber-300' : 'text-purple-300'">{{ m.char }}</div>
                <div class="text-xs text-gray-400">
                  属于<strong :class="m.set === 'digit' ? 'text-amber-300' : 'text-purple-300'">
                    {{ m.set === 'digit' ? '数字套' : '字母套' }}
                  </strong>
                  （点位 {{ [...m.dots].sort((a, b) => a - b).join(', ') }}）
                </div>
              </div>
            </div>
            <div v-if="store.reverseMatches.length === 0"
              class="bg-red-950/60 border border-red-700 rounded-lg p-3 text-red-300">
              该组圆点不对应任何已收录的字母或数字（点位 {{ normalizedReverseDots.join(', ') }}）。
            </div>
            <div v-if="store.reverseMatches.length > 1"
              class="text-xs text-gray-500">
              同一图形在两套字符中各有对应，盲文实际使用时数字前需加数字符 ⠼ 区分。
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Learn -->
    <div v-if="activeTab === 'learn'" class="grid grid-cols-2 gap-4">
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

    <!-- Reference: 字母区与数字区分开排，共用图形各自标注 -->
    <div v-if="activeTab === 'ref'" class="flex flex-col gap-6">
      <div class="bg-gray-900 rounded-xl p-4">
        <h3 class="text-purple-300 font-bold mb-1">字母区（A–Z）</h3>
        <p class="text-xs text-gray-500 mb-3">标有「同数字」的图形与数字套共用同一组圆点。</p>
        <div class="grid grid-cols-6 md:grid-cols-9 gap-3">
          <div v-for="entry in letterEntries" :key="entry.char" class="flex flex-col items-center">
            <div class="flex items-center gap-1">
              <span class="text-xl font-bold text-purple-400">{{ entry.char }}</span>
              <span v-if="findSharedChar('letter', entry.dots)"
                class="text-[10px] px-1 rounded bg-amber-900/60 text-amber-300 border border-amber-700"
                :title="`与数字 ${findSharedChar('letter', entry.dots)} 共用同一图形`">
                同数字{{ findSharedChar('letter', entry.dots) }}
              </span>
            </div>
            <BrailleCell :dots="entry.dots" :size="30" />
            <div class="text-xs text-gray-500">{{ entry.dots.join(',') }}</div>
          </div>
        </div>
      </div>

      <div class="bg-gray-900 rounded-xl p-4">
        <h3 class="text-amber-300 font-bold mb-1">数字区（1–0）</h3>
        <p class="text-xs text-gray-500 mb-3">
          数字 1–0 与字母 A–J 共用同一组圆点图形；Grade 1 盲文中数字前加数字符
          <span class="font-mono text-gray-300">⠼</span>（点位 3,4,5,6）以示区分。
          标有「同字母」的图形与字母套共用。
        </p>
        <div class="flex flex-wrap gap-3 mb-4">
          <div class="flex flex-col items-center px-3 py-2 rounded-lg bg-gray-800 border border-amber-800">
            <span class="text-sm font-bold text-amber-300">数字符 ⠼</span>
            <BrailleCell :dots="numberSign.dots" :size="30" />
            <div class="text-xs text-gray-500">{{ numberSign.dots.join(',') }}</div>
          </div>
        </div>
        <div class="grid grid-cols-6 md:grid-cols-9 gap-3">
          <div v-for="entry in digitEntries" :key="entry.char" class="flex flex-col items-center">
            <div class="flex items-center gap-1">
              <span class="text-xl font-bold text-amber-300">{{ entry.char }}</span>
              <span v-if="findSharedChar('digit', entry.dots)"
                class="text-[10px] px-1 rounded bg-purple-900/60 text-purple-300 border border-purple-700"
                :title="`与字母 ${findSharedChar('digit', entry.dots)} 共用同一图形`">
                同字母{{ findSharedChar('digit', entry.dots) }}
              </span>
            </div>
            <BrailleCell :dots="entry.dots" :size="30" />
            <div class="text-xs text-gray-500">{{ entry.dots.join(',') }}</div>
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
  LETTER_MAP, DIGIT_MAP, NUMBER_SIGN,
  dotsToUnicode, findSharedChar,
  type BrailleEntry, type TokenKind,
} from './utils/braille'
import BrailleCell from './components/BrailleCell.vue'

const store = useBrailleStore()
const tabs = [
  { id: 'translate', label: '翻译模式' },
  { id: 'reverse', label: '圆点反查' },
  { id: 'learn', label: '训练模式' },
  { id: 'ref', label: '速查表' },
]
const activeTab = ref('translate')

const numberSign = NUMBER_SIGN

const letterEntries = computed<BrailleEntry[]>(() =>
  Object.entries(LETTER_MAP).map(([char, dots]) => ({ char, set: 'letter' as const, dots }))
)
const digitEntries = computed<BrailleEntry[]>(() =>
  Object.entries(DIGIT_MAP).map(([char, dots]) => ({ char, set: 'digit' as const, dots }))
)

const uniqueUnknown = computed(() => [...new Set(store.unknownChars)])

const normalizedReverseDots = computed(() =>
  [...store.reverseDots].sort((a, b) => a - b)
)

function legendText(t: { kind: TokenKind; raw: string }): string {
  switch (t.kind) {
    case 'space': return '␠ 空格'
    case 'digit': return t.raw
    case 'letter': return t.raw
    default: return `⟨${t.raw}⟩未收录`
  }
}

function legendClass(kind: TokenKind): string {
  switch (kind) {
    case 'space': return 'text-gray-500'
    case 'digit': return 'text-amber-300'
    case 'unknown': return 'text-red-400'
    default: return 'text-purple-300'
  }
}

function doExport() {
  const text = store.exportPDF()
  const blob = new Blob([text], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'braille-output.txt'
  a.click()
}
</script>
