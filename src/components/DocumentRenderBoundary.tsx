import { useEffect, useMemo, type ReactNode } from 'react'
import { createDocumentRenderGate, type DocumentRenderStatus } from './documentRenderGate'
import { DocumentRenderContext } from './documentRenderContext'
export function DocumentRenderBoundary({ ids,onStatus,children }: { ids: string[]; onStatus: (status: DocumentRenderStatus) => void; children: ReactNode }) {
  const gate = useMemo(() => createDocumentRenderGate(ids,onStatus),[ids,onStatus])
  useEffect(() => { gate.start(); return () => gate.dispose() },[gate])
  return <DocumentRenderContext.Provider value={gate.report}>{children}</DocumentRenderContext.Provider>
}
