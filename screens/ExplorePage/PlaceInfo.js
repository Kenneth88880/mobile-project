import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  ScrollView,
  Platform,
  Image,
  StatusBar,
  Alert,
  TextInput,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { getPlacesPhotoUrl } from "./PlaceItem";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80";

export default function PlaceInfo({ place, visible, onClose, onCreateEvent }) {
  const theme = useTheme();
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [eventHour, setEventHour] = useState("");
  const [eventMinute, setEventMinute] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("PM");

  if (!place) return null;

  const today = new Date().toISOString().split("T")[0];
  const validHour = /^\d{1,2}$/.test(eventHour) && Number(eventHour) >= 1 && Number(eventHour) <= 12;
  const validMinute = /^\d{2}$/.test(eventMinute) && Number(eventMinute) >= 0 && Number(eventMinute) <= 59;
  const canSave = eventDate && validHour && validMinute;

  const imageUri =
    (place.photo_reference && getPlacesPhotoUrl(place.photo_reference)) ||
    place.image_url ||
    PLACEHOLDER_IMAGE;

  const openMaps = () => {
    const { latitude, longitude, name } = place;
    const label = encodeURIComponent(name);
    const url =
      Platform.OS === "ios"
        ? `maps://app?daddr=${latitude},${longitude}&q=${label}`
        : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
    Linking.openURL(url);
  };

  const callPhone = () => {
    if (place.phone) Linking.openURL(`tel:${place.phone}`);
  };

  const openWebsite = () => {
    if (!place.website) return;
    const url = place.website.startsWith("http")
      ? place.website
      : `https://${place.website}`;
    Linking.openURL(url);
  };

  const handleDateSelect = (day) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEventDate(day.dateString);
  };

  const handleChangeDate = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEventDate("");
    setEventHour("");
    setEventMinute("");
  };

  const handleCreateEvent = () => {
    if (!canSave) return;

    onCreateEvent({
      date: eventDate,
      time: `${eventHour}:${eventMinute} ${selectedPeriod}`,
      title: place.name,
      place,
    });

    setShowEventForm(false);
    setEventDate("");
    setEventHour("");
    setEventMinute("");
    setSelectedPeriod("PM");
    Alert.alert("Event Created", `${place.name} added to your dates.`);
  };

  const resetForm = () => {
    setShowEventForm(false);
    setEventDate("");
    setEventHour("");
    setEventMinute("");
    setSelectedPeriod("PM");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
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
    backgroundColor: "transparent",
    calendarBackground: "transparent",
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

  const markedDates = eventDate
    ? { [eventDate]: { selected: true, selectedColor: theme.colors.primary } }
    : {};

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero image */}
          <View style={styles.imageWrapper}>
            <Image source={{ uri: imageUri }} style={styles.heroImage} />

            <TouchableOpacity
              style={[
                styles.backBtn,
                { backgroundColor: theme.colors.surface },
              ]}
              onPress={handleClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color={theme.colors.onSurface}
              />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={[styles.name, { color: theme.colors.onSurface }]}>
              {place.name}
            </Text>
            <Text
              style={[
                styles.category,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {place.category}
            </Text>

            {/* Action buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: theme.colors.primaryContainer },
                ]}
                onPress={openMaps}
              >
                <MaterialCommunityIcons
                  name="directions"
                  size={22}
                  color={theme.colors.onPrimaryContainer}
                />
                <Text
                  style={[
                    styles.actionLabel,
                    { color: theme.colors.onPrimaryContainer },
                  ]}
                >
                  Directions
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: theme.colors.primaryContainer },
                ]}
                onPress={() => setShowEventForm(true)}
              >
                <MaterialCommunityIcons
                  name="calendar-plus"
                  size={22}
                  color={theme.colors.onPrimaryContainer}
                />
                <Text
                  style={[
                    styles.actionLabel,
                    { color: theme.colors.onPrimaryContainer },
                  ]}
                >
                  Create Event
                </Text>
              </TouchableOpacity>
            </View>

            {/* Event creation form */}
            {showEventForm && (
              <View
                style={[
                  styles.eventForm,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <Text
                  style={[
                    styles.formTitle,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  New Event
                </Text>

                {/* Step 1: Calendar — hidden once date is picked */}
                {!eventDate ? (
                  <>
                    <Text
                      style={[
                        styles.inputLabel,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Select a date
                    </Text>
                    <Calendar
                      current={today}
                      minDate={today}
                      onDayPress={handleDateSelect}
                      markedDates={markedDates}
                      theme={calendarTheme}
                      style={styles.formCalendar}
                    />
                  </>
                ) : (
                  <>
                    {/* Selected date chip with change option */}
                    <View style={styles.selectedDateRow}>
                      <MaterialCommunityIcons
                        name="calendar-check"
                        size={18}
                        color={theme.colors.primary}
                      />
                      <Text
                        style={[
                          styles.selectedDateText,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        {formatDate(eventDate)}
                      </Text>
                      <TouchableOpacity onPress={handleChangeDate}>
                        <Text
                          style={[
                            styles.changeDateLink,
                            { color: theme.colors.primary },
                          ]}
                        >
                          Change
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Step 2: Time input */}
                    <Text
                      style={[
                        styles.inputLabel,
                        { color: theme.colors.onSurfaceVariant, marginTop: 16 },
                      ]}
                    >
                      Enter time
                    </Text>

                    <View style={styles.timeRow}>
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={20}
                        color={theme.colors.primary}
                      />
                      <TextInput
                        style={[
                          styles.timeInput,
                          {
                            backgroundColor: theme.colors.surface,
                            color: theme.colors.onSurface,
                            borderColor: theme.colors.outlineVariant,
                          },
                        ]}
                        placeholder="HH"
                        placeholderTextColor={theme.colors.outlineVariant}
                        value={eventHour}
                        onChangeText={setEventHour}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                      <Text style={[styles.timeSeparator, { color: theme.colors.onSurface }]}>
                        :
                      </Text>
                      <TextInput
                        style={[
                          styles.timeInput,
                          {
                            backgroundColor: theme.colors.surface,
                            color: theme.colors.onSurface,
                            borderColor: theme.colors.outlineVariant,
                          },
                        ]}
                        placeholder="MM"
                        placeholderTextColor={theme.colors.outlineVariant}
                        value={eventMinute}
                        onChangeText={setEventMinute}
                        keyboardType="number-pad"
                        maxLength={2}
                      />

                      {/* AM / PM toggle */}
                      {["AM", "PM"].map((p) => (
                        <TouchableOpacity
                          key={p}
                          style={[
                            styles.periodBtn,
                            {
                              backgroundColor:
                                selectedPeriod === p
                                  ? theme.colors.primary
                                  : theme.colors.surface,
                            },
                          ]}
                          onPress={() => setSelectedPeriod(p)}
                        >
                          <Text
                            style={[
                              styles.periodBtnText,
                              {
                                color:
                                  selectedPeriod === p
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
                  </>
                )}

                {/* Cancel / Save */}
                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[
                      styles.formBtn,
                      { backgroundColor: theme.colors.surface },
                    ]}
                    onPress={resetForm}
                  >
                    <Text
                      style={[
                        styles.formBtnText,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.formBtn,
                      {
                        backgroundColor: canSave
                          ? theme.colors.primary
                          : theme.colors.surfaceDisabled ||
                            theme.colors.outlineVariant,
                      },
                    ]}
                    onPress={handleCreateEvent}
                    disabled={!canSave}
                    activeOpacity={canSave ? 0.7 : 1}
                  >
                    <Text
                      style={[
                        styles.formBtnText,
                        {
                          color: canSave
                            ? theme.colors.onPrimary
                            : theme.colors.onSurfaceDisabled ||
                              theme.colors.outline,
                        },
                      ]}
                    >
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Divider */}
            <View
              style={[
                styles.divider,
                { backgroundColor: theme.colors.outlineVariant },
              ]}
            />

            {/* Info rows */}
            {place.address ? (
              <TouchableOpacity style={styles.row} onPress={openMaps}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={22}
                  color={theme.colors.primary}
                />
                <Text
                  style={[styles.rowText, { color: theme.colors.onSurface }]}
                >
                  {place.address.replace(/\n/g, ", ")}
                </Text>
              </TouchableOpacity>
            ) : null}

            {place.phone ? (
              <TouchableOpacity style={styles.row} onPress={callPhone}>
                <MaterialCommunityIcons
                  name="phone-outline"
                  size={22}
                  color={theme.colors.primary}
                />
                <Text
                  style={[styles.rowText, { color: theme.colors.onSurface }]}
                >
                  {place.phone}
                </Text>
              </TouchableOpacity>
            ) : null}

            {place.price_range ? (
              <View style={styles.row}>
                <MaterialCommunityIcons
                  name="currency-usd"
                  size={22}
                  color={theme.colors.primary}
                />
                <Text
                  style={[styles.rowText, { color: theme.colors.onSurface }]}
                >
                  {place.price_range}
                </Text>
              </View>
            ) : null}

            {place.website ? (
              <TouchableOpacity style={styles.row} onPress={openWebsite}>
                <MaterialCommunityIcons
                  name="web"
                  size={22}
                  color={theme.colors.primary}
                />
                <Text
                  style={[styles.rowText, { color: theme.colors.primary }]}
                  numberOfLines={1}
                >
                  {place.website}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageWrapper: {
    position: "relative",
  },
  heroImage: {
    width: "100%",
    aspectRatio: 4 / 3,
  },
  backBtn: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  category: {
    fontSize: 15,
    marginBottom: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  eventForm: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 14,
  },
  formCalendar: {
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  changeDateLink: {
    fontSize: 13,
    fontWeight: "600",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
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
  formActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  formBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  formBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  rowText: {
    fontSize: 15,
    flex: 1,
  },
});
