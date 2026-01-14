import React, { useState } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Text, Button, useTheme, Chip, IconButton } from "react-native-paper";

const GenderPreferenceScreen = ({ onNext, onBack, initialPreferences = [] }) => {
  const theme = useTheme();
  const [selectedPreferences, setSelectedPreferences] = useState(initialPreferences);

  const togglePreference = (gender) => {
    if (selectedPreferences.includes(gender)) {
      console.log("if you see this again, you fucke dup")
      setSelectedPreferences(selectedPreferences.filter((g) => g !== gender));
    } else {
      console.log("if you see this again, you fucke dup")
      setSelectedPreferences([...selectedPreferences, gender]);
    }
  };

  const handleNext = () => {
    if (selectedPreferences.length === 0) {
      
      alert("Please select at least one gender preference");
      return;
    }
    onNext(selectedPreferences);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
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
        <Text style={[styles.counterText, { color: theme.colors.onSurfaceVariant }]}>
          4/6
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            Who do you want to meet?
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Select all that apply
          </Text>

          <View style={styles.optionsContainer}>
            <Chip
              selected={selectedPreferences.includes("male")}
              onPress={() => togglePreference("male")}
              style={[
                styles.genderChip,
                {
                  backgroundColor: selectedPreferences.includes("male")
                    ? "#4A90E2"
                    : theme.colors.surface,
                },
              ]}
              textStyle={{
                color: selectedPreferences.includes("male")
                  ? "#FFFFFF"
                  : theme.colors.onSurface,
                fontSize: 18,
                fontWeight: "600",
              }}
              mode={selectedPreferences.includes("male") ? "flat" : "outlined"}
            >
              Male
            </Chip>

            <Chip
              selected={selectedPreferences.includes("female")}
              onPress={() => togglePreference("female")}
              style={[
                styles.genderChip,
                {
                  backgroundColor: selectedPreferences.includes("female")
                    ? "#FF69B4"
                    : theme.colors.surface,
                },
              ]}
              textStyle={{
                color: selectedPreferences.includes("female")
                  ? "#FFFFFF"
                  : theme.colors.onSurface,
                fontSize: 18,
                fontWeight: "600",
              }}
              mode={selectedPreferences.includes("female") ? "flat" : "outlined"}
            >
              Female
            </Chip>

            <Chip
              selected={selectedPreferences.includes("non-binary")}
              onPress={() => togglePreference("non-binary")}
              style={[
                styles.genderChip,
                {
                  backgroundColor: selectedPreferences.includes("non-binary")
                    ? "#9B59B6"
                    : theme.colors.surface,
                },
              ]}
              textStyle={{
                color: selectedPreferences.includes("non-binary")
                  ? "#FFFFFF"
                  : theme.colors.onSurface,
                fontSize: 18,
                fontWeight: "600",
              }}
              mode={selectedPreferences.includes("non-binary") ? "flat" : "outlined"}
            >
              Non-Binary
            </Chip>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleNext}
              style={styles.button}
              disabled={selectedPreferences.length === 0}
            >
              Next
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default GenderPreferenceScreen;

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
  optionsContainer: {
    width: "100%",
    maxWidth: 400,
    gap: 16,
    marginBottom: 32,
  },
  genderChip: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 400,
  },
  button: {
    marginVertical: 5,
  },
});
