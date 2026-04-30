// components/ImageCarousel.js
import React from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from "react-native";
import { Card, IconButton, useTheme } from "react-native-paper";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_HEIGHT = 500; // Fixed height for consistency

/**
 * ImageCarousel component with improved tap zones for navigation
 * Handles extreme aspect ratios by using cover resizeMode and fixed height
 */
export default function ImageCarousel({
  photos = [],
  currentIndex = 0,
  onPrevious,
  onNext,
  style,
}) {
  const theme = useTheme();

  if (!photos || photos.length === 0) {
    return (
      <Card style={[styles.container, style]}>
        <Image
          source={{
            uri: "https://via.placeholder.com/400x500?text=No+Photo",
          }}
          style={styles.image}
          resizeMode="cover"
        />
      </Card>
    );
  }

  const hasMultiplePhotos = photos.length > 1;

  return (
    <Card style={[styles.container, style]}>
      {/* Main Image */}
      <Image
        source={{ uri: photos[currentIndex] }}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Navigation Tap Zones - Only show if multiple photos */}
      {hasMultiplePhotos && (
        <View style={StyleSheet.absoluteFill}>
          {/* Left Tap Zone - Previous Photo */}
          <TouchableOpacity
            style={styles.leftTapZone}
            onPress={onPrevious}
            activeOpacity={0.3}
          >
            <View style={styles.leftIconContainer}>
              <IconButton
                icon="chevron-left"
                size={32}
                iconColor="#fff"
                style={styles.navIcon}
              />
            </View>
          </TouchableOpacity>

          {/* Right Tap Zone - Next Photo */}
          <TouchableOpacity
            style={styles.rightTapZone}
            onPress={onNext}
            activeOpacity={0.3}
          >
            <View style={styles.rightIconContainer}>
              <IconButton
                icon="chevron-right"
                size={32}
                iconColor="#fff"
                style={styles.navIcon}
              />
            </View>
          </TouchableOpacity>

          {/* Photo Indicators (Dots) */}
          <View style={styles.dotsContainer}>
            {photos.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === currentIndex && styles.activeDot]}
              />
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: CARD_HEIGHT,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  leftTapZone: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 60, // Leave space for dots
    width: "40%",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  rightTapZone: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 60, // Leave space for dots
    width: "40%",
    justifyContent: "center",
    alignItems: "flex-end",
  },
  leftIconContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  rightIconContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  navIcon: {
    margin: 0,
  },
  dotsContainer: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    pointerEvents: "none", // Allow taps to pass through
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  activeDot: {
    backgroundColor: "white",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
