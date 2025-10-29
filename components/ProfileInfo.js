import React, { useContext } from "react";
import { View, TextInput, Text, StyleSheet } from "react-native";
import { UserContext } from "../context/UserContext";

export default function ProfileInfo() {
  const { userData, setUserData } = useContext(UserContext);

  const handleChange = (key, value) => {
    setUserData({ ...userData, [key]: value });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Name:</Text>
      <TextInput
        style={styles.input}
        value={userData.name}
        onChangeText={(text) => handleChange("name", text)}
        placeholder="Enter your name"
      />

      <Text style={styles.label}>Age:</Text>
      <TextInput
        style={styles.input}
        value={userData.age}
        onChangeText={(text) => handleChange("age", text)}
        placeholder="Enter your age"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Description:</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        value={userData.description}
        onChangeText={(text) => handleChange("description", text)}
        placeholder="Describe yourself"
        multiline
      />

      <Text style={styles.label}>Tags:</Text>
      <TextInput
        style={styles.input}
        value={userData.tags}
        onChangeText={(text) => handleChange("tags", text)}
        placeholder="#gaming #music #foodie"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", padding: 10 },
  label: { fontSize: 16, fontWeight: "bold", marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
});
