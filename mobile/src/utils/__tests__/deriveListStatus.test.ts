import { deriveListStatus } from '../deriveListStatus'
import {
  forChecked,
  isDone,
  isTaskStatus,
  normalizeTaskStatus,
  type TaskStatus,
} from '@/constants/taskStatus'

describe('deriveListStatus — деривация статуса задачи из пунктов', () => {
  it('пустой список пунктов → new', () => {
    expect(deriveListStatus([])).toBe('new')
  })

  it('все пункты new → new', () => {
    expect(deriveListStatus(['new', 'new'])).toBe('new')
  })

  it('хоть один in_progress → in_progress (приоритет №1)', () => {
    expect(deriveListStatus(['new', 'in_progress'])).toBe('in_progress')
    expect(deriveListStatus(['done', 'in_progress', 'postponed'])).toBe('in_progress')
    expect(deriveListStatus(['in_progress'])).toBe('in_progress')
  })

  it('все done → done', () => {
    expect(deriveListStatus(['done'])).toBe('done')
    expect(deriveListStatus(['done', 'done', 'done'])).toBe('done')
  })

  it('все postponed → postponed', () => {
    expect(deriveListStatus(['postponed'])).toBe('postponed')
    expect(deriveListStatus(['postponed', 'postponed'])).toBe('postponed')
  })

  it('смесь done+postponed (без in_progress) → new', () => {
    expect(deriveListStatus(['done', 'postponed'])).toBe('new')
  })

  it('смесь new+done → new', () => {
    expect(deriveListStatus(['new', 'done'])).toBe('new')
  })

  it('смесь new+postponed → new', () => {
    expect(deriveListStatus(['new', 'postponed'])).toBe('new')
  })

  it('полная матрица одиночных статусов', () => {
    const single: Record<TaskStatus, TaskStatus> = {
      new: 'new',
      in_progress: 'in_progress',
      postponed: 'postponed',
      done: 'done',
    }
    for (const [input, expected] of Object.entries(single)) {
      expect(deriveListStatus([input as TaskStatus])).toBe(expected)
    }
  })
})

describe('forChecked — инвариант чекбокса и статуса', () => {
  it('checked=true всегда → done', () => {
    expect(forChecked(true, 'new')).toBe('done')
    expect(forChecked(true, 'in_progress')).toBe('done')
    expect(forChecked(true, 'postponed')).toBe('done')
    expect(forChecked(true, 'done')).toBe('done')
  })

  it('checked=false: done сбрасывается в new', () => {
    expect(forChecked(false, 'done')).toBe('new')
  })

  it('checked=false: остальные статусы сохраняются', () => {
    expect(forChecked(false, 'new')).toBe('new')
    expect(forChecked(false, 'in_progress')).toBe('in_progress')
    expect(forChecked(false, 'postponed')).toBe('postponed')
  })
})

describe('isDone / isTaskStatus / normalizeTaskStatus', () => {
  it('isDone true только для done', () => {
    expect(isDone('done')).toBe(true)
    expect(isDone('new')).toBe(false)
    expect(isDone('in_progress')).toBe(false)
    expect(isDone('postponed')).toBe(false)
  })

  it('isTaskStatus распознаёт валидные значения и отклоняет мусор', () => {
    expect(isTaskStatus('in_progress')).toBe(true)
    expect(isTaskStatus('deleted')).toBe(false)
    expect(isTaskStatus(null)).toBe(false)
    expect(isTaskStatus(1)).toBe(false)
  })

  it('normalizeTaskStatus: мусор/undefined → new, валидное — как есть', () => {
    expect(normalizeTaskStatus('postponed')).toBe('postponed')
    expect(normalizeTaskStatus(undefined)).toBe('new')
    expect(normalizeTaskStatus('bogus')).toBe('new')
  })
})
