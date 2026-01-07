import React, { useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  TouchableOpacity,
  Clipboard,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Card,
  IconButton,
  Divider,
} from "react-native-paper";
import { CURRENT_USER_ID } from "../../services/UserConfig";

const DuoSetupScreen = ({ onNext, onSkip, onBack }) => {
  const theme = useTheme();
  const [friendCode, setFriendCode] = useState("");
  const [copied, setCopied] = useState(false);
  const userCode = CURRENT_USER_ID || "Loading...";

  const handleNext = () => {
    if (friendCode.trim()) {
      // Check if user is trying to add themselves
      if (friendCode.trim() === CURRENT_USER_ID) {
        Alert.alert(
          "Invalid Code",
          "You cannot add yourself as your own duo partner. Please enter a different friend's code."
        );
        return;
      }
      onNext(friendCode.trim());
    } else {
      Alert.alert(
        "No Friend Code",
        "You haven't entered a friend code. You can add a duo partner later from your profile.",
        [
          { text: "Go Back", style: "cancel" },
          { text: "Continue Anyway", onPress: () => onSkip() },
        ]
      );
    }
  };

  const handleSkip = () => {
    onSkip();
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            Add your Duo Partner
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Connect with your friend to appear together in the dating feed
          </Text>

          {/* Your Friend Code Section */}
          <Card
            style={[
              styles.card,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <Card.Content>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.onPrimaryContainer },
                ]}
              >
                Your Friend Code
              </Text>
              <Text
                style={[
                  styles.sectionDescription,
                  { color: theme.colors.onPrimaryContainer },
                ]}
              >
                Share this code with your friend
              </Text>

              <TouchableOpacity
                onPress={() => {
                  Clipboard.setString(userCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 3000);
                }}
                style={[
                  styles.codeContainer,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Text
                  style={[styles.codeText, { color: theme.colors.onSurface }]}
                  selectable={true}
                >
                  {userCode}
                </Text>
                <IconButton
                  icon={copied ? "check" : "content-copy"}
                  size={20}
                  iconColor={copied ? "#4CAF50" : theme.colors.primary}
                />
              </TouchableOpacity>

              <Text
                style={[
                  styles.helpText,
                  { color: theme.colors.onPrimaryContainer },
                ]}
              >
                Tap to copy
              </Text>
            </Card.Content>
          </Card>

          <Divider style={styles.divider} />

          {/* Enter Friend's Code Section */}
          <Card style={styles.card}>
            <Card.Content>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Enter Friend's Code
              </Text>
              <Text
                style={[
                  styles.sectionDescription,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Paste your friend's code here to send them a duo request
              </Text>

              <TextInput
                label="Friend's Code"
                value={friendCode}
                onChangeText={setFriendCode}
                mode="outlined"
                style={styles.input}
                placeholder="Paste your friend's code here"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
              />
            </Card.Content>
          </Card>

          <View style={styles.buttonContainer}>
            <Button mode="contained" onPress={handleNext} style={styles.button}>
              {friendCode.trim() ? "Send Request" : "Continue"}
            </Button>

            <Button mode="text" onPress={handleSkip} style={styles.skipButton}>
              Skip for now
            </Button>
          </View>

          <Card
            style={[
              styles.infoCard,
              { backgroundColor: theme.colors.secondaryContainer },
            ]}
          >
            <Card.Content>
              <Text
                style={[
                  styles.infoText,
                  { color: theme.colors.onSecondaryContainer },
                ]}
              >
                Don't worry! You can add a duo partner later from your profile
                settings.
              </Text>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default DuoSetupScreen;

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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: "center",
  },
  card: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  codeText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 16,
    flex: 1,
  },
  helpText: {
    fontSize: 12,
    fontStyle: "italic",
    opacity: 0.7,
    textAlign: "center",
  },
  divider: {
    marginVertical: 20,
  },
  input: {
    marginBottom: 10,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  button: {
    marginVertical: 5,
  },
  skipButton: {
    marginTop: 10,
  },
  infoCard: {
    marginTop: 10,
  },
  infoText: {
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
  },
});
