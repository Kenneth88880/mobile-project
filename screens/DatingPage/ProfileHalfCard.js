// screens/DatingPage/ProfileHalfCard.js
import React from "react";
import { View, Image, StyleSheet, Platform } from "react-native";
import { Text, Card, IconButton } from "react-native-paper";
import { getDistanceToProfile } from "../../utils/locationUtils";
import { formatLastActive } from "../../utils/locationTracker";

const CARD_HEIGHT = 250;
const IMAGE_RENDER_HEIGHT = CARD_HEIGHT * 2;
const MAX_OFFSET = IMAGE_RENDER_HEIGHT - CARD_HEIGHT;

export default function ProfileHalfCard({
  profile,
  photo,
  name,
  age,
  currentUserLocation,
  onPress,
}) {
  const hasCropOffset = profile?.photoCropY != null && profile.photoCropY > 0;

  return (
    <Card style={styles.halfCard} onPress={onPress}>
      {hasCropOffset ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: photo }}
            style={[
              styles.croppedImage,
              { marginTop: -(profile.photoCropY * MAX_OFFSET) },
            ]}
            resizeMode="cover"
          />
        </View>
      ) : (
        <Card.Cover source={{ uri: photo }} style={styles.defaultCover} />
      )}

      <Card.Content style={styles.cardOverlay}>
        <Text style={[styles.overlayText, styles.nameText]}>
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
    marginVertical: 2,
    height: CARD_HEIGHT,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: CARD_HEIGHT,
    overflow: "hidden",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  croppedImage: {
    width: "100%",
    height: IMAGE_RENDER_HEIGHT,
  },
  defaultCover: {
    height: CARD_HEIGHT,
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

  nameText: {
    fontSize: 22,
    width: 150,
    weight: 425,
    // save fonts for later fontFamily: "FredokaBubble",
    letterSpacing: 1,
  },
});
