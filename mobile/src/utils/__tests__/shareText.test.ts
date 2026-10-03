import { noteShareText, listShareText } from '@/utils/shareText'

describe('plain text sharing', () => {
  it('shares the current title/body with original line breaks and special characters', () => {
    expect(noteShareText(' План & дела ', 'Первая строка\nВторая <b>строка</b>')).toBe(
      'План & дела\n\nПервая строка\nВторая <b>строка</b>',
    )
    expect(noteShareText('', 'Только текст')).toBe('Только текст')
    expect(noteShareText('Заголовок', null)).toBe('Заголовок')
    expect(noteShareText(' ', ' ')).toBe('')
  })
  it('keeps all task statuses and completion marks in list order', () => {
    const items = [
      { name: 'Разобрать', isChecked: false, status: 'new' as const, quantity: 1 },
      { name: 'Написать', isChecked: false, status: 'in_progress' as const, quantity: 1 },
      { name: 'Позвонить', isChecked: false, status: 'postponed' as const, quantity: 1 },
      { name: 'Проверить', isChecked: true, status: 'done' as const, quantity: 1 },
    ]
    expect(listShareText('План', 'tasks', items)).toBe(
      'План\n\n☐ Разобрать — Новая\n☐ Написать — В работе\n☐ Позвонить — Отложена\n☑ Проверить — Выполнена',
    )
  })
  it('shares quantities and purchased marks without task statuses', () => {
    expect(listShareText('Продукты', 'goods', [
      { name: 'Молоко', isChecked: true, status: 'new', quantity: 2 },
      { name: 'Хлеб', isChecked: false, status: 'new', quantity: 1 },
      { name: 'Сыр', isChecked: false, status: 'new', quantity: 0.5 },
    ])).toBe('Продукты\n\n☑ Молоко × 2\n☐ Хлеб\n☐ Сыр × 0.5')
    expect(listShareText('', 'goods', [])).toBe('Список покупок')
  })
  it('does not truncate long content or append an application URL', () => {
    const body = 'Длинная заметка 🚀\n'.repeat(1000).trim()
    expect(noteShareText('Заметка', body)).toBe(`Заметка\n\n${body}`)
  })
})
