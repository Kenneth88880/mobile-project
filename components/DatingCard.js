import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Text, Card, Chip, useTheme } from "react-native-paper";
import { EmptyState } from "../components/CommonComponents";

export default function DatingCard({ user }) {
  const theme = useTheme();

  if (!user.name && (!user.photos || user.photos.length === 0)) {
    return (
      <EmptyState
        icon="heart"
        title="Complete Your Profile"
        message="Your profile info will appear here"
      />
    );
  }

  return (
    <Card style={styles.card}>
      {user.photos && user.photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photoScroll}
        >
          {user.photos.map((uri, i) => (
            <Card.Cover key={i} source={{ uri }} style={styles.photo} />
          ))}
        </ScrollView>
      )}

      <Card.Content>
        <Text variant="headlineMedium" style={styles.name}>
          {user.name}
          {user.age ? `, ${user.age}` : ""}
        </Text>

        {user.description && (
          <Text variant="bodyLarge" style={styles.description}>
            {user.description}
          </Text>
        )}

        {user.tags && (
          <View style={styles.tagsContainer}>
            {user.tags
              .split(" ")
              .filter((tag) => tag.trim())
              .map((tag, index) => (
                <Chip key={index} style={styles.tag} compact>
                  {tag}
                </Chip>
              ))}
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
  },
  photoScroll: {
    maxHeight: 300,
  },
  photo: {
    width: 250,
    height: 300,
    marginRight: 8,
  },
  name: {
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    marginTop: 8,
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
  },
  tag: {
    marginRight: 4,
    marginBottom: 4,
  },
});
