import React from "react";
import { View, StyleSheet } from "react-native";
import {
  Card,
  Title,
  Paragraph,
  Button,
  Surface,
  Subheading,
} from "react-native-paper";

export default function PremiumScreen() {
  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={4}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Premium</Title>

            <Subheading style={styles.subtitle}>Coming Soon</Subheading>

            <Paragraph style={styles.description}>
              We are currently working on premium to give you access to no ads,
              glow up advice, free games, and more!
            </Paragraph>
          </Card.Content>

          <Card.Actions style={styles.actions}>
            <Button
              mode="contained"
              onPress={() => console.log("Join Now pressed")}
              style={styles.signUpButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Notify Me
            </Button>
          </Card.Actions>
        </Card>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  surface: {
    width: "95%",
    borderRadius: 20,
  },
  card: {
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 15,
    fontStyle: "italic",
  },
  description: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 26,
    marginVertical: 20,
  },
  actions: {
    justifyContent: "center",
    paddingBottom: 20,
  },
  signUpButton: {
    borderRadius: 25,
  },
  buttonContent: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
