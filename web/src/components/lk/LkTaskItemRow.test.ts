import { describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import LkTaskItemRow from './LkTaskItemRow.vue'
import type { ShoppingListItem, ShoppingListType } from '@/types/shoppingList'

function makeItem(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return {
    uuid: 'i-1',
    name: 'Молоко',
    category: 'products',
    category_label: 'Продукты',
    is_checked: false,
    position: 0,
    quantity: null,
    deadline: null,
    reminder_at: null,
    link: null,
    comment: null,
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
    expect(wrapper.find('.lk-item-row__meta').exists()).toBe(false)
  })

  it('shows the compact meta line: ×quantity chip (goods), tags and indicator icons', () => {
    const wrapper = mountRow({
      item: {
        quantity: 3,
        tags: ['Дом'],
        reminder_at: '2027-03-05T10:00:00Z',
        comment: 'заметка',
        link: 'https://ozon.ru',
      },
    })
    const meta = wrapper.find('.lk-item-row__meta')
    expect(meta.exists()).toBe(true)
    expect(meta.find('.lk-item-row__meta-chip').text()).toBe('×3')
    expect(meta.find('.lk-tag-pill').text()).toBe('Дом')
    // Индикаторы напоминания/ссылки — 2 иконки; comment в мете БОЛЬШЕ нет:
    // его роль у кнопки «Комментарий» в строке.
    expect(meta.find('.lk-item-row__indicators').findAll('svg')).toHaveLength(2)
  })

  it('does NOT render a comment indicator in the meta line (роль у кнопки в строке)', () => {
    // Только комментарий — мета-строка вовсе не рендерится.
    const wrapper = mountRow({ item: { comment: 'заметка' } })
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

  it('emits check / toggleExpand from the row controls, without a remove button in the row', async () => {
    const wrapper = mountRow()

    await wrapper.find('.lk-form-dialog__item-checkbox').setValue(true)
    expect(wrapper.emitted('check')).toEqual([[true]])

    // Удаление переехало в раскрытую область — в свёрнутой строке его нет.
    expect(wrapper.find('.lk-form-dialog__item-remove').exists()).toBe(false)
    expect(wrapper.find('.lk-item-attrs__remove').exists()).toBe(false)

    const chevron = wrapper.find('.lk-item-row__chevron')
    expect(chevron.attributes('aria-expanded')).toBe('false')
    await chevron.trigger('click')
    expect(wrapper.emitted('toggleExpand')).toHaveLength(1)
  })
})

describe('LkTaskItemRow — кнопка «Комментарий» в основной строке', () => {
  it('renders the comment icon button next to the chevron (chevron последний)', () => {
    const wrapper = mountRow()
    const button = wrapper.find('[aria-label="Комментарий: Молоко"]')
    expect(button.exists()).toBe(true)
    expect(button.classes()).toContain('lk-item-row__comment-btn')
    expect(button.classes()).not.toContain('lk-item-row__comment-btn--active')
    // Порядок в строке: [кнопка Комментарий][chevron].
    const buttons = wrapper.findAll('.lk-item-row__top button')
    expect(buttons.at(-2)?.classes()).toContain('lk-item-row__comment-btn')
    expect(buttons.at(-1)?.classes()).toContain('lk-item-row__chevron')
  })

  it('marks the button active (индикатор наличия) when the item has a comment', () => {
    const wrapper = mountRow({ item: { comment: 'заметка' } })
    expect(wrapper.find('.lk-item-row__comment-btn').classes()).toContain(
      'lk-item-row__comment-btn--active',
    )
  })

  it('click on a collapsed row emits toggleExpand and auto-opens the comment editor', async () => {
    const wrapper = mountRow()
    await wrapper.find('.lk-item-row__comment-btn').trigger('click')
    expect(wrapper.emitted('toggleExpand')).toHaveLength(1)
    // Клик по кнопке не трогает чекбокс.
    expect(wrapper.emitted('check')).toBeUndefined()

    // Родитель раскрывает строку — панель монтируется и сразу открывает редактор.
    await wrapper.setProps({ expanded: true })
    expect(wrapper.find('textarea[aria-label="Текст комментария"]').exists()).toBe(true)
  })

  it('click on an expanded row opens the editor without collapsing; сигнал сбрасывается', async () => {
    const wrapper = mountRow({ expanded: true, item: { comment: 'старый' } })
    await wrapper.find('.lk-item-row__comment-btn').trigger('click')
    expect(wrapper.emitted('toggleExpand')).toBeUndefined()
    const textarea = wrapper.find('textarea[aria-label="Текст комментария"]')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('старый')

    // Сигнал сброшен (@autoOpened): после «Отмена» повторный клик открывает снова.
    await wrapper.find('.lk-item-attrs__editor-cancel').trigger('click')
    expect(wrapper.find('.lk-item-attrs__editor').exists()).toBe(false)
    await wrapper.find('.lk-item-row__comment-btn').trigger('click')
    expect(wrapper.find('textarea[aria-label="Текст комментария"]').exists()).toBe(true)
  })
})

describe('LkTaskItemRow — раскрытая панель атрибутов', () => {
  it('marks the chevron expanded and renders 4 «добавить атрибут» chips WITHOUT «Комментарий»', () => {
    const wrapper = mountRow({ expanded: true })
    expect(wrapper.find('.lk-item-row__chevron').attributes('aria-expanded')).toBe('true')
    const chips = wrapper.findAll('.lk-item-attrs__chip')
    // «Комментарий» вынесен в кнопку основной строки — в чипсах его нет.
    expect(chips.map((chip) => chip.text())).toEqual([
      'Дедлайн',
      'Напоминание',
      'Ссылка',
      'Тег',
    ])
    expect(wrapper.findAll('.lk-item-attrs__token')).toHaveLength(0)
  })

  it('emits remove from the compact «Удалить строку» in the TOP toolbar of the expanded area', async () => {
    const wrapper = mountRow({ expanded: true })
    // «Удалить строку» — в верхнем тулбаре (первый ребёнок панели), справа
    // от степпера количества (goods), а не отдельной строкой внизу.
    const panel = wrapper.find('.lk-item-attrs')
    expect(panel.element.children[0]?.classList.contains('lk-item-attrs__toolbar')).toBe(true)
    const toolbar = panel.find('.lk-item-attrs__toolbar')
    expect(toolbar.find('.lk-item-attrs__quantity').exists()).toBe(true)
    const remove = toolbar.find('.lk-item-attrs__remove')
    expect(remove.text()).toBe('Удалить строку')

    await remove.trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('keeps «Удалить строку» in the top toolbar for tasks lists (без степпера)', async () => {
    const wrapper = mountRow({ expanded: true, listType: 'tasks' })
    const toolbar = wrapper.find('.lk-item-attrs__toolbar')
    expect(toolbar.find('.lk-item-attrs__quantity').exists()).toBe(false)
    await toolbar.find('.lk-item-attrs__remove').trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('renders tokens for set attributes (кроме comment) and keeps unset attributes as chips', () => {
    const wrapper = mountRow({
      expanded: true,
      item: { deadline: '2027-03-05', comment: 'привезти', tags: ['Дом'] },
    })
    // Токенов 2 (дедлайн + тег): comment не показывается токеном.
    const tokens = wrapper.findAll('.lk-item-attrs__token')
    expect(tokens).toHaveLength(2)
    expect(wrapper.text()).not.toContain('Есть заметка')
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

  it('edits the comment through the textarea editor opened by the row button', async () => {
    const wrapper = mountRow({ expanded: true, item: { comment: 'старый' } })
    // Редактор комментария открывается кнопкой в строке (не токеном/чипсом).
    await wrapper.find('.lk-item-row__comment-btn').trigger('click')
    const textarea = wrapper.find('textarea')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('старый')

    await textarea.setValue('новый текст')
    await wrapper.find('.lk-item-attrs__editor-apply').trigger('click')
    expect(lastEmittedUpdate(wrapper)).toEqual({ comment: 'новый текст' })
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
