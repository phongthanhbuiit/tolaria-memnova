/**
 * useStats.ts
 *
 * Hook to manage FSRS gamification (XP, Level, Streak, and Heatmap).
 * Persists data inside localStorage under "tolaria-memnova:stats".
 */

import { useCallback, useEffect, useState } from 'react'

export interface StudyStats {
  totalXp: number
  streak: number
  lastStudyDate: string | null // YYYY-MM-DD
  dailyGoal: number
  todayReviews: number
  todayCorrect: number
  todayXp: number
  todayDurationMs: number
  heatmap: { date: string; count: number }[]
  combo: number
}

const STORAGE_KEY = 'tolaria-memnova:stats'

const DEFAULT_STATS: StudyStats = {
  totalXp: 0,
  streak: 0,
  lastStudyDate: null,
  dailyGoal: 20,
  todayReviews: 0,
  todayCorrect: 0,
  todayXp: 0,
  todayDurationMs: 0,
  heatmap: [],
  combo: 0,
}

// ---------------------------------------------------------------------------
// Date Helpers (Vanilla JS to avoid extra library dependencies)
// ---------------------------------------------------------------------------

export function getTodayString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const date = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

export function getYesterdayString(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const date = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

// ---------------------------------------------------------------------------
// Gamification Formulae (matching the original memnova-flashcard code)
// ---------------------------------------------------------------------------

export function calcXP(rating: number, durationMs?: number, combo?: number): number {
  let xp = 0
  if (rating === 1) xp = 0
  else if (rating === 2) xp = 3
  else if (rating === 3) xp = 5
  else xp = 7

  // Speed bonus: < 3s + rating >= 3
  if (durationMs !== undefined && durationMs < 3000 && rating >= 3) {
    xp += 2
  }

  // Combo bonus (max +10)
  if (rating >= 3 && combo !== undefined && combo >= 3) {
    xp += Math.min(combo, 10)
  }

  return xp
}

export function calcLevel(totalXP: number) {
  const level = Math.floor(Math.sqrt(totalXP / 100)) + 1
  const currentLevelBaseXP = Math.pow(level - 1, 2) * 100
  const nextLevelBaseXP = Math.pow(level, 2) * 100
  return {
    level,
    currentLevelXP: totalXP - currentLevelBaseXP,
    nextLevelXP: nextLevelBaseXP - currentLevelBaseXP,
  }
}

// ---------------------------------------------------------------------------
// useStats Hook
// ---------------------------------------------------------------------------

export function useStats() {
  const [stats, setStats] = useState<StudyStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as StudyStats
        const loadedStats = { ...DEFAULT_STATS, ...parsed }
        
        const today = getTodayString()
        const yesterday = getYesterdayString()
        if (loadedStats.lastStudyDate !== today) {
          loadedStats.todayReviews = 0
          loadedStats.todayCorrect = 0
          loadedStats.todayXp = 0
          loadedStats.todayDurationMs = 0
          loadedStats.combo = 0

          if (loadedStats.lastStudyDate !== yesterday && loadedStats.lastStudyDate !== null) {
            loadedStats.streak = 0
          }
          
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedStats))
        }
        return loadedStats
      }
    } catch (e) {
      console.warn('[Stats] Failed to parse stats from localStorage:', e)
    }
    return DEFAULT_STATS
  })

  // Safe save helper
  const saveStats = useCallback((newStats: StudyStats) => {
    setStats(newStats)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats))
    } catch (e) {
      console.warn('[Stats] Failed to save stats to localStorage:', e)
    }
  }, [])

  // Auto-reset daily stats on mount and when day changes
  const checkAndResetNewDay = useCallback(() => {
    const today = getTodayString()
    const yesterday = getYesterdayString()

    if (stats.lastStudyDate !== today) {
      const nextStats = { ...stats }

      // Reset today's progress
      nextStats.todayReviews = 0
      nextStats.todayCorrect = 0
      nextStats.todayXp = 0
      nextStats.todayDurationMs = 0
      nextStats.combo = 0

      // If they skipped studying yesterday, streak is broken
      if (stats.lastStudyDate !== yesterday && stats.lastStudyDate !== null) {
        nextStats.streak = 0
      }

      saveStats(nextStats)
    }
  }, [stats, saveStats])

  useEffect(() => {
    // Check every minute if day changed while app is open.
    // We rely on the lazy initializer for the mount check to avoid setState in render.
    const interval = setInterval(checkAndResetNewDay, 60000)
    return () => clearInterval(interval)
  }, [checkAndResetNewDay])

  // Record a review result, calculating XP & updating streak/heatmap
  const recordReview = useCallback(
    (rating: number, durationMs: number) => {
      const today = getTodayString()
      const yesterday = getYesterdayString()

      const nextStats = { ...stats }

      // 1. Update daily review counters
      nextStats.todayReviews += 1
      const isCorrect = rating >= 3

      if (isCorrect) {
        nextStats.todayCorrect += 1
        nextStats.combo += 1
      } else {
        nextStats.combo = 0
      }

      // 2. Calculate and add XP
      const earnedXp = calcXP(rating, durationMs, nextStats.combo)
      nextStats.todayXp += earnedXp
      nextStats.totalXp += earnedXp
      nextStats.todayDurationMs += durationMs

      // 3. Update Heatmap
      const existingHeatmapIndex = nextStats.heatmap.findIndex((h) => h.date === today)
      if (existingHeatmapIndex > -1) {
        nextStats.heatmap[existingHeatmapIndex].count += 1
      } else {
        nextStats.heatmap.push({ date: today, count: 1 })
      }

      // 4. Update Streak
      if (nextStats.lastStudyDate === yesterday) {
        nextStats.streak += 1
      } else if (nextStats.lastStudyDate !== today) {
        // First study session ever, or streak was already broken (streak = 1)
        nextStats.streak = 1
      }

      nextStats.lastStudyDate = today
      saveStats(nextStats)

      return earnedXp
    },
    [stats, saveStats],
  )

  const updateDailyGoal = useCallback(
    (goal: number) => {
      saveStats({ ...stats, dailyGoal: Math.max(1, goal) })
    },
    [stats, saveStats],
  )

  const levelInfo = calcLevel(stats.totalXp)
  const duePercent = stats.dailyGoal > 0 ? Math.min(Math.round((stats.todayReviews / stats.dailyGoal) * 100), 100) : 0

  return {
    stats,
    level: levelInfo.level,
    currentLevelXP: levelInfo.currentLevelXP,
    nextLevelXP: levelInfo.nextLevelXP,
    duePercent,
    recordReview,
    updateDailyGoal,
  }
}
