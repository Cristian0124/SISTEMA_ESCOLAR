export function profileStorageKey(section: string, userId: number | string): string {
  return `sistema-escolar:${section}:${userId}`
}

export function loadDraft<T extends object>(key: string, defaults: T): T {
  const saved = localStorage.getItem(key)
  if (saved === null) return defaults

  const parsed: unknown = JSON.parse(saved)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Los datos guardados tienen un formato inválido.')
  }

  return Object.assign(defaults, parsed)
}

export function saveDraft(key: string, value: object): void {
  localStorage.setItem(key, JSON.stringify(value))
}
