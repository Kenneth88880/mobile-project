import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, Surface, Text } from "react-native-paper";
import Animated from "react-native-reanimated";
import ProfileHalfCard from "./ProfileHalfCard";

export default function DuoCard({
  topProfile,
  bottomProfile,
  topPhoto,
  bottomPhoto,
  topName,
  topAge,
  bottomName,
  bottomAge,
  currentUserLocation,
  handleProfileClick,
  swipeFeedback,
  cardAnimatedStyle,
}) {
  return (
    <Animated.View style={[styles.cardsContainer, cardAnimatedStyle]}>
      <View style={styles.duoCard}>
        <ProfileHalfCard
          profile={topProfile}
          photo={topPhoto}
          name={topName}
          age={topAge}
          currentUserLocation={currentUserLocation}
          onPress={() => handleProfileClick(topProfile)}
        />
        <ProfileHalfCard
          profile={bottomProfile}
          photo={bottomPhoto}
          name={bottomName}
          age={bottomAge}
          currentUserLocation={currentUserLocation}
          onPress={() => handleProfileClick(bottomProfile)}
        />
      </View>

      {swipeFeedback && (
        <Surface style={styles.feedbackOverlay} elevation={4}>
          <Text variant="displaySmall" style={styles.feedbackText}>
            {swipeFeedback === "like" ? "LIKE" : "PASS"}
          </Text>
        </Surface>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardsContainer: {
    flex: 1,
    padding: 8,
  },
  duoCard: {
    backgroundColor: "transparent",
  },
  feedbackOverlay: {
    position: "absolute",
    top: "40%",
    left: "25%",
    right: "25%",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
  },
  feedbackText: {
    fontWeight: "bold",
  },
});