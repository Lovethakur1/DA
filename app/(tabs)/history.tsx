import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

interface BreakEntry {
  start: string
  end: string
  duration: string
}

interface AttendanceDay {
  date: string
  checkIn: string | null
  checkOut: string | null
  workingHours: string
  totalBreakTime: string
  netWorkingHours: string // workingHours - totalBreakTime
  breakCount: number
  breaks: BreakEntry[]
  status: 'Present' | 'Absent' | 'Half Day' | 'Late'
}

const HistoryPage = () => {
  const [selectedView, setSelectedView] = useState<'weekly' | 'monthly'>('weekly')
  const [attendanceData, setAttendanceData] = useState<AttendanceDay[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Dummy data generator
  useEffect(() => {
    const generateData = async () => {
      setIsLoading(true)
      try {
        // Add a small delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 100))
        generateDummyData()
      } finally {
        setIsLoading(false)
      }
    }
    generateData()
  }, [selectedView])

  const generateDummyData = () => {
    try {
      const data: AttendanceDay[] = []
      const today = new Date()
      const daysToShow = selectedView === 'weekly' ? 7 : 30
      
      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(today.getDate() - i)
        
        // Skip weekends for dummy data
        if (date.getDay() === 0 || date.getDay() === 6) {
          continue
        }
        
        // Generate random attendance data
        const isPresent = Math.random() > 0.1 // 90% attendance rate
        const isLate = Math.random() > 0.8 // 20% late rate
        
        let checkIn = null
        let checkOut = null
        let status: AttendanceDay['status'] = 'Absent'
        let workingHours = '00:00'
        let breaks: BreakEntry[] = []
        let totalBreakTime = '00:00'
        let netWorkingHours = '00:00'
        let breakCount = 0
        
        if (isPresent) {
          const baseCheckIn = isLate ? 9 + Math.random() * 2 : 9 + Math.random() * 0.5 // 9-11 AM if late, 9-9:30 if on time
          const baseCheckOut = 17 + Math.random() * 2 // 5-7 PM
          
          checkIn = `${Math.floor(baseCheckIn)}:${String(Math.floor((baseCheckIn % 1) * 60)).padStart(2, '0')}`
          checkOut = `${Math.floor(baseCheckOut)}:${String(Math.floor((baseCheckOut % 1) * 60)).padStart(2, '0')}`
          
          const workHours = baseCheckOut - baseCheckIn
          workingHours = `${Math.floor(workHours)}:${String(Math.floor((workHours % 1) * 60)).padStart(2, '0')}`
          
          // Generate breaks (0-3 breaks per day)
          breakCount = Math.floor(Math.random() * 4) // 0-3 breaks
          let totalBreakMinutes = 0
          
          for (let b = 0; b < breakCount; b++) {
            const breakStart = baseCheckIn + 2 + (b * 2) + Math.random() * 1 // Spread breaks throughout day
            const breakDuration = 15 + Math.random() * 45 // 15-60 minutes
            const breakEnd = breakStart + (breakDuration / 60)
            
            const startTime = `${Math.floor(breakStart)}:${String(Math.floor((breakStart % 1) * 60)).padStart(2, '0')}`
            const endTime = `${Math.floor(breakEnd)}:${String(Math.floor((breakEnd % 1) * 60)).padStart(2, '0')}`
            const duration = `${Math.floor(breakDuration / 60)}:${String(Math.floor(breakDuration % 60)).padStart(2, '0')}`
            
            breaks.push({
              start: startTime,
              end: endTime,
              duration: duration
            })
            
            totalBreakMinutes += breakDuration
          }
          
          // Calculate total break time
          const breakHours = Math.floor(totalBreakMinutes / 60)
          const breakMins = Math.floor(totalBreakMinutes % 60)
          totalBreakTime = `${breakHours}:${String(breakMins).padStart(2, '0')}`
          
          // Calculate net working hours (total - breaks)
          const netHours = workHours - (totalBreakMinutes / 60)
          netWorkingHours = `${Math.floor(netHours)}:${String(Math.floor((netHours % 1) * 60)).padStart(2, '0')}`
          
          if (workHours < 4) {
            status = 'Half Day'
          } else if (isLate) {
            status = 'Late'
          } else {
            status = 'Present'
          }
        }
        
        data.push({
          date: date.toISOString().split('T')[0],
          checkIn,
          checkOut,
          workingHours,
          totalBreakTime,
          netWorkingHours,
          breakCount,
          breaks,
          status
        })
      }
      
      setAttendanceData(data)
    } catch (error) {
      console.error('Error generating dummy data:', error)
      setAttendanceData([])
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return { bg: 'bg-green-100', text: 'text-green-800' }
      case 'Absent': return { bg: 'bg-red-100', text: 'text-red-800' }
      case 'Half Day': return { bg: 'bg-yellow-100', text: 'text-yellow-800' }
      case 'Late': return { bg: 'bg-orange-100', text: 'text-orange-800' }
      default: return { bg: 'bg-gray-100', text: 'text-gray-800' }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const calculateStats = () => {
    try {
      const totalDays = attendanceData.length
      const presentDays = attendanceData.filter(day => 
        day.status === 'Present' || day.status === 'Late'
      ).length
      const lateDays = attendanceData.filter(day => day.status === 'Late').length
      const halfDays = attendanceData.filter(day => day.status === 'Half Day').length
      
      const attendancePercentage = totalDays > 0 ? (presentDays / totalDays * 100).toFixed(1) : '0'
      
      return {
        totalDays,
        presentDays,
        lateDays,
        halfDays,
        attendancePercentage
      }
    } catch (error) {
      console.error('Error calculating stats:', error)
      return {
        totalDays: 0,
        presentDays: 0,
        lateDays: 0,
        halfDays: 0,
        attendancePercentage: '0'
      }
    }
  }

  const stats = calculateStats()

  const toggleExpanded = (date: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(date)) {
      newExpanded.delete(date)
    } else {
      newExpanded.add(date)
    }
    setExpandedItems(newExpanded)
  }

  const renderAttendanceItem = ({ item }: { item: AttendanceDay }) => {
    const statusColors = getStatusColor(item.status)
    const isExpanded = expandedItems.has(item.date)
    
    return (
      <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-semibold text-gray-800">
            {formatDate(item.date)}
          </Text>
          <View className={`px-3 py-1 rounded-full ${statusColors.bg}`}>
            <Text className={`text-xs font-medium ${statusColors.text}`}>{item.status}</Text>
          </View>
        </View>
      
        <View className="flex-row justify-between mb-3">
          <View className="flex-1">
            <Text className="text-sm text-gray-600 mb-1">Check In</Text>
            <Text className="text-base font-medium text-gray-800">
              {item.checkIn || '--:--'}
            </Text>
          </View>
          
          <View className="flex-1">
            <Text className="text-sm text-gray-600 mb-1">Check Out</Text>
            <Text className="text-base font-medium text-gray-800">
              {item.checkOut || '--:--'}
            </Text>
          </View>
          
          <View className="flex-1">
            <Text className="text-sm text-gray-600 mb-1">Total Hours</Text>
            <Text className="text-base font-medium text-gray-800">
              {item.workingHours}
            </Text>
          </View>
        </View>

        {/* Break Summary Row */}
        <View className="flex-row justify-between items-center mb-3 bg-gray-50 rounded-lg p-3">
          <View className="flex-1">
            <Text className="text-sm text-gray-600 mb-1">Breaks</Text>
            <Text className="text-base font-medium text-gray-800">
              {item.breakCount} ({item.totalBreakTime})
            </Text>
          </View>
          
          <View className="flex-1">
            <Text className="text-sm text-gray-600 mb-1">Net Working</Text>
            <Text className="text-base font-medium text-green-600">
              {item.netWorkingHours}
            </Text>
          </View>

          {item.breakCount > 0 && (
            <TouchableOpacity 
              onPress={() => toggleExpanded(item.date)}
              className="px-3 py-1 bg-blue-100 rounded-full"
            >
              <Text className="text-blue-600 text-xs font-medium">
                {isExpanded ? '▲ Hide' : '▼ Details'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Expandable Break Details */}
        {isExpanded && item.breaks.length > 0 && (
          <View className="border-t border-gray-200 pt-3">
            <Text className="text-sm font-medium text-gray-700 mb-2">Break Details:</Text>
            {item.breaks.map((breakItem, index) => (
              <View key={index} className="flex-row justify-between items-center py-2 px-3 bg-yellow-50 rounded-lg mb-2">
                <View className="flex-1">
                  <Text className="text-xs text-gray-600">Break {index + 1}</Text>
                  <Text className="text-sm font-medium text-gray-800">
                    {breakItem.start} - {breakItem.end}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs text-gray-600">Duration</Text>
                  <Text className="text-sm font-medium text-orange-600">
                    {breakItem.duration}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    )
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-6 px-6 border-b border-gray-100">
        <Text className="text-2xl font-bold text-center mb-4" style={{ color: '#289294' }}>
          Attendance History
        </Text>
        
        {/* View Toggle */}
        <View className="flex-row bg-gray-100 rounded-xl p-1">
          <TouchableOpacity
            className={`flex-1 py-2 px-4 rounded-lg ${
              selectedView === 'weekly' ? 'bg-white shadow-sm' : ''
            }`}
            onPress={() => setSelectedView('weekly')}
          >
            <Text className={`text-center font-medium ${
              selectedView === 'weekly' ? 'text-[#289294]' : 'text-gray-600'
            }`}>
              Weekly
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className={`flex-1 py-2 px-4 rounded-lg ${
              selectedView === 'monthly' ? 'bg-white shadow-sm' : ''
            }`}
            onPress={() => setSelectedView('monthly')}
          >
            <Text className={`text-center font-medium ${
              selectedView === 'monthly' ? 'text-[#289294]' : 'text-gray-600'
            }`}>
              Monthly
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Section */}
      <View className="px-6 py-4">
        <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Summary</Text>
          
          <View className="flex-row justify-between mb-3">
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold" style={{ color: '#289294' }}>
                {stats.attendancePercentage}%
              </Text>
              <Text className="text-xs text-gray-600">Attendance</Text>
            </View>
            
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-green-600">
                {stats.presentDays}
              </Text>
              <Text className="text-xs text-gray-600">Present</Text>
            </View>
            
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-orange-600">
                {stats.lateDays}
              </Text>
              <Text className="text-xs text-gray-600">Late</Text>
            </View>
            
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-yellow-600">
                {stats.halfDays}
              </Text>
              <Text className="text-xs text-gray-600">Half Day</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Attendance List */}
      <View className="flex-1 px-6">
        {isLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#289294" />
            <Text className="text-gray-500 mt-2">Loading attendance data...</Text>
          </View>
        ) : attendanceData.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500">No attendance data available</Text>
          </View>
        ) : (
          <FlatList
            data={attendanceData}
            renderItem={renderAttendanceItem}
            keyExtractor={(item) => item.date}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            initialNumToRender={7}
            windowSize={10}
          />
        )}
      </View>
    </View>
  )
}

export default HistoryPage