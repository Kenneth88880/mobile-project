import React from "react";
import { View, Image, TouchableOpacity, Text, ScrollView, StyleSheet, Alert, StatusBar } from "react-native";
import * as ImagePicker from "expo-image-picker";

export default function PhotoPicker({ photos, onPhotosChange, maxPhotos = 6 }) {
  const pickImage = async () => {
    // Hide status bar before opening picker
    StatusBar.setHidden(true);
    
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      StatusBar.setHidden(false);
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload photos!');
      return;
    }

    // Check if already at max photos
    if (photos.length >= maxPhotos) {
      StatusBar.setHidden(false);
      Alert.alert('Max Photos Reached', `You can only upload up to ${maxPhotos} photos.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16], // Much taller - full phone screen ratio
      quality: 0.8,
    });

    // Show status bar again
    StatusBar.setHidden(false);

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newImageUri = result.assets[0].uri;
      const updatedPhotos = [...photos, newImageUri];
      onPhotosChange(updatedPhotos);
    }
  };

  const removePhoto = (indexToRemove) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedPhotos = photos.filter((_, index) => index !== indexToRemove);
            onPhotosChange(updatedPhotos);
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {photos.map((uri, index) => (
          <View key={index} style={styles.photoContainer}>
            <Image source={{ uri }} style={styles.image} />
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => removePhoto(index)}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        
        {photos.length < maxPhotos && (
          <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
            <Text style={styles.addPhotoText}>+</Text>
            <Text style={styles.addPhotoLabel}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      
      <Text style={styles.photoCount}>
        {photos.length} / {maxPhotos} photos
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  scroll: {
    marginBottom: 10,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 10,
  },
  image: {
    width: 120,
    height: 160,
    borderRadius: 10,
  },
  removeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: -3,
  },
  addPhotoButton: {
    width: 120,
    height: 160,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
  },
  addPhotoText: {
    fontSize: 40,
    color: '#007AFF',
    marginBottom: 5,
  },
  addPhotoLabel: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  photoCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});