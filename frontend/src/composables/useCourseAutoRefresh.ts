import { onBeforeUnmount, onMounted } from 'vue'
import { useCoursesStore } from '@/stores/courses.store'

export function useCourseAutoRefresh(
  isActive: () => boolean,
  shouldSkip: () => boolean = () => false,
  intervalMs = 15_000,
): void {
  const store = useCoursesStore()

  const actualizar = () => {
    if (
      !isActive()
      || shouldSkip()
      || document.visibilityState === 'hidden'
      || store.cargando
    ) return

    void store.cargarCursos()
  }

  let intervalo: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    intervalo = setInterval(actualizar, intervalMs)
    window.addEventListener('focus', actualizar)
  })

  onBeforeUnmount(() => {
    if (intervalo) clearInterval(intervalo)
    window.removeEventListener('focus', actualizar)
  })
}
