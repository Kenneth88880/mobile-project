import { collection, addDoc } from "firebase/firestore";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { db } from "./firebaseConfig";
import { useState } from "react";

export function getChatName() {

    return "Busy";

}

export default function CreateChat() {
    const [chatName, setChatName] = useState("");

    const createNewChat = async () => {
        if (chatName.trim() === "") {
            alert("Please enter a chat name");
            return;
        }
        try {
            // This will create a new document in a 'chats' collection with the chat name as the ID
            // and then a 'messages' subcollection inside it.
            await addDoc(collection(db, "user1", chatName, "messages"), {
                text: 'Welcome to the new chat!',
                createdAt: new Date(),
                user: { _id: 'system', name: 'System' }
            });
            alert(`Chat "${chatName}" created successfully!`);
            setChatName("");
        } catch (error) {
            console.error("Error creating chat: ", error);
            alert("Failed to create chat.");
        }
    };

    return (
        <View style={{height: 200}}>
            <Text style={styles.title}>Create a New Chat</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter a name for the new chat"
                value={chatName}
                onChangeText={setChatName}
            />
            <Button title="Create Chat" onPress={createNewChat} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        alignItems: 'center'
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 20
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginBottom: 20,
        borderRadius: 5
    }
});