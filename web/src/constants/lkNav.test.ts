import { describe, expect, it } from 'vitest'

import { isLkNavItemActive, LK_NAV_ITEMS, LK_SECTION_META } from './lkNav'

function findItem(routeName: string) {
  return LK_NAV_ITEMS.find((item) => item.routeName === routeName)
}

describe('LK_NAV_ITEMS', () => {
  it('contains 5 items in order: Обзор, Задачи и списки, Напоминания, Календарь, Заметки', () => {
    expect(LK_NAV_ITEMS.map((item) => item.label)).toEqual([
      'Вспомнить все!',
      'Задачи и списки',
      'Напоминания',
      'Календарь',
      'Заметки',
    ])
  })

  it('exposes the «Напоминания» item with the bell icon and form deep-link related routes', () => {
    const reminders = findItem('lk-reminders')
    expect(reminders).toBeDefined()
    expect(reminders?.icon).toBe('bell')
    expect(reminders?.mobileLabel).toBe('Напомин.')
    expect(reminders?.relatedNames).toEqual(['lk-reminder-create', 'lk-reminder-edit'])
  })

  it('no longer lists reminder routes under «Задачи и списки» (иначе подсветятся 2 пункта)', () => {
    const tasks = findItem('lk-tasks')
    expect(tasks?.relatedNames).toEqual(['lk-lists', 'lk-list-detail'])
  })

  it('activates ONLY the «Напоминания» item on lk-reminders / lk-reminder-edit routes', () => {
    for (const routeName of ['lk-reminders', 'lk-reminder-create', 'lk-reminder-edit']) {
      const active = LK_NAV_ITEMS.filter((item) => isLkNavItemActive(item, routeName))
      expect(active.map((item) => item.routeName)).toEqual(['lk-reminders'])
    }
  })

  it('keeps «Задачи и списки» active for its own routes only', () => {
    for (const routeName of ['lk-tasks', 'lk-lists', 'lk-list-detail']) {
      const active = LK_NAV_ITEMS.filter((item) => isLkNavItemActive(item, routeName))
      expect(active.map((item) => item.routeName)).toEqual(['lk-tasks'])
    }
  })
})

describe('LK_SECTION_META', () => {
  it('provides the «Напоминания» title/subtitle for the list and both form deep-link routes', () => {
    for (const routeName of ['lk-reminders', 'lk-reminder-create', 'lk-reminder-edit']) {
      expect(LK_SECTION_META[routeName]).toEqual({
        title: 'Напоминания',
        subtitle: 'Все напоминания с датой и временем',
      })
    }
  })
})
