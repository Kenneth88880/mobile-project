import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Card, IconButton } from "react-native-paper";
import { getDistanceToProfile } from "../../utils/locationUtils";
import { formatLastActive } from "../../utils/locationTracker";

export default function ProfileHalfCard({
  profile,
  photo,
  name,
  age,
  currentUserLocation,
  onPress,
}) {
  return (
    <Card style={styles.halfCard} onPress={onPress}>
      <Card.Cover source={{ uri: photo }} />
      <Card.Content style={styles.cardOverlay}>
        <Text variant="titleLarge" style={styles.overlayText}>
          {name}, {age}
        </Text>
        {profile?.showOnlineStatus !== false && profile?.lastActive && (
          <Text variant="bodySmall" style={styles.overlayText}>
            {formatLastActive(profile.lastActive, profile.isOnline)}
          </Text>
        )}
        {currentUserLocation && profile?.latitude && profile?.longitude ? (
          <Text variant="bodySmall" style={styles.overlayText}>
            {getDistanceToProfile(currentUserLocation, {
              latitude: profile.latitude,
              longitude: profile.longitude,
              city: profile.city,
            })}
          </Text>
        ) : (
          profile?.city && (
            <View style={styles.cityRow}>
              <IconButton
                icon="map-marker"
                size={14}
                iconColor="white"
                style={styles.cityIcon}
              />
              <Text variant="bodySmall" style={styles.overlayText}>
                {profile.city}
              </Text>
            </View>
          )
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  halfCard: {
    marginVertical: 8,
    height: 250,
  },
  cardOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
  },
  overlayText: {
    color: "white",
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cityIcon: {
    margin: 0,
    padding: 0,
  },
});
