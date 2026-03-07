import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  StatusBar,
} from "react-native";
import { Text, useTheme } from "react-native-paper";
import { Calendar } from "react-native-calendars";
import { GestureDetector, Gesture, GestureHandlerRootView } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/** Convert "3:30 PM" → minutes since midnight for sorting. */
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

/** Sort events by date then time. */
function sortEvents(eventList) {
  return [...eventList].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return timeToMinutes(a.time) - timeToMinutes(b.time);
  });
}

/** Parse "3:30 PM" into { hour, minute, period }. */
function parseTime(timeStr) {
  if (!timeStr) return { hour: "", minute: "", period: "PM" };
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hour: "", minute: "", period: "PM" };
  return { hour: match[1], minute: match[2], period: match[3].toUpperCase() };
}

export default function MyDates({
  events = {},
  onExplore,
  onUpdateEvent,
  onDeleteEvent,
}) {
  const theme = useTheme();
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);

  // Edit modal state
  const [editingEvent, setEditingEvent] = useState(null); // { event, originalDate, index }
  const [editDate, setEditDate] = useState("");
  const [editHour, setEditHour] = useState("");
  const [editMinute, setEditMinute] = useState("");
  const [editPeriod, setEditPeriod] = useState("PM");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const allEvents = useMemo(() => {
    const flat = Object.values(events).flat();
    return sortEvents(flat);
  }, [events]);

  const hasAnyEvents = allEvents.length > 0;

  const todayEvents = useMemo(
    () => sortEvents(events[today] || []),
    [events, today],
  );

  const upcomingEvents = useMemo(
    () => allEvents.filter((e) => e.date > today),
    [allEvents, today],
  );

  // Find the original index of an event within its date group
  const findEventIndex = (event) => {
    const dateEvents = events[event.date] || [];
    return dateEvents.indexOf(event);
  };

  const openEditModal = (event) => {
    const parsed = parseTime(event.time);
    setEditingEvent({ event, originalDate: event.date, index: findEventIndex(event) });
    setEditDate(event.date);
    setEditHour(parsed.hour);
    setEditMinute(parsed.minute);
    setEditPeriod(parsed.period);
    setShowDatePicker(false);
  };

  const closeEditModal = () => {
    setEditingEvent(null);
    setEditDate("");
    setEditHour("");
    setEditMinute("");
    setEditPeriod("PM");
    setShowDatePicker(false);
  };

  const calendarSwipeGesture = useMemo(() =>
  
    Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-15, 15])
        .onUpdate((event) => {
          if (event.translationX > 10) {
            console.log("this is the calendar swipe right")
          } else if (event.translationX < -10) {
            console.log("this is the calendar swipe left")
          }
        })
        .onEnd((event) => {
          if (event.translationX > 10) {
            console.log("this is the calendar swipe right")
          } else if (event.translationX < -10) {
            console.log("this is the calendar swipe left")
          }
        }),
    [editingEvent, handleDelete, openEditModal],
  );

  const myEventSwipeGesture = useMemo(() =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-15, 15])
        .onUpdate((event) => {
          if (event.translationX > 10) {
            console.log("this is the event swipe right")
          } else if (event.translationX < -10) {
            console.log("this is the event swipe left")
          }
        })
        .onEnd((event) => {
          if (event.translationX > 10) {
            console.log("this is the event swipe right")
          } else if (event.translationX < -10) {
            console.log("this is the event swipe left")
          }
        }),
    [editingEvent, handleDelete, openEditModal],
  );

  const validHour =
    /^\d{1,2}$/.test(editHour) &&
    Number(editHour) >= 1 &&
    Number(editHour) <= 12;
  const validMinute =
    /^\d{2}$/.test(editMinute) &&
    Number(editMinute) >= 0 &&
    Number(editMinute) <= 59;
  const canSave = editDate && validHour && validMinute;

  const handleSave = () => {
    if (!canSave || !editingEvent) return;
    onUpdateEvent(editingEvent.originalDate, editingEvent.index, {
      ...editingEvent.event,
      date: editDate,
      time: `${editHour}:${editMinute} ${editPeriod}`,
    });
    closeEditModal();
  };

  const handleDelete = () => {
    if (!editingEvent) return;
    Alert.alert("Delete Event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          onDeleteEvent(editingEvent.originalDate, editingEvent.index);
          closeEditModal();
        },
      },
    ]);
  };

  const formatDisplayDate = (dateStr) => {
    const [y, m, d] = dateStr.split("-");
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatFullDate = (dateStr) => {
    const [y, m, d] = dateStr.split("-");
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const calendarTheme = {
    backgroundColor: theme.colors.background,
    calendarBackground: theme.colors.background,
    textSectionTitleColor: theme.colors.onSurfaceVariant,
    selectedDayBackgroundColor: theme.colors.primary,
    selectedDayTextColor: theme.colors.onPrimary,
    todayTextColor: theme.colors.primary,
    dayTextColor: theme.colors.onSurface,
    textDisabledColor: theme.colors.outlineVariant,
    monthTextColor: theme.colors.onSurface,
    arrowColor: theme.colors.primary,
    textMonthFontWeight: "700",
    textDayFontSize: 14,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 13,
  };

  const editCalendarTheme = {
    ...calendarTheme,
    backgroundColor: "transparent",
    calendarBackground: "transparent",
  };

  const markedDates = {
    [selectedDate]: {
      selected: true,
      selectedColor: theme.colors.primary,
    },
    ...Object.keys(events).reduce((acc, date) => {
      acc[date] = {
        ...(date === selectedDate
          ? { selected: true, selectedColor: theme.colors.primary }
          : {}),
        marked: true,
        dotColor: theme.colors.primary,
      };
      return acc;
    }, {}),
  };

  const editMarkedDates = editDate
    ? { [editDate]: { selected: true, selectedColor: theme.colors.primary } }
    : {};

  const renderEventCard = (event, index) => (
    <TouchableOpacity
      key={`${event.date}-${index}`}
      style={[
        styles.eventCard,
        { backgroundColor: theme.colors.surfaceVariant },
      ]}
      onPress={() => openEditModal(event)}
      activeOpacity={0.7}
    >
      <View style={styles.eventCardContent}>
        <View style={styles.eventCardText}>
          <Text style={[styles.eventName, { color: theme.colors.onSurface }]}>
            {event.title}
          </Text>
          <View style={styles.eventMeta}>
            {event.time ? (
              <Text
                style={[
                  styles.eventTime,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {event.time}
              </Text>
            ) : null}
            {event.date && event.date !== today ? (
              <Text
                style={[
                  styles.eventDate,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {formatDisplayDate(event.date)}
              </Text>
            ) : null}
          </View>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <GestureDetector gesture={calendarSwipeGesture}>
              <View collapsable={false}>
                <Calendar
                  current={today}
                  onDayPress={(day) => setSelectedDate(day.dateString)}
                  markedDates={markedDates}
                  theme={calendarTheme}
                  style={[
                    styles.calendar,
                    { borderColor: theme.colors.outlineVariant },
                  ]}
                />
                </View>
            </GestureDetector>

              {/* My Events */}
              <GestureDetector gesture={myEventSwipeGesture}>
                <View style={styles.eventsSection}>
                  <Text
                    style={[styles.eventsTitle, { color: theme.colors.onSurface }]}
                  >
                    My Events
                  </Text>

                  {!hasAnyEvents ? (
                    <View style={styles.emptyEvents}>
                      <MaterialCommunityIcons
                        name="calendar-blank-outline"
                        size={48}
                        color={theme.colors.outlineVariant}
                      />
                      <Text
                        style={[
                          styles.emptyText,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        No events found
                      </Text>
                      <TouchableOpacity onPress={onExplore}>
                        <Text
                          style={[
                            styles.exploreLink,
                            { color: theme.colors.primary },
                          ]}
                        >
                          Explore Events
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {/* Today */}
                      <Text
                        style={[
                          styles.subsectionTitle,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Today
                      </Text>
                      {todayEvents.length === 0 ? (
                        <Text
                          style={[
                            styles.noEventsText,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                        >
                          No events today
                        </Text>
                      ) : (
                        todayEvents.map(renderEventCard)
                      )}

                      {/* Upcoming */}
                      <Text
                        style={[
                          styles.subsectionTitle,
                          { color: theme.colors.onSurface, marginTop: 20 },
                        ]}
                      >
                        Upcoming
                      </Text>
                      {upcomingEvents.length === 0 ? (
                        <Text
                          style={[
                            styles.noEventsText,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                        >
                          No upcoming events
                        </Text>
                      ) : (
                        upcomingEvents.map(renderEventCard)
                      )}
                    </>
                  )}
                </View>
              </GestureDetector>
          </ScrollView>

          {/* Edit / Delete modal */}
          <Modal
            visible={!!editingEvent}
            animationType="slide"
            transparent
            onRequestClose={closeEditModal}
          >
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.modalSheet,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalScroll}
                >
                  {/* Header */}
                  <View style={styles.modalHeader}>
                    <Text
                      style={[
                        styles.modalTitle,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Edit Event
                    </Text>
                    <TouchableOpacity onPress={closeEditModal}>
                      <MaterialCommunityIcons
                        name="close"
                        size={22}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Event name (read-only) */}
                  <Text
                    style={[
                      styles.editEventName,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {editingEvent?.event?.title}
                  </Text>

                  {/* Date */}
                  <Text
                    style={[
                      styles.editLabel,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Date
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.datePickerBtn,
                      { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                    onPress={() => setShowDatePicker(!showDatePicker)}
                  >
                    <MaterialCommunityIcons
                      name="calendar"
                      size={18}
                      color={theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.datePickerText,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {editDate ? formatFullDate(editDate) : "Select date"}
                    </Text>
                    <MaterialCommunityIcons
                      name={showDatePicker ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>

                  {showDatePicker && (
                    <Calendar
                      current={editDate || today}
                      onDayPress={(day) => {
                        setEditDate(day.dateString);
                        setShowDatePicker(false);
                      }}
                      markedDates={editMarkedDates}
                      theme={editCalendarTheme}
                      style={styles.editCalendar}
                    />
                  )}

                  {/* Time */}
                  <Text
                    style={[
                      styles.editLabel,
                      { color: theme.colors.onSurfaceVariant, marginTop: 16 },
                    ]}
                  >
                    Time
                  </Text>
                  <View style={styles.timeRow}>
                    <TextInput
                      style={[
                        styles.timeInput,
                        {
                          backgroundColor: theme.colors.surfaceVariant,
                          color: theme.colors.onSurface,
                          borderColor: theme.colors.outlineVariant,
                        },
                      ]}
                      placeholder="HH"
                      placeholderTextColor={theme.colors.outlineVariant}
                      value={editHour}
                      onChangeText={setEditHour}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                    <Text
                      style={[
                        styles.timeSeparator,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      :
                    </Text>
                    <TextInput
                      style={[
                        styles.timeInput,
                        {
                          backgroundColor: theme.colors.surfaceVariant,
                          color: theme.colors.onSurface,
                          borderColor: theme.colors.outlineVariant,
                        },
                      ]}
                      placeholder="MM"
                      placeholderTextColor={theme.colors.outlineVariant}
                      value={editMinute}
                      onChangeText={setEditMinute}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                    {["AM", "PM"].map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.periodBtn,
                          {
                            backgroundColor:
                              editPeriod === p
                                ? theme.colors.primary
                                : theme.colors.surfaceVariant,
                          },
                        ]}
                        onPress={() => setEditPeriod(p)}
                      >
                        <Text
                          style={[
                            styles.periodBtnText,
                            {
                              color:
                                editPeriod === p
                                  ? theme.colors.onPrimary
                                  : theme.colors.onSurfaceVariant,
                            },
                          ]}
                        >
                          {p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Actions */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[
                        styles.deleteBtn,
                        { borderColor: theme.colors.error },
                      ]}
                      onPress={handleDelete}
                    >
                      <MaterialCommunityIcons
                        name="delete-outline"
                        size={18}
                        color={theme.colors.error}
                      />
                      <Text
                        style={[
                          styles.deleteBtnText,
                          { color: theme.colors.error },
                        ]}
                      >
                        Delete
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.saveBtn,
                        {
                          backgroundColor: canSave
                            ? theme.colors.primary
                            : theme.colors.surfaceDisabled ||
                              theme.colors.outlineVariant,
                        },
                      ]}
                      onPress={handleSave}
                      disabled={!canSave}
                      activeOpacity={canSave ? 0.7 : 1}
                    >
                      <Text
                        style={[
                          styles.saveBtnText,
                          {
                            color: canSave
                              ? theme.colors.onPrimary
                              : theme.colors.onSurfaceDisabled ||
                                theme.colors.outline,
                          },
                        ]}
                      >
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  calendar: {
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  eventsSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  noEventsText: {
    fontSize: 14,
    marginBottom: 8,
  },
  emptyEvents: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
  exploreLink: {
    fontSize: 15,
    fontWeight: "600",
  },
  eventCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  eventCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  eventCardText: {
    flex: 1,
  },
  eventName: {
    fontSize: 15,
    fontWeight: "600",
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  eventTime: {
    fontSize: 13,
  },
  eventDate: {
    fontSize: 13,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 32,
  },
  modalScroll: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  editEventName: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  datePickerText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  editCalendar: {
    borderRadius: 12,
    marginTop: 8,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeInput: {
    width: 52,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  timeSeparator: {
    fontSize: 22,
    fontWeight: "700",
  },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  periodBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 28,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
