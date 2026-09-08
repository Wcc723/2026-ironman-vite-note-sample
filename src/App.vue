<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useNotes } from './composables/useNotes'
import { createBackup, loadTheme, parseBackup, saveTheme } from './services/noteStorage'
import type { BackupFile, Note, NoteDraft, Theme } from './types/note'
import { filterAndSortNotes, type FilterScope } from './utils/noteFilters'

interface EditorState extends NoteDraft {
  id: string | null
}

const { notes, errorMessage, addNote, updateNote, removeNote, replaceNotes, clearError } = useNotes()

const theme = ref<Theme>(loadTheme())
const searchQuery = ref('')
const filterScope = ref<FilterScope>('all')
const selectedTag = ref<string | null>(null)
const editorOpen = ref(false)
const editorTitle = ref<HTMLInputElement | null>(null)
const tagInput = ref('')
const statusMessage = ref('')
const importMessage = ref('')
const pendingBackup = ref<BackupFile | null>(null)
const importInput = ref<HTMLInputElement | null>(null)

const emptyEditor = (): EditorState => ({
  id: null,
  title: '',
  content: '',
  tags: [],
  pinned: false,
})

const editor = ref<EditorState>(emptyEditor())

const availableTags = computed(() => {
  const uniqueTags = new Map<string, string>()
  notes.value.forEach((note) => {
    note.tags.forEach((tag) => uniqueTags.set(tag.toLocaleLowerCase(), tag))
  })

  return [...uniqueTags.values()].sort((first, second) => first.localeCompare(second, 'zh-Hant'))
})

const filteredNotes = computed(() =>
  filterAndSortNotes(notes.value, {
    scope: filterScope.value,
    tag: selectedTag.value,
    query: searchQuery.value,
  }),
)

const filterLabel = computed(() => {
  if (filterScope.value === 'pinned') return '已釘選'
  if (filterScope.value === 'tag') return `#${selectedTag.value}`
  return '全部備忘錄'
})

const formatDate = (dateString: string): string =>
  new Intl.DateTimeFormat('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))

const parseTags = (value: string): string[] => value.replaceAll('，', ',').split(',')

const showStatus = (message: string) => {
  statusMessage.value = message
}

const openNewNote = async () => {
  editor.value = emptyEditor()
  tagInput.value = ''
  editorOpen.value = true
  await nextTick()
  editorTitle.value?.focus()
}

const openNote = async (note: Note) => {
  editor.value = {
    id: note.id,
    title: note.title,
    content: note.content,
    tags: [...note.tags],
    pinned: note.pinned,
  }
  tagInput.value = note.tags.join(', ')
  editorOpen.value = true
  await nextTick()
  editorTitle.value?.focus()
}

const closeEditor = () => {
  editorOpen.value = false
}

const saveEditor = () => {
  const title = editor.value.title.trim()
  const content = editor.value.content.trim()

  if (!title && !content) {
    showStatus('請至少輸入標題或內容，再儲存。')
    return
  }

  const draft: NoteDraft = {
    title,
    content,
    tags: parseTags(tagInput.value),
    pinned: editor.value.pinned,
  }

  const editingExistingNote = Boolean(editor.value.id)
  const saved = editor.value.id ? updateNote(editor.value.id, draft) : addNote(draft)
  if (saved) {
    closeEditor()
    showStatus(editingExistingNote ? '備忘錄已更新。' : '備忘錄已加入。')
  }
}

const togglePinned = (note: Note) => {
  const updated = updateNote(note.id, {
    title: note.title,
    content: note.content,
    tags: note.tags,
    pinned: !note.pinned,
  })

  if (updated) showStatus(note.pinned ? '已取消釘選。' : '已釘選在最上方。')
}

const deleteNote = (note: Note) => {
  if (!window.confirm(`確定要刪除「${note.title || '未命名備忘錄'}」嗎？此動作無法復原。`)) return
  if (removeNote(note.id)) showStatus('備忘錄已刪除。')
}

const setFilter = (scope: FilterScope, tag: string | null = null) => {
  filterScope.value = scope
  selectedTag.value = tag
}

const toggleTheme = () => {
  const nextTheme: Theme = theme.value === 'light' ? 'dark' : 'light'
  theme.value = nextTheme
  document.documentElement.dataset.theme = nextTheme

  try {
    saveTheme(nextTheme)
  } catch (error) {
    showStatus(error instanceof Error ? error.message : '無法儲存主題設定。')
  }
}

const exportNotes = () => {
  const backup = createBackup(notes.value)
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)

  link.href = url
  link.download = `memoire-backup-${date}.json`
  link.click()
  URL.revokeObjectURL(url)
  showStatus('備份檔已下載。請將它保存在安全的位置。')
}

const triggerImport = () => {
  importMessage.value = ''
  importInput.value?.click()
}

const readImport = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  try {
    pendingBackup.value = parseBackup(await file.text())
    importMessage.value = ''
  } catch (error) {
    importMessage.value = error instanceof Error ? error.message : '無法讀取備份檔。'
  }
}

const cancelRestore = () => {
  pendingBackup.value = null
}

const confirmRestore = () => {
  if (!pendingBackup.value) return

  if (replaceNotes(pendingBackup.value.notes)) {
    pendingBackup.value = null
    showStatus('已完成備份還原。')
  }
}

document.documentElement.dataset.theme = theme.value
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar" aria-label="備忘錄分類">
      <div class="brand-mark" aria-label="Memoire 個人備忘錄">
        <span class="brand-symbol">M</span>
        <span class="brand-name">mémoire</span>
      </div>

      <div class="sidebar-intro">
        <p class="eyebrow">PERSONAL INDEX</p>
        <p>為一閃而過的念頭<br />留下一個位置。</p>
      </div>

      <nav class="filter-nav" aria-label="筆記篩選">
        <button class="filter-button" :class="{ active: filterScope === 'all' }" type="button" @click="setFilter('all')">
          <span>全部備忘錄</span>
          <span class="filter-count">{{ notes.length }}</span>
        </button>
        <button class="filter-button" :class="{ active: filterScope === 'pinned' }" type="button" @click="setFilter('pinned')">
          <span>已釘選</span>
          <span class="filter-count">{{ notes.filter((note) => note.pinned).length }}</span>
        </button>
      </nav>

      <div class="tag-section">
        <p class="section-label">標籤索引</p>
        <div v-if="availableTags.length" class="tag-list">
          <button
            v-for="tag in availableTags"
            :key="tag"
            class="tag-filter"
            :class="{ active: filterScope === 'tag' && selectedTag === tag }"
            type="button"
            @click="setFilter('tag', tag)"
          >
            <span>#{{ tag }}</span>
          </button>
        </div>
        <p v-else class="tag-empty">新增標籤後會顯示在這裡。</p>
      </div>

      <div class="sidebar-actions">
        <button class="utility-button" type="button" @click="exportNotes"><span aria-hidden="true">↓</span> 匯出備份</button>
        <button class="utility-button" type="button" @click="triggerImport"><span aria-hidden="true">↑</span> 還原備份</button>
        <input ref="importInput" class="visually-hidden" type="file" accept="application/json,.json" @change="readImport" />
        <p v-if="importMessage" class="inline-error" role="alert">{{ importMessage }}</p>
      </div>
    </aside>

    <main class="workspace">
      <header class="workspace-header">
        <div>
          <p class="eyebrow">YOUR QUIET CORNER</p>
          <h1>{{ filterLabel }}</h1>
        </div>
        <div class="header-actions">
          <button class="theme-button" type="button" :aria-label="theme === 'light' ? '切換為深色模式' : '切換為明亮模式'" :title="theme === 'light' ? '切換為深色模式' : '切換為明亮模式'" @click="toggleTheme">
            <span aria-hidden="true">{{ theme === 'light' ? '☾' : '☀' }}</span>
          </button>
          <button class="new-note-button" type="button" @click="openNewNote"><span aria-hidden="true">＋</span> 新增備忘錄</button>
        </div>
      </header>

      <div class="toolbar">
        <label class="search-field">
          <span class="visually-hidden">搜尋備忘錄</span>
          <span class="search-icon" aria-hidden="true">⌕</span>
          <input v-model="searchQuery" type="search" placeholder="搜尋標題、內容或標籤" />
        </label>
        <p class="note-total">顯示 <strong>{{ filteredNotes.length }}</strong> 則</p>
      </div>

      <p v-if="statusMessage" class="status-message" role="status">{{ statusMessage }}</p>
      <div v-if="errorMessage" class="storage-alert" role="alert">
        <span>{{ errorMessage }}</span>
        <button type="button" aria-label="關閉錯誤訊息" @click="clearError">×</button>
      </div>

      <section v-if="filteredNotes.length" class="notes-grid" aria-label="備忘錄清單">
        <article v-for="note in filteredNotes" :key="note.id" class="note-card" :class="{ pinned: note.pinned }">
          <button class="note-open" type="button" :aria-label="`開啟：${note.title || '未命名備忘錄'}`" @click="openNote(note)">
            <div class="card-topline">
              <span v-if="note.pinned" class="pin-label">釘選</span>
              <time :datetime="note.updatedAt">{{ formatDate(note.updatedAt) }}</time>
            </div>
            <h2>{{ note.title || '未命名備忘錄' }}</h2>
            <p class="note-excerpt">{{ note.content || '沒有內容' }}</p>
            <div v-if="note.tags.length" class="note-tags" aria-label="標籤">
              <span v-for="tag in note.tags" :key="tag">#{{ tag }}</span>
            </div>
          </button>
          <div class="card-actions">
            <button type="button" :aria-label="note.pinned ? '取消釘選' : '釘選備忘錄'" :title="note.pinned ? '取消釘選' : '釘選備忘錄'" @click="togglePinned(note)">
              <span aria-hidden="true">{{ note.pinned ? '●' : '○' }}</span>
            </button>
            <button type="button" aria-label="刪除備忘錄" title="刪除備忘錄" @click="deleteNote(note)"><span aria-hidden="true">×</span></button>
          </div>
        </article>
      </section>

      <section v-else class="empty-state" aria-label="沒有符合的備忘錄">
        <span class="empty-number">01</span>
        <p class="eyebrow">A BLANK PAGE</p>
        <h2>{{ searchQuery ? '找不到相符的記錄' : '從一個念頭開始' }}</h2>
        <p>{{ searchQuery ? '試試不同關鍵字，或回到全部備忘錄。' : '這裡只屬於你。寫下第一則備忘錄，讓它不再從腦中溜走。' }}</p>
        <button v-if="!searchQuery" class="text-button" type="button" @click="openNewNote">寫下第一則 <span>→</span></button>
      </section>
    </main>

    <Transition name="fade">
      <div v-if="editorOpen" class="drawer-backdrop" @click.self="closeEditor">
        <aside class="editor-drawer" role="dialog" aria-modal="true" aria-labelledby="editor-heading" @keydown.esc="closeEditor">
          <header class="drawer-header">
            <div>
              <p class="eyebrow">{{ editor.id ? 'REFINE THE THOUGHT' : 'CAPTURE THE SPARK' }}</p>
              <h2 id="editor-heading">{{ editor.id ? '編輯備忘錄' : '新增備忘錄' }}</h2>
            </div>
            <button class="close-button" type="button" aria-label="關閉編輯面板" @click="closeEditor">×</button>
          </header>

          <form class="editor-form" @submit.prevent="saveEditor">
            <label class="form-field">
              <span>標題</span>
              <input ref="editorTitle" v-model="editor.title" type="text" placeholder="替這個念頭取個名字" />
            </label>
            <label class="form-field form-field-grow">
              <span>內容</span>
              <textarea v-model="editor.content" placeholder="從這裡開始寫…" rows="10"></textarea>
            </label>
            <label class="form-field">
              <span>標籤</span>
              <input v-model="tagInput" type="text" placeholder="例如：靈感, 工作, 週末" />
              <small>以逗號分隔，方便日後找到它。</small>
            </label>
            <label class="pin-toggle">
              <input v-model="editor.pinned" type="checkbox" />
              <span class="toggle-indicator" aria-hidden="true"></span>
              釘選在最上方
            </label>
            <div class="editor-footer">
              <button class="quiet-button" type="button" @click="closeEditor">取消</button>
              <button class="save-button" type="submit">{{ editor.id ? '儲存變更' : '加入備忘錄' }}</button>
            </div>
          </form>
        </aside>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="pendingBackup" class="restore-backdrop">
        <section class="restore-dialog" role="dialog" aria-modal="true" aria-labelledby="restore-heading" @keydown.esc="cancelRestore">
          <p class="eyebrow">RESTORE WITH CARE</p>
          <h2 id="restore-heading">準備還原備份</h2>
          <p>這份備份包含 <strong>{{ pendingBackup.notes.length }}</strong> 則備忘錄。確認後，這台瀏覽器現有的所有備忘錄都會被取代。</p>
          <p class="restore-date">備份建立於 {{ formatDate(pendingBackup.exportedAt) }}</p>
          <div class="dialog-actions">
            <button class="quiet-button" type="button" @click="cancelRestore">取消</button>
            <button class="danger-button" type="button" @click="confirmRestore">取代並還原</button>
          </div>
        </section>
      </div>
    </Transition>
  </div>
</template>
