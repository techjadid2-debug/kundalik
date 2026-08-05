import { Mark, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    iqtibos: {
      setIqtibos: () => ReturnType
      toggleIqtibos: () => ReturnType
      unsetIqtibos: () => ReturnType
    }
  }
}

/**
 * Maqola ichidagi gapni "iqtibos" deb belgilaydigan mark.
 * Belgilangan matnlar publish paytida ajratib olinadi va
 * kanalga alohida iqtibos posti sifatida navbatga qo'yiladi.
 */
export const Iqtibos = Mark.create({
  name: 'iqtibos',

  parseHTML() {
    return [{ tag: 'mark[data-iqtibos]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'mark',
      mergeAttributes(HTMLAttributes, { 'data-iqtibos': '', class: 'iqtibos' }),
      0,
    ]
  },

  addCommands() {
    return {
      setIqtibos:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),
      toggleIqtibos:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
      unsetIqtibos:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-q': () => this.editor.commands.toggleIqtibos(),
    }
  },
})
