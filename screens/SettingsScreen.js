import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  SafeAreaView,
  PanResponder,
  TextInput as RNTextInput,
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
import firestore from "@react-native-firebase/firestore";
import { CURRENT_USER_ID } from "../services/UserConfig";
import {
  getUserProfile,
  updateMaxDistance,
  saveUserProfile,
  invalidateProfileCache,
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

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
      invalidateProfileCache(CURRENT_USER_ID);
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== "delete") return;

    try {
      // SOFT DELETE: preserve data as evidence, just mark as deleted
      await firestore().collection("profiles").doc(CURRENT_USER_ID).update({
        deleted: true,
        deletedAt: firestore.FieldValue.serverTimestamp(),
        deletedBy: "user",
        // Keep all other data intact for evidence/moderation purposes
      });

      // Delete the Firebase Auth account so they can't log back in
      await auth().currentUser.delete();

      // Auth state change will automatically redirect to sign in screen
    } catch (error) {
      console.error("Error deleting account:", error);
      // If the user's auth token is stale, they need to re-authenticate
      if (error.code === "auth/requires-recent-login") {
        Alert.alert(
          "Re-authentication Required",
          "For security, please sign out and sign back in before deleting your account.",
        );
      } else {
        Alert.alert("Error", "Failed to delete account. Please try again.");
      }
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

        {/* Delete Account Button */}
        <Button
          mode="outlined"
          icon="account-remove"
          onPress={() => {
            setDeleteConfirmText("");
            setShowDeleteModal(true);
          }}
          style={styles.deleteButton}
          textColor="#ff4444"
        >
          Delete Account
        </Button>

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

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View
            style={[
              styles.deleteModalCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text variant="headlineSmall" style={styles.deleteModalTitle}>
              Delete Account
            </Text>
            <Text variant="bodyMedium" style={styles.deleteModalBody}>
              This action is permanent. You will not be able to log back in.
            </Text>
            <Text variant="bodyMedium" style={styles.deleteModalBody}>
              Type{" "}
              <Text style={{ fontWeight: "bold", color: "#ff4444" }}>
                delete
              </Text>{" "}
              below to confirm:
            </Text>
            <RNTextInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="Type delete here"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.deleteInput,
                {
                  borderColor: theme.colors.outline,
                  color: theme.colors.onSurface,
                },
              ]}
            />
            <View style={styles.deleteModalButtons}>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                style={styles.deleteCancelButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleDeleteAccount}
                disabled={deleteConfirmText.toLowerCase() !== "delete"}
                buttonColor="#ff4444"
                style={styles.deleteConfirmButton}
              >
                Delete
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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
  deleteButton: {
    marginHorizontal: 16,
    marginTop: 16,
    borderColor: "#ff4444",
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  deleteModalCard: {
    width: "100%",
    borderRadius: 12,
    padding: 24,
  },
  deleteModalTitle: {
    fontWeight: "bold",
    color: "#ff4444",
    marginBottom: 12,
  },
  deleteModalBody: {
    marginBottom: 12,
    lineHeight: 22,
  },
  deleteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 4,
    marginBottom: 20,
  },
  deleteModalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  deleteCancelButton: {
    flex: 1,
  },
  deleteConfirmButton: {
    flex: 1,
  },
});
