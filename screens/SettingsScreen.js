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
  Button,
} from "react-native-paper";
import Slider from "@react-native-community/slider";
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
       // console.log('soemthing' + currentPreferences);
        
      } else {
        // Add the gender
        newPreferences = [...currentPreferences, gender];
        //console.log('soemthing' + currentPreferences);
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

  // const confirmFinalDelete = async () => {
  //   Alert.alert(
  //     "Delete Account",
  //     "This will delete your chats and may affect your duo.",
  //     [
  //       {
  //         text: "Delete",
  //         style: "destructive",
  //         onPress: async () => {
  //           try {
  //             const userId = CURRENT_USER_ID;
  //             const currentUser = auth().currentUser;

  //             if (!userId || !currentUser) {
  //               Alert.alert("Error", "User not found");
  //               return;
  //             }

  //             // Delete user profile from Firestore
  //             await firestore().collection("profiles").doc(userId).delete();

  //             // Delete any duo requests involving this user
  //             const duoRequestsSnapshot = await firestore()
  //               .collection("duoRequests")
  //               .where("fromUserId", "==", userId)
  //               .get();

  //             const duoRequestsToSnapshot = await firestore()
  //               .collection("duoRequests")
  //               .where("toUserId", "==", userId)
  //               .get();

  //             // Delete all duo requests
  //             const batch = firestore().batch();
  //             duoRequestsSnapshot.forEach((doc) => {
  //               batch.delete(doc.ref);
  //             });
  //             duoRequestsToSnapshot.forEach((doc) => {
  //               batch.delete(doc.ref);
  //             });
  //             await batch.commit();

  //             // Delete Firebase auth account
  //             await currentUser.delete();

  //             console.log("Account deleted successfully");
  //             Alert.alert("Success", "Your account has been deleted");
  //           } catch (error) {
  //             console.error("Error deleting account:", error);
  //             Alert.alert(
  //               "Error",
  //               "Failed to delete account. Please try again or contact support."
  //             );
  //           }
  //         },
  //       },
  //       {
  //         text: "Cancel",
  //         style: "cancel",
  //       },
  //     ]
  //   );
  // };

  // const handleDeleteAccount = () => {
  //   Alert.alert(
  //     "Did you mean sign out?",
  //     "",
  //     [
  //       {
  //         text: "Cancel",
  //         style: "cancel",
  //       },
  //       {
  //         text: "Sign Out",
  //         onPress: () => {
  //           handleLogout();
  //         },
  //       },
  //       {
  //         text: "Delete",
  //         style: "destructive",
  //         onPress: () => {
  //           confirmFinalDelete();
  //         },
  //       },
  //     ]
  //   );
  // };

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

        {/* Delete Account */}
        {/* <Button
          mode="outlined"
          icon="delete-forever"
          onPress={handleDeleteAccount}
          style={styles.deleteButton}
          textColor="#d32f2f"
        >
          Delete Account
        </Button> */}
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
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    borderColor: "#ff6b6b",
  },
  // deleteButton: {
  //   marginHorizontal: 16,
  //   marginBottom: 24,
  //   borderColor: "#d32f2f",
  // },
});
