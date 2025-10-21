// styles.js
import { StyleSheet } from "react-native";

export default StyleSheet.create({
  // --- GLOBAL ---
  container: {
    flex: 1,
    backgroundColor: "dodgerblue",
    paddingBottom: 70,
  },
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "white",
    width: "100%",
    paddingVertical: 10,
  },
  navButton: {
    padding: 10,
  },
  activeButton: {
    borderBottomWidth: 2,
    borderBottomColor: "dodgerblue",
  },
  navText: {
    fontSize: 16,
  },
  profileText: {
    color: "white",
    fontSize: 18,
    marginBottom: 10,
  }
});
