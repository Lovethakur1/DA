import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'

interface TimerDisplayProps {
  /**
   * True when the "active work" timer should tick.
   * If you set this to false during breaks, you usually don't need deductedSeconds.
   */
  isRunning: boolean

  /**
   * When the current running segment started (Date).
   * Required when isRunning = true.
   */
  startTime?: Date | null

  /**
   * Total active seconds accumulated before the current run segment.
   * (e.g., after resume from a previous session today)
   */
  carriedSeconds?: number

  /**
   * Total seconds to subtract from the elapsed (e.g., total break seconds so far).
   * If you keep isRunning=true during breaks, keep increasing this as breaks accrue.
   */
  deductedSeconds?: number

  /**
   * @deprecated Use `deductedSeconds` .
   * For backward compatibility with your prop name.
   */
  pausedTime?: number

  label?: string
  style?: ViewStyle
  textStyle?: { label?: TextStyle; time?: TextStyle }
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({
  isRunning,
  startTime,
  carriedSeconds = 0,
  deductedSeconds,
  pausedTime, // deprecated alias
  label,
  style,
  textStyle
}) => {
  const [elapsedTime, setElapsedTime] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Prefer new name; fall back to pausedTime for compatibility
  const totalDeductions = useMemo(() => {
    const v =
      typeof deductedSeconds === 'number'
        ? deductedSeconds
        : typeof pausedTime === 'number'
        ? pausedTime
        : 0
    return v >= 0 ? v : 0
  }, [deductedSeconds, pausedTime])

  const getNowSecondsSinceStart = () => {
    if (!startTime || Number.isNaN(startTime.getTime())) return 0
    const now = Date.now()
    const started = startTime.getTime()
    const diff = Math.floor((now - started) / 1000)
    return diff > 0 ? diff : 0
  }

  const recompute = () => {
    const runningPortion = isRunning ? getNowSecondsSinceStart() : 0
    // Active time = carried (prior active) + running - deductions (breaks)
    const raw = carriedSeconds + runningPortion - totalDeductions
    setElapsedTime(raw > 0 ? raw : 0)
  }

  useEffect(() => {
    // Always compute once on mount/prop change
    recompute()

    // Manage ticking only when running & have a valid startTime
    if (isRunning && startTime && !Number.isNaN(startTime.getTime())) {
      // Guard against duplicate intervals
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(recompute, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    // Re-tick if these change
  }, [isRunning, startTime?.getTime(), carriedSeconds, totalDeductions])

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds))
    const hours = Math.floor(s / 3600)
    const minutes = Math.floor((s % 3600) / 60)
    const secs = s % 60
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={[styles.label, textStyle?.label]}>{label}</Text> : null}
      <Text style={[styles.time, textStyle?.time]}>{formatTime(elapsedTime)}</Text>
      {isRunning && (
        <View style={styles.indicator}>
          <View style={styles.pulse} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4
  },
  time: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: 'monospace'
  },
  indicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center'
  },
  pulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF'
  }
})

export default TimerDisplay
