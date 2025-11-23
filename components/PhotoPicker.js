import React from "react";
import {
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  StatusBar,
} from "react-native";
import { Text, IconButton, Surface, useTheme } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";

export default function PhotoPicker({ photos, onPhotosChange, maxPhotos = 6 }) {
  const theme = useTheme(); // ✅ FIXED: Added this line
  
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
      const newImageUri = result.assets[0].uri;
      const updatedPhotos = [...photos, newImageUri];
      onPhotosChange(updatedPhotos);
    }
  };

  const removePhoto = (indexToRemove) => {
    Alert.alert("Remove Photo", "Are you sure you want to remove this photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
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
            <IconButton
              icon="plus"
              size={40}
              iconColor={theme.colors.primary}
              onPress={pickImage}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
              Add Photo
            </Text>
          </Surface>
        )}
      </ScrollView>

      <Text variant="bodySmall" style={styles.photoCount}>
        {photos.length} / {maxPhotos} photos
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
  photoCount: {
    textAlign: "center",
    opacity: 0.7,
  },
});