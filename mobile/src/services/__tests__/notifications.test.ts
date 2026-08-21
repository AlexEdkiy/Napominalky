import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import {
  DEFAULT_ANDROID_CHANNEL_ID,
  REMINDER_ACTION_COMPLETE,
  REMINDER_ACTION_SNOOZE_10M,
  REMINDER_CATEGORY_ID,
  cancelReminder,
  configureNotificationHandler,
  ensureAndroidNotificationChannel,
  rescheduleItemReminder,
  rescheduleReminder,
  scheduleItemReminder,
  scheduleReminder,
} from '../notifications'

const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock
const mockCancel = Notifications.cancelScheduledNotificationAsync as jest.Mock
const mockSetHandler = Notifications.setNotificationHandler as jest.Mock
const mockSetChannel = Notifications.setNotificationChannelAsync as jest.Mock
const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock

const future = (): string => new Date(Date.now() + 60_000).toISOString()
const past = (): string => new Date(Date.now() - 60_000).toISOString()

const originalPlatformOs = Platform.OS

beforeEach(() => {
  jest.clearAllMocks()
  mockSchedule.mockResolvedValue('notif-1')
  mockGetPermissions.mockResolvedValue({ granted: true, status: 'granted', canAskAgain: true, expires: 'never' })
  Platform.OS = originalPlatformOs
})

describe('scheduleReminder', () => {
  it('планирует уведомление на будущую дату с data{type,uuid}', async () => {
    const id = await scheduleReminder({
      uuid: 'u1',
      title: 'Звонок',
      notes: 'детали',
      remind_at: future(),
    })

    expect(id).toBe('notif-1')
    const arg = mockSchedule.mock.calls[0]?.[0]
    expect(arg.content.data).toEqual({ type: 'reminder', uuid: 'u1' })
    expect(arg.content.title).toBe('Звонок')
    expect(arg.content.body).toBe('детали')
    expect(arg.trigger.type).toBe('date')
    expect(arg.trigger.date).toBeInstanceOf(Date)
    expect(arg.trigger.channelId).toBe(DEFAULT_ANDROID_CHANNEL_ID)
  })

  it('уведомление получает категорию с кнопками «Выполнено»/«Отложить на 10 мин»', async () => {
    await scheduleReminder({ uuid: 'u1', title: 'Звонок', remind_at: future() })
    const arg = mockSchedule.mock.calls[0]?.[0]
    expect(arg.content.categoryIdentifier).toBe(REMINDER_CATEGORY_ID)

    // Регистрация категории — идемпотентный singleton: проверяем на свежем
    // экземпляре модуля (в этом файле категория уже зарегистрирована ранее).
    const mockSetCategory = Notifications.setNotificationCategoryAsync as jest.Mock
    let fresh: typeof import('../notifications') | undefined
    jest.isolateModules(() => {
      fresh = require('../notifications')
    })
    await fresh?.ensureReminderNotificationCategory()
    const call = mockSetCategory.mock.calls.find(([id]: [string]) => id === REMINDER_CATEGORY_ID)
    expect(call).toBeDefined()
    const actions = call?.[1] as Array<{ identifier: string; buttonTitle: string; options?: { opensAppToForeground?: boolean } }>
    expect(actions.map((a) => a.identifier)).toEqual([
      REMINDER_ACTION_COMPLETE,
      REMINDER_ACTION_SNOOZE_10M,
    ])
    expect(actions.map((a) => a.buttonTitle)).toEqual(['Выполнено', 'Отложить на 10 мин'])
    expect(actions.every((a) => a.options?.opensAppToForeground === false)).toBe(true)
  })

  it('прошедшую дату не планирует, возвращает null', async () => {
    const id = await scheduleReminder({
      uuid: 'u1',
      title: 'Звонок',
      remind_at: past(),
    })

    expect(id).toBeNull()
    expect(mockSchedule).not.toHaveBeenCalled()
  })

  it('snoozed_until приоритетнее remind_at при выборе даты', async () => {
    const snoozed = future()
    await scheduleReminder({
      uuid: 'u1',
      title: 'Звонок',
      remind_at: past(),
      snoozed_until: snoozed,
    })

    const arg = mockSchedule.mock.calls[0]?.[0]
    expect((arg.trigger.date as Date).toISOString()).toBe(snoozed)
  })

  it('пустые notes дают пустой body', async () => {
    await scheduleReminder({ uuid: 'u1', title: 'T', remind_at: future() })
    expect(mockSchedule.mock.calls[0]?.[0].content.body).toBe('')
  })
})

describe('scheduleReminder — без разрешения на уведомления', () => {
  it('permission не granted → не планирует, возвращает null', async () => {
    mockGetPermissions.mockResolvedValueOnce({
      granted: false,
      status: 'denied',
      canAskAgain: true,
      expires: 'never',
    })

    const id = await scheduleReminder({ uuid: 'u1', title: 'T', remind_at: future() })

    expect(id).toBeNull()
    expect(mockSchedule).not.toHaveBeenCalled()
  })
})

describe('cancelReminder', () => {
  it('отменяет по id', async () => {
    await cancelReminder('notif-1')
    expect(mockCancel).toHaveBeenCalledWith('notif-1')
  })

  it('null id — ничего не делает', async () => {
    await cancelReminder(null)
    expect(mockCancel).not.toHaveBeenCalled()
  })

  it('проглатывает ошибку отмены (id уже сработал)', async () => {
    mockCancel.mockRejectedValueOnce(new Error('not found'))
    await expect(cancelReminder('gone')).resolves.toBeUndefined()
  })
})

describe('rescheduleReminder', () => {
  it('отменяет старое и планирует новое', async () => {
    const id = await rescheduleReminder(
      { uuid: 'u1', title: 'T', remind_at: future() },
      'old-id',
    )

    expect(mockCancel).toHaveBeenCalledWith('old-id')
    expect(mockSchedule).toHaveBeenCalled()
    expect(id).toBe('notif-1')
  })
})

describe('configureNotificationHandler', () => {
  it('идемпотентен: повторные вызовы не дублируют setNotificationHandler', () => {
    configureNotificationHandler()
    configureNotificationHandler()
    expect(mockSetHandler).toHaveBeenCalledTimes(1)
  })
})

describe('scheduleItemReminder', () => {
  it('планирует уведомление на будущую дату с data.type=list_item', async () => {
    const id = await scheduleItemReminder({
      uuid: 'i1',
      listUuid: 'l1',
      name: 'Купить молоко',
      comment: 'Без жира',
      reminderAt: future(),
    })

    expect(id).toBe('notif-1')
    const arg = mockSchedule.mock.calls[0]?.[0]
    expect(arg.content.data).toEqual({
      type: 'list_item',
      itemUuid: 'i1',
      listUuid: 'l1',
    })
    expect(arg.content.title).toBe('Купить молоко')
    expect(arg.content.body).toBe('Без жира')
    expect(arg.trigger.type).toBe('date')
    expect(arg.trigger.date).toBeInstanceOf(Date)
    expect(arg.trigger.channelId).toBe(DEFAULT_ANDROID_CHANNEL_ID)
  })

  it('прошедшая дата → null, уведомление не планируется', async () => {
    const id = await scheduleItemReminder({
      uuid: 'i1',
      listUuid: 'l1',
      name: 'Хлеб',
      reminderAt: past(),
    })

    expect(id).toBeNull()
    expect(mockSchedule).not.toHaveBeenCalled()
  })

  it('пустой comment даёт пустой body', async () => {
    await scheduleItemReminder({
      uuid: 'i1',
      listUuid: 'l1',
      name: 'Соль',
      reminderAt: future(),
    })

    expect(mockSchedule.mock.calls[0]?.[0].content.body).toBe('')
  })

  it('null comment даёт пустой body', async () => {
    await scheduleItemReminder({
      uuid: 'i1',
      listUuid: 'l1',
      name: 'Соль',
      comment: null,
      reminderAt: future(),
    })

    expect(mockSchedule.mock.calls[0]?.[0].content.body).toBe('')
  })
})

describe('rescheduleItemReminder', () => {
  it('отменяет старое и планирует новое уведомление', async () => {
    const id = await rescheduleItemReminder(
      { uuid: 'i1', listUuid: 'l1', name: 'Молоко', reminderAt: future() },
      'old-id',
    )

    expect(mockCancel).toHaveBeenCalledWith('old-id')
    expect(mockSchedule).toHaveBeenCalled()
    expect(id).toBe('notif-1')
  })
})

describe('scheduleItemReminder — без разрешения на уведомления', () => {
  it('permission не granted → не планирует, возвращает null', async () => {
    mockGetPermissions.mockResolvedValueOnce({
      granted: false,
      status: 'denied',
      canAskAgain: true,
      expires: 'never',
    })

    const id = await scheduleItemReminder({
      uuid: 'i1',
      listUuid: 'l1',
      name: 'Соль',
      reminderAt: future(),
    })

    expect(id).toBeNull()
    expect(mockSchedule).not.toHaveBeenCalled()
  })
})

describe('ensureAndroidNotificationChannel', () => {
  afterEach(() => {
    Platform.OS = originalPlatformOs
  })

  it('на iOS — no-op, канал не создаётся', async () => {
    Platform.OS = 'ios'
    await ensureAndroidNotificationChannel()
    expect(mockSetChannel).not.toHaveBeenCalled()
  })

  it('на Android создаёт канал default с importance HIGH; идемпотентен', async () => {
    Platform.OS = 'android'
    await ensureAndroidNotificationChannel()
    await ensureAndroidNotificationChannel()

    expect(mockSetChannel).toHaveBeenCalledTimes(1)
    expect(mockSetChannel).toHaveBeenCalledWith(
      DEFAULT_ANDROID_CHANNEL_ID,
      expect.objectContaining({
        name: expect.any(String),
        importance: Notifications.AndroidImportance.HIGH,
      }),
    )
  })
})
