import { createElement } from 'react'
import { createReactBlockSpec } from '@blocknote/react'
import { LITERAL_NOTE_MARKER_TYPE } from '../utils/literalNoteMarker'
import { MEMORY_BACK_MARKER } from '../lib/learning/noteMemoryLines'

/** A source comment remains hidden in rendered prose and editable in raw Markdown. */
export const literalNoteMarkerBlock = createReactBlockSpec({
  type: LITERAL_NOTE_MARKER_TYPE,
  propSchema: { source: { default: MEMORY_BACK_MARKER } },
  content: 'none',
}, {
  render: () => createElement('span', { hidden: true, 'aria-hidden': true }),
  toExternalHTML: ({ block }) => createElement('span', null, block.props.source),
})()
