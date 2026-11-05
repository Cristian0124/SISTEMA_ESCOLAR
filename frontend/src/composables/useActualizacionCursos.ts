import { onBeforeUnmount, onMounted } from 'vue'
import { useCursosStore } from '@/stores/cursos.store'

export function useActualizacionCursos(
  estaActivo: () => boolean,
  debeOmitir: () => boolean = () => false,
  intervaloMs = 15_000,
): void {
  const store = useCursosStore()

  const actualizar = () => {
    if (
      !estaActivo()
      || debeOmitir()
      || document.visibilityState === 'hidden'
      || store.cargando
    ) return

    void store.cargarCursos()
  }

  let intervalo: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    intervalo = setInterval(actualizar, intervaloMs)
    window.addEventListener('focus', actualizar)
  })

  onBeforeUnmount(() => {
    if (intervalo) clearInterval(intervalo)
    window.removeEventListener('focus', actualizar)
  })
}
