// UserConfig.js
// This file will hold the UID of the currently logged-in user.

export let CURRENT_USER_ID = null;

export const setCurrentUserId = (uid) => {
  CURRENT_USER_ID = uid;
  //console.log(`Current user ID set to: ${CURRENT_USER_ID}`);
};

// Instructions for testing:
// 1. To test as a different user, just change the value above
// 2. Save the file
// 3. Reload your app
// 4. All screens will automatically use the new user ID

// Example users for testing:
// - "user123" - Your main test account
// - "user456" - Second test account
// - "user789" - Third test account

// Login users accounts for testing
// - abc123@tester.ca | PW: 123abc
// - matt@gmail.ca | Pw: 1234567
