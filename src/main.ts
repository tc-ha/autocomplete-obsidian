import { MarkdownView, Plugin } from 'obsidian'
import { Autocomplete } from './autocomplete'
import { AutocompleteSettings } from './settings/settings'
import { AutocompleteSettingsTab } from './settings/settings-tab'

export default class AutocompletePlugin extends Plugin {
  private autocomplete: Autocomplete
  private lastUsedEditor: CodeMirror.Editor
  settings: AutocompleteSettings

  async onload() {
    console.log('Loading Autocomplete plugin.')
    this.settings = Object.assign(
      new AutocompleteSettings(),
      await this.loadData()
    )
    this.addSettingTab(new AutocompleteSettingsTab(this.app, this))

    if (!this.settings.enabled) return

    this.enable()
    this.addCommands()
  }

  async onunload() {
    console.log('Unloaded Obsidian Autocomplete')
    this.disable()
  }

  async refresh() {
    this.disable()
    this.enable()
  }

  private addCommands() {
    this.addCommand({
      id: 'autocomplete-toggle',
      name: 'Toggle Autocomplete',
      hotkeys: [
        {
          modifiers: ['Ctrl'],
          key: ' ',
        },
      ],
      callback: () => {
        const autocomplete = this.autocomplete
        const editor = this.getValidEditorFor(autocomplete)

        if (editor) {
          // Do not open on vim normal mode
          if (editor.getOption('keyMap') === 'vim') return

          autocomplete.toggleViewIn(editor)
        }
      },
    })
  }

  enable() {
    this.autocomplete = new Autocomplete(this.settings)
    if (this.settings.flowProviderScanCurrent)
      // Passing autocomplete as context
      this.app.workspace.on(
        'file-open',
        this.autocomplete.onFileOpened,
        this.autocomplete
      )
    this.registerCodeMirror((editor) => {
      editor.on('keyup', this.keyUpListener)
    })
  }

  disable() {
    const workspace = this.app.workspace
    // Always remove to avoid any kind problem
    workspace.off('file-open', this.autocomplete.onFileOpened)
    workspace.iterateCodeMirrors((cm) => {
      cm.off('keyup', this.keyUpListener)
      this.autocomplete.removeViewFrom(cm)
    })
  }

  private keyUpListener = (editor: CodeMirror.Editor, event: KeyboardEvent) => {
    const autocomplete = this.autocomplete
    autocomplete.updateProvidersFrom(event, editor)

    if (!autocomplete.isShown) return

    this.updateEditorIfChanged(editor, autocomplete)

    this.autocomplete.updateViewIn(editor, event)
  }

  private getValidEditorFor(
    autocomplete: Autocomplete
  ): CodeMirror.Editor | null {
    const currentEditor = this.getCurrentEditor()

    if (currentEditor) this.updateEditorIfChanged(currentEditor, autocomplete)

    return currentEditor
  }

  private updateEditorIfChanged(
    editor: CodeMirror.Editor,
    autocomplete: Autocomplete
  ) {
    if (!this.lastUsedEditor) this.lastUsedEditor = editor

    if (editor !== this.lastUsedEditor) {
      autocomplete.removeViewFrom(this.lastUsedEditor)
      this.lastUsedEditor = editor
    }
  }

  private getCurrentEditor(): CodeMirror.Editor | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView)

    return view ? view.sourceMode.cmEditor : null
  }
}
