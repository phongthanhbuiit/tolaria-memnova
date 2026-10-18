import { createContext } from 'react'
import type { DocumentRenderStatus } from './documentRenderGate'
export const DocumentRenderContext = createContext<((id: string,status: DocumentRenderStatus) => void) | null>(null)
