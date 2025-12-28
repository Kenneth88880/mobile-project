// components/PhotoPicker.js
import React, { useState } from "react";
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import {
  uploadProfilePhoto,
  deleteProfilePhoto,
} from "../services/photoService";

const SCREEN_WIDTH = Dimensions.get("window").width;
// 3 columns × 2 rows layout (like Instagram)
const PHOTO_MARGIN = 4; // Smaller margin for 3-column layout
const PHOTO_WIDTH = (SCREEN_WIDTH - 48) / 3 - PHOTO_MARGIN * 4; // 3 photos per row
const PHOTO_HEIGHT = PHOTO_WIDTH * 1.33; // 4:3 aspect ratio

// Maximum dimensions for uploaded images
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;

// Allowed image formats
const ALLOWED_FORMATS = ["jpeg", "jpg", "png", "webp"];

export default function PhotoPicker({
  photos = [],
  onPhotosChange,
  maxPhotos = 6,
}) {
  const theme = useTheme();
  const [uploading, setUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);

  /**
   * Validate image format
   */
  const validateImageFormat = (uri) => {
    const extension = uri.split(".").pop().toLowerCase();
    return ALLOWED_FORMATS.includes(extension);
  };

  /**
   * Compress and resize image to max 1080p
   * Also ensures proper aspect ratio (minimum 3:4, maximum 4:3)
   */
  const processImage = async (imageUri) => {
    try {
      // Get image dimensions using React Native Image API
      const { width, height } = await new Promise((resolve, reject) => {
        Image.getSize(
          imageUri,
          (width, height) => resolve({ width, height }),
          (error) => reject(error)
        );
      });

      console.log(`Original dimensions: ${width}x${height}`);

      // Calculate aspect ratio
      const aspectRatio = width / height;

      // Enforce aspect ratio limits (3:4 to 4:3)
      // This prevents extremely wide or tall images
      const MIN_ASPECT = 0.75; // 3:4 portrait
      const MAX_ASPECT = 1.33; // 4:3 landscape

      let cropActions = [];

      if (aspectRatio < MIN_ASPECT) {
        // Too tall - crop height
        const newHeight = width / MIN_ASPECT;
        const cropY = (height - newHeight) / 2;
        cropActions.push({
          crop: {
            originX: 0,
            originY: cropY,
            width: width,
            height: newHeight,
          },
        });
        height = newHeight;
        console.log(`Image too tall, cropping to ${width}x${newHeight}`);
      } else if (aspectRatio > MAX_ASPECT) {
        // Too wide - crop width
        const newWidth = height * MAX_ASPECT;
        const cropX = (width - newWidth) / 2;
        cropActions.push({
          crop: {
            originX: cropX,
            originY: 0,
            width: newWidth,
            height: height,
          },
        });
        width = newWidth;
        console.log(`Image too wide, cropping to ${newWidth}x${height}`);
      }

      // Calculate resize dimensions to max 1080p
      let resizeWidth = width;
      let resizeHeight = height;

      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const widthRatio = MAX_WIDTH / width;
        const heightRatio = MAX_HEIGHT / height;
        const ratio = Math.min(widthRatio, heightRatio);

        resizeWidth = Math.round(width * ratio);
        resizeHeight = Math.round(height * ratio);

        console.log(`Resizing to ${resizeWidth}x${resizeHeight}`);
      }

      // Apply manipulations
      const actions = [
        ...cropActions,
        {
          resize: {
            width: resizeWidth,
            height: resizeHeight,
          },
        },
      ];

      const manipulatedImage = await manipulateAsync(imageUri, actions, {
        compress: 0.8, // High quality but compressed
        format: SaveFormat.JPEG, // Always convert to JPEG for consistency
      });

      // Check final size
      console.log(`Processed dimensions: ${resizeWidth}x${resizeHeight}`);

      return manipulatedImage.uri;
    } catch (error) {
      console.error("Error processing image:", error);
      throw error;
    }
  };

  /**
   * Handle picking an image from gallery
   */
  const pickImage = async () => {
    try {
      // Check if we've reached max photos
      if (photos.length >= maxPhotos) {
        Alert.alert(
          "Maximum Photos Reached",
          `You can only upload up to ${maxPhotos} photos.`,
          [{ text: "OK" }]
        );
        return;
      }

      // Request permission
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to upload photos.",
          [{ text: "OK" }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4], // Suggest 3:4 aspect ratio
        quality: 1,
      });

      if (result.canceled) {
        return;
      }

      const imageUri = result.assets[0].uri;

      // Validate format
      if (!validateImageFormat(imageUri)) {
        Alert.alert(
          "Invalid Format",
          `Please select a valid image format (${ALLOWED_FORMATS.join(
            ", "
          ).toUpperCase()}).`,
          [{ text: "OK" }]
        );
        return;
      }

      setUploading(true);
      setUploadingIndex(photos.length);

      // Process image (resize, compress, enforce aspect ratio)
      const processedUri = await processImage(imageUri);

      // Upload to Firebase Storage
      const downloadUrl = await uploadProfilePhoto(processedUri);

      // Add to photos array
      const updatedPhotos = [...photos, downloadUrl];
      onPhotosChange(updatedPhotos);

      Alert.alert("Success", "Photo uploaded successfully!", [{ text: "OK" }]);
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(
        "Upload Failed",
        "There was an error uploading your photo. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setUploading(false);
      setUploadingIndex(null);
    }
  };

  /**
   * Handle removing a photo
   */
  const removePhoto = async (index) => {
    Alert.alert("Remove Photo", "Are you sure you want to remove this photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const photoUrl = photos[index];

            // Delete from Firebase Storage
            await deleteProfilePhoto(photoUrl);

            // Remove from array
            const updatedPhotos = photos.filter((_, i) => i !== index);
            onPhotosChange(updatedPhotos);
          } catch (error) {
            console.error("Error removing photo:", error);
            Alert.alert("Error", "Failed to remove photo. Please try again.");
          }
        },
      },
    ]);
  };

  /**
   * Render photo grid
   */
  const renderPhotoGrid = () => {
    const photoSlots = Array(maxPhotos).fill(null);

    return (
      <View style={styles.photoGrid}>
        {photoSlots.map((_, index) => {
          const hasPhoto = index < photos.length;
          const isUploading = uploading && uploadingIndex === index;
          const isNextSlot = index === photos.length;

          return (
            <View key={index} style={styles.photoSlot}>
              {hasPhoto ? (
                // Show uploaded photo with remove button
                <View style={styles.photoContainer}>
                  <Image
                    source={{ uri: photos[index] }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                  <IconButton
                    icon="close-circle"
                    size={24}
                    iconColor="#fff"
                    style={styles.removeButton}
                    onPress={() => removePhoto(index)}
                  />
                </View>
              ) : isUploading ? (
                // Show uploading indicator
                <View
                  style={[
                    styles.emptySlot,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                  />
                  <Text variant="bodySmall" style={{ marginTop: 8 }}>
                    Uploading...
                  </Text>
                </View>
              ) : isNextSlot ? (
                // Show "Add Photo" button for next available slot
                <TouchableOpacity
                  style={[
                    styles.emptySlot,
                    { borderColor: theme.colors.outline },
                  ]}
                  onPress={pickImage}
                  disabled={uploading}
                >
                  <IconButton
                    icon="camera-plus"
                    size={32}
                    iconColor={theme.colors.primary}
                  />
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Add Photo
                  </Text>
                </TouchableOpacity>
              ) : (
                // Show empty slot (no icon, just border)
                <View
                  style={[
                    styles.emptySlot,
                    {
                      borderColor: theme.colors.surfaceVariant,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderPhotoGrid()}
      <Text
        variant="bodySmall"
        style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}
      >
        • Upload up to {maxPhotos} photos{"\n"}• Supported formats: JPG, PNG,
        WebP{"\n"}• Images will be resized to max 1080p{"\n"}• Extreme aspect
        ratios will be cropped
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginHorizontal: -PHOTO_MARGIN, // Negative margin to offset photoSlot margins
  },
  photoSlot: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    margin: PHOTO_MARGIN, // Margin around each photo slot
  },
  photoContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  photo: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    margin: 0,
  },
  emptySlot: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: {
    marginTop: 16,
    fontSize: 12,
    lineHeight: 18,
    fontStyle: "italic",
  },
});
