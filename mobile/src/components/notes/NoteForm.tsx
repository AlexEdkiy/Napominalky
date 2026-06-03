import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import BaseButton from '@/components/common/BaseButton'
import BaseInput from '@/components/common/BaseInput'
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback'

export interface NoteFormValues {
  title: string
  body: string
}

interface NoteFormProps {
  initialValues?: NoteFormValues
  isPinned?: boolean
  isArchived?: boolean
  onAutoSave: (values: NoteFormValues) => void
  onTogglePin?: () => void
  onToggleArchive?: () => void
  onDelete?: () => void
}

const AUTOSAVE_DELAY = 800

const NoteForm: React.FC<NoteFormProps> = ({
  initialValues,
  isPinned = false,
  isArchived = false,
  onAutoSave,
  onTogglePin,
  onToggleArchive,
  onDelete,
}) => {
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [body, setBody] = useState(initialValues?.body ?? '')
  const isDirty = useRef(false)
  const debouncedSave = useDebouncedCallback(onAutoSave, AUTOSAVE_DELAY)

  useEffect(() => {
    if (isDirty.current) debouncedSave({ title, body })
  }, [title, body, debouncedSave])

  const handleTitle = (text: string): void => {
    isDirty.current = true
    setTitle(text)
  }

  const handleBody = (text: string): void => {
    isDirty.current = true
    setBody(text)
  }

  return (
    <View style={styles.container}>
      <BaseInput label="Заголовок" value={title} onChangeText={handleTitle} placeholder="Заголовок" />
      <BaseInput
        label="Текст"
        value={body}
        onChangeText={handleBody}
        placeholder="Текст заметки"
        multiline
        style={styles.body}
      />
      <View style={styles.actions}>
        {onTogglePin ? (
          <BaseButton
            label={isPinned ? 'Открепить' : 'Закрепить'}
            variant="secondary"
            onPress={onTogglePin}
          />
        ) : null}
        {onToggleArchive ? (
          <BaseButton
            label={isArchived ? 'Из архива' : 'В архив'}
            variant="secondary"
            onPress={onToggleArchive}
          />
        ) : null}
        {onDelete ? <BaseButton label="Удалить" variant="secondary" onPress={onDelete} /> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 16, padding: 16 },
  body: { minHeight: 160, textAlignVertical: 'top', paddingTop: 12 },
  actions: { gap: 12 },
})

export default NoteForm
