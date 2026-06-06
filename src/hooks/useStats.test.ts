import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStats, calcXP, calcLevel, getTodayString } from './useStats'

describe('Gamification Formulae', () => {
  describe('calcXP', () => {
    it('returns correct base XP for ratings', () => {
      expect(calcXP(1)).toBe(0) // Again
      expect(calcXP(2)).toBe(3) // Hard
      expect(calcXP(3)).toBe(5) // Good
      expect(calcXP(4)).toBe(7) // Easy
    })

    it('adds speed bonus if rating >= 3 and durationMs < 3000', () => {
      // Good (5 XP) + speed bonus (2 XP) = 7 XP
      expect(calcXP(3, 2500)).toBe(7)
      // Easy (7 XP) + speed bonus (2 XP) = 9 XP
      expect(calcXP(4, 1000)).toBe(9)
      // Hard (3 XP) -> no speed bonus (rating < 3)
      expect(calcXP(2, 1000)).toBe(3)
      // Good (5 XP) but slow (>= 3000ms) -> no speed bonus
      expect(calcXP(3, 3000)).toBe(5)
    })

    it('adds combo bonus if rating >= 3 and combo >= 3', () => {
      // Good (5 XP) + combo bonus (3 XP) = 8 XP
      expect(calcXP(3, 5000, 3)).toBe(8)
      // Good (5 XP) + max combo bonus (10 XP) = 15 XP
      expect(calcXP(3, 5000, 15)).toBe(15)
      // rating < 3 -> no combo bonus
      expect(calcXP(2, 5000, 5)).toBe(3)
    })

    it('combines speed and combo bonuses correctly', () => {
      // Good (5) + Speed (2) + Combo (4) = 11 XP
      expect(calcXP(3, 2000, 4)).toBe(11)
    })
  })

  describe('calcLevel', () => {
    it('calculates correct level details', () => {
      // Level 1: 0 - 99 XP
      const lvl1 = calcLevel(50)
      expect(lvl1.level).toBe(1)
      expect(lvl1.currentLevelXP).toBe(50)
      expect(lvl1.nextLevelXP).toBe(100)

      // Level 2: 100 - 399 XP (base: 100, next base: 400)
      const lvl2 = calcLevel(250)
      expect(lvl2.level).toBe(2)
      expect(lvl2.currentLevelXP).toBe(150)
      expect(lvl2.nextLevelXP).toBe(300)
    })
  })
})

describe('useStats Hook', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes with default stats if local storage is empty', () => {
    const { result } = renderHook(() => useStats())
    expect(result.current.stats.totalXp).toBe(0)
    expect(result.current.stats.streak).toBe(0)
    expect(result.current.stats.dailyGoal).toBe(20)
    expect(result.current.level).toBe(1)
  })

  it('allows updating daily goal', () => {
    const { result } = renderHook(() => useStats())
    act(() => {
      result.current.updateDailyGoal(30)
    })
    expect(result.current.stats.dailyGoal).toBe(30)
  })

  it('records review XP, streak and heatmap count', () => {
    const { result } = renderHook(() => useStats())
    
    // Study today, rating Good (5 XP), duration 4000ms, first time (streak = 1)
    let xpEarned = 0
    act(() => {
      xpEarned = result.current.recordReview(3, 4000)
    })

    expect(xpEarned).toBe(5)
    expect(result.current.stats.totalXp).toBe(5)
    expect(result.current.stats.todayReviews).toBe(1)
    expect(result.current.stats.todayXp).toBe(5)
    expect(result.current.stats.streak).toBe(1)

    const todayStr = getTodayString()
    const todayHeatmap = result.current.stats.heatmap.find(h => h.date === todayStr)
    expect(todayHeatmap).toBeDefined()
    expect(todayHeatmap?.count).toBe(1)
  })
})
