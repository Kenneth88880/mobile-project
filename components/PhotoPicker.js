import React, { useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Text, IconButton, Surface, useTheme } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { CURRENT_USER_ID } from "../services/UserConfig";

export default function PhotoPicker({ photos, onPhotosChange, maxPhotos = 6 }) {
  const theme = useTheme();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadImageToStorage = async (uri) => {
    try {
      // Validate URI
      if (!uri || uri.trim() === "") {
        throw new Error("Invalid image URI");
      }

      const filename = `${CURRENT_USER_ID}_${Date.now()}.jpg`;
      const storage = getStorage();
      const storageRef = ref(storage, `profile_photos/${filename}`);

      console.log("Uploading from:", uri);
      console.log("Uploading to:", `profile_photos/${filename}`);

      // Fetch the image as a blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload blob to Firebase Storage
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log("Upload complete! URL:", downloadURL);

      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error(error.message || "Upload failed. Please try again.");
    }
  };

  const pickImage = async () => {
    // Hide status bar before opening picker
    StatusBar.setHidden(true);

    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      StatusBar.setHidden(false);
      Alert.alert(
        "Permission Required",
        "Sorry, we need camera roll permissions to upload photos!"
      );
      return;
    }

    // Check if already at max photos
    if (photos.length >= maxPhotos) {
      StatusBar.setHidden(false);
      Alert.alert(
        "Max Photos Reached",
        `You can only upload up to ${maxPhotos} photos.`
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16], // Much taller - full phone screen ratio
      quality: 0.8,
    });

    // Show status bar again
    StatusBar.setHidden(false);

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const localUri = result.assets[0].uri;

      // Show uploading state
      setUploading(true);
      setUploadProgress(0);

      try {
        // Upload to Firebase Storage
        const downloadURL = await uploadImageToStorage(localUri);

        // Add the Firebase Storage URL to photos
        const updatedPhotos = [...photos, downloadURL];
        onPhotosChange(updatedPhotos);

        Alert.alert("Success", "Photo uploaded successfully!");
      } catch (error) {
        console.error("Upload error:", error);
        Alert.alert(
          "Upload Failed",
          error.message || "Failed to upload photo. Please try again."
        );
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    }
  };

  const removePhoto = (indexToRemove) => {
    Alert.alert("Remove Photo", "Are you sure you want to remove this photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const photoToRemove = photos[indexToRemove];

          // Try to delete from Firebase Storage (only if it's a Firebase URL)
          try {
            // Check if it's a Firebase Storage URL
            if (
              photoToRemove &&
              photoToRemove.includes("firebasestorage.googleapis.com")
            ) {
              const storage = getStorage();
              // Extract the path from the URL
              const urlParts = photoToRemove.split("/o/")[1];
              if (urlParts) {
                const pathPart = urlParts.split("?")[0];
                const filePath = decodeURIComponent(pathPart);
                const fileRef = ref(storage, filePath);
                await deleteObject(fileRef);
                console.log("Deleted from Firebase Storage:", photoToRemove);
              }
            } else {
              console.log(
                "Skipping Firebase delete - not a Firebase URL:",
                photoToRemove
              );
            }
          } catch (error) {
            console.log(
              "Could not delete from storage (this is OK for local files):",
              error.message
            );
            // Continue anyway - remove from array even if Firebase delete fails
          }

          // Remove from photos array
          const updatedPhotos = photos.filter(
            (_, index) => index !== indexToRemove
          );
          onPhotosChange(updatedPhotos);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
      >
        {photos.map((uri, index) => (
          <Surface key={index} style={styles.photoContainer} elevation={2}>
            <Image source={{ uri }} style={styles.image} />
            <IconButton
              icon="close-circle"
              size={24}
              iconColor="white"
              style={styles.removeButton}
              onPress={() => removePhoto(index)}
            />
          </Surface>
        ))}

        {photos.length < maxPhotos && (
          <Surface
            style={[
              styles.addPhotoButton,
              { borderColor: theme.colors.primary },
            ]}
            elevation={1}
          >
            {uploading ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text
                  variant="bodySmall"
                  style={{ marginTop: 8, color: theme.colors.primary }}
                >
                  Uploading...
                </Text>
              </View>
            ) : (
              <>
                <IconButton
                  icon="plus"
                  size={40}
                  iconColor={theme.colors.primary}
                  onPress={pickImage}
                />
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.primary }}
                >
                  Add Photo
                </Text>
              </>
            )}
          </Surface>
        )}
      </ScrollView>

      <Text variant="bodySmall" style={styles.photoCount}>
        {photos.length} / {maxPhotos} photos
        {uploading && " (Uploading...)"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  scroll: {
    marginBottom: 10,
  },
  scrollContent: {
    paddingRight: 10,
  },
  photoContainer: {
    position: "relative",
    marginRight: 10,
    borderRadius: 10,
    overflow: "hidden",
  },
  image: {
    width: 120,
    height: 160,
    borderRadius: 10,
  },
  removeButton: {
    position: "absolute",
    top: 0,
    right: 0,
    margin: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  addPhotoButton: {
    width: 120,
    height: 160,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  uploadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  photoCount: {
    textAlign: "center",
    opacity: 0.7,
  },
});
