import { registerRootComponent } from "expo";
import App from "./App";
import React from "react";
import { View, Text } from "react-native";

class ErrorBoundary extends React.Component {
  state = { error: null };

  componentDidCatch(error, info) {
    console.log("CAUGHT ERROR:", error.message);
    console.log("STACK:", error.stack);
    console.log("INFO:", info.componentStack);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Text style={{ color: "red", fontSize: 16 }}>
            {this.state.error.message}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function Root() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

registerRootComponent(Root);
