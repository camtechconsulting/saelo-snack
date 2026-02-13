import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Dimensions, Animated, PanResponder, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { colors } from '../styles/colors';
import { Plus, ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, CheckSquare, Clock, Repeat, Target } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { transformEvent } from '../lib/transforms';
import DataStateView from '../components/DataStateView';
import FormModal from '../components/FormModal';
import { insertCalendarEvent } from '../lib/mutations';

const { width, height } = Dimensions.get('window');
const TIME_COLUMN_WIDTH = 60;
const DAY_COLUMN_WIDTH = width * 0.45; 
const HOUR_HEIGHT = 60;
const SWIPE_THRESHOLD = 50;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CalendarScreen({ onSelectEvent }) {
  const [viewMode, setViewMode] = useState('Upcoming');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [formConfig, setFormConfig] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const { user } = useAuth();
  const { data: events, loading, error, refetch } = useSupabaseQuery('calendar_events', {
    filters: { user_id: user.id },
    transform: transformEvent,
  });

  // Animation Values
  const zoomAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [touchStart, setTouchStart] = useState(null);

  // Helper to trigger the InfoCardModal with structured event data
  const handleEventPress = (event) => {
    if (onSelectEvent) {
      onSelectEvent({
        ...event,
        type: 'event_detail', // Layout for InfoCardModal
        context: event.category === 'Work' ? 'Business' : 'Personal',
        title: event.title,
        detail: `${event.time || 'All Day'} (${event.duration || '24h'})`,
        location: event.location || 'No location specified'
      });
    }
  };

  // Pinch Gesture Logic for Zooming Out
  const lastScale = useRef(1);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.numberActiveTouches === 2,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.numberActiveTouches === 2) {
          const scale = gestureState.pinch ? gestureState.scale : 1;
          if (scale < 0.8 && lastScale.current >= 0.8) {
             handleZoomOut();
          }
          lastScale.current = scale;
        }
      },
      onPanResponderRelease: () => { lastScale.current = 1; }
    })
  ).current;

  const handleZoomOut = () => {
    if (viewMode === 'Daily') {
      setViewMode('Weekly');
      performZoomAnimation(0.9, 1);
    } else if (viewMode === 'Weekly') {
      setViewMode('Monthly');
      performZoomAnimation(0.9, 1);
    }
  };

  const performZoomAnimation = (from, to) => {
    zoomAnim.setValue(from);
    Animated.spring(zoomAnim, { toValue: to, friction: 8, useNativeDriver: true }).start();
  };

  const handleDayPress = (day) => {
    const [year, month, date] = day.dateString.split('-').map(Number);
    setCurrentDate(new Date(year, month - 1, date));
    setViewMode('Daily');
    performZoomAnimation(1.1, 1);
  };

  const handleNav = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'Daily') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
      slideAnim.setValue(direction === 'next' ? width : -width);
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }).start();
    } else if (viewMode === 'Weekly') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setShowMonthPicker(false);
  };

  const selectMonth = (idx) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(idx);
    setCurrentDate(newDate);
    setShowMonthPicker(false);
  };

  const formatDailyHeader = (date) => `${date.toLocaleDateString('en-US', { weekday: 'long' })} ${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(-2)}`;
  
  const formatWeeklyHeader = (date) => {
    const start = new Date(date); start.setDate(date.getDate() - date.getDay());
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
  };

  const renderUpcomingItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.eventCard}
      onPress={() => handleEventPress(item)}
    >
      <View style={[styles.categoryStrip, { backgroundColor: item.color }]} />
      <View style={styles.eventDetails}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventTime}>{item.time || 'All Day'} • {item.duration || '24h'}</Text>
      </View>
      <View style={styles.accountBadge}><Text style={styles.accountText}>{item.account || 'Holidays'}</Text></View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    const dateKey = currentDate.toISOString().split('T')[0];
    
    switch (viewMode) {
      case 'Daily':
        return (
          <View style={{ flex: 1 }} {...panResponder.panHandlers} onTouchStart={(e) => setTouchStart(e.nativeEvent.pageX)} onTouchEnd={(e) => {
            if (!touchStart) return;
            const dist = touchStart - e.nativeEvent.pageX;
            if (Math.abs(dist) > SWIPE_THRESHOLD) handleNav(dist > 0 ? 'next' : 'prev');
            setTouchStart(null);
          }}>
            <View style={styles.headerNavContainer}>
              <TouchableOpacity onPress={goToToday} style={styles.todayButton}><Target size={16} color={colors.primary} /><Text style={styles.todayText}>Today</Text></TouchableOpacity>
              <View style={styles.navArrowsCentered}>
                <TouchableOpacity onPress={() => handleNav('prev')}><ChevronLeft color="#000" size={24} /></TouchableOpacity>
                <Text style={styles.headerTitle}>{formatDailyHeader(currentDate)}</Text>
                <TouchableOpacity onPress={() => handleNav('next')}><ChevronRight color="#000" size={24} /></TouchableOpacity>
              </View>
            </View>
            <Animated.ScrollView style={{ transform: [{ translateX: slideAnim }, { scale: zoomAnim }] }}>
              {events.filter(e => e.isAllDay && e.date === dateKey).length > 0 && (
                <View style={styles.allDaySection}>
                  <Text style={styles.allDayLabel}>{currentDate.getDate()}</Text>
                  <View style={{ flex: 1 }}>
                    {events.filter(e => e.isAllDay && e.date === dateKey).map(ev => (
                      <TouchableOpacity key={ev.id} onPress={() => handleEventPress(ev)} style={[styles.allDayBubble, { backgroundColor: ev.color || '#70757a', marginBottom: 2 }]}>
                        <Text style={styles.allDayText}>{ev.title}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              <View style={styles.timelineContainer}>
                <View style={styles.timeColumn}>{HOURS.map(h => <View key={h} style={styles.hourLabelHeight}><Text style={styles.hourText}>{h === 0 ? '12 AM' : h === 12 ? '12 PM' : h > 12 ? `${h-12} PM` : `${h} AM`}</Text></View>)}</View>
                <View style={styles.gridFull}>
                  {HOURS.map(h => <View key={h} style={styles.gridLine} />)}
                  {events.filter(e => !e.isAllDay && e.date === dateKey).map(ev => (
                    <TouchableOpacity 
                      key={ev.id} 
                      onPress={() => handleEventPress(ev)}
                      style={[styles.eventBlock, { top: ev.startHour * HOUR_HEIGHT, height: 60, backgroundColor: ev.color + '20', borderLeftColor: ev.color }]}
                    >
                      <Text style={[styles.eventTitleSmall, { color: ev.color }]}>{ev.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Animated.ScrollView>
          </View>
        );
      case 'Weekly':
        return (
          <View style={{ flex: 1 }} {...panResponder.panHandlers}>
            <View style={styles.headerNavContainer}>
              <TouchableOpacity onPress={goToToday} style={styles.todayButton}><Target size={16} color={colors.primary} /><Text style={styles.todayText}>Today</Text></TouchableOpacity>
              <View style={styles.navArrowsCentered}>
                <TouchableOpacity onPress={() => handleNav('prev')}><ChevronLeft color="#000" size={24} /></TouchableOpacity>
                <Text style={styles.headerTitle}>{formatWeeklyHeader(currentDate)}</Text>
                <TouchableOpacity onPress={() => handleNav('next')}><ChevronRight color="#000" size={24} /></TouchableOpacity>
              </View>
            </View>
            <Animated.View style={{ flex: 1, transform: [{ scale: zoomAnim }] }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={styles.weekHeaderRow}>
                    <View style={{ width: TIME_COLUMN_WIDTH }} />
                    {WEEK_DAYS.map((day, i) => {
                      const d = new Date(currentDate); d.setDate(currentDate.getDate() - currentDate.getDay() + i);
                      return <View key={day} style={styles.weekDayHeader}><Text style={styles.weekDayName}>{day}</Text><Text style={styles.weekDayNum}>{d.getDate()}</Text></View>
                    })}
                  </View>
                  <ScrollView>
                    <View style={styles.timelineContainer}>
                      <View style={styles.timeColumn}>{HOURS.map(h => <View key={h} style={styles.hourLabelHeight}><Text style={styles.hourText}>{h === 0 ? '12 AM' : h === 12 ? '12 PM' : h > 12 ? `${h-12} PM` : `${h} AM`}</Text></View>)}</View>
                      {WEEK_DAYS.map((_, i) => (
                        <View key={i} style={styles.weekColumnGrid}>
                          {HOURS.map(h => <View key={h} style={styles.gridLine} />)}
                          {events.filter(e => !e.isAllDay).map(ev => {
                            const eD = new Date(ev.date); const start = new Date(currentDate); start.setDate(currentDate.getDate() - currentDate.getDay());
                            const cur = new Date(start); cur.setDate(start.getDate() + i);
                            return eD.toDateString() === cur.toDateString() ? 
                              <TouchableOpacity 
                                key={ev.id} 
                                onPress={() => handleEventPress(ev)}
                                style={[styles.weeklyEventMini, { top: ev.startHour * HOUR_HEIGHT, backgroundColor: ev.color }]}
                              >
                                <Text style={styles.miniText} numberOfLines={1}>{ev.title}</Text>
                              </TouchableOpacity> : null;
                          })}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </ScrollView>
            </Animated.View>
          </View>
        );
      case 'Monthly':
        return (
          <View style={{ flex: 1 }}>
            <View style={styles.headerNavContainer}>
              <TouchableOpacity onPress={goToToday} style={styles.todayButton}><Target size={16} color={colors.primary} /><Text style={styles.todayText}>Today</Text></TouchableOpacity>
              <View style={styles.navArrowsCentered}>
                <TouchableOpacity onPress={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); setShowMonthPicker(false); }}><ChevronLeft color="#000" size={24} /></TouchableOpacity>
                <TouchableOpacity onPress={() => setShowMonthPicker(!showMonthPicker)}>
                  <Text style={styles.headerTitle}>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); setShowMonthPicker(false); }}><ChevronRight color="#000" size={24} /></TouchableOpacity>
              </View>
            </View>
            {showMonthPicker && (
              <View style={styles.monthDropdown}><ScrollView nestedScrollEnabled>{MONTHS.map((m, idx) => <TouchableOpacity key={m} style={styles.monthItem} onPress={() => selectMonth(idx)}><Text style={[styles.monthItemText, currentDate.getMonth() === idx && { color: colors.primary, fontWeight: 'bold' }]}>{m}</Text></TouchableOpacity>)}</ScrollView></View>
            )}
            <Animated.View style={{ transform: [{ scale: zoomAnim }] }}>
              <Calendar
                current={currentDate.toISOString().split('T')[0]}
                markedDates={markedDates}
                theme={{ todayTextColor: colors.primary, selectedDayBackgroundColor: colors.primary }}
                onDayPress={handleDayPress}
                hideArrows renderHeader={() => null}
              />
            </Animated.View>
            <View style={{ flex: 1, backgroundColor: colors.backgroundLight }}>
              <FlatList
                data={events.filter(e => new Date(e.date).getMonth() === currentDate.getMonth())}
                renderItem={renderUpcomingItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listPadding}
                ListHeaderComponent={<Text style={styles.sectionHeader}>{MONTHS[currentDate.getMonth()]} Events</Text>}
                ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptySubtitle}>No events this month</Text></View>}
              />
            </View>
          </View>
        );
      case 'Upcoming':
        return <FlatList data={events} renderItem={renderUpcomingItem} keyExtractor={item => item.id} contentContainerStyle={styles.listPadding} ListHeaderComponent={<Text style={styles.sectionHeader}>Next 7 Days</Text>} ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyTitle}>No upcoming events</Text><Text style={styles.emptySubtitle}>Tap + to create an event or connect Google Calendar</Text></View>} />;
    }
  };

  const markedDates = useMemo(() => {
    const marks = {};
    if (events) events.forEach(e => { if (!marks[e.date]) marks[e.date] = { marked: true, dotColor: e.color }; });
    marks[currentDate.toISOString().split('T')[0]] = { ...marks[currentDate.toISOString().split('T')[0]], selected: true, selectedColor: colors.primary };
    return marks;
  }, [currentDate, events]);

  const EVENT_FIELDS = [
    { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Event name' },
    { key: 'date', label: 'Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD', defaultValue: currentDate.toISOString().split('T')[0] },
    { key: 'time', label: 'Time', type: 'text', placeholder: 'e.g. 10:00 AM' },
    { key: 'duration', label: 'Duration', type: 'text', placeholder: 'e.g. 1h' },
    { key: 'location', label: 'Location', type: 'text', placeholder: 'e.g. Meeting Room B' },
    { key: 'category', label: 'Category', type: 'select', options: ['Work', 'Personal'] },
  ];

  const openEventForm = () => {
    setIsMenuOpen(false);
    setFormConfig({ title: 'Create Event', fields: EVENT_FIELDS });
    setFormVisible(true);
  };

  const openPersonalTimeForm = () => {
    setIsMenuOpen(false);
    const fields = EVENT_FIELDS.map(f => {
      if (f.key === 'title') return { ...f, defaultValue: 'Personal Time' };
      if (f.key === 'category') return { ...f, defaultValue: 'Personal' };
      return f;
    });
    setFormConfig({ title: 'Reserve Personal Time', fields, category: 'Personal' });
    setFormVisible(true);
  };

  const handleEventFormSubmit = async (values) => {
    setFormLoading(true);
    if (formConfig.category) values.category = formConfig.category;
    const { error: err } = await insertCalendarEvent(user.id, values);
    setFormLoading(false);
    if (err) {
      Alert.alert('Error', err.message);
      return;
    }
    setFormVisible(false);
    refetch();
  };

  if (loading || error) {
    return (
      <View style={styles.container}>
        <DataStateView loading={loading} error={error} onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.viewTabs}>{['Daily', 'Weekly', 'Monthly', 'Upcoming'].map(m => <TouchableOpacity key={m} onPress={() => { setViewMode(m); setShowMonthPicker(false); performZoomAnimation(0.95, 1); }} style={[styles.tab, viewMode === m && styles.tabActive]}><Text style={[styles.tabLabel, viewMode === m && styles.tabLabelActive]}>{m}</Text></TouchableOpacity>)}</View>
      <View style={{ flex: 1 }}>{renderContent()}</View>
      {isMenuOpen && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={styles.menuPill} onPress={openEventForm}>
            <CalendarIcon size={18} color={colors.primary} />
            <Text style={styles.pillText}>Create Event</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuPill} onPress={() => setIsMenuOpen(false)}>
            <CheckSquare size={18} color={colors.primary} />
            <Text style={styles.pillText}>Create To-Do List</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuPill} onPress={openPersonalTimeForm}>
            <Clock size={18} color={colors.primary} />
            <Text style={styles.pillText}>Reserve Personal Time</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuPill} onPress={() => setIsMenuOpen(false)}>
            <Repeat size={18} color={colors.primary} />
            <Text style={styles.pillText}>Create Recurring Event</Text>
          </TouchableOpacity>
        </View>
      )}
      {formConfig && (
        <FormModal
          visible={formVisible}
          title={formConfig.title}
          fields={formConfig.fields}
          onSubmit={handleEventFormSubmit}
          onClose={() => setFormVisible(false)}
          loading={formLoading}
        />
      )}
      <TouchableOpacity style={[styles.fab, isMenuOpen && styles.fabActive]} onPress={() => setIsMenuOpen(!isMenuOpen)}>{isMenuOpen ? <X color="#fff" size={30} /> : <Plus color="#fff" size={30} />}</TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerNavContainer: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee', zIndex: 10, backgroundColor: '#fff' },
  todayButton: { position: 'absolute', left: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F7FF', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 },
  todayText: { marginLeft: 4, color: colors.primary, fontWeight: '700', fontSize: 11 },
  navArrowsCentered: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', marginHorizontal: 8 },
  monthDropdown: { position: 'absolute', top: 60, left: '25%', width: '50%', backgroundColor: '#fff', borderRadius: 12, elevation: 10, zIndex: 100, borderWidth: 1, borderColor: '#eee', maxHeight: 200 },
  monthItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', alignItems: 'center' },
  monthItemText: { fontSize: 14, color: '#333' },
  viewTabs: { flexDirection: 'row', justifyContent: 'space-around', padding: 12, backgroundColor: '#f8f9fa' },
  tab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  tabActive: { backgroundColor: colors.primary },
  tabLabel: { fontSize: 12, color: '#666', fontWeight: '600' },
  tabLabelActive: { color: '#fff' },
  listPadding: { padding: 20 },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: '#666', textTransform: 'uppercase', marginBottom: 16 },
  eventCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 16, marginBottom: 12, alignItems: 'center', paddingRight: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0' },
  categoryStrip: { width: 6, height: '100%' },
  eventDetails: { flex: 1, padding: 16 },
  eventTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 4 },
  eventTime: { fontSize: 13, color: '#666' },
  accountBadge: { backgroundColor: '#F5F5F7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  accountText: { fontSize: 10, fontWeight: '700', color: '#666' },
  timelineContainer: { flexDirection: 'row' },
  timeColumn: { width: TIME_COLUMN_WIDTH, alignItems: 'center' },
  hourLabelHeight: { height: HOUR_HEIGHT, paddingTop: 4 },
  hourText: { fontSize: 10, color: '#70757a' },
  gridFull: { flex: 1, borderLeftWidth: 1, borderLeftColor: '#eee' },
  gridLine: { height: HOUR_HEIGHT, borderBottomWidth: 1, borderBottomColor: '#eee' },
  allDaySection: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  allDayLabel: { width: 45, textAlign: 'center', fontSize: 18, fontWeight: '300' },
  allDayBubble: { flex: 1, backgroundColor: '#70757a', borderRadius: 4, padding: 4, marginLeft: 10 },
  allDayText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  weekHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  weekDayHeader: { width: DAY_COLUMN_WIDTH, alignItems: 'center', paddingVertical: 10, borderLeftWidth: 1, borderLeftColor: '#eee' },
  weekDayName: { fontSize: 10, color: '#70757a' },
  weekDayNum: { fontSize: 20, fontWeight: '400' },
  weekColumnGrid: { width: DAY_COLUMN_WIDTH, borderLeftWidth: 1, borderLeftColor: '#eee', position: 'relative' },
  eventBlock: { position: 'absolute', left: 4, right: 4, borderRadius: 4, borderLeftWidth: 4, padding: 4 },
  eventTitleSmall: { fontSize: 11, fontWeight: '700' },
  weeklyEventMini: { position: 'absolute', left: 2, right: 2, height: 20, borderRadius: 2, padding: 2 },
  miniText: { color: 'white', fontSize: 8, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 10, right: 10, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5, zIndex: 2000 },
  fabActive: { backgroundColor: '#333' },
  menuOverlay: { position: 'absolute', bottom: 80, right: 10, alignItems: 'flex-end', zIndex: 1999 },
  menuPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 25, marginBottom: 10, elevation: 4, borderWidth: 1, borderColor: '#eee' },
  pillText: { marginLeft: 8, fontWeight: '600', color: '#333', fontSize: 13 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 }
});