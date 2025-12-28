import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Text, TextInput, Button, useTheme, Card, IconButton } from "react-native-paper";

const FirstNameScreen = ({ onNext, onBack, initialName = "" }) => {
  const theme = useTheme();
  const [firstName, setFirstName] = useState(initialName);

  const handleNext = () => {
    if (!firstName.trim()) {
      alert("Please enter your first name");
      return;
    }
    onNext(firstName.trim());
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {onBack && (
        <View style={styles.backButton}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={onBack}
            iconColor={theme.colors.primary}
          />
        </View>
      )}
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>
          What's your first name?
        </Text>
        <Text
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          This is how you'll appear to others
        </Text>
        <Card
          style={[
            styles.warningCard,
            { backgroundColor: theme.colors.errorContainer },
          ]}
        >
          <Card.Content>
            <Text
              style={[
                styles.warningText,
                { color: theme.colors.onErrorContainer },
              ]}
            >
              Your name cannot be changed after signing up
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.inputContainer}>
          <TextInput
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            mode="outlined"
            autoFocus
            style={styles.input}
            maxLength={50}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleNext}
            style={styles.button}
            disabled={!firstName.trim()}
          >
            Continue
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default FirstNameScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 10,
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  warningCard: {
    marginBottom: 24,
    width: "100%",
    maxWidth: 400,
  },
  warningText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  inputContainer: {
    width: "100%",
    maxWidth: 400,
  },
  input: {
    marginBottom: 10,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 400,
    marginTop: 20,
  },
  button: {
    marginVertical: 5,
  },
});
