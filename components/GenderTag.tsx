import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Gender, getGenderColor, getGenderLabel } from "../types";

interface GenderTagProps {
  gender: Gender;
  size?: "small" | "medium" | "large";
}

export const GenderTag: React.FC<GenderTagProps> = ({
  gender,
  size = "medium",
}) => {
  const backgroundColor = getGenderColor(gender);
  const label = getGenderLabel(gender);

  const sizeStyles = {
    small: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 12 },
    medium: { paddingHorizontal: 12, paddingVertical: 6, fontSize: 14 },
    large: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 16 },
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor },
        {
          paddingHorizontal: sizeStyles[size].paddingHorizontal,
          paddingVertical: sizeStyles[size].paddingVertical,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: sizeStyles[size].fontSize }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
