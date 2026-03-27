import React from "react";
import { View, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { getPhotoUrl } from "../../services/placesService";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80";

const PlaceItem = ({ place, onPress }) => {
  const theme = useTheme();

  const imageUri =
    (place.photo_name && getPhotoUrl(place.photo_name)) ||
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
