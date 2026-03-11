import React from "react";
import { View, Image, StyleSheet } from "react-native";
import {
  Text,
  Button,
  Card,
  Avatar,
  Chip,
  useTheme,
  Icon,
} from "react-native-paper";

/**
 * EmptyState Component
 * Displays an empty state with an icon, title, message, and optional action button
 */
export function EmptyState({ icon, title, message, actionLabel, onAction }) {
  const theme = useTheme();

  return (
    <View style={styles.emptyStateContainer}>
      <Icon source={icon} size={64} color={theme.colors.primary} />
      <Text variant="headlineMedium" style={styles.emptyStateTitle}>
        {title}
      </Text>
      <Text
        variant="bodyLarge"
        style={[
          styles.emptyStateMessage,
          { color: theme.colors.onSurfaceVariant },
        ]}
      >
        {message}
      </Text>
      {actionLabel && onAction && (
        <Button
          mode="contained"
          onPress={onAction}
          style={styles.emptyStateButton}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

/**
 * ProfilePhoto Component
 * Displays a user profile photo with fallback to default avatar
 */
export function ProfilePhoto({ uri, size = 80, style }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.profilePhoto,
          { width: size, height: size, borderRadius: size / 2 },
          style,
        ]}
      />
    );
  }

  return (
    <Avatar.Icon
      size={size}
      icon="account"
      style={[styles.profilePhotoFallback, style]}
    />
  );
}

/**
 * StarRating Component
 * Displays a star rating with filled and empty stars
 */
export function StarRating({ rating = 0, maxStars = 5, size = 20, style }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const stars = [];

  for (let i = 0; i < maxStars; i++) {
    if (i < fullStars) {
      stars.push(
        <Text key={i} style={[styles.starFilled, { fontSize: size }]}>
          {"\u2605"}
        </Text>,
      );
    } else if (i === fullStars && hasHalfStar) {
      stars.push(
        <Text key={i} style={[styles.starHalf, { fontSize: size }]}>
          {"\u2BE8"}
        </Text>,
      );
    } else {
      stars.push(
        <Text key={i} style={[styles.starEmpty, { fontSize: size }]}>
          {"\u2606"}
        </Text>,
      );
    }
  }

  return <View style={[styles.starRatingContainer, style]}>{stars}</View>;
}

/**
 * ActionButtonRow Component
 * Displays a row of action buttons (pass and like)
 */
export function ActionButtonRow({ onPass, onLike, passLabel, likeLabel }) {
  return (
    <View style={styles.actionButtonRow}>
      <Button
        mode="outlined"
        onPress={onPass}
        style={[styles.actionButton, styles.passButton]}
        labelStyle={styles.actionButtonLabel}
      >
        {passLabel || "Pass"}
      </Button>
      <Button
        mode="contained"
        onPress={onLike}
        style={[styles.actionButton, styles.likeButton]}
        labelStyle={styles.actionButtonLabel}
      >
        {likeLabel || "Like"}
      </Button>
    </View>
  );
}

/**
 * ProfileInfoCard Component
 * Displays detailed profile information including name, age, description, tags, city, and last active
 */
export function ProfileInfoCard({
  name,
  age,
  gender,
  description,
  tags,
  city,
  lastActive,
  showOnlineStatus = true,
}) {
  const theme = useTheme();

  return (
    <Card style={styles.profileInfoCard}>
      <Card.Content>
        <Text variant="headlineMedium" style={styles.profileName}>
          {name}, {age}
        </Text>

        {gender && (
          <Chip
            icon="gender-male-female"
            compact
            style={{ alignSelf: "flex-start", marginBottom: 8 }}
          >
            {gender}
          </Chip>
        )}

        {city && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginBottom: 4,
            }}
          >
            <Icon
              source="map-marker"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {city}
            </Text>
          </View>
        )}

        {showOnlineStatus && lastActive && (
          <Text
            variant="bodySmall"
            style={[
              styles.profileLastActive,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {lastActive}
          </Text>
        )}

        {description && (
          <Text variant="bodyLarge" style={styles.profileDescription}>
            {description}
          </Text>
        )}

        {tags && tags.length > 0 && (
          <View style={styles.profileTagsContainer}>
            <Text variant="titleSmall" style={styles.profileTagsTitle}>
              Interests:
            </Text>
            <View style={styles.profileTags}>
              {tags.map((tag, index) => (
                <Chip key={index} style={styles.profileTag} compact>
                  {tag}
                </Chip>
              ))}
            </View>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  // EmptyState styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateMessage: {
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyStateButton: {
    marginTop: 16,
  },

  // ProfilePhoto styles
  profilePhoto: {
    resizeMode: "cover",
  },
  profilePhotoFallback: {
    backgroundColor: "#E0E0E0",
  },

  // StarRating styles
  starRatingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  starFilled: {
    color: "#FFD700",
  },
  starHalf: {
    color: "#FFD700",
  },
  starEmpty: {
    color: "#CCCCCC",
  },

  // ActionButtonRow styles
  actionButtonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: 140,
  },
  passButton: {
    borderColor: "#F44336",
  },
  likeButton: {
    backgroundColor: "#4CAF50",
  },
  actionButtonLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },

  // ProfileInfoCard styles
  profileInfoCard: {
    margin: 16,
  },
  profileName: {
    marginBottom: 8,
  },
  profileCity: {
    marginBottom: 4,
  },
  profileLastActive: {
    marginBottom: 12,
  },
  profileDescription: {
    marginTop: 12,
    lineHeight: 24,
  },
  profileTagsContainer: {
    marginTop: 16,
  },
  profileTagsTitle: {
    marginBottom: 8,
  },
  profileTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  profileTag: {
    marginRight: 4,
    marginBottom: 4,
  },
});
