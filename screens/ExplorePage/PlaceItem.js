import React from "react";
import { View, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Text, useTheme } from "react-native-paper";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80";

// Build a Google Places photo URL from a photo_reference.
// Call this when you have real Places API data.
export function getPlacesPhotoUrl(photoReference, maxWidth = 600) {
  // Replace GOOGLE_PLACES_API_KEY with your actual key or import from config
  // return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
  return null;
}

const PlaceItem = ({ place, onPress }) => {
  const theme = useTheme();

  // Resolve image source: prefer Places API photo, fall back to any provided
  // uri, then placeholder.
  const imageUri =
    (place.photo_reference && getPlacesPhotoUrl(place.photo_reference)) ||
    place.image_url ||
    PLACEHOLDER_IMAGE;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Image source={{ uri: imageUri }} style={styles.image} />
      <View style={styles.info}>
        <Text
          style={[styles.name, { color: theme.colors.onSurface }]}
          numberOfLines={1}
        >
          {place.name}
        </Text>
        <Text
          style={[styles.category, { color: theme.colors.onSurfaceVariant }]}
          numberOfLines={1}
        >
          {place.category}
        </Text>
        {place.price_range ? (
          <Text
            style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={1}
          >
            {place.price_range}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export default PlaceItem;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  info: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  category: {
    fontSize: 13,
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
});
