import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export type DateRangeMode = 'all-time' | 'date-range' | 'today' | 'month' | 'week' | 'day';

export type DateRangeSelection = {
  mode: DateRangeMode;
  startDate?: Date;
  endDate?: Date;
  displayText: string;
  displayNumber?: string;
};

type DateRangePickerProps = {
  selection: DateRangeSelection;
  onSelectionChange: (selection: DateRangeSelection) => void;
  showBalance?: boolean;
  startingBalance?: number;
  endingBalance?: number;
  projectedBalance?: number;
};

type PeriodOption = {
  id: DateRangeMode;
  title: string;
  subtitle?: string;
  icon: string;
  number?: string;
};

const formatCurrency = (amount: number) => {
  return `₱ ${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (date: Date) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
};

const formatDateRange = (startDate: Date, endDate: Date) => {
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
};

const getCurrentWeekRange = () => {
  const today = new Date();
  const currentDay = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - currentDay + 1); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
  return { startOfWeek, endOfWeek };
};

const getCurrentMonth = () => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { startOfMonth, endOfMonth };
};

export default function DateRangePicker({ 
  selection, 
  onSelectionChange, 
  showBalance = false,
  startingBalance,
  endingBalance,
  projectedBalance 
}: DateRangePickerProps) {
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [showDayPickerModal, setShowDayPickerModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  // For date range selection
  const [rangeStartDate, setRangeStartDate] = useState<Date | null>(null);
  const [rangeEndDate, setRangeEndDate] = useState<Date | null>(null);
  const [rangeMonth, setRangeMonth] = useState(new Date());

  const today = new Date();
  const { startOfWeek, endOfWeek } = getCurrentWeekRange();
  const { startOfMonth, endOfMonth } = getCurrentMonth();

  const periodOptions: PeriodOption[] = [
    {
      id: 'date-range',
      title: 'Select range',
      subtitle: 'Year 2025',
      icon: 'dots-horizontal',
    },
    {
      id: 'all-time',
      title: 'All time',
      icon: 'infinity',
    },
    {
      id: 'day',
      title: 'Select day',
      icon: 'calendar',
    },
    {
      id: 'week',
      title: 'Week',
      subtitle: `${formatDate(startOfWeek)} – ${formatDate(endOfWeek)}`,
      icon: 'numeric-7-circle-outline',
      number: '7',
    },
    {
      id: 'today',
      title: 'Today',
      subtitle: formatDate(today),
      icon: 'numeric-1-circle-outline',
      number: '1',
    },
    {
      id: 'month',
      title: selection.mode === 'month' ? 'Month' : 'Year',
      subtitle: selection.mode === 'month' ? 'May 2025' : 'Year 2025',
      icon: selection.mode === 'month' ? 'numeric-31-box-outline' : 'numeric-365-box-outline',
      number: selection.mode === 'month' ? '31' : '365',
    },
  ];

  const handlePeriodSelect = (option: PeriodOption) => {
    let newSelection: DateRangeSelection;

    switch (option.id) {
      case 'all-time':
        newSelection = {
          mode: 'all-time',
          displayText: 'ALL TIME',
        };
        break;
      case 'today':
        newSelection = {
          mode: 'today',
          startDate: today,
          endDate: today,
          displayText: 'MON, 26 MAY 2025',
          displayNumber: '1',
        };
        break;
      case 'week':
        newSelection = {
          mode: 'week',
          startDate: startOfWeek,
          endDate: endOfWeek,
          displayText: '26 MAY – 1 JUN 2025',
          displayNumber: '7',
        };
        break;
      case 'month':
        newSelection = {
          mode: 'month',
          startDate: startOfMonth,
          endDate: endOfMonth,
          displayText: 'MAY 2025',
          displayNumber: '31',
        };
        break;
      case 'date-range':
        // Reset range selection
        setRangeStartDate(null);
        setRangeEndDate(null);
        setRangeMonth(new Date());
        setShowDateRangeModal(true);
        setShowPeriodModal(false);
        return;
      case 'day':
        setShowDayPickerModal(true);
        setShowPeriodModal(false);
        return;
      default:
        return;
    }

    onSelectionChange(newSelection);
    setShowPeriodModal(false);
  };

  const handleDateRangeSelect = () => {
    if (rangeStartDate && rangeEndDate) {
      const newSelection: DateRangeSelection = {
        mode: 'date-range',
        startDate: rangeStartDate,
        endDate: rangeEndDate,
        displayText: formatDateRange(rangeStartDate, rangeEndDate),
      };
      onSelectionChange(newSelection);
    }
    setShowDateRangeModal(false);
  };

  const handleDaySelect = (day: number) => {
    const selectedDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const newSelection: DateRangeSelection = {
      mode: 'day',
      startDate: selectedDate,
      endDate: selectedDate,
      displayText: `${day} ${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`,
    };
    onSelectionChange(newSelection);
    setShowDayPickerModal(false);
  };

  const handleRangeDaySelect = (day: number) => {
    const selectedDate = new Date(rangeMonth.getFullYear(), rangeMonth.getMonth(), day);
    
    if (!rangeStartDate || (rangeStartDate && rangeEndDate)) {
      // Start new selection
      setRangeStartDate(selectedDate);
      setRangeEndDate(null);
    } else if (rangeStartDate && !rangeEndDate) {
      // Complete the range
      if (selectedDate >= rangeStartDate) {
        setRangeEndDate(selectedDate);
      } else {
        // If selected date is before start date, swap them
        setRangeEndDate(rangeStartDate);
        setRangeStartDate(selectedDate);
      }
    }
  };

  const navigateMonth = (direction: 'prev' | 'next', isRangeModal = false) => {
    const currentMonth = isRangeModal ? rangeMonth : selectedMonth;
    const newMonth = new Date(currentMonth);
    
    if (direction === 'prev') {
      newMonth.setMonth(currentMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(currentMonth.getMonth() + 1);
    }
    
    if (isRangeModal) {
      setRangeMonth(newMonth);
    } else {
      setSelectedMonth(newMonth);
    }
  };

  const renderCalendar = (isRangeModal = false) => {
    const currentMonth = isRangeModal ? rangeMonth : selectedMonth;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      let isSelected = false;
      let isInRange = false;
      
      if (isRangeModal) {
        // Range selection logic
        if (rangeStartDate && currentDate.getTime() === rangeStartDate.getTime()) {
          isSelected = true;
        }
        if (rangeEndDate && currentDate.getTime() === rangeEndDate.getTime()) {
          isSelected = true;
        }
        if (rangeStartDate && rangeEndDate && 
            currentDate >= rangeStartDate && currentDate <= rangeEndDate) {
          isInRange = true;
        }
      } else {
        // Single day selection
        isSelected = day === 26; // Default selected day
      }
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay, 
            isSelected && styles.selectedDay,
            isInRange && !isSelected && styles.rangeDay
          ]}
          onPress={() => isRangeModal ? handleRangeDaySelect(day) : handleDaySelect(day)}
        >
          <Text style={[
            styles.calendarDayText, 
            isSelected && styles.selectedDayText,
            isInRange && !isSelected && styles.rangeDayText
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => navigateMonth('prev', isRangeModal)}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#8E8E93" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{monthNames[month]} {year}</Text>
          <TouchableOpacity onPress={() => navigateMonth('next', isRangeModal)}>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </View>
        <View style={styles.weekDaysHeader}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
            <Text key={index} style={styles.weekDayText}>{day}</Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {days}
        </View>
      </View>
    );
  };

  const getRangeDisplayText = () => {
    if (rangeStartDate && rangeEndDate) {
      return formatDateRange(rangeStartDate, rangeEndDate);
    } else if (rangeStartDate) {
      return `${formatDate(rangeStartDate)} – Select end date`;
    }
    return '1 Jan – 31 Dec';
  };

  return (
    <View style={styles.container}>
      {/* Date Selector Button */}
      <View style={styles.dateSelector}>
        <TouchableOpacity style={styles.dateArrow}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#8E8E93" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.dateContainer}
          onPress={() => setShowPeriodModal(true)}
        >
          {selection.displayNumber && (
            <View style={styles.dateCircle}>
              <Text style={styles.dateNumber}>{selection.displayNumber}</Text>
            </View>
          )}
          {selection.mode === 'all-time' && (
            <MaterialCommunityIcons name="infinity" size={24} color="#FFFFFF" style={styles.infinityIcon} />
          )}
          <Text style={styles.dateText}>{selection.displayText}</Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color="#8E8E93" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.dateArrow}>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      {/* Balance Display */}
      {showBalance && (
        <View style={styles.balanceContainer}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>
              {selection.mode === 'week' ? 'Starting balance' : 'Starting balance'}
            </Text>
            <Text style={styles.balanceAmount}>
              {startingBalance ? formatCurrency(startingBalance) : '₱ 449,524.70'}
            </Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>
              {selection.mode === 'week' ? 'Projected balance' : 'Ending balance'}
            </Text>
            <Text style={styles.balanceAmount}>
              {selection.mode === 'week' 
                ? (projectedBalance ? formatCurrency(projectedBalance) : '₱ 421,713.70')
                : (endingBalance ? formatCurrency(endingBalance) : '₱ 422,262.70')
              }
            </Text>
          </View>
        </View>
      )}

      {/* Period Selection Modal */}
      <Modal
        visible={showPeriodModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPeriodModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPeriodModal(false)}>
          <View style={styles.periodModal}>
            <Text style={styles.modalTitle}>Period</Text>
            
            <View style={styles.periodGrid}>
              {periodOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.periodOption,
                    selection.mode === option.id && styles.selectedPeriodOption
                  ]}
                  onPress={() => handlePeriodSelect(option)}
                >
                  <View style={styles.periodIconContainer}>
                    {option.number ? (
                      <View style={styles.numberCircle}>
                        <Text style={styles.numberText}>{option.number}</Text>
                      </View>
                    ) : (
                      <MaterialCommunityIcons 
                        name={option.icon as any} 
                        size={24} 
                        color="#FFFFFF" 
                      />
                    )}
                  </View>
                  <Text style={styles.periodTitle}>{option.title}</Text>
                  {option.subtitle && (
                    <Text style={styles.periodSubtitle}>{option.subtitle}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Date Range Selection Modal */}
      <Modal
        visible={showDateRangeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDateRangeModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.dateRangeModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDateRangeModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleDateRangeSelect}
                disabled={!rangeStartDate || !rangeEndDate}
              >
                <Text style={[
                  styles.saveButton,
                  (!rangeStartDate || !rangeEndDate) && styles.saveButtonDisabled
                ]}>Save</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalTitle}>Select range</Text>
            <View style={styles.dateRangeDisplay}>
              <Text style={styles.dateRangeText}>{getRangeDisplayText()}</Text>
              <MaterialCommunityIcons name="pencil" size={20} color="#8E8E93" />
            </View>
            
            {renderCalendar(true)}
          </View>
        </View>
      </Modal>

      {/* Day Picker Modal */}
      <Modal
        visible={showDayPickerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDayPickerModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDayPickerModal(false)}>
          <View style={styles.dayPickerModal}>
            <Text style={styles.modalTitle}>Select day</Text>
            
            <View style={styles.selectedDateDisplay}>
              <Text style={styles.selectedDateText}>26 May 2025</Text>
              <MaterialCommunityIcons name="pencil" size={20} color="#8E8E93" />
            </View>
            
            <View style={styles.monthNavigation}>
              <Text style={styles.monthText}>
                {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <View style={styles.monthArrows}>
                <TouchableOpacity onPress={() => navigateMonth('prev')}>
                  <MaterialCommunityIcons name="chevron-left" size={24} color="#8E8E93" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigateMonth('next')}>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </View>
            
            {renderCalendar(false)}
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowDayPickerModal(false)}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleDaySelect(26)}
              >
                <Text style={styles.actionButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  dateArrow: {
    padding: 8,
  },
  dateContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3C',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 8,
  },
  dateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6B8AFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  dateNumber: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infinityIcon: {
    marginRight: 8,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
    textAlign: 'center',
  },
  balanceContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2C2C2E',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  balanceItem: {
    flex: 1,
  },
  balanceLabel: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 4,
  },
  balanceAmount: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  periodModal: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: 400,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  periodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  periodOption: {
    width: '48%',
    backgroundColor: '#3A3A3C',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  selectedPeriodOption: {
    backgroundColor: '#6B8AFE',
  },
  periodIconContainer: {
    marginBottom: 8,
  },
  numberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6B8AFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  periodTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  periodSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    textAlign: 'center',
  },
  dateRangeModal: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  saveButton: {
    color: '#6B8AFE',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButtonDisabled: {
    color: '#8E8E93',
  },
  dateRangeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#2C2C2E',
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  dateRangeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
  },
  dayPickerModal: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
  },
  selectedDateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3C',
    marginBottom: 20,
  },
  selectedDateText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  monthArrows: {
    flexDirection: 'row',
    gap: 16,
  },
  calendar: {
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  weekDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  weekDayText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
    width: 32,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedDay: {
    backgroundColor: '#6B8AFE',
    borderRadius: 16,
  },
  rangeDay: {
    backgroundColor: '#3A3A3C',
    borderRadius: 16,
  },
  calendarDayText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  selectedDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  rangeDayText: {
    color: '#6B8AFE',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  actionButtonText: {
    color: '#6B8AFE',
    fontSize: 16,
    fontWeight: '500',
  },
}); 