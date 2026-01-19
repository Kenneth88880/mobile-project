import { StyleSheet, View, Text } from "react-native";
import React from "react";
import { Button, useTheme } from "react-native-paper";

const VerificationCompleteScreen = ({ onContinue }) => {
  const theme = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Text style={[styles.title, { color: theme.colors.primary }]}>
        Verification Complete
      </Text>

      <View style={styles.buttonContainer}>
        <Button mode="contained" onPress={onContinue} style={styles.button}>
          Continue
        </Button>
      </View>
    </View>
  );
};

export default VerificationCompleteScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 30,
  },
  buttonContainer: {
    width: "80%",
    marginTop: 20,
  },
  button: {
    marginVertical: 5,
  },
});
