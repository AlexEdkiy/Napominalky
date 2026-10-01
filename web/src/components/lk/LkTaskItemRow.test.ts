import { describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import LkTaskItemRow from './LkTaskItemRow.vue'
import type { ShoppingListItem, ShoppingListItemComment, ShoppingListType } from '@/types/shoppingList'

function makeComment(overrides: Partial<ShoppingListItemComment> = {}): ShoppingListItemComment {
  return {
    uuid: 'c-1',
    author_name: 'Анна',
    body: 'Взять образец',
    created_at: '2026-03-05T14:30:00',
    ...overrides,
  }
}

function makeItem(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return {
    uuid: 'i-1',
    name: 'Молоко',
    category: 'products',
    category_label: 'Продукты',
    is_checked: false,
    status: 'new',
    status_label: 'Новая',
    position: 0,
    quantity: null,
    deadline: null,
    reminder_at: null,
    link: null,
    comment: null,
    comments_count: 0,
    comments: [],
    tags: [],
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

interface MountOptions {
  item?: Partial<ShoppingListItem>
  listType?: ShoppingListType
  expanded?: boolean
  tagSuggestions?: string[]
}

function mountRow(options: MountOptions = {}) {
  return mount(LkTaskItemRow, {
    props: {
      item: makeItem(options.item),
      listType: options.listType ?? 'goods',
      accentColor: '#17897a',
      accentSoft: '#d8ebe4',
      expanded: options.expanded ?? false,
      tagSuggestions: options.tagSuggestions ?? [],
    },
  })
}

function lastEmittedUpdate(wrapper: VueWrapper): unknown {
  const events = wrapper.emitted('update')
  return events?.[events.length - 1]?.[0]
}

describe('LkTaskItemRow — свёрнутый вид', () => {
  it('renders the name, checkbox and no attributes panel when collapsed', () => {
    const wrapper = mountRow()
    expect(wrapper.find('.lk-form-dialog__item-name').text()).toBe('Молоко')
    expect(wrapper.find('.lk-item-attrs').exists()).toBe(false)
    expect(wrapper.find('.lk-comments-thread').exists()).toBe(false)
    expect(wrapper.find('.lk-item-row__meta').exists()).toBe(false)
  })

  it('shows the compact meta line: ×quantity chip (goods), tags and indicator icons', () => {
    const wrapper = mountRow({
      item: {
        quantity: 3,
        tags: ['Дом'],
        reminder_at: '2027-03-05T10:00:00Z',
        link: 'https://ozon.ru',
      },
    })
    const meta = wrapper.find('.lk-item-row__meta')
    expect(meta.exists()).toBe(true)
    expect(meta.find('.lk-item-row__meta-chip').text()).toBe('×3')
    expect(meta.find('.lk-tag-pill').text()).toBe('Дом')
    // Индикаторы напоминания/ссылки — 2 иконки; комментариев в мете нет:
    // их роль у кнопки 💬 в строке.
    expect(meta.find('.lk-item-row__indicators').findAll('svg')).toHaveLength(2)
  })

  it('does NOT render a comments indicator in the meta line (роль у кнопки 💬 в строке)', () => {
    // Только комментарии — мета-строка вовсе не рендерится.
    const wrapper = mountRow({ item: { comments_count: 1, comments: [makeComment()] } })
    expect(wrapper.find('.lk-item-row__meta').exists()).toBe(false)
  })

  it('hides the ×quantity chip for quantity 1 and for tasks lists', () => {
    expect(mountRow({ item: { quantity: 1, tags: ['Дом'] } }).find('.lk-item-row__meta-chip').exists()).toBe(false)
    expect(
      mountRow({ item: { quantity: 3 }, listType: 'tasks' }).find('.lk-item-row__meta').exists(),
    ).toBe(false)
  })

  it('shows the deadline chip in the meta line for tasks lists', () => {
    const wrapper = mountRow({ item: { deadline: '2027-03-05' }, listType: 'tasks' })
    expect(wrapper.find('.lk-item-row__meta-chip').exists()).toBe(true)
  })

  it('emits check / toggleExpand from the row controls', async () => {
    const wrapper = mountRow()

    await wrapper.find('.lk-form-dialog__item-checkbox').setValue(true)
    expect(wrapper.emitted('check')).toEqual([[true]])

    const chevron = wrapper.find('.lk-item-row__chevron')
    expect(chevron.attributes('aria-expanded')).toBe('false')
    await chevron.trigger('click')
    expect(wrapper.emitted('toggleExpand')).toHaveLength(1)
  })
})

describe('LkTaskItemRow — инлайн-редактирование названия', () => {
  async function startEditing(wrapper: VueWrapper) {
    await wrapper.find('[aria-label="Переименовать Молоко"]').trigger('click')
    return wrapper.find('.lk-item-row__name-input')
  }

  it('enters the edit mode from the pencil with the current name prefilled, без побочных эффектов', async () => {
    const wrapper = mountRow()
    const input = await startEditing(wrapper)
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('Молоко')
    // Текст имени скрыт на время редактирования.
    expect(wrapper.find('.lk-form-dialog__item-name').exists()).toBe(false)
    // Карандаш не трогает чекбокс (label) и не раскрывает строку.
    expect(wrapper.emitted('check')).toBeUndefined()
    expect(wrapper.emitted('toggleExpand')).toBeUndefined()
  })

  it('saves on Enter → emits update {name} and leaves the edit mode', async () => {
    const wrapper = mountRow()
    const input = await startEditing(wrapper)
    await input.setValue('Кефир')
    await input.trigger('keydown.enter')
    expect(wrapper.emitted('update')).toEqual([[{ name: 'Кефир' }]])
    expect(wrapper.find('.lk-item-row__name-input').exists()).toBe(false)
    // Переименование не эмитит check/toggleExpand.
    expect(wrapper.emitted('check')).toBeUndefined()
    expect(wrapper.emitted('toggleExpand')).toBeUndefined()
  })

  it('saves on blur as well (клик мимо инпута)', async () => {
    const wrapper = mountRow()
    const input = await startEditing(wrapper)
    await input.setValue('Кефир 2%')
    await input.trigger('blur')
    expect(lastEmittedUpdate(wrapper)).toEqual({ name: 'Кефир 2%' })
  })

  it('cancels on Esc: без update, старое имя на месте (blur после Esc тоже не сохраняет)', async () => {
    const wrapper = mountRow()
    const input = await startEditing(wrapper)
    await input.setValue('Другое')
    await input.trigger('keydown.esc')
    await input.trigger('blur')
    expect(wrapper.emitted('update')).toBeUndefined()
    expect(wrapper.find('.lk-form-dialog__item-name').text()).toBe('Молоко')
  })

  it('stops the Esc keydown from bubbling (модалка на window его не увидит)', async () => {
    const wrapper = mountRow()
    const input = await startEditing(wrapper)
    const seen: string[] = []
    wrapper.element.addEventListener('keydown', (event: Event) => seen.push((event as KeyboardEvent).key))
    await input.trigger('keydown.esc')
    expect(seen).toEqual([])
  })

  it('does NOT save an empty/whitespace name — откат к прежнему', async () => {
    const wrapper = mountRow()
    const input = await startEditing(wrapper)
    await input.setValue('   ')
    await input.trigger('keydown.enter')
    expect(wrapper.emitted('update')).toBeUndefined()
    expect(wrapper.find('.lk-form-dialog__item-name').text()).toBe('Молоко')
  })

  it('does NOT emit update when the name is unchanged', async () => {
    const wrapper = mountRow()
    const input = await startEditing(wrapper)
    await input.trigger('keydown.enter')
    expect(wrapper.emitted('update')).toBeUndefined()
    expect(wrapper.find('.lk-item-row__name-input').exists()).toBe(false)
  })

  it('не конфликтует с остальными контролами строки: чекбокс/статус/раскрытие работают в режиме правки', async () => {
    const wrapper = mountRow({ listType: 'tasks' })
    await startEditing(wrapper)

    await wrapper.find('.lk-form-dialog__item-checkbox').setValue(true)
    expect(wrapper.emitted('check')).toEqual([[true]])

    // Клик по бейджу статуса открывает его меню, а не сохраняет/ломает правку.
    await wrapper.find('.lk-status-badge__pill--interactive').trigger('click')
    expect(wrapper.findAll('[role="menuitemradio"]')).toHaveLength(4)

    await wrapper.find('.lk-item-row__chevron').trigger('click')
    expect(wrapper.emitted('toggleExpand')).toHaveLength(1)
  })
})

describe('LkTaskItemRow — крестик удаления строки', () => {
  it('renders the × remove button as the LAST control of the row', () => {
    const wrapper = mountRow()
    const buttons = wrapper.findAll('.lk-item-row__top button')
    expect(buttons.at(-1)?.classes()).toContain('lk-item-row__remove')
    expect(buttons.at(-1)?.attributes('aria-label')).toBe('Удалить строку Молоко')
    // Текстовой ссылки «Удалить строку» больше нет нигде в строке.
    expect(wrapper.text()).not.toContain('Удалить строку')
  })

  it('emits removeRequest (НЕ удаляет сразу — подтверждение у родителя)', async () => {
    const wrapper = mountRow()
    await wrapper.find('.lk-item-row__remove').trigger('click')
    expect(wrapper.emitted('removeRequest')).toHaveLength(1)
    // Клик по крестику не трогает чекбокс и не раскрывает строку.
    expect(wrapper.emitted('check')).toBeUndefined()
    expect(wrapper.emitted('toggleExpand')).toBeUndefined()
  })

  it('does not render «Удалить строку» inside the expanded attributes toolbar', () => {
    const wrapper = mountRow({ expanded: true })
    expect(wrapper.find('.lk-item-attrs__remove').exists()).toBe(false)
    expect(wrapper.find('.lk-item-attrs').text()).not.toContain('Удалить строку')
  })
})

describe('LkTaskItemRow — статус пункта (только tasks)', () => {
  it('renders a compact interactive status badge for tasks rows and none for goods', () => {
    const tasks = mountRow({ listType: 'tasks', item: { status: 'in_progress', status_label: 'В работе' } })
    expect(tasks.find('.lk-item-row__status .lk-status-badge__pill--interactive').text()).toBe('В работе')

    const goods = mountRow({ listType: 'goods' })
    expect(goods.find('.lk-status-badge').exists()).toBe(false)
  })

  it('opens a 4-status menu WITHOUT «Авто» (у пунктов автоматики нет) and emits update {status}', async () => {
    const wrapper = mountRow({ listType: 'tasks', item: { status: 'new' } })
    await wrapper.find('.lk-status-badge__pill--interactive').trigger('click')

    expect(wrapper.findAll('[role="menuitemradio"]')).toHaveLength(4)
    expect(wrapper.find('.lk-status-badge__option--auto').exists()).toBe(false)

    await wrapper.findAll('[role="menuitemradio"]')[3]?.trigger('click')
    expect(lastEmittedUpdate(wrapper)).toEqual({ status: 'done' })
    // Смена статуса не эмитит check: is_checked сведёт сервер.
    expect(wrapper.emitted('check')).toBeUndefined()
  })

  it('strikes a tasks row by status === done (не по is_checked) and checks its checkbox', () => {
    const done = mountRow({
      listType: 'tasks',
      item: { status: 'done', status_label: 'Выполнена', is_checked: false },
    })
    expect(done.find('.lk-form-dialog__item').classes()).toContain('lk-form-dialog__item--checked')
    expect((done.find('.lk-form-dialog__item-checkbox').element as HTMLInputElement).checked).toBe(true)

    const active = mountRow({
      listType: 'tasks',
      item: { status: 'in_progress', status_label: 'В работе', is_checked: false },
    })
    expect(active.find('.lk-form-dialog__item').classes()).not.toContain('lk-form-dialog__item--checked')
  })

  it('keeps goods rows striking by is_checked as before', () => {
    const wrapper = mountRow({ listType: 'goods', item: { is_checked: true } })
    expect(wrapper.find('.lk-form-dialog__item').classes()).toContain('lk-form-dialog__item--checked')
  })
})

describe('LkTaskItemRow — кнопка 💬 (счётчик + попап + раскрытие к треду)', () => {
  it('renders the comment button before the chevron, inactive and WITHOUT a badge at 0 comments', () => {
    const wrapper = mountRow()
    const button = wrapper.find('[aria-label="Комментарии: Молоко"]')
    expect(button.exists()).toBe(true)
    expect(button.classes()).toContain('lk-item-row__comment-btn')
    expect(button.classes()).not.toContain('lk-item-row__comment-btn--active')
    // Счётчик скрыт при comments_count === 0.
    expect(wrapper.find('.lk-item-row__comment-count').exists()).toBe(false)
    // Порядок в строке: […][💬][chevron][×].
    const buttons = wrapper.findAll('.lk-item-row__top button')
    expect(buttons.at(-3)?.classes()).toContain('lk-item-row__comment-btn')
    expect(buttons.at(-2)?.classes()).toContain('lk-item-row__chevron')
  })

  it('marks the button active and shows the thread size badge from comments_count', () => {
    const wrapper = mountRow({
      item: { comments_count: 2, comments: [makeComment(), makeComment({ uuid: 'c-2' })] },
    })
    expect(wrapper.find('.lk-item-row__comment-btn').classes()).toContain(
      'lk-item-row__comment-btn--active',
    )
    expect(wrapper.find('.lk-item-row__comment-count').text()).toBe('2')
  })

  it('ignores the legacy `comment` field for the active state (deprecated)', () => {
    const wrapper = mountRow({ item: { comment: 'старая заметка', comments_count: 0, comments: [] } })
    expect(wrapper.find('.lk-item-row__comment-btn').classes()).not.toContain(
      'lk-item-row__comment-btn--active',
    )
  })

  it('wraps the button in a hover popover with the thread preview', async () => {
    const wrapper = mountRow({
      item: { comments_count: 1, comments: [makeComment({ body: 'Взять образец' })] },
    })
    const popover = wrapper.find('.lk-comments-popover')
    expect(popover.exists()).toBe(true)
    // Превью по focusin (доступность; hover-задержки покрыты тестами попапа).
    await popover.trigger('focusin')
    expect(wrapper.find('[role="tooltip"]').text()).toContain('Взять образец')
    expect(wrapper.find('[role="tooltip"]').text()).toContain('Анна')
  })

  it('click on a collapsed row emits toggleExpand (раскрытие к треду)', async () => {
    const wrapper = mountRow()
    await wrapper.find('.lk-item-row__comment-btn').trigger('click')
    expect(wrapper.emitted('toggleExpand')).toHaveLength(1)
    // Клик по кнопке не трогает чекбокс.
    expect(wrapper.emitted('check')).toBeUndefined()

    // Родитель раскрывает строку — тред смонтирован, поле ввода на месте.
    await wrapper.setProps({ expanded: true })
    expect(wrapper.find('.lk-comments-thread textarea').exists()).toBe(true)
  })

  it('click on an expanded row keeps it expanded (no toggleExpand)', async () => {
    const wrapper = mountRow({ expanded: true })
    await wrapper.find('.lk-item-row__comment-btn').trigger('click')
    expect(wrapper.emitted('toggleExpand')).toBeUndefined()
    expect(wrapper.find('.lk-comments-thread').exists()).toBe(true)
  })
})

describe('LkTaskItemRow — тред комментариев в раскрытой строке', () => {
  it('renders the thread with the comments of the item below the attributes panel', () => {
    const wrapper = mountRow({
      expanded: true,
      item: {
        comments_count: 2,
        comments: [
          makeComment({ body: 'Взять образец' }),
          makeComment({ uuid: 'c-2', author_name: 'Пётр', body: 'Уже взял' }),
        ],
      },
    })
    const thread = wrapper.find('.lk-comments-thread')
    expect(thread.exists()).toBe(true)
    expect(thread.findAll('.lk-comments-thread__item')).toHaveLength(2)
    expect(thread.text()).toContain('Анна')
    expect(thread.text()).toContain('Уже взял')
    // Тред — ПОСЛЕ панели атрибутов.
    expect(wrapper.find('.lk-item-attrs').exists()).toBe(true)
  })

  it('re-emits the thread submit as addComment with the body', async () => {
    const wrapper = mountRow({ expanded: true })
    await wrapper.find('.lk-comments-thread textarea').setValue('Новый комментарий')
    await wrapper.find('.lk-comments-thread__send').trigger('click')
    expect(wrapper.emitted('addComment')).toEqual([['Новый комментарий']])
  })

  it('shows the thread empty state when there are no comments yet', () => {
    const wrapper = mountRow({ expanded: true })
    expect(wrapper.find('.lk-comments-thread').text()).toContain('Комментариев пока нет')
  })

  it('does NOT render the legacy single-comment editor anywhere', () => {
    const wrapper = mountRow({ expanded: true, item: { comment: 'старый' } })
    // Ни чипса «Комментарий», ни textarea-редактора атрибута.
    expect(wrapper.find('[aria-label="Добавить: Комментарий"]').exists()).toBe(false)
    expect(wrapper.find('textarea[aria-label="Текст комментария"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Есть заметка')
  })
})

describe('LkTaskItemRow — раскрытая панель атрибутов', () => {
  it('marks the chevron expanded and renders 4 «добавить атрибут» chips WITHOUT «Комментарий»', () => {
    const wrapper = mountRow({ expanded: true })
    expect(wrapper.find('.lk-item-row__chevron').attributes('aria-expanded')).toBe('true')
    const chips = wrapper.findAll('.lk-item-attrs__chip')
    // «Комментарий» — не атрибут: тред живёт отдельным компонентом.
    expect(chips.map((chip) => chip.text())).toEqual([
      'Дедлайн',
      'Напоминание',
      'Ссылка',
      'Тег',
    ])
    expect(wrapper.findAll('.lk-item-attrs__token')).toHaveLength(0)
  })

  it('renders tokens for set attributes and keeps unset attributes as chips', () => {
    const wrapper = mountRow({
      expanded: true,
      item: { deadline: '2027-03-05', tags: ['Дом'] },
    })
    const tokens = wrapper.findAll('.lk-item-attrs__token')
    expect(tokens).toHaveLength(2)
    expect(wrapper.findAll('.lk-item-attrs__chip').map((chip) => chip.text())).toEqual([
      'Напоминание',
      'Ссылка',
    ])
  })

  it('removes an attribute from its token «×» (deadline → null, tags → [])', async () => {
    const wrapper = mountRow({ expanded: true, item: { deadline: '2027-03-05', tags: ['Дом'] } })

    await wrapper.find('[aria-label="Удалить дедлайн"]').trigger('click')
    expect(lastEmittedUpdate(wrapper)).toEqual({ deadline: null })

    await wrapper.find('[aria-label="Удалить тег"]').trigger('click')
    expect(lastEmittedUpdate(wrapper)).toEqual({ tags: [] })
  })

  it('adds a deadline through the inline date editor', async () => {
    const wrapper = mountRow({ expanded: true })
    await wrapper.find('[aria-label="Добавить: Дедлайн"]').trigger('click')

    await wrapper.find('input[type="date"]').setValue('2027-03-05')
    await wrapper.find('.lk-item-attrs__editor-apply').trigger('click')

    expect(lastEmittedUpdate(wrapper)).toEqual({ deadline: '2027-03-05' })
    // Редактор закрывается после «Готово».
    expect(wrapper.find('.lk-item-attrs__editor').exists()).toBe(false)
  })

  it('adds a reminder through the datetime-local editor (локальное время → ISO)', async () => {
    const wrapper = mountRow({ expanded: true })
    await wrapper.find('[aria-label="Добавить: Напоминание"]').trigger('click')

    await wrapper.find('input[type="datetime-local"]').setValue('2027-03-05T10:30')
    await wrapper.find('.lk-item-attrs__editor-apply').trigger('click')

    expect(lastEmittedUpdate(wrapper)).toEqual({
      reminder_at: new Date('2027-03-05T10:30').toISOString(),
    })
  })

  it('validates the link editor: invalid URL shows an error and does NOT emit', async () => {
    const wrapper = mountRow({ expanded: true })
    await wrapper.find('[aria-label="Добавить: Ссылка"]').trigger('click')

    await wrapper.find('input[type="url"]').setValue('просто текст')
    await wrapper.find('.lk-item-attrs__editor-apply').trigger('click')

    expect(wrapper.find('.lk-item-attrs__error').exists()).toBe(true)
    expect(wrapper.emitted('update')).toBeUndefined()

    await wrapper.find('input[type="url"]').setValue('ozon.ru/product/1')
    await wrapper.find('.lk-item-attrs__editor-apply').trigger('click')
    expect(lastEmittedUpdate(wrapper)).toEqual({ link: 'ozon.ru/product/1' })
  })

  it('edits tags: prefill, add from input and suggestions, remove, apply', async () => {
    const wrapper = mountRow({
      expanded: true,
      item: { tags: ['Дом'] },
      tagSuggestions: ['Дом', 'Важное', 'Покупки'],
    })
    await wrapper.find('.lk-item-attrs__token-open').trigger('click')

    // Текущие теги предзаполнены; предложения — без уже выбранных.
    expect(wrapper.findAll('.lk-item-attrs__tag')).toHaveLength(1)
    expect(wrapper.findAll('.lk-item-attrs__suggestion').map((s) => s.text())).toEqual([
      'Важное',
      'Покупки',
    ])

    await wrapper.find('.lk-item-attrs__suggestion').trigger('click')
    await wrapper.find('[aria-label="Название тега"]').setValue('Дача')
    await wrapper.find('[aria-label="Название тега"]').trigger('keydown.enter')
    await wrapper.find('[aria-label="Убрать тег Дом"]').trigger('click')
    await wrapper.find('.lk-item-attrs__editor-apply').trigger('click')

    expect(lastEmittedUpdate(wrapper)).toEqual({ tags: ['Важное', 'Дача'] })
  })

  it('steps the quantity for goods lists with a minimum of 1', async () => {
    const wrapper = mountRow({ expanded: true, item: { quantity: 2 } })

    await wrapper.find('[aria-label="Увеличить количество"]').trigger('click')
    expect(lastEmittedUpdate(wrapper)).toEqual({ quantity: 3 })

    await wrapper.find('[aria-label="Уменьшить количество"]').trigger('click')
    expect(lastEmittedUpdate(wrapper)).toEqual({ quantity: 1 })
  })

  it('disables the minus button at quantity 1 and hides the stepper for tasks lists', () => {
    const atMinimum = mountRow({ expanded: true, item: { quantity: 1 } })
    expect(atMinimum.find('[aria-label="Уменьшить количество"]').attributes('disabled')).toBeDefined()

    const tasks = mountRow({ expanded: true, listType: 'tasks' })
    expect(tasks.find('.lk-item-attrs__quantity').exists()).toBe(false)
  })
})


describe('LkTaskItemRow — комментарии по названию пункта (WEB-56)', () => {
  it('shows only the hovered item thread, including older comments, without changing the item', async () => {
    vi.useFakeTimers()
    const first = mountRow({ listType: 'tasks', item: { comments_count: 6,
      comments: Array.from({ length: 6 }, (_, n) => makeComment({ uuid: `c-${n}`, body: `Комментарий ${n}` })),
    } })
    const second = mountRow({ listType: 'tasks', item: { uuid: 'other', name: 'Другой пункт', comments_count: 1,
      comments: [makeComment({ uuid: 'other-comment', body: 'Чужой комментарий' })],
    } })
    try {
      const name = first.find('.lk-item-row__name-line .lk-comments-popover')
      await name.trigger('mouseenter')
      expect(document.querySelector('[role="tooltip"]')).toBeNull()
      await vi.advanceTimersByTimeAsync(250)
      const tooltip = document.querySelector('[role="tooltip"]')
      expect(tooltip?.textContent).toContain('Комментарий 0')
      expect(tooltip?.textContent).toContain('Комментарий 5')
      expect(tooltip?.textContent).not.toContain('Чужой комментарий')
      expect(tooltip?.parentElement).toBe(document.body)
      expect(first.emitted('check')).toBeUndefined()
      expect(first.emitted('update')).toBeUndefined()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await first.vm.$nextTick()
      expect(document.querySelector('[role="tooltip"]')).toBeNull()
      await second.find('.lk-form-dialog__item-name').trigger('focusin')
      expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('Чужой комментарий')
      expect(document.querySelector('[role="tooltip"]')?.textContent).not.toContain('Комментарий 0')
    } finally { first.unmount(); second.unmount(); vi.useRealTimers() }
  })
})
