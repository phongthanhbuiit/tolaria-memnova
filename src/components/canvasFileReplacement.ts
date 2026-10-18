import { AssetRecordType, type Editor, type TLFileReplaceExternalContent } from 'tldraw'

/** Preserve the existing geometry/crop and pointer until a unique durable asset is ready. */
export async function replaceCanvasFile(editor: Editor, { file, shapeId }: TLFileReplaceExternalContent, active: () => boolean): Promise<void> {
  const before = editor.getShape(shapeId)
  if (!before || !['image', 'video'].includes(before.type)) throw Error('unavailable')
  const asset = await editor.getAssetForExternalContent({ type: 'file', file, assetId: AssetRecordType.createId() })
  if (!active()) return
  if (!asset || asset.type !== before.type || editor.getShape(shapeId) !== before) throw Error('unavailable')
  editor.run(() => {
    editor.createAssets([asset])
    if (before.type === 'image' || before.type === 'video') editor.updateShapes([{ id: before.id, type: before.type, props: { assetId: asset.id } }])
  })
}
