// UserConfig.js
// This file will hold the UID of the currently logged-in user.

export let CURRENT_USER_ID = null;

export const setCurrentUserId = (uid) => {
  CURRENT_USER_ID = uid;
  //console.log(`Current user ID set to: ${CURRENT_USER_ID}`);
};

