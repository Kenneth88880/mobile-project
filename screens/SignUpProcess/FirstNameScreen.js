import React, { useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Card,
  IconButton,
} from "react-native-paper";

import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

const FirstNameScreen = ({ onNext, onBack, initialName = "" }) => {
  const theme = useTheme();
  const [firstName, setFirstName] = useState(initialName);

  const handleNext = () => {
    const trimmed = firstName.trim();
    if (!trimmed) {
      alert("Please enter your first name");
      return;
    }
    if (trimmed.length < 2) {
      alert("Name must be at least 2 characters");
      return;
    }
    if (matcher.hasMatch(trimmed)) {
      alert("Please choose an appropriate name");
      return;
    }
    // Optional: block names with numbers/special chars
    if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
      alert("Names can only contain letters, spaces, hyphens, and apostrophes");
      return;
    }
    onNext(trimmed);
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
      <View style={styles.progressCounter}>
        <Text
          style={[styles.counterText, { color: theme.colors.onSurfaceVariant }]}
        >
          1/6
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
              Next
            </Button>
          </View>
        </View>
      </ScrollView>
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
  progressCounter: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  counterText: {
    fontSize: 16,
    fontWeight: "600",
  },
  scrollContent: {
    flexGrow: 1,
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
