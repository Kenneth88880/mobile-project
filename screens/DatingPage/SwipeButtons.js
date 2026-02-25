import React from "react";
import { View, StyleSheet } from "react-native";
import { Button, useTheme } from "react-native-paper";

export default function SwipeButtons({ onPass, onLike }) {
  const theme = useTheme();

  return (
    <View style={styles.buttonContainer}>
      <Button
        mode="outlined"
        icon="close"
        onPress={onPass}
        style={styles.passButton}
        labelStyle={styles.buttonLabel}
        buttonColor={theme.colors.surface}
      >
        PASS DUO
      </Button>
      <Button
        mode="contained"
        icon="heart"
        onPress={onLike}
        style={styles.likeButton}
        labelStyle={styles.buttonLabel}
      >
        LIKE DUO
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  passButton: {
    flex: 1,
    borderWidth: 2,
  },
  likeButton: {
    flex: 1,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: "bold",
  },
});
