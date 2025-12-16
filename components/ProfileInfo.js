import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import { Text, TextInput, useTheme } from "react-native-paper";
import { UserContext } from "../context/UserContext";

export default function ProfileInfo() {
  const theme = useTheme();
  const { userData, setUserData } = useContext(UserContext);

  const handleChange = (key, value) => {
    setUserData({ ...userData, [key]: value });
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <TextInput
        label="Name"
        mode="outlined"
        value={userData.name}
        onChangeText={(text) => handleChange("name", text)}
        placeholder="Enter your name"
        style={styles.input}
        left={<TextInput.Icon icon="account" />}
      />

      <TextInput
        label="Age"
        mode="outlined"
        value={userData.age}
        onChangeText={(text) => handleChange("age", text)}
        placeholder="Enter your age"
        keyboardType="numeric"
        style={styles.input}
        left={<TextInput.Icon icon="cake-variant" />}
      />

      <TextInput
        label="Description"
        mode="outlined"
        value={userData.description}
        onChangeText={(text) => handleChange("description", text)}
        placeholder="Describe yourself"
        multiline
        numberOfLines={4}
        style={[styles.input, styles.textArea]}
        left={<TextInput.Icon icon="text" />}
      />

      <TextInput
        label="Tags"
        mode="outlined"
        value={userData.tags}
        onChangeText={(text) => handleChange("tags", text)}
        placeholder="#gaming #music #foodie"
        style={styles.input}
        left={<TextInput.Icon icon="tag-multiple" />}
        right={<TextInput.Affix text="#" />}
      />

      <Text variant="bodySmall" style={styles.helperText}>
        Separate tags with spaces (e.g., #gaming #music #travel)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
  },
  helperText: {
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 12,
    opacity: 0.7,
  },
});
