import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView from 'react-native-maps';//npx expo install react-native-maps

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map}
        initialRegion={{
          latitude: 43.6532, // Toronto example
          longitude: -79.3832,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // fills screen
  },
  map: {
    flex: 1, // fills container
  },

});
