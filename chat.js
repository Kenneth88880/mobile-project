import {React, useState, useEffect, useCallback } from "react";
import { StyleSheet, Text, TextInput, Button, View } from "react-native";
import { GiftedChat, Bubble } from "react-native-gifted-chat";
import { db } from "./firebaseConfig";
import { getUserID } from "./App.js";
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";

// global variables used to track if a new chat has been created and its name 
var chatCreated = false;
var chatOpened = false;
var inputtedChatName = "";
var openChatName = "";

// resets variables when they leave the screen
export function ResetCreation() {

    chatCreated = false;
    inputtedChatName = "";

}

export function ResetOpening() {

    chatOpened = false;
    openChatName = "";

}


// creates the chat scren for people to interact and message each other 
export function ChatScreen() {
    
    // stores messages 
    const [chatName, setChatName] = useState("");
    const [messages, setMessages] = useState([]);

    const openChat = async () => {
        // gets the user to input a chat name
        if (chatName.trim() === "") {
            alert("Please enter a chat name");
            return;
        }

        try {
            
            openChatName = chatName;
            setChatName("");
            chatOpened = true;

        } catch (error) {

            console.error("Error opening chat: ", error);
            alert("Failed to open chat.");

        }
    };

    // gets chat name
    function getChatName() {

        // waits for a value for the new chat name 
        return new Promise(resolve => {
            const interval = setInterval(() => {
                if (openChatName !== "") {
                    clearInterval(interval);
                    resolve(openChatName);
                }
            }, 100);
        })
    }

    // updates the firebase data collection with the new chat name
    useEffect(() => {

        const fetchName = async() => {
            
            const name = await getChatName();
            const q = query(collection(db, getUserID() , name, "messages"), orderBy("createdAt", "desc"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(
                snapshot.docs.map((doc) => ({
                _id: doc.id,
                text: doc.data().text,
                createdAt: doc.data().createdAt?.toDate(),
                user: doc.data().user,
                }))
            );
            });
            return unsubscribe;
            }
        fetchName();
    
    }, []);

    // sends messages
    const onSend = useCallback(async (messages = []) => {
        const { _id, createdAt, text, user } = messages[0];
        await addDoc(collection(db, getUserID(), openChatName, "messages"), {
        _id,
        text,
        createdAt: serverTimestamp(),
        user,
        });
    }, []);

    // changes bubble colour 
    const renderBubble = (props) => {
        return (
            <Bubble
            {...props}
            wrapperStyle={{
                right: {
                backgroundColor: '#000000',
                },
                left: {
                backgroundColor: '#E5E5EA',
                },
            }}
            />
        );
        };

    if (chatOpened === true) {
        // renders chat
        return (
            <View style={{ 
            backgroundColor: '#fff', 
            width: 411, 
            height: 600,
            }}>
            <Text style={styles.profileText}>{"Chatting with " + openChatName}</Text>

            <GiftedChat
                messages={messages}
                onSend={(msgs) => onSend(msgs)}
                user={{
                _id: 1,
                name: "Test User",
                }}
                renderBubble={renderBubble}
            />
            </View>
        );

    } else {

        return (
            <View style={{height: 200}}>
                <Text style={styles.title}>Open Text Chat</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter a name for the existing chat"
                    value={chatName}
                    onChangeText={setChatName}
                />
                <Button title="Open Chat" onPress={openChat} />
            </View>
        );
        
    }

}

// creates a new chat with a name 
export function CreateChat() {
    
    // stores chat names and stores messages
    const [chatName, setChatName] = useState("");
    const [messages, setMessages] = useState([]);

    // creates a new chat 
    const createNewChat = async () => {

        // gets the user to input a chat name
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
            inputtedChatName = chatName;
            alert(`Chat "${chatName}" created successfully!`);
            setChatName("");
            chatCreated = true;    

        } catch (error) {

            console.error("Error creating chat: ", error);
            alert("Failed to create chat.");

        }
    };

    // gets chat name
    function getChatName() {

        // waits for a value for the new chat name 
        return new Promise(resolve => {
            const interval = setInterval(() => {
                if (inputtedChatName !== "") {
                    clearInterval(interval);
                    resolve(inputtedChatName);
                }
            }, 100);
        })
    }

    // updates the firebase data collection with the new chat name
    useEffect(() => {

        const fetchName = async() => {
            
            const name = await getChatName();
            const q = query(collection(db, getUserID() , name, "messages"), orderBy("createdAt", "desc"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(
                snapshot.docs.map((doc) => ({
                _id: doc.id,
                text: doc.data().text,
                createdAt: doc.data().createdAt?.toDate(),
                user: doc.data().user,
                }))
            );
            });
            return unsubscribe;
            }
        fetchName();
    
    }, []);

    
    // sends messages
    const onSend = useCallback(async (messages = []) => {
        const { _id, createdAt, text, user } = messages[0];

        await addDoc(collection(db, getUserID(), inputtedChatName, "messages"), {
        _id,
        text,
        createdAt: serverTimestamp(),
        user,
        });

    }, []);

    // changes bubble colour 
    const renderBubble = (props) => {
        return (
            <Bubble
            {...props}
            wrapperStyle={{
                right: {
                backgroundColor: '#000000',
                },
                left: {
                backgroundColor: '#E5E5EA',
                },
            }}
            />
        );
    };

    // if a chat has been created, then show the newly created chat screen 
    if (chatCreated === true) {
        
        return (
            <View style={{ 
                backgroundColor: '#fff', 
                width: 411, 
                height: 600,
                }}>
                <Text style={styles.profileText}>{"Chatting with " + inputtedChatName}</Text>

                <GiftedChat
                    messages={messages}
                    onSend={(msgs) => onSend(msgs)}
                    user={{
                    _id: 1,
                    name: "Test User",
                    }}
                    renderBubble={renderBubble}
                />
            </View>
            
        );

    } else if (chatCreated === false) {

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

}

// styles for text
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
    },
    profileText: {
    fontSize: 24,
    color: "black", 
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "bold",
    }
});