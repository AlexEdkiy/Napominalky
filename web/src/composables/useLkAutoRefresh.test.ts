import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

import { AUTO_REFRESH_THROTTLE_MS, useLkAutoRefresh } from './useLkAutoRefresh'
import { syncApi } from '@/api/syncApi'
import { resetLkFormsForTests } from '@/composables/useLkForms'
import { resetSyncMeterForTests, useSyncMeter } from '@/composables/useSyncMeter'

const emptyChangesResponse = {
  data: { notes: [], shopping_lists: [], shopping_list_items: [], reminders: [] },
  meta: { cursor: 1, has_more: false },
}

/** Фиксированный момент времени — тесты не зависят от реальной даты. */
const NOW_MS = 1_700_000_000_000

const HostComponent = defineComponent({
  setup() {
    useLkAutoRefresh()
    return () => null
  },
})

function setVisibilityState(state: DocumentVisibilityState): void {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state)
}

async function fireVisibilityChange(state: DocumentVisibilityState): Promise<void> {
  setVisibilityState(state)
  document.dispatchEvent(new Event('visibilitychange'))
  await Promise.resolve()
}

describe('useLkAutoRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetSyncMeterForTests()
    resetLkFormsForTests()
    vi.spyOn(Date, 'now').mockReturnValue(NOW_MS)
    vi.mocked(syncApi.fetchChanges).mockResolvedValue(emptyChangesResponse)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('runs the sync when the tab becomes visible and no recent sync happened', async () => {
    const wrapper = mount(HostComponent)

    await fireVisibilityChange('visible')

    expect(syncApi.fetchChanges).toHaveBeenCalledTimes(1)
    expect(syncApi.fetchChanges).toHaveBeenCalledWith(0)
    wrapper.unmount()
  })

  it('does not run the sync when the tab becomes hidden', async () => {
    const wrapper = mount(HostComponent)

    await fireVisibilityChange('hidden')

    expect(syncApi.fetchChanges).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('throttles: skips the sync when the last one finished less than 30s ago', async () => {
    const { lastSyncedAt } = useSyncMeter()
    lastSyncedAt.value = new Date(NOW_MS - AUTO_REFRESH_THROTTLE_MS + 1_000)
    const wrapper = mount(HostComponent)

    await fireVisibilityChange('visible')

    expect(syncApi.fetchChanges).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('runs the sync again once the throttle window has passed', async () => {
    const { lastSyncedAt } = useSyncMeter()
    lastSyncedAt.value = new Date(NOW_MS - AUTO_REFRESH_THROTTLE_MS)
    const wrapper = mount(HostComponent)

    await fireVisibilityChange('visible')

    expect(syncApi.fetchChanges).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('removes the visibilitychange listener on unmount', async () => {
    const wrapper = mount(HostComponent)
    wrapper.unmount()

    await fireVisibilityChange('visible')

    expect(syncApi.fetchChanges).not.toHaveBeenCalled()
  })
})

vi.mock('@/api/syncApi', () => ({
  syncApi: {
    fetchChanges: vi.fn(),
    fetchConflicts: vi.fn(),
  },
}))
