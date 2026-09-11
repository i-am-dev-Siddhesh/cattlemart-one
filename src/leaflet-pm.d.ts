import 'leaflet'

declare module 'leaflet' {
  interface Map {
    pm: {
      addControls: (opts: Record<string, unknown>) => void
      enableDraw: (shape: string) => void
      disableDraw: (shape?: string) => void
      toggleGlobalEditMode: () => void
      toggleGlobalRemovalMode: () => void
      setLang: (lang: string) => void
    }
  }
  interface Layer {
    pm: {
      enable: () => void
      disable: () => void
    }
  }
}
