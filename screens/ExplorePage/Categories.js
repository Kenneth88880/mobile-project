import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const CATEGORIES = [
  { id: "restaurant", label: "Restaurants", type: "restaurant", icon: "silverware-fork-knife" },
  { id: "cafe", label: "Cafes", type: "cafe", icon: "coffee" },
  { id: "bar", label: "Bars", type: "bar", icon: "glass-cocktail" },
  { id: "park", label: "Parks", type: "park", icon: "tree" },
  { id: "movie_theater", label: "Movies", type: "movie_theater", icon: "movie-open" },
  { id: "museum", label: "Museums", type: "museum", icon: "bank" },
  { id: "bowling_alley", label: "Bowling", type: "bowling_alley", icon: "bowling" },
  { id: "spa", label: "Spa", type: "spa", icon: "spa" },
];

export { CATEGORIES };

export default function Categories({ selected, onSelect, onScrollStart, onScrollEnd }) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      onScrollBeginDrag={onScrollStart}
      onScrollEndDrag={onScrollEnd}
      onMomentumScrollEnd={onScrollEnd}
    >
      {CATEGORIES.map((cat) => {
        const isActive = selected === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            style={styles.item}
            onPress={() => onSelect(isActive ? null : cat.id)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconWrapper,
                {
                  backgroundColor: isActive
                    ? theme.colors.primaryContainer
                    : theme.colors.surfaceVariant,
                  borderColor: isActive ? theme.colors.primary : "transparent",
                },
              ]}
            >
              <MaterialCommunityIcons
                name={cat.icon}
                size={26}
                color={
                  isActive
                    ? theme.colors.onPrimaryContainer
                    : theme.colors.onSurfaceVariant
                }
              />
            </View>
            <Text
              style={[
                styles.label,
                {
                  color: isActive
                    ? theme.colors.primary
                    : theme.colors.onSurfaceVariant,
                  fontWeight: isActive ? "700" : "500",
                },
              ]}
              numberOfLines={1}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  item: {
    alignItems: "center",
    width: 72,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    textAlign: "center",
  },
});