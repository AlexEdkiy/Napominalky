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
    // Индикаторы напоминания/комментария/ссылки — 3 ненавязчивые иконки.
    expect(meta.find('.lk-item-row__indicators').findAll('svg')).toHaveLength(3)
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

  it('emits check / remove / toggleExpand from the row controls', async () => {
    const wrapper = mountRow()

    await wrapper.find('.lk-form-dialog__item-checkbox').setValue(true)
    expect(wrapper.emitted('check')).toEqual([[true]])

    await wrapper.find('.lk-form-dialog__item-remove').trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)

    const chevron = wrapper.find('.lk-item-row__chevron')
    expect(chevron.attributes('aria-expanded')).toBe('false')
    await chevron.trigger('click')
    expect(wrapper.emitted('toggleExpand')).toHaveLength(1)
  })
})

describe('LkTaskItemRow — раскрытая панель атрибутов', () => {
  it('marks the chevron expanded and renders 5 «добавить атрибут» chips for an empty item', () => {
    const wrapper = mountRow({ expanded: true })
    expect(wrapper.find('.lk-item-row__chevron').attributes('aria-expanded')).toBe('true')
    const chips = wrapper.findAll('.lk-item-attrs__chip')
    expect(chips.map((chip) => chip.text())).toEqual([
      'Дедлайн',
      'Напоминание',
      'Ссылка',
      'Комментарий',
      'Тег',
    ])
    expect(wrapper.findAll('.lk-item-attrs__token')).toHaveLength(0)
  })

  it('renders tokens for set attributes and keeps only unset attributes as chips', () => {
    const wrapper = mountRow({
      expanded: true,
      item: { deadline: '2027-03-05', comment: 'привезти', tags: ['Дом'] },
    })
    const tokens = wrapper.findAll('.lk-item-attrs__token')
    expect(tokens).toHaveLength(3)
    expect(wrapper.text()).toContain('Есть заметка')
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

  it('edits the comment through the textarea editor', async () => {
    const wrapper = mountRow({ expanded: true, item: { comment: 'старый' } })
    // Клик по токену открывает редактор с предзаполненным значением.
    await wrapper.find('.lk-item-attrs__token-open').trigger('click')
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
