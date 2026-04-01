import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { Image } from "expo-image";

// expo-image handles lazy loading and aggressive memory+disk caching.
// Images are cached to disk permanently so a user who saw a restaurant
// yesterday won't trigger a new photo request today.
const PLACEHOLDER_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

const PlaceItem = ({ place, onPress }) => {
  const theme = useTheme();

  // Use image_url directly — it's pre-built at 800px in normalisePlaceResult
  // so it matches the detail screen URL and React Native's cache serves
  // PlaceInfo's hero image for free after the list card loads it.
  const imageUri = place.image_url || null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Image
        source={imageUri ? { uri: imageUri } : null}
        style={styles.image}
        contentFit="cover"
        transition={200}
        placeholder={PLACEHOLDER_BLURHASH}
        cachePolicy="memory-disk"  // caches aggressively to disk, survives app restarts
        recyclingKey={place.id}    // tells expo-image to reuse this slot when list scrolls
      />
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
        {place.rating != null ? (
          <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>
            ★ {place.rating}
            {place.user_ratings_total ? ` (${place.user_ratings_total})` : ""}
            {place.price_range ? `  ·  ${place.price_range}` : ""}
          </Text>
        ) : null}
        {!place.rating && place.price_range ? (
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