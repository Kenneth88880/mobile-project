import React, { useState, useEffect } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Text, TextInput, Button, useTheme, Card, IconButton } from "react-native-paper";

const BirthdayScreen = ({ onNext, onBack, initialBirthday = {} }) => {
  const theme = useTheme();
  const [day, setDay] = useState(initialBirthday.day || "");
  const [month, setMonth] = useState(initialBirthday.month || "");
  const [year, setYear] = useState(initialBirthday.year || "");
  const [age, setAge] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    calculateAge();
  }, [day, month, year]);

  const calculateAge = () => {
    if (!day || !month || !year) {
      setAge(null);
      setError("");
      return;
    }

    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Validation
    if (dayNum < 1 || dayNum > 31) {
      setError("Invalid day");
      setAge(null);
      return;
    }
    if (monthNum < 1 || monthNum > 12) {
      setError("Invalid month");
      setAge(null);
      return;
    }
    if (yearNum < 1900 || yearNum > new Date().getFullYear()) {
      setError("Invalid year");
      setAge(null);
      return;
    }

    // Check if valid date
    const birthDate = new Date(yearNum, monthNum - 1, dayNum);
    if (
      birthDate.getDate() !== dayNum ||
      birthDate.getMonth() !== monthNum - 1 ||
      birthDate.getFullYear() !== yearNum
    ) {
      setError("Invalid date");
      setAge(null);
      return;
    }

    // Calculate age
    const today = new Date();
    let calculatedAge = today.getFullYear() - yearNum;
    const monthDiff = today.getMonth() - (monthNum - 1);
    const dayDiff = today.getDate() - dayNum;

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      calculatedAge--;
    }

    if (calculatedAge < 18) {
      setError("You must be at least 18 years old");
      setAge(null);
      return;
    }

    if (calculatedAge > 120) {
      setError("Please enter a valid birth year");
      setAge(null);
      return;
    }

    setError("");
    setAge(calculatedAge);
  };

  const handleNext = () => {
    if (!age || error) {
      alert("Please enter a valid birthday");
      return;
    }
    onNext({ day, month, year, age });
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
        <Text style={[styles.counterText, { color: theme.colors.onSurfaceVariant }]}>
          2/6
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            When's your birthday?
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            We'll calculate your age automatically
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
                Your age cannot be changed after signing up
              </Text>
            </Card.Content>
          </Card>

          <View style={styles.inputContainer}>
            <View style={styles.dateRow}>
              <TextInput
                label="Day"
                value={day}
                onChangeText={setDay}
                mode="outlined"
                keyboardType="numeric"
                maxLength={2}
                style={styles.dateInput}
                placeholder="DD"
              />
              <TextInput
                label="Month"
                value={month}
                onChangeText={setMonth}
                mode="outlined"
                keyboardType="numeric"
                maxLength={2}
                style={styles.dateInput}
                placeholder="MM"
              />
              <TextInput
                label="Year"
                value={year}
                onChangeText={setYear}
                mode="outlined"
                keyboardType="numeric"
                maxLength={4}
                style={styles.yearInput}
                placeholder="YYYY"
              />
            </View>

            {error ? (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {error}
              </Text>
            ) : null}

            {age && !error ? (
              <Card
                style={[
                  styles.ageCard,
                  { backgroundColor: theme.colors.primaryContainer },
                ]}
              >
                <Card.Content>
                  <Text
                    style={[
                      styles.ageLabel,
                      { color: theme.colors.onPrimaryContainer },
                    ]}
                  >
                    Your age:
                  </Text>
                  <Text
                    style={[
                      styles.ageValue,
                      { color: theme.colors.onPrimaryContainer },
                    ]}
                  >
                    {age} years old
                  </Text>
                </Card.Content>
              </Card>
            ) : null}
          </View>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleNext}
              style={styles.button}
              disabled={!age || !!error}
            >
              Next
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default BirthdayScreen;

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
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dateInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  yearInput: {
    flex: 1.5,
    marginHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  ageCard: {
    marginTop: 20,
    padding: 8,
  },
  ageLabel: {
    fontSize: 16,
    textAlign: "center",
  },
  ageValue: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
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
