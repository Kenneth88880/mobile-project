import { StyleSheet, Text, View, KeyboardAvoidingView, TouchableOpacity, TextInput } from 'react-native'
import React, {useEffect, useState} from 'react'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, validatePassword, signOut  } from 'firebase/auth';

const SigninScreen = () => {

    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    
    const auth = getAuth();

    // checks if user is logged in or not
    useEffect(() => {
        
        const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, see docs for a list of available properties
            // https://firebase.google.com/docs/reference/js/auth.user
            
            console.log('here');
            const uid = user.uid;
            console.log(uid);

            // ...
        } else {
            // User is signed out
            // ...
        }

        return unsubscribe;
        });
    });

    // handles sign up 
    const handleSignUp = () => {
        
        createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed up 
            const user = userCredential.user;
            console.log('Registered with:', user.email);
            // ...
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log(errorCode + errorMessage);
            console.log('nope dumbass');
            // ..
        });

    }

    // handles sign in
    const handleSignIn = () => {
        signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in 
            console.log('trying');
            const user = userCredential.user;
            console.log('Logged in with:', user.email);
            // ...
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            alert(errorCode + errorMessage);
            console.log(errorCode + errorMessage)
            console.log('nope dumbass');
            // ..')
        });
    }

  
  const signOutButton = () => {  // sign out button for testing 
        signOut(auth).then(() => {
            console.log('signed out')
        }).catch((error) => {
            console.log('nope dumbass');
        });
    }

    return (
        <KeyboardAvoidingView
        style={styles.container}
        behavior="padding">

            <View style={styles.inputContainer}>

                <TextInput
                    placeholder="Email"
                    value={email}
                    onChangeText={text => setEmail(text)}
                    style={styles.input}
                />
                <TextInput
                    placeholder="Password"
                    value={password}
                    onChangeText={text => setPassword(text)}
                    style={styles.input}
                    secureTextEntry
                />

            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity

                    onPress={handleSignIn}
                    style={styles.button}>

                    <Text style={styles.button}>
                        Login
                    </Text>

                </TouchableOpacity>

                <TouchableOpacity

                    onPress={handleSignUp}
                    style={[styles.button, styles.buttonOutline]}>

                    <Text style={styles.button}>
                        Register
                    </Text>

                </TouchableOpacity>

                <TouchableOpacity

                    onPress={signOutButton}
                    style={[styles.button, styles.buttonOutline]}>

                    <Text style={styles.button}>
                        Sign Out
                    </Text>

                </TouchableOpacity>

            </View>
        </KeyboardAvoidingView>
    )
}

export default SigninScreen

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }, 
    inputContainer: {
        width: '80%'
    },
    input: {

        backgroundColor: 'white',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 10,
        marginTop: 5,

    },
    buttonContainer: {

        width: '60%',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,

    },
    button: {
        
        backgroundColor: '#0782F9',
        width: '100%',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',

    },
    buttonOutline: {

        backgroundColor: 'white',
        marginTop: 5,
        borderColor: '#0782F9',
        borderWidth: 2,

    },
    buttonText: {

        color: 'white',
        fontWeight: '700',
        fontSize: 16,


    },
    buttonOutlineText: {

        color: '#0782F9',
        fontWeight: '700',
        fontSize: 16,

    },

})