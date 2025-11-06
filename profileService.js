import { db } from "./firebaseConfig";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  setDoc,
  doc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  query, 
  where,
  serverTimestamp 
} from "firebase/firestore";

// Save or update user profile to Firebase
export const saveUserProfile = async (userId, userData) => {
  try {
    const profileRef = doc(db, "profiles", userId);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      // Update existing profile
      await updateDoc(profileRef, {
        ...userData,
        updatedAt: serverTimestamp(),
      });
      console.log("Profile updated successfully!");
    } else {
      // Create new profile
      await setDoc(profileRef, {
        ...userData,
        userId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log("Profile created successfully!");
    }
    return true;
  } catch (error) {
    console.error("Error saving profile:", error);
    return false;
  }
};

// Get all profiles except current user
export const getAllProfiles = async (currentUserId) => {
  try {
    const profilesRef = collection(db, "profiles");
    const q = query(profilesRef, where("userId", "!=", currentUserId));
    const querySnapshot = await getDocs(q);
    
    const profiles = [];
    querySnapshot.forEach((doc) => {
      profiles.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return profiles;
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return [];
  }
};

// Get a specific user profile
export const getUserProfile = async (userId) => {
  try {
    const profileRef = doc(db, "profiles", userId);
    const profileSnap = await getDoc(profileRef);
    
    if (profileSnap.exists()) {
      return {
        id: profileSnap.id,
        ...profileSnap.data(),
      };
    } else {
      console.log("No such profile!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
};

// Save rating for a profile
export const saveRating = async (fromUserId, toUserId, rating) => {
  try {
    await addDoc(collection(db, "ratings"), {
      fromUser: fromUserId,
      toUser: toUserId,
      rating: rating, // 1-5 stars
      timestamp: serverTimestamp(),
    });
    console.log(`Rated user ${toUserId} with ${rating} stars`);
    return true;
  } catch (error) {
    console.error("Error saving rating:", error);
    return false;
  }
};

// Get average rating for a user
export const getAverageRating = async (userId) => {
  try {
    console.log(`Fetching ratings WHERE toUser == "${userId}"`);
    const q = query(collection(db, "ratings"), where("toUser", "==", userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`No ratings found for user ${userId}`);
      return { average: 0, count: 0 };
    }
    
    let totalRating = 0;
    let count = 0;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Rating from ${data.fromUser}: ${data.rating} stars`);
      totalRating += data.rating;
      count++;
    });
    
    const average = totalRating / count;
    console.log(`Average: ${average.toFixed(1)} from ${count} ratings`);
    return { average: average.toFixed(1), count };
  } catch (error) {
    console.error("Error getting average rating:", error);
    return { average: 0, count: 0 };
  }
};

// Save swipe action (like/pass)
export const saveSwipeAction = async (currentUserId, targetUserId, action) => {
  try {
    await addDoc(collection(db, "swipes"), {
      fromUser: currentUserId,
      toUser: targetUserId,
      action: action, // "like" or "pass"
      timestamp: serverTimestamp(),
    });
    
    // Check for match (if both users liked each other)
    const matchQuery = query(
      collection(db, "swipes"),
      where("fromUser", "==", targetUserId),
      where("toUser", "==", currentUserId),
      where("action", "==", "like")
    );
    
    const matchSnapshot = await getDocs(matchQuery);
    if (!matchSnapshot.empty && action === "like") {
      // It's a match!
      await addDoc(collection(db, "matches"), {
        users: [currentUserId, targetUserId],
        timestamp: serverTimestamp(),
      });
      console.log("🎉 It's a match!");
      return { match: true };
    }
    
    return { match: false };
  } catch (error) {
    console.error("Error saving swipe:", error);
    return { match: false };
  }
};

// Delete a specific profile
export const deleteProfile = async (userId) => {
  try {
    await deleteDoc(doc(db, "profiles", userId));
    console.log(`Profile ${userId} deleted successfully`);
    return true;
  } catch (error) {
    console.error("Error deleting profile:", error);
    return false;
  }
};

// Delete all ratings for a user (both given and received)
export const deleteUserRatings = async (userId) => {
  try {
    // Delete ratings TO this user
    const ratingsToUser = query(collection(db, "ratings"), where("toUser", "==", userId));
    const toSnapshot = await getDocs(ratingsToUser);
    const deleteToPromises = toSnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    // Delete ratings FROM this user
    const ratingsFromUser = query(collection(db, "ratings"), where("fromUser", "==", userId));
    const fromSnapshot = await getDocs(ratingsFromUser);
    const deleteFromPromises = fromSnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    await Promise.all([...deleteToPromises, ...deleteFromPromises]);
    console.log(`All ratings for ${userId} deleted`);
    return true;
  } catch (error) {
    console.error("Error deleting ratings:", error);
    return false;
  }
};

// Delete a user's complete data (profile, ratings, swipes, matches)
export const deleteUserCompletely = async (userId) => {
  try {
    // Delete profile
    await deleteProfile(userId);
    
    // Delete ratings
    await deleteUserRatings(userId);
    
    // Delete swipes
    const swipesQuery = query(collection(db, "swipes"), where("fromUser", "==", userId));
    const swipesSnapshot = await getDocs(swipesQuery);
    const deleteSwipesPromises = swipesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deleteSwipesPromises);
    
    // Delete matches
    const matchesQuery = query(collection(db, "matches"), where("users", "array-contains", userId));
    const matchesSnapshot = await getDocs(matchesQuery);
    const deleteMatchesPromises = matchesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deleteMatchesPromises);
    
    console.log(`All data for ${userId} deleted completely`);
    return true;
  } catch (error) {
    console.error("Error deleting user completely:", error);
    return false;
  }
};

// Search for a user by userId
export const searchUserById = async (userId) => {
  try {
    const profileRef = doc(db, "profiles", userId);
    const profileSnap = await getDoc(profileRef);
    
    if (profileSnap.exists()) {
      return {
        userId: profileSnap.id,
        ...profileSnap.data(),
      };
    }
    return null;
  } catch (error) {
    console.error("Error searching user:", error);
    return null;
  }
};

// Send a duo request
export const sendDuoRequest = async (fromUserId, toUserId) => {
  try {
    // Check if request already exists
    const existingQuery = query(
      collection(db, "duoRequests"),
      where("fromUser", "==", fromUserId),
      where("toUser", "==", toUserId),
      where("status", "==", "pending")
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      console.log("Duo request already sent");
      return { success: false, message: "Request already sent" };
    }
    
    await addDoc(collection(db, "duoRequests"), {
      fromUser: fromUserId,
      toUser: toUserId,
      status: "pending", // pending, accepted, declined
      timestamp: serverTimestamp(),
    });
    
    console.log(`Duo request sent from ${fromUserId} to ${toUserId}`);
    return { success: true, message: "Duo request sent!" };
  } catch (error) {
    console.error("Error sending duo request:", error);
    return { success: false, message: "Failed to send request" };
  }
};

// Get incoming duo requests for a user
export const getIncomingDuoRequests = async (userId) => {
  try {
    const q = query(
      collection(db, "duoRequests"),
      where("toUser", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    
    const requests = [];
    for (const doc of querySnapshot.docs) {
      const requestData = doc.data();
      
      // Check if a duo already exists between these users
      const fromUser = requestData.fromUser;
      const duoExists = await checkIfDuoExists(userId, fromUser);
      
      if (duoExists) {
        // Duo already exists, delete this stale request
        console.log(`Cleaning up stale request ${doc.id} - duo already exists`);
        await deleteDoc(doc.ref);
        continue; // Skip adding to requests list
      }
      
      // Get the sender's profile info
      const senderProfile = await getUserProfile(requestData.fromUser);
      requests.push({
        id: doc.id,
        fromUser: requestData.fromUser,
        senderName: senderProfile?.name || "Unknown",
        timestamp: requestData.timestamp,
      });
    }
    
    return requests;
  } catch (error) {
    console.error("Error getting duo requests:", error);
    return [];
  }
};

// Check if duo exists between two users
const checkIfDuoExists = async (user1Id, user2Id) => {
  try {
    const duosRef = collection(db, "duos");
    const q1 = query(duosRef, where("users", "array-contains", user1Id));
    const snapshot = await getDocs(q1);
    
    for (const doc of snapshot.docs) {
      const duoData = doc.data();
      if (duoData.users.includes(user2Id)) {
        return true; // Duo exists
      }
    }
    
    return false;
  } catch (error) {
    console.error("Error checking duo exists:", error);
    return false;
  }
};

// Accept a duo request
export const acceptDuoRequest = async (requestId, fromUserId, toUserId) => {
  try {
    // Create duo partnership
    await addDoc(collection(db, "duos"), {
      users: [fromUserId, toUserId],
      createdAt: serverTimestamp(),
    });
    
    // Delete the request after accepting (clean up)
    const requestRef = doc(db, "duoRequests", requestId);
    await deleteDoc(requestRef);
    
    console.log(`Duo created between ${fromUserId} and ${toUserId}, request deleted`);
    return true;
  } catch (error) {
    console.error("Error accepting duo request:", error);
    return false;
  }
};

// Decline a duo request
export const declineDuoRequest = async (requestId) => {
  try {
    // Delete the request instead of just marking as declined
    await deleteDoc(doc(db, "duoRequests", requestId));
    console.log("Duo request declined and deleted");
    return true;
  } catch (error) {
    console.error("Error declining duo request:", error);
    return false;
  }
};

// Get outgoing duo requests (requests you sent)
export const getOutgoingDuoRequests = async (userId) => {
  try {
    const q = query(
      collection(db, "duoRequests"),
      where("fromUser", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    
    const requests = [];
    for (const doc of querySnapshot.docs) {
      const requestData = doc.data();
      // Get the recipient's profile info
      const recipientProfile = await getUserProfile(requestData.toUser);
      requests.push({
        id: doc.id,
        toUser: requestData.toUser,
        recipientName: recipientProfile?.name || "Unknown",
        timestamp: requestData.timestamp,
      });
    }
    
    return requests;
  } catch (error) {
    console.error("Error getting outgoing duo requests:", error);
    return [];
  }
};

// Cancel a duo request (delete it)
export const cancelDuoRequest = async (requestId) => {
  try {
    await deleteDoc(doc(db, "duoRequests", requestId));
    console.log("Duo request cancelled and deleted");
    return true;
  } catch (error) {
    console.error("Error cancelling duo request:", error);
    return false;
  }
};

// Get current duo partner
export const getCurrentDuoPartner = async (userId) => {
  try {
    const q = query(
      collection(db, "duos"),
      where("users", "array-contains", userId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    // Get the first duo (assuming one duo at a time)
    const duoData = querySnapshot.docs[0].data();
    const partnerId = duoData.users.find(id => id !== userId);
    
    if (partnerId) {
      const partnerProfile = await getUserProfile(partnerId);
      return {
        duoId: querySnapshot.docs[0].id,
        partnerId: partnerId,
        partnerName: partnerProfile?.name || "Unknown",
        partnerProfile: partnerProfile,
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error getting duo partner:", error);
    return null;
  }
};

// Get all duo pairs (excluding any duo that includes the current user)
export const getAllDuoPairs = async (currentUserId) => {
  try {
    console.log("Fetching all duo pairs...");
    
    // First, get the current user's duo
    const currentDuoQuery = query(
      collection(db, "duos"),
      where("users", "array-contains", currentUserId)
    );
    const currentDuoSnapshot = await getDocs(currentDuoQuery);
    let currentDuoId = null;
    
    if (!currentDuoSnapshot.empty) {
      currentDuoId = currentDuoSnapshot.docs[0].id;
      console.log("Current user's duo ID:", currentDuoId);
    } else {
      console.log("User not in a duo, showing all duos");
    }
    
    // Get all duo swipes - both ways (you swiped on them OR they swiped on you)
    let blockedDuoIds = [];
    if (currentDuoId) {
      // Get swipes WHERE you swiped on others
      const swipesQuery1 = query(
        collection(db, "duoSwipes"),
        where("fromDuoId", "==", currentDuoId)
      );
      const swipesSnapshot1 = await getDocs(swipesQuery1);
      const youSwipedOn = swipesSnapshot1.docs.map(doc => doc.data().toDuoId);
      
      // Get swipes WHERE others swiped on you
      const swipesQuery2 = query(
        collection(db, "duoSwipes"),
        where("toDuoId", "==", currentDuoId)
      );
      const swipesSnapshot2 = await getDocs(swipesQuery2);
      const othersSwipedOnYou = swipesSnapshot2.docs.map(doc => doc.data().fromDuoId);
      
      // Combine both lists (remove duplicates)
      blockedDuoIds = [...new Set([...youSwipedOn, ...othersSwipedOnYou])];
      console.log(`Blocked from seeing ${blockedDuoIds.length} duos (mutual filtering):`, blockedDuoIds);
    }
    
    const duosRef = collection(db, "duos");
    const querySnapshot = await getDocs(duosRef);
    
    console.log(`Total duos in database: ${querySnapshot.size}`);
    
    const duoPairs = [];
    
    for (const duoDoc of querySnapshot.docs) {
      const duoData = duoDoc.data();
      const [user1Id, user2Id] = duoData.users;
      
      console.log(`Checking duo: ${duoDoc.id} (${user1Id} & ${user2Id})`);
      
      // Skip if current user is in this duo
      if (user1Id === currentUserId || user2Id === currentUserId) {
        console.log(`Skipping duo (current user ${currentUserId} is in it)`);
        continue;
      }
      
      // Skip if already swiped (either direction)
      if (blockedDuoIds.includes(duoDoc.id)) {
        console.log(`Skipping duo ${duoDoc.id} (mutual swipe filtering)`);
        continue;
      }
      
      // Get both profiles
      console.log(`Fetching profiles for ${user1Id} and ${user2Id}...`);
      const profile1 = await getUserProfile(user1Id);
      const profile2 = await getUserProfile(user2Id);
      
      console.log(`Profile1 exists: ${!!profile1}, Profile2 exists: ${!!profile2}`);
      
      // Only include if both profiles exist
      if (profile1 && profile2) {
        duoPairs.push({
          duoId: duoDoc.id,
          user1: profile1,
          user2: profile2,
        });
        console.log(`Added duo pair: ${profile1.name} & ${profile2.name}`);
      }
    }
    
    console.log(`Found ${duoPairs.length} valid duo pairs (filtered out ${blockedDuoIds.length} blocked)`);
    return duoPairs;
  } catch (error) {
    console.error("Error fetching duo pairs:", error);
    return [];
  }
};

// Leave duo
export const leaveDuo = async (duoId) => {
  try {
    await deleteDoc(doc(db, "duos", duoId));
    console.log("Left duo successfully");
    return true;
  } catch (error) {
    console.error("Error leaving duo:", error);
    return false;
  }
};

// ===== DUO LIKE FUNCTIONS =====

// Save a duo swipe (like or pass) - prevents seeing the same duo again
export const saveDuoSwipe = async (fromDuoId, toDuoId, action) => {
  try {
    await addDoc(collection(db, "duoSwipes"), {
      fromDuoId: fromDuoId,
      toDuoId: toDuoId,
      action: action, // "like" or "pass"
      timestamp: serverTimestamp(),
    });
    
    console.log(`Duo ${fromDuoId} ${action}d duo ${toDuoId}`);
    return true;
  } catch (error) {
    console.error("Error saving duo swipe:", error);
    return false;
  }
};

// Save a duo like (when a duo likes another duo on the Dating screen)
export const saveDuoLike = async (fromDuoId, toDuoId, fromUser1Id, fromUser2Id, toUser1Id, toUser2Id) => {
  try {
    console.log("=== SAVE DUO LIKE DEBUG ===");
    console.log("From Duo ID:", fromDuoId);
    console.log("To Duo ID:", toDuoId);
    console.log("From User 1 (should auto-accept):", fromUser1Id);
    console.log("From User 2 (should auto-accept):", fromUser2Id);
    console.log("To User 1:", toUser1Id);
    console.log("To User 2:", toUser2Id);
    
    // Save the swipe first (so they won't see this duo again)
    await saveDuoSwipe(fromDuoId, toDuoId, "like");
    
    // Check if like already exists
    const existingQuery = query(
      collection(db, "duoLikes"),
      where("fromDuoId", "==", fromDuoId),
      where("toDuoId", "==", toDuoId)
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      console.log("Duo like already exists");
      return { success: false, message: "Already liked" };
    }

    // IMPORTANT: The sending duo (fromUser1 and fromUser2) should be auto-accepted
    const initialAcceptedBy = [fromUser1Id, fromUser2Id];
    console.log("Setting initial acceptedBy array:", initialAcceptedBy);
    
    // Store which users are from which duo for proper tracking
    const duoLikeData = {
      fromDuoId: fromDuoId,
      toDuoId: toDuoId,
      fromUser1: fromUser1Id,
      fromUser2: fromUser2Id,
      toUser1: toUser1Id,
      toUser2: toUser2Id,
      acceptedBy: initialAcceptedBy, // Both senders auto-accept
      timestamp: serverTimestamp(),
      status: "pending",
    };
    
    console.log("Creating duo like with data:", duoLikeData);
    
    await addDoc(collection(db, "duoLikes"), duoLikeData);

    console.log(`✅ Duo ${fromDuoId} liked duo ${toDuoId} - auto-accepted by ${fromUser1Id} and ${fromUser2Id}`);
    return { success: true, message: "Duo like sent!" };
  } catch (error) {
    console.error("Error saving duo like:", error);
    return { success: false, message: "Failed to send like" };
  }
};

// Get duo likes for a specific duo (incoming likes from other duos)
export const getDuoLikes = async (currentUserId, duoPartnerId) => {
  try {
    // Get the current user's duo
    const duoQuery = query(
      collection(db, "duos"),
      where("users", "array-contains", currentUserId)
    );
    const duoSnapshot = await getDocs(duoQuery);
    
    if (duoSnapshot.empty) {
      console.log("User not in a duo");
      return [];
    }

    const currentDuoId = duoSnapshot.docs[0].id;

    // Get all likes where this duo is the recipient
    const likesQuery = query(
      collection(db, "duoLikes"),
      where("toDuoId", "==", currentDuoId),
      where("status", "==", "pending")
    );
    const likesSnapshot = await getDocs(likesQuery);

    const likes = [];
    for (const doc of likesSnapshot.docs) {
      const likeData = doc.data();
      
      // Get profiles for the duo that liked you
      const user1Profile = await getUserProfile(likeData.fromUser1);
      const user2Profile = await getUserProfile(likeData.fromUser2);

      if (user1Profile && user2Profile) {
        likes.push({
          id: doc.id,
          fromDuoId: likeData.fromDuoId,
          toDuoId: likeData.toDuoId,
          user1: user1Profile,
          user2: user2Profile,
          acceptedBy: likeData.acceptedBy || [],
          timestamp: likeData.timestamp,
          status: likeData.status,
        });
      }
    }

    console.log(`Found ${likes.length} duo likes`);
    return likes;
  } catch (error) {
    console.error("Error getting duo likes:", error);
    return [];
  }
};

// Accept a duo like (add current user to acceptedBy array)
export const acceptDuoLike = async (likeId, userId, currentDuoId, fromDuoId) => {
  try {
    const likeRef = doc(db, "duoLikes", likeId);
    const likeSnap = await getDoc(likeRef);

    if (!likeSnap.exists()) {
      console.log("Like not found");
      return false;
    }

    const likeData = likeSnap.data();
    const acceptedBy = likeData.acceptedBy || [];

    console.log("=== ACCEPT DUO LIKE DEBUG ===");
    console.log("Current acceptedBy:", acceptedBy);
    console.log("User accepting:", userId);
    console.log("From duo users:", likeData.fromUser1, likeData.fromUser2);
    console.log("To duo users:", likeData.toUser1, likeData.toUser2);

    // Add current user to acceptedBy if not already there
    if (!acceptedBy.includes(userId)) {
      acceptedBy.push(userId);
      
      await updateDoc(likeRef, {
        acceptedBy: acceptedBy,
      });

      console.log(`User ${userId} accepted duo like ${likeId}`);
      console.log("Updated acceptedBy:", acceptedBy);

      // Check if ALL 4 users have accepted
      const allFourUsers = [
        likeData.fromUser1, 
        likeData.fromUser2, 
        likeData.toUser1, 
        likeData.toUser2
      ];
      
      console.log("All four users that need to accept:", allFourUsers);
      
      const allAccepted = allFourUsers.every(user => acceptedBy.includes(user));
      console.log("All 4 accepted?", allAccepted);

      if (allAccepted) {
        console.log("🎉 ALL 4 USERS ACCEPTED! Creating match...");
        
        // Full match! Update status
        await updateDoc(likeRef, {
          status: "accepted",
          matchedAt: serverTimestamp(),
        });

        // Get duo documents to get all users
        const fromDuo = await getDoc(doc(db, "duos", fromDuoId));
        const toDuo = await getDoc(doc(db, "duos", currentDuoId));
        
        const fromDuoUsers = fromDuo.data().users;
        const toDuoUsers = toDuo.data().users;
        const allUsers = [...fromDuoUsers, ...toDuoUsers];

        console.log("Creating match between duos with users:", allUsers);

        // Create a match record
        await addDoc(collection(db, "duoMatches"), {
          duo1: currentDuoId,
          duo2: fromDuoId,
          users: allUsers,
          timestamp: serverTimestamp(),
        });

        // Get all user profiles for the group chat
        const userProfiles = await Promise.all(
          allUsers.map(uid => getUserProfile(uid))
        );

        // Create group chat name
        const groupName = userProfiles
          .map(p => p?.name || "Unknown")
          .join(", ");

        console.log("Creating group chat:", groupName);

        // Create the group chat for all 4 users
        const chatId = await createGroupChat(allUsers, groupName, userProfiles);
        
        console.log("✅ Match and group chat created! Chat ID:", chatId);
      } else {
        console.log("Not all users accepted yet. Waiting for:", 
          allFourUsers.filter(user => !acceptedBy.includes(user))
        );
      }

      return true;
    }

    console.log("User already accepted");
    return true;
  } catch (error) {
    console.error("Error accepting duo like:", error);
    return false;
  }
};

// Create a group chat for matched duos
export const createGroupChat = async (userIds, groupName, userProfiles) => {
  try {
    // Create a unique chat ID
    const chatId = `duo_chat_${Date.now()}`;
    
    // Create the chat document with subcollection structure
    const chatRef = doc(db, "chats", chatId);
    
    await setDoc(chatRef, {
      participants: userIds,
      groupName: groupName,
      isGroupChat: true,
      createdAt: serverTimestamp(),
      lastMessageTime: serverTimestamp(),
      lastMessageText: "Group chat created! Say hi! 👋",
      unreadCount: userIds.reduce((acc, uid) => {
        acc[uid] = 0;
        return acc;
      }, {}),
    });

    // Add welcome message to the chat
    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: `Welcome to the group! ${groupName} - Let's plan a double date! 🎉`,
      createdAt: serverTimestamp(),
      user: {
        _id: "system",
        name: "System",
      },
    });

    console.log(`Group chat created: ${chatId} for users: ${userIds.join(", ")}`);
    return chatId;
  } catch (error) {
    console.error("Error creating group chat:", error);
    return null;
  }
};

// ===== NEW DELETE FUNCTIONS FOR DUO LIKES =====

// Delete a specific duo like/request
export const deleteDuoLike = async (likeId) => {
  try {
    await deleteDoc(doc(db, "duoLikes", likeId));
    console.log(`Duo like ${likeId} deleted successfully`);
    return true;
  } catch (error) {
    console.error("Error deleting duo like:", error);
    return false;
  }
};

// Delete all duo likes sent by a specific duo
export const deleteAllSentDuoLikes = async (duoId) => {
  try {
    const q = query(
      collection(db, "duoLikes"),
      where("fromDuoId", "==", duoId)
    );
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`Deleted ${querySnapshot.size} duo likes sent by duo ${duoId}`);
    return true;
  } catch (error) {
    console.error("Error deleting sent duo likes:", error);
    return false;
  }
};

// Delete all duo likes received by a specific duo
export const deleteAllReceivedDuoLikes = async (duoId) => {
  try {
    const q = query(
      collection(db, "duoLikes"),
      where("toDuoId", "==", duoId)
    );
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`Deleted ${querySnapshot.size} duo likes received by duo ${duoId}`);
    return true;
  } catch (error) {
    console.error("Error deleting received duo likes:", error);
    return false;
  }
};

// Reset acceptance status for a specific duo like (remove user from acceptedBy)
export const resetDuoLikeAcceptance = async (likeId, userId) => {
  try {
    const likeRef = doc(db, "duoLikes", likeId);
    const likeSnap = await getDoc(likeRef);
    
    if (!likeSnap.exists()) {
      console.log("Like not found");
      return false;
    }
    
    const likeData = likeSnap.data();
    const acceptedBy = likeData.acceptedBy || [];
    
    // Remove user from acceptedBy array
    const updatedAcceptedBy = acceptedBy.filter(id => id !== userId);
    
    await updateDoc(likeRef, {
      acceptedBy: updatedAcceptedBy,
      status: "pending", // Reset status to pending
    });
    
    console.log(`User ${userId} removed from acceptedBy for like ${likeId}`);
    return true;
  } catch (error) {
    console.error("Error resetting acceptance:", error);
    return false;
  }
};

// Delete a duo like between two specific duos (to allow re-requesting)
export const deleteDuoLikeBetween = async (fromDuoId, toDuoId) => {
  try {
    const q = query(
      collection(db, "duoLikes"),
      where("fromDuoId", "==", fromDuoId),
      where("toDuoId", "==", toDuoId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log("No duo like found between these duos");
      return false;
    }
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`Deleted duo like from ${fromDuoId} to ${toDuoId}`);
    return true;
  } catch (error) {
    console.error("Error deleting duo like between duos:", error);
    return false;
  }
};

// ===== RESET FUNCTIONS FOR TESTING =====

// Delete ALL duo likes (reset all requests)
export const deleteAllDuoLikes = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "duoLikes"));
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`Deleted ${querySnapshot.size} duo likes`);
    return { success: true, count: querySnapshot.size };
  } catch (error) {
    console.error("Error deleting all duo likes:", error);
    return { success: false, count: 0 };
  }
};

// Delete ALL duo swipes (reset swipe history) - THIS IS THE MISSING FUNCTION
export const deleteAllDuoSwipes = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "duoSwipes"));
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`Deleted ${querySnapshot.size} duo swipes`);
    return { success: true, count: querySnapshot.size };
  } catch (error) {
    console.error("Error deleting all duo swipes:", error);
    return { success: false, count: 0 };
  }
};

// Delete ALL duo matches
export const deleteAllDuoMatches = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "duoMatches"));
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`Deleted ${querySnapshot.size} duo matches`);
    return { success: true, count: querySnapshot.size };
  } catch (error) {
    console.error("Error deleting all duo matches:", error);
    return { success: false, count: 0 };
  }
};

// Delete ALL group chats created from duo matches
export const deleteAllDuoChats = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "chats"));
    const deletePromises = [];
    
    for (const chatDoc of querySnapshot.docs) {
      const chatData = chatDoc.data();
      // Only delete group chats (duo chats have isGroupChat: true)
      if (chatData.isGroupChat) {
        // Delete all messages in the chat first
        const messagesSnapshot = await getDocs(collection(db, "chats", chatDoc.id, "messages"));
        messagesSnapshot.docs.forEach(msgDoc => {
          deletePromises.push(deleteDoc(msgDoc.ref));
        });
        
        // Then delete the chat itself
        deletePromises.push(deleteDoc(chatDoc.ref));
      }
    }
    
    await Promise.all(deletePromises);
    
    console.log(`Deleted group chats and their messages`);
    return { success: true, count: deletePromises.length };
  } catch (error) {
    console.error("Error deleting duo chats:", error);
    return { success: false, count: 0 };
  }
};

// Delete a specific chat by ID
export const deleteChat = async (chatId) => {
  try {
    // Delete all messages in the chat first
    const messagesSnapshot = await getDocs(collection(db, "chats", chatId, "messages"));
    const deleteMessagesPromises = messagesSnapshot.docs.map(msgDoc => deleteDoc(msgDoc.ref));
    await Promise.all(deleteMessagesPromises);
    
    // Then delete the chat document itself
    await deleteDoc(doc(db, "chats", chatId));
    
    console.log(`Deleted chat ${chatId} and ${messagesSnapshot.size} messages`);
    return true;
  } catch (error) {
    console.error("Error deleting chat:", error);
    return false;
  }
};

// Master reset function - deletes ALL duo-related data
export const resetAllDuoData = async () => {
  try {
    const likes = await deleteAllDuoLikes();
    const matches = await deleteAllDuoMatches();
    const chats = await deleteAllDuoChats();
    
    console.log("Complete duo data reset finished");
    return {
      success: true,
      likesDeleted: likes.count,
      matchesDeleted: matches.count,
      chatsDeleted: chats.count,
    };
  } catch (error) {
    console.error("Error in master reset:", error);
    return {
      success: false,
      likesDeleted: 0,
      matchesDeleted: 0,
      chatsDeleted: 0,
    };
  }
};