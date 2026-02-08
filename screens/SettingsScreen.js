import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  SafeAreaView,
  PanResponder,
} from "react-native";
import {
  Text,
  Card,
  Switch,
  List,
  Divider,
  Surface,
  useTheme,
  IconButton,
  Button,
} from "react-native-paper";
import auth from "@react-native-firebase/auth";
import { CURRENT_USER_ID } from "../services/UserConfig";
import {
  getUserProfile,
  updateMaxDistance,
  saveUserProfile,
} from "../services/profileService";

export default function SettingsScreen({
  isDarkMode,
  toggleTheme,
  visible = true,
  onClose = null,
}) {
  const theme = useTheme();
  const [maxDistance, setMaxDistance] = useState(50);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [genderPreference, setGenderPreference] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const sliderRef = useRef(null);
  const distanceRef = useRef(50);
  const minVal = 5;
  const maxVal = 200;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userProfile = await getUserProfile(CURRENT_USER_ID);
      if (userProfile) {
        setProfile(userProfile);
        const distance = userProfile.maxDistance || 50;
        setMaxDistance(distance);
        distanceRef.current = distance;
        setShowOnlineStatus(userProfile.showOnlineStatus !== false);
        setGenderPreference(
          Array.isArray(userProfile.genderPreference)
            ? userProfile.genderPreference
            : [],
        );
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDistanceSave = async () => {
    const value = distanceRef.current;
    console.log("Saving distance:", value);
    setMaxDistance(value);
    try {
      await updateMaxDistance(CURRENT_USER_ID, value);
    } catch (error) {
      console.error("Error updating max distance:", error);
      Alert.alert("Error", "Failed to update distance preference");
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        if (sliderRef.current) {
          sliderRef.current.measure((fx, fy, width, height) => {
            const relativeX = gestureState.moveX - fx;
            const percentage = Math.max(0, Math.min(1, relativeX / width));
            const newDistance = Math.round(
              percentage * (maxVal - minVal) + minVal,
            );
            distanceRef.current = newDistance;
            setMaxDistance(newDistance);
            console.log("Dragging to:", newDistance);
          });
        }
      },
      onPanResponderRelease: () => {
        handleDistanceSave();
      },
    }),
  ).current;

  const handleOnlineStatusChange = async (value) => {
    try {
      if (!profile) return;

      const updatedProfile = {
        ...profile,
        showOnlineStatus: value,
      };
      await saveUserProfile(CURRENT_USER_ID, updatedProfile);
      setProfile(updatedProfile);
      setShowOnlineStatus(value);
    } catch (error) {
      console.error("Error updating online status:", error);
      Alert.alert("Error", "Failed to update online status");
    }
  };

  const toggleGenderPreference = async (gender) => {
    try {
      if (!profile) return;

      const currentPreferences = genderPreference || [];
      let newPreferences;

      if (currentPreferences.includes(gender)) {
        // PREVENT REMOVING THE LAST PREFERENCE
        if (currentPreferences.length === 1) {
          Alert.alert(
            "Gender Preference Required",
            "You must have at least one gender preference selected.",
          );
          return;
        }
        newPreferences = currentPreferences.filter((g) => g !== gender);
      } else {
        newPreferences = [...currentPreferences, gender];
      }

      const updatedProfile = {
        ...profile,
        genderPreference: newPreferences,
      };

      await saveUserProfile(CURRENT_USER_ID, updatedProfile);
      setProfile(updatedProfile);
      setGenderPreference(newPreferences);
    } catch (error) {
      console.error("Error updating gender preference:", error);
      Alert.alert("Error", "Failed to update gender preference");
    }
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await auth().signOut();
          } catch (error) {
            console.error("Error signing out:", error);
            Alert.alert("Error", "Failed to sign out");
          }
        },
      },
    ]);
  };

  if (loading) {
    const loadingContent = (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Text>Loading settings...</Text>
      </SafeAreaView>
    );

    return onClose ? (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        {loadingContent}
      </Modal>
    ) : (
      loadingContent
    );
  }

  const percentage = ((maxDistance - minVal) / (maxVal - minVal)) * 100;

  const settingsContent = (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Surface style={styles.header} elevation={2}>
        {onClose && (
          <IconButton
            icon="arrow-left"
            onPress={onClose}
            style={styles.backButton}
          />
        )}
      </Surface>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Distance Preferences */}
        <Card style={styles.card}>
          <Card.Title
            title="Distance Preferences"
            left={(props) => (
              <IconButton icon="map-marker-distance" {...props} />
            )}
          />
          <Card.Content>
            <View style={styles.sliderContainer}>
              <Text variant="titleMedium" style={styles.sliderTitle}>
                Maximum Distance: {maxDistance}km
              </Text>
              <Text variant="bodyMedium" style={styles.sliderDescription}>
                Show profiles within {maxDistance}km of your location
              </Text>

              {/* Slider Track */}
              <View
                style={styles.sliderWrapper}
                {...panResponder.panHandlers}
                ref={sliderRef}
              >
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${percentage}%`,
                        backgroundColor: "#8B4A61",
                      },
                    ]}
                  />
                </View>
                <View
                  style={[
                    styles.thumb,
                    {
                      left: `${percentage}%`,
                      marginLeft: -12,
                    },
                  ]}
                />
              </View>

              <View style={styles.sliderLabels}>
                <Text variant="bodySmall" style={styles.sliderLabel}>
                  {minVal}km
                </Text>
                <Text variant="bodySmall" style={styles.sliderLabel}>
                  {maxVal}km
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Gender Preferences */}
        <Card style={styles.card}>
          <Card.Title
            title="Gender Preference"
            left={(props) => (
              <IconButton icon="gender-male-female" {...props} />
            )}
          />
          <Card.Content>
            <Text variant="bodyMedium" style={styles.preferenceDescription}>
              Select which genders you're interested in matching with:
            </Text>

            <View style={styles.preferenceOptions}>
              <List.Item
                title="Male"
                right={() => (
                  <Switch
                    value={genderPreference.includes("male")}
                    onValueChange={() => toggleGenderPreference("male")}
                  />
                )}
              />
              <List.Item
                title="Female"
                right={() => (
                  <Switch
                    value={genderPreference.includes("female")}
                    onValueChange={() => toggleGenderPreference("female")}
                  />
                )}
              />
              <Divider />
              <List.Item
                title="Non-Binary"
                right={() => (
                  <Switch
                    value={genderPreference.includes("non-binary")}
                    onValueChange={() => toggleGenderPreference("non-binary")}
                  />
                )}
              />
            </View>

            {genderPreference.length === 0 && (
              <Text
                variant="bodySmall"
                style={[styles.infoText, { marginTop: 12, color: "#ff6b6b" }]}
              >
                ⚠️ Please select at least one gender preference to see matches
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Info Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="bodySmall" style={styles.infoText}>
              Distance preferences help you find matches nearby. Your location
              is updated automatically while using the app.
            </Text>
          </Card.Content>
        </Card>

        {/* Privacy Settings */}
        <Card style={styles.card}>
          <Card.Title
            title="Privacy"
            left={(props) => <IconButton icon="shield-account" {...props} />}
          />
          <Card.Content>
            <List.Item
              title="Show Online Status"
              description={
                showOnlineStatus
                  ? "Others can see when you're active"
                  : "Your online status is hidden"
              }
              right={() => (
                <Switch
                  value={showOnlineStatus}
                  onValueChange={handleOnlineStatusChange}
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* Appearance Settings */}
        <Card style={styles.card}>
          <Card.Title
            title="Appearance"
            left={(props) => <IconButton icon="palette" {...props} />}
          />
          <Card.Content>
            <List.Item
              title="Dark Mode"
              description={
                isDarkMode ? "Dark theme enabled" : "Light theme enabled"
              }
              right={() => (
                <Switch value={isDarkMode} onValueChange={toggleTheme} />
              )}
            />
          </Card.Content>
        </Card>

        {/* Sign Out Button */}
        <Button
          mode="outlined"
          icon="logout"
          onPress={handleLogout}
          style={styles.logoutButton}
          textColor="#ff6b6b"
        >
          Sign Out
        </Button>
      </ScrollView>
    </SafeAreaView>
  );

  return onClose ? (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {settingsContent}
    </Modal>
  ) : (
    settingsContent
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 8,
  },
  backButton: {
    marginRight: -8,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 8,
    marginHorizontal: 12,
  },
  sliderContainer: {
    paddingVertical: 8,
  },
  sliderTitle: {
    marginBottom: 4,
  },
  sliderDescription: {
    marginBottom: 16,
    color: "#666",
  },
  sliderWrapper: {
    height: 60,
    justifyContent: "center",
    marginVertical: 12,
  },
  track: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  thumb: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#8B4A61",
    top: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  sliderLabel: {
    color: "#999",
  },
  preferenceDescription: {
    marginBottom: 12,
    color: "#666",
  },
  preferenceOptions: {
    marginTop: 8,
  },
  infoText: {
    textAlign: "center",
    color: "#666",
    fontStyle: "italic",
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    borderColor: "#ff6b6b",
  },
});
