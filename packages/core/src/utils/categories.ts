import type { PlaceCategory } from "../types/place";

export const foodCategories: PlaceCategory[] = ["food_drink", "restaurant", "quick_bites", "bar", "cafe"];
export const isFoodCategory = (category: PlaceCategory) => foodCategories.includes(category);

export const directoryCategories: Array<{ id: PlaceCategory; title: string; members: PlaceCategory[] }> = [
  { id: "food_drink", title: "Food & Drink", members: foodCategories },
  { id: "shops", title: "Shops", members: ["shops", "pharmacy", "hardware"] },
  { id: "automotive", title: "Cars & Garages", members: ["automotive", "petrol_station"] },
  { id: "public_services", title: "Public Services", members: ["public_services", "government_office"] },
  { id: "entertainment", title: "Entertainment", members: ["entertainment"] },
  { id: "sport_outdoors", title: "Sport & Outdoors", members: ["sport_outdoors"] }
];
