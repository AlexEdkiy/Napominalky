import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import LkNoteFormDialog from './LkNoteFormDialog.vue'
import { notesApi } from '@/api/notesApi'
import { resetLkFormsForTests, useLkForms } from '@/composables/useLkForms'
import type { Note } from '@/types/note'

const note: Note = {
  uuid: 'n-1',
  title: 'Список покупок на дачу',
  body: 'Молоко, хлеб',
  color: 'amber',
  is_pinned: false,
  is_archived: false,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
}

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  )
}

function mountDialog() {
  stubMatchMedia(true)
  return mount(LkNoteFormDialog)
}

describe('LkNoteFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLkFormsForTests()
  })

  it('renders nothing when the form is closed', () => {
    const wrapper = mountDialog()
    expect(wrapper.find('.lk-form-dialog__overlay').exists()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('shows the "new" title with an empty form and the default teal color', async () => {
    const wrapper = mountDialog()
    useLkForms().openNoteForm()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.lk-form-dialog__title').text()).toBe('Новая заметка')
    expect((wrapper.find('#note-form-title').element as HTMLInputElement).value).toBe('')
    expect(wrapper.find('.lk-form-dialog__delete').exists()).toBe(false)
    const activeSwatch = wrapper.find('.lk-note-form-dialog__swatch--active')
    expect(activeSwatch.attributes('aria-label')).toBe('teal')
    vi.unstubAllGlobals()
  })

  it('shows the "edit" title pre-filled with the title/body/color', async () => {
    const wrapper = mountDialog()
    useLkForms().openNoteForm(note)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.lk-form-dialog__title').text()).toBe('Редактирование заметки')
    expect((wrapper.find('#note-form-title').element as HTMLInputElement).value).toBe('Список покупок на дачу')
    expect((wrapper.find('#note-form-body').element as HTMLTextAreaElement).value).toBe('Молоко, хлеб')
    expect(wrapper.find('.lk-note-form-dialog__swatch--active').attributes('aria-label')).toBe('amber')
    expect(wrapper.find('.lk-form-dialog__delete').exists()).toBe(true)
    vi.unstubAllGlobals()
  })

  it('does not call the API and simply closes when both title and body are empty', async () => {
    const wrapper = mountDialog()
    const forms = useLkForms()
    forms.openNoteForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('form').trigger('submit')

    expect(notesApi.createNote).not.toHaveBeenCalled()
    expect(forms.isNoteFormOpen.value).toBe(false)
    vi.unstubAllGlobals()
  })

  it('selects a color swatch and includes it in the create payload', async () => {
    const wrapper = mountDialog()
    vi.mocked(notesApi.createNote).mockResolvedValue({ ...note, uuid: 'n-2', color: 'purple' })
    useLkForms().openNoteForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('#note-form-title').setValue('Новая заметка')
    const swatches = wrapper.findAll('.lk-note-form-dialog__swatch')
    await swatches[3]?.trigger('click')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(notesApi.createNote).toHaveBeenCalledWith({
        title: 'Новая заметка',
        body: null,
        color: 'purple',
      }),
    )
    vi.unstubAllGlobals()
  })

  it('creates a note, bumps the version and closes the form', async () => {
    const wrapper = mountDialog()
    vi.mocked(notesApi.createNote).mockResolvedValue({ ...note, uuid: 'n-2' })
    const forms = useLkForms()
    forms.openNoteForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('#note-form-title').setValue('Заметка')
    await wrapper.find('#note-form-body').setValue('Текст')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(notesApi.createNote).toHaveBeenCalled())
    expect(forms.notesVersion.value).toBe(1)
    expect(forms.isNoteFormOpen.value).toBe(false)
    vi.unstubAllGlobals()
  })

  it('updates an existing note with the edited fields', async () => {
    const wrapper = mountDialog()
    vi.mocked(notesApi.updateNote).mockResolvedValue({ ...note, title: 'Обновлено' })
    const forms = useLkForms()
    forms.openNoteForm(note)
    await wrapper.vm.$nextTick()

    await wrapper.find('#note-form-title').setValue('Обновлено')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(notesApi.updateNote).toHaveBeenCalledWith('n-1', {
        title: 'Обновлено',
        body: 'Молоко, хлеб',
        color: 'amber',
      }),
    )
    expect(forms.notesVersion.value).toBe(1)
    vi.unstubAllGlobals()
  })

  it('shows a field-level validation error from a 422 API response', async () => {
    const wrapper = mountDialog()
    vi.mocked(notesApi.createNote).mockRejectedValue({
      isAxiosError: true,
      response: { status: 422, data: { message: 'Ошибка', errors: { title: ['Обязательное поле'] } } },
    })
    useLkForms().openNoteForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('#note-form-body').setValue('Текст без заголовка')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Обязательное поле'))
    vi.unstubAllGlobals()
  })

  it('deletes the note from the footer after confirmation', async () => {
    const wrapper = mountDialog()
    vi.mocked(notesApi.deleteNote).mockResolvedValue(undefined)
    const forms = useLkForms()
    forms.openNoteForm(note)
    await wrapper.vm.$nextTick()

    await wrapper.find('.lk-form-dialog__delete').trigger('click')
    expect(wrapper.text()).toContain('Удалить заметку?')
    await wrapper.find('.lk-confirm-dialog__confirm').trigger('click')

    await vi.waitFor(() => expect(notesApi.deleteNote).toHaveBeenCalledWith('n-1'))
    expect(forms.notesVersion.value).toBe(1)
    expect(forms.isNoteFormOpen.value).toBe(false)
    vi.unstubAllGlobals()
  })

  it('does not delete when the confirmation is cancelled', async () => {
    const wrapper = mountDialog()
    useLkForms().openNoteForm(note)
    await wrapper.vm.$nextTick()

    await wrapper.find('.lk-form-dialog__delete').trigger('click')
    await wrapper.find('.lk-confirm-dialog__cancel').trigger('click')

    expect(notesApi.deleteNote).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('closes on Cancel, the close button, Escape and the scrim click', async () => {
    const wrapper = mountDialog()
    const forms = useLkForms()

    forms.openNoteForm()
    await wrapper.vm.$nextTick()
    await wrapper.find('.lk-form-dialog__cancel').trigger('click')
    expect(forms.isNoteFormOpen.value).toBe(false)

    forms.openNoteForm()
    await wrapper.vm.$nextTick()
    await wrapper.find('.lk-form-dialog__close').trigger('click')
    expect(forms.isNoteFormOpen.value).toBe(false)

    forms.openNoteForm()
    await wrapper.vm.$nextTick()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(forms.isNoteFormOpen.value).toBe(false)

    forms.openNoteForm()
    await wrapper.vm.$nextTick()
    await wrapper.find('.lk-form-dialog__overlay').trigger('click')
    expect(forms.isNoteFormOpen.value).toBe(false)

    vi.unstubAllGlobals()
  })

  it('renders as a bottom sheet on mobile and a centered modal on desktop', async () => {
    stubMatchMedia(false)
    const mobile = mount(LkNoteFormDialog)
    useLkForms().openNoteForm()
    await mobile.vm.$nextTick()
    expect(mobile.find('.lk-form-dialog__overlay--desktop').exists()).toBe(false)
    vi.unstubAllGlobals()

    resetLkFormsForTests()
    const wrapper = mountDialog()
    useLkForms().openNoteForm()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lk-form-dialog__overlay--desktop').exists()).toBe(true)
    vi.unstubAllGlobals()
  })
})

vi.mock('@/api/notesApi', () => ({
  notesApi: {
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
  },
}))
