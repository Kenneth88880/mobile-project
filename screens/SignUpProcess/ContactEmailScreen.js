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
  IconButton,
} from "react-native-paper";

const ContactEmailScreen = ({ onNext, onSkip, onBack, initialEmail = "" }) => {
  const theme = useTheme();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (text) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(text.trim());
  };

  const handleNext = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!validateEmail(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await onNext(trimmed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      await onSkip();
    } finally {
      setIsSubmitting(false);
    }
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
            disabled={isSubmitting}
          />
        </View>
      )}
      <View style={styles.progressCounter}>
        <Text
          style={[styles.counterText, { color: theme.colors.onSurfaceVariant }]}
        >
          7/7
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            Add your email
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            We'll use this for event updates and if we ever need to contact
            support. You can skip this for now and add it later.
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              label="Email (optional)"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError("");
              }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              error={!!error}
            />
            {error ? (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {error}
              </Text>
            ) : null}
          </View>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleNext}
              style={styles.button}
              loading={isSubmitting && !!email.trim()}
              disabled={!email.trim() || isSubmitting}
            >
              Add email
            </Button>
            <Button
              mode="text"
              onPress={handleSkip}
              style={styles.button}
              disabled={isSubmitting}
            >
              Skip for now
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ContactEmailScreen;

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
    marginBottom: 32,
    textAlign: "center",
  },
  inputContainer: {
    width: "100%",
    maxWidth: 400,
    marginBottom: 20,
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    marginTop: 4,
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
