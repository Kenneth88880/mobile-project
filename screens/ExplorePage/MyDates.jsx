import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  useWindowDimensions,
} from "react-native";
import { Text, useTheme } from "react-native-paper";
import { Calendar } from "react-native-calendars";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let h = Number(match[1]);
  const m = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "AM" && h === 12) h = 0;
  else if (period === "PM" && h !== 12) h += 12;
  return h * 60 + m;
}

function sortEvents(list) {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return timeToMinutes(a.time) - timeToMinutes(b.time);
  });
}

function parseTime(timeStr) {
  if (!timeStr) return { hour: "", minute: "", period: "PM" };
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hour: "", minute: "", period: "PM" };
  return { hour: match[1], minute: match[2], period: match[3].toUpperCase() };
}

function offsetDate(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().split("T")[0];
}

function offsetMonth(dateStr, months) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1 + months, 1);
  const maxDay = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  dt.setDate(Math.min(d, maxDay));
  return dt.toISOString().split("T")[0];
}

function firstOfMonth(dateStr) {
  return dateStr.slice(0, 7) + "-01";
}

const SNAP_THRESHOLD = 60;
const SNAP_DURATION  = 260;
const SNAP_EASING    = Easing.out(Easing.cubic);
const RUBBER         = 0.18;

// ─── SwipeStrip ───────────────────────────────────────────────────────────────

function SwipeStrip({ width: W, slideX, prevContent, currContent, nextContent, onCommitPrev, onCommitNext }) {
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value - W }],
  }));

  const gesture = useMemo(() =>
    Gesture.Pan()
      .activeOffsetX([-12, 12])
      .failOffsetY([-18, 18])
      .onUpdate((e) => {
        "worklet";
        const tx = e.translationX;
        if (tx < -W) {
          slideX.value = -W + (tx + W) * RUBBER;
        } else if (tx > W) {
          slideX.value = W + (tx - W) * RUBBER;
        } else {
          slideX.value = tx;
        }
      })
      .onEnd((e) => {
        "worklet";
        if (e.translationX < -SNAP_THRESHOLD) {
          slideX.value = withTiming(-W, { duration: SNAP_DURATION, easing: SNAP_EASING }, () => {
            runOnJS(onCommitNext)();
          });
        } else if (e.translationX > SNAP_THRESHOLD) {
          slideX.value = withTiming(W, { duration: SNAP_DURATION, easing: SNAP_EASING }, () => {
            runOnJS(onCommitPrev)();
          });
        } else {
          slideX.value = withTiming(0, { duration: SNAP_DURATION, easing: SNAP_EASING });
        }
      }),
    [W, onCommitPrev, onCommitNext],
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width: W, overflow: "hidden" }} collapsable={false}>
        <Animated.View style={[{ flexDirection: "row", width: W * 3 }, animStyle]}>
          <View style={{ width: W }}>{prevContent}</View>
          <View style={{ width: W }}>{currContent}</View>
          <View style={{ width: W }}>{nextContent}</View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MyDates({ events = {}, onExplore, onUpdateEvent, onDeleteEvent }) {
  const theme = useTheme();
  const { width: W } = useWindowDimensions();
  const today = new Date().toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [displayMonth, setDisplayMonth] = useState(firstOfMonth(today));

  const calSlideX = useSharedValue(0);
  const evSlideX  = useSharedValue(0);

  // ── Neighbours ───────────────────────────────────────────────────────────
  const prevMonthStr = useMemo(() => firstOfMonth(offsetMonth(displayMonth, -1)), [displayMonth]);
  const nextMonthStr = useMemo(() => firstOfMonth(offsetMonth(displayMonth,  1)), [displayMonth]);
  const prevDate     = useMemo(() => offsetDate(selectedDate, -1), [selectedDate]);
  const nextDate     = useMemo(() => offsetDate(selectedDate,  1), [selectedDate]);

  // ── Events ────────────────────────────────────────────────────────────────
  const allEvents      = useMemo(() => sortEvents(Object.values(events).flat()), [events]);
  const hasAnyEvents   = allEvents.length > 0;
  const upcomingEvents = useMemo(() => allEvents.filter((e) => e.date > today), [allEvents, today]);

  // ── Edit modal state ──────────────────────────────────────────────────────
  const [editingEvent,   setEditingEvent]   = useState(null);
  const [editDate,       setEditDate]       = useState("");
  const [editHour,       setEditHour]       = useState("");
  const [editMinute,     setEditMinute]     = useState("");
  const [editPeriod,     setEditPeriod]     = useState("PM");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── Commit ────────────────────────────────────────────────────────────────

  const commitPrevMonth = useCallback(() => {
    calSlideX.value = 0;
    evSlideX.value  = 0;
    const nd = offsetMonth(selectedDate, -1);
    setDisplayMonth(prevMonthStr);
    setSelectedDate(nd.slice(0, 7) === today.slice(0, 7) ? today : nd);
  }, [prevMonthStr, selectedDate, today]);

  const commitNextMonth = useCallback(() => {
    calSlideX.value = 0;
    evSlideX.value  = 0;
    const nd = offsetMonth(selectedDate, 1);
    setDisplayMonth(nextMonthStr);
    setSelectedDate(nd.slice(0, 7) === today.slice(0, 7) ? today : nd);
  }, [nextMonthStr, selectedDate, today]);

  const commitPrevDay = useCallback(() => {
    evSlideX.value = 0;
    if (prevDate.slice(0, 7) !== selectedDate.slice(0, 7)) {
      calSlideX.value = 0;
      setDisplayMonth(firstOfMonth(prevDate));
    }
    setSelectedDate(prevDate);
  }, [prevDate, selectedDate]);

  const commitNextDay = useCallback(() => {
    evSlideX.value = 0;
    if (nextDate.slice(0, 7) !== selectedDate.slice(0, 7)) {
      calSlideX.value = 0;
      setDisplayMonth(firstOfMonth(nextDate));
    }
    setSelectedDate(nextDate);
  }, [nextDate, selectedDate]);

  // ── Button-tap navigation ─────────────────────────────────────────────────

  const tapPrevMonth = useCallback(() => {
    calSlideX.value = withTiming(W, { duration: SNAP_DURATION, easing: SNAP_EASING }, () => runOnJS(commitPrevMonth)());
    evSlideX.value  = withTiming(W, { duration: SNAP_DURATION, easing: SNAP_EASING });
  }, [W, commitPrevMonth]);

  const tapNextMonth = useCallback(() => {
    calSlideX.value = withTiming(-W, { duration: SNAP_DURATION, easing: SNAP_EASING }, () => runOnJS(commitNextMonth)());
    evSlideX.value  = withTiming(-W, { duration: SNAP_DURATION, easing: SNAP_EASING });
  }, [W, commitNextMonth]);

  const tapPrevDay = useCallback(() => {
    if (prevDate.slice(0, 7) !== selectedDate.slice(0, 7))
      calSlideX.value = withTiming(W, { duration: SNAP_DURATION, easing: SNAP_EASING });
    evSlideX.value = withTiming(W, { duration: SNAP_DURATION, easing: SNAP_EASING }, () => runOnJS(commitPrevDay)());
  }, [W, prevDate, selectedDate, commitPrevDay]);

  const tapNextDay = useCallback(() => {
    if (nextDate.slice(0, 7) !== selectedDate.slice(0, 7))
      calSlideX.value = withTiming(-W, { duration: SNAP_DURATION, easing: SNAP_EASING });
    evSlideX.value = withTiming(-W, { duration: SNAP_DURATION, easing: SNAP_EASING }, () => runOnJS(commitNextDay)());
  }, [W, nextDate, selectedDate, commitNextDay]);

  // ── Stable refs for handlers that close over selectedDate ─────────────────
  // Prevents panel useMemos from rebuilding on every day change

  const selectedDateRef   = useRef(selectedDate);
  const tapPrevDayRef     = useRef(tapPrevDay);
  const tapNextDayRef     = useRef(tapNextDay);
  const openEditModalRef  = useRef(null);

  useEffect(() => { selectedDateRef.current  = selectedDate; }, [selectedDate]);
  useEffect(() => { tapPrevDayRef.current    = tapPrevDay;   }, [tapPrevDay]);
  useEffect(() => { tapNextDayRef.current    = tapNextDay;   }, [tapNextDay]);

  // ── Edit helpers ──────────────────────────────────────────────────────────

  const openEditModal = useCallback((ev) => {
    const p = parseTime(ev.time);
    const index = (events[ev.date] || []).indexOf(ev);
    setEditingEvent({ event: ev, originalDate: ev.date, index });
    setEditDate(ev.date); setEditHour(p.hour); setEditMinute(p.minute); setEditPeriod(p.period);
    setShowDatePicker(false);
  }, [events]);

  useEffect(() => { openEditModalRef.current = openEditModal; }, [openEditModal]);

  const closeEditModal = useCallback(() => {
    setEditingEvent(null);
    setEditDate(""); setEditHour(""); setEditMinute(""); setEditPeriod("PM");
    setShowDatePicker(false);
  }, []);

  const validHour   = /^\d{1,2}$/.test(editHour)   && Number(editHour)   >= 1 && Number(editHour)   <= 12;
  const validMinute = /^\d{2}$/.test(editMinute) && Number(editMinute) >= 0 && Number(editMinute) <= 59;
  const canSave = editDate && validHour && validMinute;

  const handleSave = useCallback(() => {
    if (!canSave || !editingEvent) return;
    onUpdateEvent(editingEvent.originalDate, editingEvent.index, {
      ...editingEvent.event, date: editDate, time: `${editHour}:${editMinute} ${editPeriod}`,
    });
    closeEditModal();
  }, [canSave, editingEvent, editDate, editHour, editMinute, editPeriod, onUpdateEvent, closeEditModal]);

  const handleDelete = useCallback(() => {
    if (!editingEvent) return;
    Alert.alert("Delete Event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { onDeleteEvent(editingEvent.originalDate, editingEvent.index); closeEditModal(); } },
    ]);
  }, [editingEvent, onDeleteEvent, closeEditModal]);

  // ── Formatting ────────────────────────────────────────────────────────────

  const fmtShort = (dateStr) => {
    const [y, m, d] = dateStr.split("-");
    return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const fmtFull = (dateStr) => {
    const [y, m, d] = dateStr.split("-");
    return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
  };

  // ── Theme ─────────────────────────────────────────────────────────────────

  const calTheme = useMemo(() => ({
    backgroundColor:            theme.colors.background,
    calendarBackground:         theme.colors.background,
    textSectionTitleColor:      theme.colors.onSurfaceVariant,
    selectedDayBackgroundColor: theme.colors.primary,
    selectedDayTextColor:       theme.colors.onPrimary,
    todayTextColor:             theme.colors.primary,
    dayTextColor:               theme.colors.onSurface,
    textDisabledColor:          theme.colors.outlineVariant,
    monthTextColor:             theme.colors.onSurface,
    arrowColor:                 theme.colors.primary,
    textMonthFontWeight:        "700",
    textDayFontSize:            14,
    textMonthFontSize:          16,
    textDayHeaderFontSize:      13,
  }), [theme]);

  const editCalTheme = useMemo(() => ({
    ...calTheme, backgroundColor: "transparent", calendarBackground: "transparent",
  }), [calTheme]);

  // ── Marked dates ──────────────────────────────────────────────────────────

  const buildMarked = useCallback((activeSel) => ({
    [activeSel]: { selected: true, selectedColor: theme.colors.primary },
    ...Object.keys(events).reduce((acc, date) => {
      acc[date] = {
        ...(date === activeSel ? { selected: true, selectedColor: theme.colors.primary } : {}),
        marked: true, dotColor: theme.colors.primary,
      };
      return acc;
    }, {}),
  }), [events, theme.colors.primary]);

  const markedPrev = useMemo(() => buildMarked(prevDate),     [buildMarked, prevDate]);
  const markedCurr = useMemo(() => buildMarked(selectedDate), [buildMarked, selectedDate]);
  const markedNext = useMemo(() => buildMarked(nextDate),     [buildMarked, nextDate]);

  const editMarkedDates = editDate
    ? { [editDate]: { selected: true, selectedColor: theme.colors.primary } }
    : {};

  // ── Slot renderers ────────────────────────────────────────────────────────

  // renderEventCard: only rebuilds when theme/today change — openEditModal via ref
  const renderEventCard = useCallback((ev, idx) => (
    <TouchableOpacity
      key={`${ev.date}-${idx}`}
      style={[styles.eventCard, { backgroundColor: theme.colors.surfaceVariant }]}
      onPress={() => openEditModalRef.current(ev)}
      activeOpacity={0.7}
    >
      <View style={styles.eventCardContent}>
        <View style={styles.eventCardText}>
          <Text style={[styles.eventName, { color: theme.colors.onSurface }]}>{ev.title}</Text>
          <View style={styles.eventMeta}>
            {ev.time
              ? <Text style={[styles.eventTime, { color: theme.colors.onSurfaceVariant }]}>{ev.time}</Text>
              : null}
            {ev.date && ev.date !== today
              ? <Text style={[styles.eventDate, { color: theme.colors.onSurfaceVariant }]}>{fmtShort(ev.date)}</Text>
              : null}
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
      </View>
    </TouchableOpacity>
  ), [theme, today]);

  // renderCalSlot: selectedDate via ref so panels don't rebuild on day change
  const renderCalSlot = useCallback((monthStr, marked) => (
    <Calendar
      key={monthStr}
      current={monthStr}
      onDayPress={(day) => {
        const d = day.dateString;
        const dir = d > selectedDateRef.current ? -W : W;
        evSlideX.value = withTiming(dir, { duration: SNAP_DURATION, easing: SNAP_EASING }, () => {
          runOnJS(setSelectedDate)(d);
          runOnJS(() => { evSlideX.value = 0; })();
        });
      }}
      markedDates={marked}
      theme={calTheme}
      style={[styles.calendar, { borderColor: theme.colors.outlineVariant }]}
      hideArrows
    />
  ), [W, calTheme, theme.colors.outlineVariant]);

  // renderEvSlot: tap handlers via refs so panels don't rebuild on day change
  const renderEvSlot = useCallback((dateStr) => {
    const dayEvs  = sortEvents(events[dateStr] || []);
    const isToday = dateStr === today;
    const label   = isToday ? "Today" : fmtFull(dateStr);

    return (
      <View style={styles.eventsSection}>
        <View style={styles.eventsTitleRow}>
          <TouchableOpacity onPress={() => tapPrevDayRef.current()} hitSlop={8}>
            <MaterialCommunityIcons name="chevron-left" size={22} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={[styles.eventsTitle, { color: theme.colors.onSurface }]}>{label}</Text>
          <TouchableOpacity onPress={() => tapNextDayRef.current()} hitSlop={8}>
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {!hasAnyEvents ? (
          <View style={styles.emptyEvents}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={48} color={theme.colors.outlineVariant} />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No events found</Text>
            <TouchableOpacity onPress={onExplore}>
              <Text style={[styles.exploreLink, { color: theme.colors.primary }]}>Explore Events</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {dayEvs.length === 0
              ? <Text style={[styles.noEventsText, { color: theme.colors.onSurfaceVariant }]}>No events on this day</Text>
              : dayEvs.map(renderEventCard)}
            {isToday && upcomingEvents.length > 0 && (
              <>
                <Text style={[styles.subsectionTitle, { color: theme.colors.onSurface, marginTop: 20 }]}>Upcoming</Text>
                {upcomingEvents.map(renderEventCard)}
              </>
            )}
          </>
        )}
      </View>
    );
  }, [events, today, hasAnyEvents, upcomingEvents, theme, onExplore, renderEventCard]);
  // ↑ tapPrevDay / tapNextDay intentionally omitted — accessed via refs

  // ── Memoized panels ───────────────────────────────────────────────────────

  const calPrev = useMemo(() => renderCalSlot(prevMonthStr, markedPrev), [renderCalSlot, prevMonthStr, markedPrev]);
  const calCurr = useMemo(() => renderCalSlot(displayMonth, markedCurr), [renderCalSlot, displayMonth, markedCurr]);
  const calNext = useMemo(() => renderCalSlot(nextMonthStr, markedNext), [renderCalSlot, nextMonthStr, markedNext]);

  const evPrev  = useMemo(() => renderEvSlot(prevDate),     [renderEvSlot, prevDate]);
  const evCurr  = useMemo(() => renderEvSlot(selectedDate), [renderEvSlot, selectedDate]);
  const evNext  = useMemo(() => renderEvSlot(nextDate),     [renderEvSlot, nextDate]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <View style={styles.calHeader}>
            <TouchableOpacity onPress={tapPrevMonth} hitSlop={8}>
              <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={tapNextMonth} hitSlop={8}>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <SwipeStrip
            width={W} slideX={calSlideX}
            prevContent={calPrev} currContent={calCurr} nextContent={calNext}
            onCommitPrev={commitPrevMonth} onCommitNext={commitNextMonth}
          />

          <SwipeStrip
            width={W} slideX={evSlideX}
            prevContent={evPrev} currContent={evCurr} nextContent={evNext}
            onCommitPrev={commitPrevDay} onCommitNext={commitNextDay}
          />

        </ScrollView>

        {/* Edit modal */}
        <Modal visible={!!editingEvent} animationType="slide" transparent onRequestClose={closeEditModal}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>

                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>Edit Event</Text>
                  <TouchableOpacity onPress={closeEditModal}>
                    <MaterialCommunityIcons name="close" size={22} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.editEventName, { color: theme.colors.onSurface }]}>{editingEvent?.event?.title}</Text>

                <Text style={[styles.editLabel, { color: theme.colors.onSurfaceVariant }]}>Date</Text>
                <TouchableOpacity
                  style={[styles.datePickerBtn, { backgroundColor: theme.colors.surfaceVariant }]}
                  onPress={() => setShowDatePicker(!showDatePicker)}
                >
                  <MaterialCommunityIcons name="calendar" size={18} color={theme.colors.primary} />
                  <Text style={[styles.datePickerText, { color: theme.colors.onSurface }]}>
                    {editDate ? fmtFull(editDate) : "Select date"}
                  </Text>
                  <MaterialCommunityIcons name={showDatePicker ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>

                {showDatePicker && (
                  <Calendar
                    current={editDate || today}
                    onDayPress={(day) => { setEditDate(day.dateString); setShowDatePicker(false); }}
                    markedDates={editMarkedDates}
                    theme={editCalTheme}
                    style={styles.editCalendar}
                  />
                )}

                <Text style={[styles.editLabel, { color: theme.colors.onSurfaceVariant, marginTop: 16 }]}>Time</Text>
                <View style={styles.timeRow}>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.onSurface, borderColor: theme.colors.outlineVariant }]}
                    placeholder="HH" placeholderTextColor={theme.colors.outlineVariant}
                    value={editHour} onChangeText={setEditHour} keyboardType="number-pad" maxLength={2}
                  />
                  <Text style={[styles.timeSeparator, { color: theme.colors.onSurface }]}>:</Text>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.onSurface, borderColor: theme.colors.outlineVariant }]}
                    placeholder="MM" placeholderTextColor={theme.colors.outlineVariant}
                    value={editMinute} onChangeText={setEditMinute} keyboardType="number-pad" maxLength={2}
                  />
                  {["AM", "PM"].map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.periodBtn, { backgroundColor: editPeriod === p ? theme.colors.primary : theme.colors.surfaceVariant }]}
                      onPress={() => setEditPeriod(p)}
                    >
                      <Text style={[styles.periodBtnText, { color: editPeriod === p ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.deleteBtn, { borderColor: theme.colors.error }]} onPress={handleDelete}>
                    <MaterialCommunityIcons name="delete-outline" size={18} color={theme.colors.error} />
                    <Text style={[styles.deleteBtnText, { color: theme.colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: canSave ? theme.colors.primary : theme.colors.surfaceDisabled || theme.colors.outlineVariant }]}
                    onPress={handleSave} disabled={!canSave} activeOpacity={canSave ? 0.7 : 1}
                  >
                    <Text style={[styles.saveBtnText, { color: canSave ? theme.colors.onPrimary : theme.colors.onSurfaceDisabled || theme.colors.outline }]}>
                      Save Changes
                    </Text>
                  </TouchableOpacity>
                </View>

              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1 },
  scrollContent:    { paddingBottom: 32 },
  calHeader:        { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 4 },
  calendar:         { borderBottomWidth: 1, marginBottom: 8 },
  eventsSection:    { paddingHorizontal: 16, paddingTop: 12 },
  eventsTitleRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  eventsTitle:      { fontSize: 18, fontWeight: "700" },
  subsectionTitle:  { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  noEventsText:     { fontSize: 14, marginBottom: 8 },
  emptyEvents:      { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText:        { fontSize: 15 },
  exploreLink:      { fontSize: 15, fontWeight: "600" },
  eventCard:        { padding: 14, borderRadius: 12, marginBottom: 10 },
  eventCardContent: { flexDirection: "row", alignItems: "center" },
  eventCardText:    { flex: 1 },
  eventName:        { fontSize: 15, fontWeight: "600" },
  eventMeta:        { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  eventTime:        { fontSize: 13 },
  eventDate:        { fontSize: 13 },
  modalOverlay:     { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%", paddingBottom: 32 },
  modalScroll:      { padding: 20 },
  modalHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle:       { fontSize: 20, fontWeight: "700" },
  editEventName:    { fontSize: 17, fontWeight: "600", marginBottom: 20 },
  editLabel:        { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  datePickerBtn:    { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10 },
  datePickerText:   { fontSize: 14, fontWeight: "600", flex: 1 },
  editCalendar:     { borderRadius: 12, marginTop: 8 },
  timeRow:          { flexDirection: "row", alignItems: "center", gap: 8 },
  timeInput:        { width: 52, borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 10, fontSize: 18, fontWeight: "600", textAlign: "center" },
  timeSeparator:    { fontSize: 22, fontWeight: "700" },
  periodBtn:        { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  periodBtnText:    { fontSize: 14, fontWeight: "700" },
  modalActions:     { flexDirection: "row", gap: 12, marginTop: 28 },
  deleteBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1 },
  deleteBtnText:    { fontSize: 14, fontWeight: "600" },
  saveBtn:          { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10 },
  saveBtnText:      { fontSize: 14, fontWeight: "600" },
});