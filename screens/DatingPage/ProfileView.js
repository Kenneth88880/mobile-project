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
  Modal,
  PanResponder,
  Animated,
  SafeAreaView,
} from "react-native";
import { IconButton, Text, useTheme, Button } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import {
  uploadProfilePhoto,
  deleteProfilePhoto,
} from "../../services/photoService";
import { invalidateProfileCache } from "../../services/profileService";
import auth from "@react-native-firebase/auth";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const PHOTO_MARGIN = 4;
const PHOTO_WIDTH = (SCREEN_WIDTH - 48) / 3 - PHOTO_MARGIN * 4;
const PHOTO_HEIGHT = PHOTO_WIDTH * 1.33;

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;

// ProfileHalfCard dimensions from DatingScreen
// Each card: marginVertical: 8, height: 250
// The card width is full screen minus container padding (padding: 8 in cardsContainer)
const CONTAINER_PADDING = 8;
const CARD_HEIGHT = 250; // From ProfileHalfCard styles
const DATING_CARD_WIDTH = SCREEN_WIDTH - CONTAINER_PADDING * 2;
const DATING_CARD_HEIGHT = CARD_HEIGHT;

const ALLOWED_FORMATS = ["jpeg", "jpg", "png", "webp"];

export default function PhotoPicker({
  photos = [],
  onPhotosChange,
  maxPhotos = 6,
}) {
  const theme = useTheme();
  const currentUser = auth().currentUser;

  const [uploading, setUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [replacingPhotoIndex, setReplacingPhotoIndex] = useState(null);

  // Pan state for dragging rectangle
  const [pan] = useState(new Animated.ValueXY());
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    }),
  ).current;

  const validateImageFormat = (uri) => {
    const extension = uri.split(".").pop().toLowerCase();
    return ALLOWED_FORMATS.includes(extension);
  };

  const processImage = async (imageUri, panX = 0, panY = 0) => {
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

  const handleConfirmCrop = async () => {
    try {
      console.log("User confirmed crop");
      setShowCropModal(false);
      setUploading(true);
      setUploadingIndex(
        replacingPhotoIndex !== null ? replacingPhotoIndex : photos.length,
      );

      const processedUri = await processImage(cropImage);
      const downloadUrl = await uploadProfilePhoto(processedUri);

      // Invalidate cache so DatingScreen/ChatScreen see updated photos
      if (currentUser) {
        invalidateProfileCache(currentUser.uid);
        console.log("Invalidated profile cache");
      }

      // If replacing, delete old photo and update at same index
      if (replacingPhotoIndex !== null) {
        const oldPhotoUrl = photos[replacingPhotoIndex];
        await deleteProfilePhoto(oldPhotoUrl);

        const updatedPhotos = [...photos];
        updatedPhotos[replacingPhotoIndex] = downloadUrl;
        onPhotosChange(updatedPhotos);
        setReplacingPhotoIndex(null);
      } else {
        // Otherwise add new photo
        const updatedPhotos = [...photos, downloadUrl];
        onPhotosChange(updatedPhotos);
      }

      setCropImage(null);
      pan.setValue({ x: 0, y: 0 });
      console.log("Photo added successfully");
    } catch (error) {
      console.error("Error processing and uploading:", error);
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

      // For new photos, upload directly without preview
      setUploading(true);
      setUploadingIndex(photos.length);

      const processedUri = await processImage(imageUri);
      const downloadUrl = await uploadProfilePhoto(processedUri);

      if (currentUser) {
        invalidateProfileCache(currentUser.uid);
      }

      const updatedPhotos = [...photos, downloadUrl];
      onPhotosChange(updatedPhotos);
      setUploading(false);
      setUploadingIndex(null);
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(
        "Upload Failed",
        "There was an error uploading your photo. Please try again.",
        [{ text: "OK" }],
      );
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

      // Show preview ONLY for first photo replacement
      if (index === 0) {
        console.log("Replacing first photo - showing preview modal");
        setCropImage(imageUri);
        setReplacingPhotoIndex(0);
        setShowCropModal(true);
        pan.setValue({ x: 0, y: 0 });
      } else {
        // For other photos, process and upload directly
        setUploading(true);
        setUploadingIndex(index);

        const processedUri = await processImage(imageUri);
        const downloadUrl = await uploadProfilePhoto(processedUri);

        const oldPhotoUrl = photos[index];
        await deleteProfilePhoto(oldPhotoUrl);

        if (currentUser) {
          invalidateProfileCache(currentUser.uid);
        }

        const updatedPhotos = [...photos];
        updatedPhotos[index] = downloadUrl;
        onPhotosChange(updatedPhotos);
        setUploading(false);
        setUploadingIndex(null);
      }
    } catch (error) {
      console.error("Error replacing photo:", error);
      Alert.alert(
        "Upload Failed",
        "There was an error replacing your photo. Please try again.",
        [{ text: "OK" }],
      );
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

            if (currentUser) {
              invalidateProfileCache(currentUser.uid);
            }

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
                    <IconButton
                      icon="camera-retake"
                      size={24}
                      iconColor="#fff"
                      style={styles.replaceButton}
                      onPress={() => replacePhoto(index)}
                    />
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
    <>
      <View style={styles.container}>
        {renderPhotoGrid()}
        <Text
          variant="bodySmall"
          style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}
        >
          • Upload up to {maxPhotos} photos{"\n"}• Supported formats: JPG, PNG,
          WebP{"\n"}• Images will be resized to max 1080p{"\n"}• Extreme aspect
          ratios will be cropped{"\n"}• First photo can be replaced but not
          removed
        </Text>
      </View>

      <Modal
        visible={showCropModal && replacingPhotoIndex === 0}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowCropModal(false);
          setCropImage(null);
          setReplacingPhotoIndex(null);
        }}
      >
        <SafeAreaView
          style={[
            styles.cropModalContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.cropHeader,
              { borderBottomColor: theme.colors.outline },
            ]}
          >
            <View style={styles.headerTop}>
              <Text
                variant="headlineSmall"
                style={{
                  color: theme.colors.onBackground,
                  fontWeight: "600",
                  flex: 1,
                }}
                numberOfLines={1}
              >
                Preview Main Photo
              </Text>
              <IconButton
                icon="close"
                onPress={() => {
                  setShowCropModal(false);
                  setCropImage(null);
                  setReplacingPhotoIndex(null);
                }}
              />
            </View>
          </View>

          {/* Preview Container - draggable rectangle */}
          <View
            style={[
              styles.cropPreviewContainer,
              { backgroundColor: theme.colors.scrim },
            ]}
            {...panResponder.panHandlers}
          >
            {cropImage && (
              <>
                <Image
                  source={{ uri: cropImage }}
                  style={styles.cropPreviewImage}
                  resizeMode="cover"
                />
                {/* Red Rectangle - Matches ProfileHalfCard exactly (250px height) */}
                <Animated.View
                  style={[
                    {
                      position: "absolute",
                      width: DATING_CARD_WIDTH,
                      height: DATING_CARD_HEIGHT,
                      borderWidth: 2,
                      borderColor: "#FF6B6B",
                      backgroundColor: "transparent",
                    },
                    {
                      transform: [{ translateX: pan.x }, { translateY: pan.y }],
                    },
                  ]}
                />
              </>
            )}
          </View>

          {/* Controls */}
          <View
            style={[
              styles.cropControlsContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              Drag the rectangle to match your dating card, then confirm
            </Text>
            <View style={styles.cropButtonRow}>
              <Button
                mode="outlined"
                textColor={theme.colors.onSurface}
                onPress={() => {
                  setShowCropModal(false);
                  setCropImage(null);
                  setReplacingPhotoIndex(null);
                }}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>

              <View style={{ width: 12 }} />

              <Button
                mode="contained"
                onPress={handleConfirmCrop}
                loading={uploading}
                disabled={uploading}
                style={{ flex: 1 }}
              >
                Use This Photo
              </Button>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
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
  cropModalContainer: {
    flex: 1,
  },
  cropHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cropPreviewContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  cropPreviewImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.5,
  },
  cropControlsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  cropButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
});
