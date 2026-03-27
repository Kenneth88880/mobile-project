// components/PhotoPicker.js
import React, { useState } from "react";
import {
  View,
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
import IntroPhotoCropModal from "./IntroPhotoCropModal";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PHOTO_MARGIN = 4;
const PHOTO_WIDTH = (SCREEN_WIDTH - 48) / 3 - PHOTO_MARGIN * 4;
const PHOTO_HEIGHT = PHOTO_WIDTH * 1.33;

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;

const ALLOWED_FORMATS = ["jpeg", "jpg", "png", "webp"];

export default function PhotoPicker({
  photos = [],
  onPhotosChange,
  maxPhotos = 6,
  photoCropY = 0,
  onPhotoCropYChange,
}) {
  const theme = useTheme();
  const [uploading, setUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [showCropPositionModal, setShowCropPositionModal] = useState(false);

  const validateImageFormat = (uri) => {
    const extension = uri.split(".").pop().toLowerCase();
    return ALLOWED_FORMATS.includes(extension);
  };

  const processImage = async (imageUri) => {
    try {
      const dimensions = await new Promise((resolve, reject) => {
        Image.getSize(
          imageUri,
          (width, height) => resolve({ width, height }),
          (error) => reject(error),
        );
      });

      let width = dimensions.width;
      let height = dimensions.height;

      console.log(`Original dimensions: ${width}x${height}`);

      const aspectRatio = width / height;
      const MIN_ASPECT = 0.75;
      const MAX_ASPECT = 1.33;

      let cropActions = [];

      if (aspectRatio < MIN_ASPECT) {
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
      } else if (aspectRatio > MAX_ASPECT) {
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
      }

      let resizeWidth = width;
      let resizeHeight = height;

      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const widthRatio = MAX_WIDTH / width;
        const heightRatio = MAX_HEIGHT / height;
        const ratio = Math.min(widthRatio, heightRatio);

        resizeWidth = Math.round(width * ratio);
        resizeHeight = Math.round(height * ratio);
      }

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
        compress: 0.8,
        format: SaveFormat.JPEG,
      });

      return manipulatedImage.uri;
    } catch (error) {
      console.error("Error processing image:", error);
      throw error;
    }
  };

  const pickImage = async () => {
    try {
      if (photos.length >= maxPhotos) {
        Alert.alert(
          "Maximum Photos Reached",
          `You can only upload up to ${maxPhotos} photos.`,
          [{ text: "OK" }],
        );
        return;
      }

      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to upload photos.",
          [{ text: "OK" }],
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 1,
      });

      if (result.canceled) {
        return;
      }

      const imageUri = result.assets[0].uri;

      if (!validateImageFormat(imageUri)) {
        Alert.alert(
          "Invalid Format",
          `Please select a valid image format (${ALLOWED_FORMATS.join(
            ", ",
          ).toUpperCase()}).`,
          [{ text: "OK" }],
        );
        return;
      }

      setUploading(true);
      setUploadingIndex(photos.length);

      const processedUri = await processImage(imageUri);
      const downloadUrl = await uploadProfilePhoto(processedUri);

      const updatedPhotos = [...photos, downloadUrl];
      onPhotosChange(updatedPhotos);

      // If this is the first photo, prompt crop position
      if (photos.length === 0 && onPhotoCropYChange) {
        // Small delay so state updates before modal opens
        setTimeout(() => setShowCropPositionModal(true), 500);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(
        "Upload Failed",
        "There was an error uploading your photo. Please try again.",
        [{ text: "OK" }],
      );
    } finally {
      setUploading(false);
      setUploadingIndex(null);
    }
  };

  const replacePhoto = async (index) => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to upload photos.",
          [{ text: "OK" }],
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 1,
      });

      if (result.canceled) {
        return;
      }

      const imageUri = result.assets[0].uri;

      if (!validateImageFormat(imageUri)) {
        Alert.alert(
          "Invalid Format",
          `Please select a valid image format (${ALLOWED_FORMATS.join(
            ", ",
          ).toUpperCase()}).`,
          [{ text: "OK" }],
        );
        return;
      }

      setUploading(true);
      setUploadingIndex(index);

      const processedUri = await processImage(imageUri);
      const downloadUrl = await uploadProfilePhoto(processedUri);

      const oldPhotoUrl = photos[index];
      await deleteProfilePhoto(oldPhotoUrl);

      const updatedPhotos = [...photos];
      updatedPhotos[index] = downloadUrl;
      onPhotosChange(updatedPhotos);

      // If replacing the first photo, prompt to re-adjust crop position
      if (index === 0 && onPhotoCropYChange) {
        setTimeout(() => setShowCropPositionModal(true), 500);
      }
    } catch (error) {
      console.error("Error replacing photo:", error);
      Alert.alert(
        "Upload Failed",
        "There was an error replacing your photo. Please try again.",
        [{ text: "OK" }],
      );
    } finally {
      setUploading(false);
      setUploadingIndex(null);
    }
  };

  const removePhoto = async (index) => {
    if (index === 0) {
      Alert.alert(
        "Cannot Remove",
        "You must have at least one photo. Use the replace button to change your main photo.",
        [{ text: "OK" }],
      );
      return;
    }

    Alert.alert("Remove Photo", "Are you sure you want to remove this photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const photoUrl = photos[index];
            await deleteProfilePhoto(photoUrl);

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
                <View style={styles.photoContainer}>
                  <Image
                    source={{ uri: photos[index] }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                  {index === 0 ? (
                    // First photo: replace button (top-right) + adjust button (bottom-right)
                    <>
                      <IconButton
                        icon="camera-retake"
                        size={24}
                        iconColor="#fff"
                        style={styles.replaceButton}
                        onPress={() => replacePhoto(index)}
                      />
                      {onPhotoCropYChange && (
                        <IconButton
                          icon="crop"
                          size={20}
                          iconColor="#fff"
                          style={styles.adjustButton}
                          onPress={() => setShowCropPositionModal(true)}
                        />
                      )}
                    </>
                  ) : (
                    <IconButton
                      icon="close-circle"
                      size={24}
                      iconColor="#fff"
                      style={styles.removeButton}
                      onPress={() => removePhoto(index)}
                    />
                  )}
                </View>
              ) : isUploading ? (
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
        ratios will be cropped{"\n"}• First photo can be replaced but not
        removed{"\n"}• Tap the crop icon on your first photo to adjust its
        position on the dating card
      </Text>

      {/* Intro Photo Crop Position Modal */}
      <IntroPhotoCropModal
        visible={showCropPositionModal}
        photoUri={photos.length > 0 ? photos[0] : null}
        initialCropY={photoCropY}
        onConfirm={(cropY) => {
          setShowCropPositionModal(false);
          if (onPhotoCropYChange) {
            onPhotoCropYChange(cropY);
          }
        }}
        onCancel={() => setShowCropPositionModal(false)}
      />
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
    marginHorizontal: -PHOTO_MARGIN,
  },
  photoSlot: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    margin: PHOTO_MARGIN,
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
  replaceButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "rgba(139, 74, 97, 0.9)",
    margin: 0,
  },
  adjustButton: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "rgba(139, 74, 97, 0.9)",
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
