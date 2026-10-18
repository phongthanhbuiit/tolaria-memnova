import { createShapesForAssets, type Editor, type TLAsset } from 'tldraw'
import type { CanvasMediaIssue } from '../utils/canvasMedia'
/** Picker, paste and drop share an upload-first handler: no ephemeral document placeholders. */
export function installCanvasFileImports(editor: Editor,active: () => boolean,issue: (value: CanvasMediaIssue) => void,busy?: (value: boolean) => void): () => void {
  let inFlight = 0
  editor.registerExternalContentHandler('files',async ({ files,point }) => {
    if (!active()) return
    if (files.length > editor.options.maxFilesAtOnce) { issue('unavailable'); return }
    const position = point ?? (editor.inputs.getShiftKey() ? editor.inputs.getCurrentPagePoint() : editor.getViewportPageBounds().center)
    inFlight++; busy?.(true)
    try {
      const results = await Promise.allSettled(files.map(file => editor.getAssetForExternalContent({type:'file',file})))
      if (!active()) return
      const assets: TLAsset[] = []
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) assets.push(result.value)
        else issue('unavailable')
      }
      if (assets.length) await createShapesForAssets(editor,assets,position)
    } catch { if (active()) issue('unavailable') }
    finally { inFlight--; if (active()) busy?.(inFlight > 0) }
  })
  return () => { editor.registerExternalContentHandler('files',null) }
}
