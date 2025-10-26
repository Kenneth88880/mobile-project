import { useState, useEffect, use } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView, Image, Button, TouchableOpacity, ScrollView } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { ChatScreen, CreateChat, Reset } from "./chat"; 


export function getUserID() {

  return "user1";

} 

export default function App() {
  const [activeTab, setActiveTab] = useState('dating'); // "dating" or "profile" or "messages"
  const [profileImages, setProfileImages] = useState([]); // photos from profile tab
  const [cards, setCards] = useState([]); // cards for dating tab
  const [showChat, setShowChat] = useState(false);
  const [createChat, setCreateChat] = useState(false);

  // when profileImages change, update the dating card
  useEffect(() => {
    if (profileImages.length > 0) {
      // Make one card that includes all profile photos
      const newCard = {
        id: 1,
        name: "You ❤️",
        images: profileImages,
      };
      setCards([newCard]);
    }
  }, [profileImages]);

  // pick images for profile tab
  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsMultipleSelection: true,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => ({ uri: asset.uri }));
      setProfileImages([...profileImages, ...newImages]);
    }
  };
  
 
  // shows the selected chat once the button is pressed for it
  if (showChat) {
      return (
        <View style={{marginTop: 40, alignItems: "center"}}>
          <Button title="Back" onPress={() => setShowChat(false)} />
          <ChatScreen name = "sudo"/>
        </View>
      );
    } else {
        Reset();
    }
    
    // brings them to the create chat screen once button is pressed
    if (createChat) {
      return (
        
        <View style={{marginTop: 40}}>
              <Button title="Back" onPress={() => setCreateChat(false)} />
              <CreateChat />
        </View>
      );
    } else {
        Reset();
    }

  return (
    <SafeAreaView style={styles.container}>
      {/* --- MAIN CONTENT --- */}
      {activeTab === 'dating' ? (
        cards.length > 0 ? (
          <Swiper
            cards={cards}
            renderCard={(card) => (
              <View style={styles.card}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                >
                  {card.images.map((img, index) => (
                    <Image
                      key={index}
                      source={img}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
                <Text style={styles.cardText}>{card.name}</Text>
              </View>
            )}
            stackSize={1}
            backgroundColor="transparent"
          />
        ) : (
          <Text style={{ color: "white", fontSize: 18 }}>Add profile photos first!</Text>
        )
      ) : activeTab === 'profile' ? (
        <View style={styles.profileContainer}>
          <Text style={styles.profileText}>👤 Profile Page</Text>
          <Button title="Pick Profile Pictures" onPress={pickProfileImage} />

          <ScrollView contentContainerStyle={styles.imageGrid} showsVerticalScrollIndicator={false}>
            {profileImages.map((img, index) => (
              <Image
                key={index}
                source={img}
                style={styles.profileImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        </View>
      ) : activeTab === 'messages' ? (

        <View style={styles.profileContainer}>
          <Text style={styles.profileText}>💬 Messages Page</Text>
          
          <Button title= "Chats" onPress = {() => setActiveTab('chatList')} />

          <Button title= "Create Chat" onPress={() => setCreateChat(true)} />

        </View>
        
        ) : activeTab === 'chatList' ? ( 

          <View style={styles.profileContainer}>
            <Text style={styles.profileText}>💬 Chat List Page</Text>
            <Button title= "Back to Messages" onPress = {() => setActiveTab('messages')} />
            <Button title= "Open Chat with sudo" onPress={() => setShowChat(true)} />
          </View>

        ):

        null}

      {/* --- BOTTOM NAVIGATION --- */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navButton, activeTab === 'dating' && styles.activeButton]}
          onPress={() => setActiveTab('dating')}
        >
          <Text style={styles.navText}>💘 Dating</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, activeTab === 'profile' && styles.activeButton]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={styles.navText}>👤 Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, activeTab === 'messages' && styles.activeButton]}
          onPress={() => setActiveTab('messages')}
        >
          <Text style={styles.navText}>💬 Messages</Text>
        </TouchableOpacity>

      </View>

      <StatusBar style="auto" />
    </SafeAreaView>
  );
} 

// styles for app
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "dodgerblue",
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
  profileContainer: {
    flex: 0.8,
    alignItems: "center",
    width: "100%",
  },
  profileText: {
    fontSize: 24,
    color: "white",
    marginBottom: 20,
    fontWeight: "bold",
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 15,
    paddingBottom: 100,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    margin: 5,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    paddingVertical: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
    position: "absolute",
    bottom: 0,
  },
  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  activeButton: {
    backgroundColor: "white",
  },
  navText: {
    color: "black",
    fontWeight: "bold",
    fontSize: 16,
  },
});
