// services/profileService.js
// ✅ FIXED: Proper duo filtering to prevent re-appearing after swipes/likes

import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// ==================== CORE PROFILE FUNCTIONS ====================

export const getUserProfile = async (userId) => {
  try {
    const docSnap = await firestore()
      .collection('profiles')
      .doc(userId)
      .get();

    if (docSnap.exists) {
      return { userId, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const saveUserProfile = async (userId, profileData) => {
  try {
    await firestore()
      .collection('profiles')
      .doc(userId)
      .set(profileData, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving user profile:', error);
    return false;
  }
};

// ==================== DUO PARTNER FUNCTIONS ====================

export const getCurrentDuoPartner = async (userId) => {
  try {
    const querySnapshot = await firestore()
      .collection('duos')
      .where('users', 'array-contains', userId)
      .get();

    if (!querySnapshot.empty) {
      const duoDoc = querySnapshot.docs[0];
      const duoData = duoDoc.data();
      const partnerId = duoData.users.find((id) => id !== userId);

      return {
        duoId: duoDoc.id,
        partnerId,
        users: duoData.users,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting duo partner:', error);
    return null;
  }
};

// ==================== DUO PAIRS FILTERING (MAIN LOGIC) ====================

/**
 * Get all duo pairs that the current user's duo hasn't interacted with yet
 * Filters out:
 * - Duos already liked
 * - Duos already swiped (passed)
 * - Duos that have liked you (they should only appear in requests)
 * - Your own duo
 */
export const getAllDuoPairs = async (currentUserId) => {
  try {
    // Step 1: Get current user's duo
    const currentDuo = await getCurrentDuoPartner(currentUserId);
    
    if (!currentDuo) {
      console.log('No duo partner found');
      return [];
    }

    const currentDuoId = currentDuo.duoId;

    // Step 2: Get all duo IDs that current duo has already interacted with
    const interactedDuoIds = new Set();

    // Get all likes FROM current duo
    const likesFromSnapshot = await firestore()
      .collection('duoLikes')
      .where('fromDuoId', '==', currentDuoId)
      .get();
    
    likesFromSnapshot.forEach(doc => {
      interactedDuoIds.add(doc.data().toDuoId);
    });

    // Get all likes TO current duo (these should only show in requests)
    const likesToSnapshot = await firestore()
      .collection('duoLikes')
      .where('toDuoId', '==', currentDuoId)
      .get();
    
    likesToSnapshot.forEach(doc => {
      interactedDuoIds.add(doc.data().fromDuoId);
    });

    // Get all swipes/passes from current duo
    const swipesSnapshot = await firestore()
      .collection('duoSwipes')
      .where('fromDuoId', '==', currentDuoId)
      .get();
    
    swipesSnapshot.forEach(doc => {
      interactedDuoIds.add(doc.data().toDuoId);
    });

    console.log('Filtered out duo IDs:', Array.from(interactedDuoIds));

    // Step 3: Get all duos
    const allDuosSnapshot = await firestore()
      .collection('duos')
      .get();

    const availablePairs = [];

    // Step 4: Filter and build duo pairs
    for (const duoDoc of allDuosSnapshot.docs) {
      const duoId = duoDoc.id;
      const duoData = duoDoc.data();

      // Skip if this is the current user's duo
      if (duoId === currentDuoId) {
        continue;
      }

      // Skip if already interacted with this duo
      if (interactedDuoIds.has(duoId)) {
        console.log(`Skipping duo ${duoId} - already interacted`);
        continue;
      }

      // Get profiles for both users in this duo
      const [user1Id, user2Id] = duoData.users;
      
      const user1Profile = await getUserProfile(user1Id);
      const user2Profile = await getUserProfile(user2Id);

      if (user1Profile && user2Profile) {
        availablePairs.push({
          id: duoId,
          users: duoData.users,
          user1Profile,
          user2Profile,
          // Legacy compatibility
          user1: user1Profile,
          user2: user2Profile,
        });
      }
    }

    console.log(`Found ${availablePairs.length} available duo pairs`);
    return availablePairs;

  } catch (error) {
    console.error('Error getting duo pairs:', error);
    return [];
  }
};

// ==================== DUO LIKES ====================

/**
 * Save a like from one duo to another
 * Creates a pending request in duoLikes collection
 */
export const saveDuoLike = async (
  fromDuoId,
  toDuoId,
  fromUser1,
  fromUser2,
  toUser1,
  toUser2
) => {
  try {
    // Check if like already exists
    const existingLike = await firestore()
      .collection('duoLikes')
      .where('fromDuoId', '==', fromDuoId)
      .where('toDuoId', '==', toDuoId)
      .get();

    if (!existingLike.empty) {
      console.log('Like already exists');
      return true;
    }

    // Create the like
    await firestore()
      .collection('duoLikes')
      .add({
        fromDuoId,
        toDuoId,
        fromUser1,
        fromUser2,
        toUser1,
        toUser2,
        status: 'pending',
        acceptedBy: [],
        timestamp: firestore.FieldValue.serverTimestamp(),
      });

    console.log(`Duo ${fromDuoId} liked duo ${toDuoId}`);
    return true;
  } catch (error) {
    console.error('Error saving duo like:', error);
    return false;
  }
};

/**
 * Accept a duo like
 * Both users in the receiving duo must accept to create a match
 */
export const acceptDuoLike = async (
  likeId,
  acceptingUserId,
  currentDuoId,
  fromDuoId
) => {
  try {
    const likeRef = firestore().collection('duoLikes').doc(likeId);
    const likeDoc = await likeRef.get();

    if (!likeDoc.exists) {
      console.log('Like not found');
      return false;
    }

    const likeData = likeDoc.data();
    const acceptedBy = likeData.acceptedBy || [];

    // Add this user to acceptedBy if not already there
    if (!acceptedBy.includes(acceptingUserId)) {
      acceptedBy.push(acceptingUserId);
    }

    // Update the like
    await likeRef.update({
      acceptedBy,
    });

    // Check if both users in the duo have accepted
    const currentDuo = await firestore()
      .collection('duos')
      .doc(currentDuoId)
      .get();
    
    const currentDuoUsers = currentDuo.data().users;
    const bothAccepted = currentDuoUsers.every(userId => 
      acceptedBy.includes(userId)
    );

    if (bothAccepted) {
      // Create a match!
      await likeRef.update({
        status: 'matched',
        matchedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Create a chat for the matched duos
      await createDuoChat(currentDuoId, fromDuoId, likeData);

      console.log(`Match created between ${currentDuoId} and ${fromDuoId}!`);
    }

    return true;
  } catch (error) {
    console.error('Error accepting duo like:', error);
    return false;
  }
};

/**
 * Delete a duo like (decline)
 */
export const deleteDuoLike = async (likeId) => {
  try {
    await firestore()
      .collection('duoLikes')
      .doc(likeId)
      .delete();
    return true;
  } catch (error) {
    console.error('Error deleting duo like:', error);
    return false;
  }
};

/**
 * Delete a specific like between two duos
 */
export const deleteDuoLikeBetween = async (fromDuoId, toDuoId) => {
  try {
    const snapshot = await firestore()
      .collection('duoLikes')
      .where('fromDuoId', '==', fromDuoId)
      .where('toDuoId', '==', toDuoId)
      .get();

    const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    
    return true;
  } catch (error) {
    console.error('Error deleting duo like between:', error);
    return false;
  }
};

// ==================== DUO SWIPES (PASSES) ====================

/**
 * Save a swipe/pass
 * This ensures the duo won't appear again
 */
export const saveDuoSwipe = async (fromDuoId, toDuoId, action) => {
  try {
    // Check if swipe already exists
    const existingSwipe = await firestore()
      .collection('duoSwipes')
      .where('fromDuoId', '==', fromDuoId)
      .where('toDuoId', '==', toDuoId)
      .get();

    if (!existingSwipe.empty) {
      // Update existing swipe
      await existingSwipe.docs[0].ref.update({
        action,
        timestamp: firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Create new swipe
      await firestore()
        .collection('duoSwipes')
        .add({
          fromDuoId,
          toDuoId,
          action,
          timestamp: firestore.FieldValue.serverTimestamp(),
        });
    }

    console.log(`Duo ${fromDuoId} ${action} duo ${toDuoId}`);
    return true;
  } catch (error) {
    console.error('Error saving duo swipe:', error);
    return false;
  }
};

// ==================== CHAT CREATION ====================

/**
 * Create a group chat when two duos match
 */
const createDuoChat = async (duo1Id, duo2Id, likeData) => {
  try {
    // Get both duos
    const duo1Doc = await firestore().collection('duos').doc(duo1Id).get();
    const duo2Doc = await firestore().collection('duos').doc(duo2Id).get();

    if (!duo1Doc.exists || !duo2Doc.exists) {
      console.log('One or both duos not found');
      return false;
    }

    const duo1Users = duo1Doc.data().users;
    const duo2Users = duo2Doc.data().users;
    const allParticipants = [...duo1Users, ...duo2Users];

    // Get names for chat title
    const user1Profile = await getUserProfile(duo1Users[0]);
    const user2Profile = await getUserProfile(duo1Users[1]);
    const user3Profile = await getUserProfile(duo2Users[0]);
    const user4Profile = await getUserProfile(duo2Users[1]);

    const chatName = `${user1Profile?.name} & ${user2Profile?.name} + ${user3Profile?.name} & ${user4Profile?.name}`;

    // Create the chat
    await firestore()
      .collection('chats')
      .add({
        participants: allParticipants,
        isGroupChat: true,
        groupName: chatName,
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastMessageTime: firestore.FieldValue.serverTimestamp(),
        lastMessageText: 'You matched! Say hi 👋',
        unreadCount: Object.fromEntries(
          allParticipants.map(userId => [userId, 0])
        ),
      });

    console.log('Chat created for matched duos');
    return true;
  } catch (error) {
    console.error('Error creating duo chat:', error);
    return false;
  }
};

// ==================== RATINGS ====================

export const saveRating = async (fromUserId, toUserId, rating) => {
  try {
    await firestore()
      .collection('ratings')
      .add({
        fromUserId,
        toUserId,
        rating,
        timestamp: firestore.FieldValue.serverTimestamp(),
      });
    return true;
  } catch (error) {
    console.error('Error saving rating:', error);
    return false;
  }
};

export const getAverageRating = async (userId) => {
  try {
    const ratingsSnapshot = await firestore()
      .collection('ratings')
      .where('toUserId', '==', userId)
      .get();

    if (ratingsSnapshot.empty) {
      return { average: '0.0', count: 0 };
    }

    const ratings = ratingsSnapshot.docs.map(doc => doc.data().rating);
    const sum = ratings.reduce((acc, val) => acc + val, 0);
    const average = sum / ratings.length;

    return {
      average: average.toFixed(1),
      count: ratings.length,
    };
  } catch (error) {
    console.error('Error getting average rating:', error);
    return { average: '0.0', count: 0 };
  }
};

// ==================== PHOTO UPLOAD ====================

export const uploadPhoto = async (userId, photoUri, index) => {
  try {
    const filename = `${userId}_${index}_${Date.now()}.jpg`;
    const reference = storage().ref(`profile_photos/${filename}`);

    await reference.putFile(photoUri);
    const downloadURL = await reference.getDownloadURL();

    return downloadURL;
  } catch (error) {
    console.error('Error uploading photo:', error);
    return null;
  }
};

// ==================== RESET FUNCTIONS ====================

/**
 * Reset all duo-related data (for testing/debugging)
 */
export const resetAllDuoData = async () => {
  try {
    // Delete all duoLikes
    const likesSnapshot = await firestore().collection('duoLikes').get();
    const likesDeletePromises = likesSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(likesDeletePromises);

    // Delete all duoSwipes
    const swipesSnapshot = await firestore().collection('duoSwipes').get();
    const swipesDeletePromises = swipesSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(swipesDeletePromises);

    // Delete all duoMatches
    const matchesSnapshot = await firestore().collection('duoMatches').get();
    const matchesDeletePromises = matchesSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(matchesDeletePromises);

    console.log('All duo data reset successfully');
    return { success: true };
  } catch (error) {
    console.error('Error resetting duo data:', error);
    return { success: false, error };
  }
};