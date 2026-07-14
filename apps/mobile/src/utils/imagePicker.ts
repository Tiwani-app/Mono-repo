import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

// Opens the photo library and returns a downscaled JPEG ready for upload,
// or null when the user cancels or denies photo access.
export const pickResizedImage = async (
  maxWidth = 1024,
): Promise<{ uri: string } | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Photo access needed",
      "Allow photo library access to choose an image.",
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.9,
  });
  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  const targetWidth = Math.min(asset.width || maxWidth, maxWidth);
  const rendered = await ImageManipulator.manipulate(asset.uri)
    .resize({ width: targetWidth })
    .renderAsync();
  const saved = await rendered.saveAsync({
    compress: 0.8,
    format: SaveFormat.JPEG,
  });
  return { uri: saved.uri };
};
