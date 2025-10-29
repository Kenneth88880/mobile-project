import React from "react";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";

export default function DatingCard({ user }) {
  if (!user.name && user.photos.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Your profile info will appear here 💘</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <ScrollView horizontal>
        {user.photos.map((uri, i) => (
          <Image key={i} source={{ uri }} style={styles.image} />
        ))}
      </ScrollView>
      <Text style={styles.name}>{user.name}, {user.age}</Text>
      <Text style={styles.description}>{user.description}</Text>
      <Text style={styles.tags}>{user.tags}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    margin: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  image: {
    width: 250,
    height: 250,
    borderRadius: 10,
    marginRight: 10,
  },
  name: { fontSize: 22, fontWeight: "bold", marginTop: 10 },
  description: { fontSize: 16, marginTop: 8, textAlign: "center" },
  tags: { fontSize: 14, color: "#666", marginTop: 6 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 200 },
  emptyText: { color: "#999", fontSize: 16 },
});
