import React from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Text, Card, Button, IconButton, useTheme } from "react-native-paper";
import { ProfileInfoCard } from "../../components/CommonComponents";
import { formatLastActive } from "../../utils/locationTracker";

export default function ProfileView({
  selectedProfile,
  currentImageIndex,
  handleBackToDouble,
  handleImageTap,
  handleRateProfile,
  hasRatedUser,
  existingRating,
  isDatingScreen,
}) {
  const theme = useTheme();

  const profilePhotos = selectedProfile?.photos || [];
  const profileName = selectedProfile?.name || "Unknown";
  const profileAge = selectedProfile?.age || "?";
  const profileGender = selectedProfile?.gender;
  const profileDescription =
    selectedProfile?.description || "No description available";
  const profileTags = selectedProfile?.tags || [];
  const profileCity = selectedProfile?.city;
  const profileLastActive = selectedProfile?.lastActive;
  const profileIsOnline = selectedProfile?.isOnline;
  const profileShowOnlineStatus = selectedProfile?.showOnlineStatus !== false;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <Button
        mode="outlined"
        icon="arrow-left"
        onPress={handleBackToDouble}
        style={styles.backButton}
      >
        Back to Duo
      </Button>

      {profilePhotos.length > 0 ? (
        <Card style={styles.imageCard}>
          <TouchableOpacity activeOpacity={0.9} onPress={handleImageTap}>
            <Card.Cover
              source={{ uri: profilePhotos[currentImageIndex] }}
              style={styles.cardCover}
            />
            {profilePhotos.length > 1 && (
              <View style={styles.dotsContainer}>
                {profilePhotos.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      index === currentImageIndex && styles.activeDot,
                    ]}
                  />
                ))}
              </View>
            )}
          </TouchableOpacity>
        </Card>
      ) : (
        <Card style={styles.imageCard}>
          <Card.Cover
            source={{
              uri: "https://via.placeholder.com/400x300?text=No+Photo",
            }}
            style={styles.cardCover}
          />
        </Card>
      )}

      <ProfileInfoCard
        name={profileName}
        age={profileAge}
        gender={profileGender}
        description={profileDescription}
        tags={profileTags}
        city={profileCity}
        lastActive={
          profileShowOnlineStatus && profileLastActive
            ? formatLastActive(profileLastActive, profileIsOnline)
            : null
        }
        showOnlineStatus={profileShowOnlineStatus}
      />

      {hasRatedUser ? (
        <Card
          style={{ margin: 16, backgroundColor: theme.colors.surfaceVariant }}
        >
          <Card.Content>
            <View style={{ alignItems: "center", gap: 8 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <IconButton icon="star" size={24} iconColor="#FFD700" />
                <Text variant="bodyLarge">
                  You rated this user {existingRating} stars
                </Text>
              </View>
              <Button
                mode="outlined"
                onPress={() => handleRateProfile(selectedProfile)}
                style={{ marginTop: 8 }}
              >
                Edit Rating
              </Button>
            </View>
          </Card.Content>
        </Card>
      ) : (
        isDatingScreen !== true && (
          <Button
            mode="contained"
            icon="star"
            onPress={() => handleRateProfile(selectedProfile)}
            style={styles.rateButton}
          >
            Rate Profile
          </Button>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  backButton: {
    marginBottom: 8,
  },
  imageCard: {
    marginBottom: 16,
  },
  cardCover: {
    height: 400,
  },
  dotsContainer: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  activeDot: {
    backgroundColor: "white",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rateButton: {
    marginTop: 16,
  },
});
