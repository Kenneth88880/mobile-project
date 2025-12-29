import React, { useState } from "react";
import { View, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { Text, Button, useTheme, Chip, Card, IconButton } from "react-native-paper";

const GenderScreen = ({ onNext, onBack, initialGender = null }) => {
  const theme = useTheme();
  const [selectedGender, setSelectedGender] = useState(initialGender);

  const handleNext = () => {
    if (!selectedGender) {
      alert("Please select your gender");
      return;
    }
    onNext(selectedGender);
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
          3/6
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            What's your gender?
          </Text>

          <View style={styles.optionsContainer}>
            <Chip
              selected={selectedGender === "male"}
              onPress={() => setSelectedGender("male")}
              style={[
                styles.genderChip,
                {
                  backgroundColor:
                    selectedGender === "male" ? "#4A90E2" : theme.colors.surface,
                },
              ]}
              textStyle={{
                color:
                  selectedGender === "male" ? "#FFFFFF" : theme.colors.onSurface,
                fontSize: 18,
                fontWeight: "600",
              }}
              mode={selectedGender === "male" ? "flat" : "outlined"}
            >
              Male
            </Chip>

            <Chip
              selected={selectedGender === "female"}
              onPress={() => setSelectedGender("female")}
              style={[
                styles.genderChip,
                {
                  backgroundColor:
                    selectedGender === "female"
                      ? "#FF69B4"
                      : theme.colors.surface,
                },
              ]}
              textStyle={{
                color:
                  selectedGender === "female"
                    ? "#FFFFFF"
                    : theme.colors.onSurface,
                fontSize: 18,
                fontWeight: "600",
              }}
              mode={selectedGender === "female" ? "flat" : "outlined"}
            >
              Female
            </Chip>

            <Chip
              selected={selectedGender === "non-binary"}
              onPress={() => setSelectedGender("non-binary")}
              style={[
                styles.genderChip,
                {
                  backgroundColor:
                    selectedGender === "non-binary"
                      ? "#9B59B6"
                      : theme.colors.surface,
                },
              ]}
              textStyle={{
                color:
                  selectedGender === "non-binary"
                    ? "#FFFFFF"
                    : theme.colors.onSurface,
                fontSize: 18,
                fontWeight: "600",
              }}
              mode={selectedGender === "non-binary" ? "flat" : "outlined"}
            >
              Non-Binary
            </Chip>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleNext}
              style={styles.button}
              disabled={!selectedGender}
            >
              Next
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default GenderScreen;

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
