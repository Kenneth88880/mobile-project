import React, { useState, useEffect } from "react";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import Swiper from "react-native-deck-swiper";
import * as ImagePicker from "expo-image-picker";

// Handles swipe and profile card logic
export default function DatingScreen() {
  const [cards, setCards] = useState([]);
  const [profileImages, setProfileImages] = useState([]);

  // pick profile photos (this can be reused by importing same function from ProfileScreen)
  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => ({ uri: asset.uri }));
      setProfileImages([...profileImages, ...newImages]);
    }
  };

  // update cards when profile images change
  useEffect(() => {
    if (profileImages.length > 0) {
      const newCard = {
        id: 1,
        name: "You ❤️",
        images: profileImages,
      };
      setCards([newCard]);
    }
  }, [profileImages]);

  return (
    <View style={styles.container}>
      {cards.length > 0 ? (
        <Swiper
          cards={cards}
          renderCard={(card) => (
            <View style={styles.card}>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                {card.images.map((img, index) => (
                  <Image key={index} source={img} style={styles.image} resizeMode="cover" />
                ))}
              </ScrollView>
              <Text style={styles.cardText}>{card.name}</Text>
            </View>
          )}
          stackSize={1}
          backgroundColor="transparent"
        />
      ) : (
        <Text style={{ color: "white", fontSize: 18 }} onPress={pickImages}>
          Add profile photos first!
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    flex: 0.65,
    borderRadius: 20,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
    overflow: "hidden",
  },
  image: {
    width: 300,
    height: 400,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  cardText: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 10,
  },
});
