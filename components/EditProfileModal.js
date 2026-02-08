import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Modal,
  Text,
  TextInput,
  Button,
  useTheme,
  IconButton,
  Chip,
  SegmentedButtons,
  ActivityIndicator,
} from "react-native-paper";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import PhotoPicker from "../components/PhotoPicker";

const PREDEFINED_TAGS = [
  "Gaming",
  "Music",
  "Foodie",
  "Travel",
  "Sports",
  "Reading",
  "Movies",
  "Fitness",
  "Art",
  "Photography",
  "Cooking",
  "Dancing",
  "Hiking",
  "Yoga",
  "Coffee",
  "Wine",
  "Tech",
  "Fashion",
  "Pets",
  "Nature",
];

export default function EditProfileModal({ visible, onClose }) {
  const theme = useTheme();
  const currentUser = auth().currentUser;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Profile fields
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [photos, setPhotos] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [gender, setGender] = useState("male");

  useEffect(() => {
    if (visible && currentUser) {
      console.log("EditProfileModal opened, loading profile...");
      loadUserProfile();
    }
  }, [visible]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Loading profile for user:", currentUser.uid);

      const profileDoc = await firestore()
        .collection("profiles")
        .doc(currentUser.uid)
        .get();

      if (profileDoc.exists) {
        const profileData = profileDoc.data();
        console.log("Profile loaded successfully");
        setName(profileData.name || "");
        setAge(profileData.age?.toString() || "");
        setBio(profileData.bio || profileData.description || "");
        setPhotos(profileData.photos || []);
        setSelectedTags(profileData.tags || []);
        setGender(profileData.gender || "male");
      } else {
        console.log("Profile document doesn't exist");
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      setError("Failed to load profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      if (selectedTags.length >= 10) {
        Alert.alert("Maximum Tags", "You can select up to 10 tags.", [
          { text: "OK" },
        ]);
        return;
      }
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const validateProfile = () => {
    if (!name.trim()) {
      Alert.alert("Missing Information", "Please enter your name.");
      return false;
    }

    if (photos.length === 0) {
      Alert.alert("Missing Photos", "Please upload at least one photo.");
      return false;
    }

    if (selectedTags.length < 3) {
      Alert.alert(
        "Missing Tags",
        "Please select at least 3 tags that describe you.",
      );
      return false;
    }

    if (!gender) {
      Alert.alert("Missing Information", "Please select your gender.");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateProfile()) {
      return;
    }

    try {
      setSaving(true);

      const profileData = {
        name: name.trim(),
        bio: bio.trim(),
        description: bio.trim(),
        photos: photos,
        tags: selectedTags,
        gender: gender,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      console.log("Saving profile data:", profileData);

      await firestore()
        .collection("profiles")
        .doc(currentUser.uid)
        .update(profileData);

      console.log("Profile saved successfully");

      Alert.alert("Success", "Your profile has been updated!", [
        {
          text: "OK",
          onPress: () => onClose(),
        },
      ]);
    } catch (err) {
      console.error("Error saving profile:", err);
      Alert.alert("Error", "Failed to save your profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Show error state
  if (error) {
    return (
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.errorContainer}>
          <IconButton
            icon="alert-circle"
            size={48}
            iconColor={theme.colors.error}
          />
          <Text variant="headlineSmall" style={styles.errorTitle}>
            Error Loading Profile
          </Text>
          <Text variant="bodyMedium" style={styles.errorMessage}>
            {error}
          </Text>
          <Button mode="contained" onPress={onClose} style={styles.errorButton}>
            Close
          </Button>
        </View>
      </Modal>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyLarge" style={styles.loadingText}>
            Loading profile...
          </Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      onDismiss={onClose}
      contentContainerStyle={[
        styles.modalContainer,
        { backgroundColor: theme.colors.surface },
      ]}
    >
      <View style={{ flex: 1 }}>
        <View
          style={[styles.header, { borderBottomColor: theme.colors.outline }]}
        >
          <Text variant="headlineSmall" style={styles.title}>
            Edit Profile
          </Text>
          <IconButton icon="close" onPress={onClose} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Photos */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Photos
            </Text>
            <PhotoPicker
              photos={photos}
              onPhotosChange={setPhotos}
              maxPhotos={6}
            />
          </View>

          {/* Name */}
          <View style={styles.section}>
            <TextInput
              label="Name"
              mode="outlined"
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              left={<TextInput.Icon icon="account" />}
              disabled
            />
            <Text
              variant="bodySmall"
              style={[
                styles.helperText,
                { color: theme.colors.onSurfaceVariant, marginTop: 4 },
              ]}
            >
              Name cannot be changed
            </Text>
          </View>

          {/* Age */}
          <View style={styles.section}>
            <TextInput
              label="Age"
              mode="outlined"
              value={age}
              placeholder="Age"
              left={<TextInput.Icon icon="cake-variant" />}
              disabled
            />
            <Text
              variant="bodySmall"
              style={[
                styles.helperText,
                { color: theme.colors.onSurfaceVariant, marginTop: 4 },
              ]}
            >
              Age cannot be changed
            </Text>
          </View>

          {/* Gender */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Gender
            </Text>
            <SegmentedButtons
              value={gender}
              onValueChange={setGender}
              buttons={[
                {
                  value: "male",
                  label: "Male",
                  icon: "gender-male",
                },
                {
                  value: "female",
                  label: "Female",
                  icon: "gender-female",
                },
                {
                  value: "non-binary",
                  label: "Non-binary",
                  icon: "gender-non-binary",
                },
              ]}
              style={styles.segmentedButtons}
            />
          </View>

          {/* Bio */}
          <View style={styles.section}>
            <TextInput
              label="Bio"
              mode="outlined"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              multiline
              numberOfLines={4}
              left={<TextInput.Icon icon="text" />}
              style={styles.bioInput}
            />
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Interests (Select at least 3)
            </Text>
            <Text
              variant="bodySmall"
              style={[
                styles.helperText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Selected: {selectedTags.length}/10
            </Text>
            <View style={styles.tagsContainer}>
              {PREDEFINED_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  mode="outlined"
                  selected={selectedTags.includes(tag)}
                  onPress={() => handleTagToggle(tag)}
                  style={styles.chip}
                  showSelectedOverlay={true}
                >
                  {tag}
                </Chip>
              ))}
            </View>
          </View>

          {/* Save Button */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              style={styles.saveButton}
              contentStyle={styles.saveButtonContent}
            >
              Save Changes
            </Button>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 12,
    height: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: "bold",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: "600",
  },
  bioInput: {
    minHeight: 100,
  },
  segmentedButtons: {
    marginTop: 8,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  chip: {
    margin: 4,
  },
  helperText: {
    fontSize: 12,
    marginBottom: 4,
  },
  buttonContainer: {
    paddingVertical: 24,
  },
  saveButton: {
    borderRadius: 8,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 16,
  },
  errorContainer: {
    padding: 24,
    alignItems: "center",
  },
  errorTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    textAlign: "center",
    marginBottom: 24,
  },
  errorButton: {
    minWidth: 120,
  },
});
