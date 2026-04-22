import React from "react";
import { View, ScrollView, StyleSheet, Text } from "react-native";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              Take a screenshot and send to the doubly team
            </Text>
            <Text style={styles.label}>Error:</Text>
            <Text style={styles.error}>
              {this.state.error?.toString() || "Unknown error"}
            </Text>
            {this.state.errorInfo?.componentStack ? (
              <>
                <Text style={styles.label}>Component stack:</Text>
                <Text style={styles.stack}>
                  {this.state.errorInfo.componentStack}
                </Text>
              </>
            ) : null}
            {this.state.error?.stack ? (
              <>
                <Text style={styles.label}>Stack trace:</Text>
                <Text style={styles.stack}>{this.state.error.stack}</Text>
              </>
            ) : null}
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    padding: 20,
    paddingTop: 80,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#b00020",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 4,
    color: "#000",
  },
  error: {
    fontSize: 14,
    color: "#b00020",
    fontFamily: "Courier",
  },
  stack: {
    fontSize: 11,
    color: "#333",
    fontFamily: "Courier",
  },
});
