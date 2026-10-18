import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { DocumentRenderStatus } from '../documentRenderGate'
import { trackEvent } from '../../lib/telemetry'

/** Snapshot-scoped acknowledgements and session-only camera/scroll lifetime. */
export function useStudyFaces(key: string, isNote: boolean, open: boolean) {
  const [face, setFace] = useState({ key: '', revealed: false })
  const [shownBack, setShownBack] = useState('')
  const revealed = face.key === key && face.revealed
  const [rendered, setRendered] = useState({
    key: '',
    question: false,
    answer: false,
  })
  const [renderProblems, setRenderProblems] = useState({
    key: '',
    question: false,
    answer: false,
  })
  const renderFailed =
    isNote &&
    renderProblems.key === key &&
    (renderProblems.question || renderProblems.answer)
  const scrollContainer = useRef<HTMLDivElement>(null)
  const mnemonicRegion = useRef<HTMLDivElement>(null)
  const faceScroll = useRef({ key: '', front: 0, back: 0 })
  const questionReady = rendered.key === key && rendered.question
  const answerReady = rendered.key === key && rendered.answer
  const questionRendered = useCallback(
    () =>
      setRendered((previous) =>
        previous.key === key && previous.question
          ? previous
          : {
              key,
              question: true,
              answer: previous.key === key && previous.answer,
            }
      ),
    [key]
  )
  const answerRendered = useCallback(
    () =>
      setRendered((previous) =>
        previous.key === key && previous.answer
          ? previous
          : {
              key,
              question: previous.key === key && previous.question,
              answer: true,
            }
      ),
    [key]
  )
  const renderStatus = useCallback(
    (which: 'question' | 'answer', status: DocumentRenderStatus) => {
      setRenderProblems((previous) => ({
        key,
        question: previous.key === key && previous.question,
        answer: previous.key === key && previous.answer,
        [which]: status === 'error',
      }))
      setRendered((previous) => ({
        key,
        question: previous.key === key && previous.question,
        answer: previous.key === key && previous.answer,
        [which]: status === 'ready',
      }))
    },
    [key]
  )
  const questionStatus = useCallback(
    (status: DocumentRenderStatus) => renderStatus('question', status),
    [renderStatus]
  )
  const answerStatus = useCallback(
    (status: DocumentRenderStatus) => renderStatus('answer', status),
    [renderStatus]
  )
  const changeFace = (next: boolean) => {
    if (isNote && scrollContainer.current) {
      if (faceScroll.current.key !== key)
        faceScroll.current = { key, front: 0, back: 0 }
      faceScroll.current[revealed ? 'back' : 'front'] =
        scrollContainer.current.scrollTop
      scrollContainer.current
        .querySelectorAll<HTMLMediaElement>('audio,video')
        .forEach((media) => media.pause())
    }
    setFace({ key, revealed: next })
  }
  useLayoutEffect(() => {
    if (faceScroll.current.key !== key)
      faceScroll.current = { key, front: 0, back: 0 }
    if (isNote && scrollContainer.current)
      scrollContainer.current.scrollTop =
        faceScroll.current[revealed ? 'back' : 'front']
  }, [isNote, revealed, key])
  useEffect(() => {
    if (open && isNote && revealed && answerReady)
      mnemonicRegion.current?.focus({ preventScroll: true })
  }, [open, isNote, revealed, answerReady, key])
  const reveal = () => {
    setShownBack(key)
    changeFace(true)
    if (isNote) trackEvent('memnova_note_study_mnemonic_shown')
  }
  const revealButton = useRef<HTMLButtonElement>(null)
  const returnToArticle = () => {
    changeFace(false)
    trackEvent('memnova_note_study_article_returned')
  }
  return {
    revealed,
    backVisited: shownBack === key,
    questionReady,
    answerReady,
    renderFailed,
    scrollContainer,
    mnemonicRegion,
    questionRendered,
    answerRendered,
    questionStatus,
    answerStatus,
    reveal,
    returnToArticle,
    revealButton,
  }
}
