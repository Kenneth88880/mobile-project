import React from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Text, Button, useTheme, IconButton } from "react-native-paper";
import PhotoPicker from "../../components/PhotoPicker";

const PhotoSelectionScreen = ({ onNext, onBack, initialPhotos = [] }) => {
  const theme = useTheme();
  const [photos, setPhotos] = React.useState(initialPhotos);

  const handleNext = () => {
    if (photos.length === 0) {
      alert("Please add at least one photo");
      return;
    }
    onNext(photos);
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            Add your photos
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Choose at least 1 photo, up to 6
          </Text>

          <View style={styles.photoContainer}>
            <PhotoPicker
              photos={photos}
              onPhotosChange={setPhotos}
              maxPhotos={6}
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleNext}
              style={styles.button}
              disabled={photos.length === 0}
            >
              Continue
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PhotoSelectionScreen;

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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
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
  photoContainer: {
    marginBottom: 32,
  },
  buttonContainer: {
    width: "100%",
  },
  button: {
    marginVertical: 5,
  },
});
