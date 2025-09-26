import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import Swiper from 'react-native-deck-swiper';

export default function App() {
  const cards = ['Card 1', 'Card 2', 'Card 3', 'Card 4']; // Example data

  return (
    <SafeAreaView style={styles.container}>
      <Swiper
        cards={cards}
        renderCard={(card) => (
          <View style={styles.card}>
            <Text style={styles.cardText}>{card}</Text>
          </View>
        )}
        stackSize={3} // how many cards visible at once
        backgroundColor="transparent"
        onSwiped={(cardIndex) => {
          console.log('Swiped card at index:', cardIndex);
        }}
        onSwipedAll={() => {
          console.log('All cards swiped!');
        }}
      />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  cardText: {
    fontSize: 22,
    fontWeight: "bold",
  },
});
