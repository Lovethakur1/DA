import { getAttendanceHistory } from '@/src/api/attendance'
import React, { useEffect, useState, useCallback } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'

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
  const [selectedView, setSelectedView] = useState<'weekly' | 'monthly' | 'custom'>('weekly')
  const [attendanceData, setAttendanceData] = useState<AttendanceDay[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [summary, setSummary] = useState<any | null>(null)
  const [pagination, setPagination] = useState<any | null>(null)
  const [page, setPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(10)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  
  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
  const [tempStartDate, setTempStartDate] = useState<Date>(new Date())
  const [tempEndDate, setTempEndDate] = useState<Date>(new Date())

  const handleViewChange = useCallback((view: 'weekly' | 'monthly' | 'custom') => {
    // Use setTimeout to ensure state update happens outside of render cycle
    setTimeout(() => {
      setSelectedView(view)
      setPage(1)
    }, 0)
  }, [])

  const formatDateForDisplay = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false)
    }
    if (selectedDate) {
      setTempStartDate(selectedDate)
      setStartDate(formatDateForDisplay(selectedDate))
      if (Platform.OS === 'android') {
        setShowStartDatePicker(false)
      }
    }
  }

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false)
    }
    if (selectedDate) {
      setTempEndDate(selectedDate)
      setEndDate(formatDateForDisplay(selectedDate))
      if (Platform.OS === 'android') {
        setShowEndDatePicker(false)
      }
    }
  }

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true)
      try {
        const params: any = {}
        if (selectedView !== 'custom') params.period = selectedView
        if (selectedView === 'monthly') {
          params.page = page
          params.per_page = perPage
        }
        if (selectedView === 'custom') {
          if (!startDate || !endDate) {
            setAttendanceData([])
            setSummary(null)
            setPagination(null)
            setIsLoading(false)
            return
          }
          params.start_date = startDate
          params.end_date = endDate
        }

        const res: any = await getAttendanceHistory(params)
        const payloadRoot = res ?? {}
        const payload = payloadRoot.data ?? payloadRoot

        setSummary(payload.summary ?? payload.data?.summary ?? null)

        const rawRecords = payload.attendance_records ?? payload.data?.attendance_records ?? []

        const records = Array.isArray(rawRecords)
          ? rawRecords.map((rec: any) => ({
              date: rec.date,
              checkIn: rec.checkIn ?? rec.check_in ?? null,
              checkOut: rec.checkOut ?? rec.check_out ?? null,
              workingHours: rec.workingHours ?? rec.working_hours ?? '0:00',
              totalBreakTime: rec.totalBreakTime ?? rec.total_break_time ?? '0:00',
              netWorkingHours: rec.netWorkingHours ?? rec.net_working_hours ?? '0:00',
              breakCount: rec.breakCount ?? rec.break_count ?? (Array.isArray(rec.breaks) ? rec.breaks.length : 0),
              breaks: Array.isArray(rec.breaks) ? rec.breaks.map((b: any) => ({ start: b.start, end: b.end, duration: b.duration })) : [],
              status: rec.status ?? 'Present'
            }))
          : []

        setAttendanceData(records)

        const paginationRoot = payloadRoot.pagination ?? payload.pagination ?? payload.data?.pagination ?? null
        setPagination(paginationRoot)
      } catch (error) {
        console.error('Failed to fetch attendance history', error)
        setAttendanceData([])
        setSummary(null)
        setPagination(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [selectedView, page, perPage, startDate, endDate])

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

  const toggleExpanded = useCallback((date: string) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(date)) {
        newExpanded.delete(date)
      } else {
        newExpanded.add(date)
      }
      return newExpanded
    })
  }, [])

  const renderAttendanceItem = useCallback(({ item }: { item: AttendanceDay }) => {
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
  }, [expandedItems, toggleExpanded])

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-6 px-6 border-b border-gray-100">
        <Text className="text-2xl font-bold text-center mb-4" style={{ color: '#289294' }}>
          Attendance History
        </Text>
        
        {/* View Toggle */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: '#F3F4F6',
          borderRadius: 12,
          padding: 4
        }}>
          <TouchableOpacity
            key="weekly-tab"
            style={[
              {
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 8,
              },
              selectedView === 'weekly' && {
                backgroundColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }
            ]}
            onPress={() => handleViewChange('weekly')}
            activeOpacity={0.7}
          >
            <Text style={{
              textAlign: 'center',
              fontWeight: '500',
              color: selectedView === 'weekly' ? '#289294' : '#6B7280'
            }}>
              Weekly
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            key="monthly-tab"
            style={[
              {
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 8,
              },
              selectedView === 'monthly' && {
                backgroundColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }
            ]}
            onPress={() => handleViewChange('monthly')}
            activeOpacity={0.7}
          >
            <Text style={{
              textAlign: 'center',
              fontWeight: '500',
              color: selectedView === 'monthly' ? '#289294' : '#6B7280'
            }}>
              Monthly
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            key="custom-tab"
            style={[
              {
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 8,
              },
              selectedView === 'custom' && {
                backgroundColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }
            ]}
            onPress={() => handleViewChange('custom')}
            activeOpacity={0.7}
          >
            <Text style={{
              textAlign: 'center',
              fontWeight: '500',
              color: selectedView === 'custom' ? '#289294' : '#6B7280'
            }}>
              Custom
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Custom Date Range Picker - Compact Layout */}
      {selectedView === 'custom' && (
        <View className="px-4 py-3 bg-white border-b border-gray-100">
          {/* Date Selection Row */}
          <View className="flex-row items-center mb-2">
            {/* Start Date */}
            <View className="flex-1 mr-2">
              <Text className="text-xs text-gray-600 mb-1">From</Text>
              <TouchableOpacity 
                onPress={() => setShowStartDatePicker(true)}
                className="bg-gray-50 p-2 rounded border border-gray-200 flex-row items-center justify-between"
              >
                <Text className="text-sm text-gray-800" numberOfLines={1}>
                  {startDate || 'Start'}
                </Text>
                <Text className="text-lg">📅</Text>
              </TouchableOpacity>
            </View>
            
            {/* End Date */}
            <View className="flex-1 ml-2">
              <Text className="text-xs text-gray-600 mb-1">To</Text>
              <TouchableOpacity 
                onPress={() => setShowEndDatePicker(true)}
                className="bg-gray-50 p-2 rounded border border-gray-200 flex-row items-center justify-between"
              >
                <Text className="text-sm text-gray-800" numberOfLines={1}>
                  {endDate || 'End'}
                </Text>
                <Text className="text-lg">📅</Text>
              </TouchableOpacity>
            </View>

            {/* Fetch Button - Inline */}
            <TouchableOpacity 
              onPress={() => {
                if (!startDate || !endDate) { 
                  Alert.alert('Missing Dates', 'Please select both dates')
                  return 
                }
                setPage(1)
              }} 
              className="bg-[#289294] px-4 py-3 rounded ml-2 self-end"
              style={{ minWidth: 60 }}
            >
              <Text className="text-white text-center font-semibold text-sm">Go</Text>
            </TouchableOpacity>
          </View>

          {/* Date Pickers - Android shows modal, iOS shows inline */}
          {showStartDatePicker && (
            <View className="mt-2 bg-gray-50 rounded-lg p-2">
              <DateTimePicker
                value={tempStartDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={handleStartDateChange}
                maximumDate={new Date()}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity 
                  onPress={() => setShowStartDatePicker(false)}
                  className="bg-[#289294] px-3 py-1.5 rounded mt-2"
                >
                  <Text className="text-white text-center text-sm font-semibold">Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {showEndDatePicker && (
            <View className="mt-2 bg-gray-50 rounded-lg p-2">
              <DateTimePicker
                value={tempEndDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={handleEndDateChange}
                maximumDate={new Date()}
                minimumDate={tempStartDate}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity 
                  onPress={() => setShowEndDatePicker(false)}
                  className="bg-[#289294] px-3 py-1.5 rounded mt-2"
                >
                  <Text className="text-white text-center text-sm font-semibold">Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {selectedView === 'monthly' && (
        <View className="px-6 py-3 bg-white border-b border-gray-100 flex-row items-center justify-between">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity disabled={page <= 1} onPress={() => setPage(Math.max(1, page - 1))} className="px-3 py-2 mr-2 bg-gray-100 rounded">
              <Text>Prev</Text>
            </TouchableOpacity>
            <Text className="mr-3">Page {page}{pagination ? ` of ${pagination.total_pages ?? pagination.last_page ?? pagination.totalPages ?? ''}` : ''}</Text>
            <TouchableOpacity disabled={pagination ? page >= (pagination.total_pages ?? pagination.last_page ?? pagination.totalPages ?? Infinity) : false} onPress={() => setPage(page + 1)} className="px-3 py-2 bg-gray-100 rounded">
              <Text>Next</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text className="mr-2">Per page:</Text>
            <TouchableOpacity onPress={() => setPerPage(10)} className={`px-2 py-1 rounded ${perPage === 10 ? 'bg-green-100' : 'bg-gray-100'}`}><Text>10</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setPerPage(25)} className={`px-2 py-1 ml-2 rounded ${perPage === 25 ? 'bg-green-100' : 'bg-gray-100'}`}><Text>25</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setPerPage(50)} className={`px-2 py-1 ml-2 rounded ${perPage === 50 ? 'bg-green-100' : 'bg-gray-100'}`}><Text>50</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {/* Stats Section */}
      <View className="px-6 py-4">
        <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Summary</Text>
          
          <View className="flex-row justify-between mb-3">
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold" style={{ color: '#289294' }}>
                {summary ? `${summary.attendance_percentage ?? summary.attendancePercentage ?? 0}%` : `${stats.attendancePercentage}%`}
              </Text>
              <Text className="text-xs text-gray-600">Attendance</Text>
            </View>
            
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-green-600">
                {summary ? summary.present_days ?? summary.presentDays ?? stats.presentDays : stats.presentDays}
              </Text>
              <Text className="text-xs text-gray-600">Present</Text>
            </View>
            
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-orange-600">
                {summary ? summary.late_days ?? summary.lateDays ?? stats.lateDays : stats.lateDays}
              </Text>
              <Text className="text-xs text-gray-600">Late</Text>
            </View>
            
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-yellow-600">
                {summary ? summary.half_days ?? summary.halfDays ?? stats.halfDays : stats.halfDays}
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
            contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 120 : 100 }}
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