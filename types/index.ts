// types.ts or add to your existing types file

export type Gender = "male" | "female" | "non-binary";

export interface DuoPreference {
  interestedIn: Gender[];
}

export interface UserProfile {
  uid: string;
  userId?: string;
  email?: string;
  name: string;
  age?: number;
  gender?: Gender;
  bio?: string;
  photos?: string[];
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
  };
  duoPartnerId?: string;
  duoPreference?: DuoPreference;
  createdAt?: any;
  updatedAt?: any;
}

// Helper function to get gender color
export const getGenderColor = (gender: Gender): string => {
  switch (gender) {
    case "male":
      return "#4A90E2"; // Blue
    case "female":
      return "#FF69B4"; // Pink
    case "non-binary":
      return "#9B59B6"; // Purple
    default:
      return "#95A5A6"; // Gray
  }
};

// Helper function to get gender label
export const getGenderLabel = (gender: Gender): string => {
  switch (gender) {
    case "male":
      return "Male";
    case "female":
      return "Female";
    case "non-binary":
      return "Non-Binary";
    default:
      return "Other";
  }
};
