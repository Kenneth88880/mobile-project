import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text, Card, Button, useTheme } from "react-native-paper";

export default function RatingModal({
  ratingProfile,
  existingRating,
  hoveredStar,
  setHoveredStar,
  submitRating,
  onClose,
}) {
  const theme = useTheme();

  return (
    <View style={styles.modalOverlay}>
      <Card style={styles.ratingCard}>
        <Card.Title
          title={
            existingRating
              ? `Edit Your Rating`
              : `Rate ${ratingProfile?.name || "User"}`
          }
          subtitle={
            existingRating
              ? `Current rating: ${existingRating} stars. Tap to change.`
              : "How would you rate this profile?"
          }
        />
        <Card.Content>
          <View style={styles.ratingStarsContainer}>
            {[1, 2, 3, 4, 5].map((star) => {
              const isHighlighted = star <= (hoveredStar || existingRating || 0);
              return (
                <TouchableOpacity
                  key={star}
                  onPress={() => submitRating(star)}
                  onPressIn={() => setHoveredStar(star)}
                  onPressOut={() => setHoveredStar(0)}
                  style={styles.starButton}
                >
                  <Text
                    style={[
                      styles.starIcon,
                      { color: isHighlighted ? "#FFD700" : "#E0E0E0" },
                    ]}
                  >
                    ★
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {hoveredStar > 0 && (
            <Text
              style={{
                textAlign: "center",
                marginTop: 8,
                color: theme.colors.primary,
              }}
            >
              {hoveredStar} star{hoveredStar !== 1 ? "s" : ""}
            </Text>
          )}
        </Card.Content>
        <Card.Actions>
          <Button onPress={onClose}>Cancel</Button>
        </Card.Actions>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 20,
  },
  ratingCard: {
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  ratingStarsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  starIcon: {
    fontSize: 48,
    fontWeight: "bold",
  },
});
