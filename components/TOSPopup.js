import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Button, useTheme } from "react-native-paper";

const TOSPopup = ({ visible, onAccept, onDecline }) => {
  const theme = useTheme();
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const isCloseToBottom = ({
    layoutMeasurement,
    contentOffset,
    contentSize,
  }) => {
    const paddingToBottom = 20;
    return (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onDecline}
    >
      <View style={styles.centeredView}>
        <View
          style={[styles.modalView, { backgroundColor: theme.colors.surface }]
        }>
          <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
            Terms of Service
          </Text>
          <ScrollView
            style={styles.tosContainer}
            onScroll={({ nativeEvent }) => {
              if (isCloseToBottom(nativeEvent)) {
                setScrolledToEnd(true);
              }
            }}
            scrollEventThrottle={400}
          >
            <Text style={{ color: theme.colors.onSurface }}>
              Welcome to our app! By using our service, you agree to the
              following terms and conditions. Please read them carefully.
              
              
              1. Acceptance of Terms: By creating an account, you agree to be
              bound by these Terms of Service. If you do not agree to these
              terms, you may not use the app.
              
              
              2. User Conduct: You are responsible for all your activity on the
              service. You agree not to use the service for any illegal or
              unauthorized purpose. You agree to comply with all local laws
              regarding online conduct and acceptable content.
              
              
              3. Privacy: Your privacy is important to us. Our Privacy Policy
              explains how we collect, use, and protect your personal
              information. By using our service, you agree to the terms of our
              Privacy Policy.
              
              
              4. Content: You are solely responsible for the content you post,
              link, or otherwise make available on the service. We do not claim
              ownership of your content, but you grant us a license to use it
              in connection with the service.
              
              
              5. Termination: We may terminate or suspend your account at any
              time, without prior notice or liability, for any reason,
              including if you breach these Terms of Service.
              
              
              By clicking "Accept", you acknowledge that you have read,
              understood, and agree to be bound by these Terms of Service.
            </Text>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={onDecline}
              style={[styles.button, { borderColor: theme.colors.primary }]}
            >
              Decline
            </Button>
            <Button
              mode="contained"
              onPress={onAccept}
              disabled={!scrolledToEnd}
              style={styles.button}
            >
              Accept
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: Dimensions.get("window").width * 0.9,
    maxHeight: Dimensions.get("window").height * 0.8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  tosContainer: {
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
});

export default TOSPopup;