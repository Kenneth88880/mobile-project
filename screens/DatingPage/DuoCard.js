import React from "react";
import { Animated, StyleSheet } from "react-native";
import { Card, Surface, Text } from "react-native-paper";
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
  pan,
  rotate,
  opacity,
  scale,
}) {
  return (
    <Animated.View
      style={[
        styles.cardsContainer,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            {
              rotate: rotate.interpolate({
                inputRange: [-20, 20],
                outputRange: ["-20deg", "20deg"],
              }),
            },
            { scale },
          ],
          opacity,
        },
      ]}
    >
      <Card style={styles.duoCard}>
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
      </Card>

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
    flex: 1,
    marginBottom: 8,
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
