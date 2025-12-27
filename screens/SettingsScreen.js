import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  SafeAreaView,
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
} from "react-native-paper";
import Slider from "@react-native-community/slider";
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
  const [maxDistance, setMaxDistance] = useState(50); // Default 50km
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [genderPreference, setGenderPreference] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userProfile = await getUserProfile(CURRENT_USER_ID);
      if (userProfile) {
        setProfile(userProfile);
        setMaxDistance(userProfile.maxDistance || 50);
        setShowOnlineStatus(userProfile.showOnlineStatus !== false);
        setGenderPreference(
          Array.isArray(userProfile.genderPreference)
            ? userProfile.genderPreference
            : []
        );
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDistanceChange = async (value) => {
    try {
      await updateMaxDistance(CURRENT_USER_ID, value);
      setMaxDistance(value);
    } catch (error) {
      console.error("Error updating max distance:", error);
      Alert.alert("Error", "Failed to update distance preference");
    }
  };

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
        // Remove the gender
        newPreferences = currentPreferences.filter((g) => g !== gender);
      } else {
        // Add the gender
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
        <Text
          variant="headlineLarge"
          style={onClose ? styles.headerWithBack : null}
        >
          Settings
        </Text>
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

              <Slider
                style={styles.slider}
                minimumValue={5}
                maximumValue={200}
                step={5}
                value={maxDistance}
                onValueChange={setMaxDistance}
                onSlidingComplete={handleDistanceChange}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.surfaceVariant}
                thumbTintColor={theme.colors.primary}
              />

              <View style={styles.sliderLabels}>
                <Text variant="bodySmall" style={styles.sliderLabel}>
                  5km
                </Text>
                <Text variant="bodySmall" style={styles.sliderLabel}>
                  200km
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
              <Divider />
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
  headerWithBack: {
    flex: 1,
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
  slider: {
    width: "100%",
    height: 40,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -8,
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
});
