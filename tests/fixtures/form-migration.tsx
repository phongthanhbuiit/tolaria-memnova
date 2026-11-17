// Real controls, isolated callbacks; no Library writes.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HomePage } from '../../src/components/HomePage'
import { NoteIcon } from '../../src/components/NoteIcon'
import { EmojiPicker } from '../../src/components/EmojiPicker'
import { TooltipProvider } from '../../src/components/ui/tooltip'
import '../../src/index.css'
import '../../src/App.css'

export function Fixture() {
  const emojiMode = new URLSearchParams(location.search).get('surface') === 'emoji'
  const [goal, setGoal] = useState(20)
  const [emoji, setEmoji] = useState('')
  return <TooltipProvider><main className="bg-background p-6 text-foreground">
    {!emojiMode && <HomePage entries={[]} stats={{ totalXp: 0, streak: 0, lastStudyDate: null, dailyGoal: goal, todayReviews: 0, todayCorrect: 0, todayXp: 0, todayDurationMs: 0, heatmap: [], combo: 0 }} level={1} currentLevelXP={0} nextLevelXP={100} onStartReview={() => {}} onNavigate={() => {}} onUpdateDailyGoal={setGoal} />}
    <NoteIcon icon="rocket" editable />
    {emojiMode && <EmojiPicker onSelect={setEmoji} onClose={() => {}} />}
    <output>{emoji}</output>
  </main></TooltipProvider>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
