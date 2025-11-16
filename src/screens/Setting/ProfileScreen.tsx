import React, { useEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Image, Alert, ScrollView } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  // Fetch user data
  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('accessToken');
      const storedUser = await SecureStore.getItemAsync('user');
      const senderId = storedUser ? JSON.parse(storedUser).userId : null;
      if (!senderId || !token) return;
      const url = `${process.env.EXPO_PUBLIC_URL}/communication/get-user-by-id?Id=${senderId}`
      console.log("url", url)
      try {
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('user', res.data);
        setUser({
          ...res.data,
          phoneNo: res.data.phoneNumber || '',
          address: res.data.address || '',
        });
        setImage(res.data.profileImage || null);
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to load profile');
      }
    })();
  }, []);

  // Pick Image
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // Update Profile
  const handleUpdate = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync('accessToken');
      const storedUser = await SecureStore.getItemAsync('user');
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      const senderId = parsedUser?.userId || parsedUser?.id;

      const formData = new FormData();
      formData.append('userId', senderId ?? '');
      formData.append('phoneNo', user.phoneNo ?? '');
      formData.append('address', user.address ?? '');

      if (image && !image.startsWith('http')) {
        formData.append('profileImage', {
          uri: image,
          type: 'image/jpeg',
          name: 'profile.jpg',
        });
      }

      console.log('Final FormData values:', {
        userId: senderId,
        phoneNo: user.phoneNo,
        address: user.address,
      });
      const url = `${process.env.EXPO_PUBLIC_URL}/users/update-profile`
      console.log("handle url", url)
      const res = await axios.patch(url, formData, {
      headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
            Accept: "*/*",
          },
      });

      if (res.status === 200) {
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <Text style={{ textAlign: 'center', marginTop: 50 }}>Loading...</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.profileImage} />
        ) : (
          <Ionicons name="person-circle-outline" size={120} color="#ccc" />
        )}
        <Text style={styles.changePhotoText}>Change Photo</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        placeholderTextColor="#757575"
        value={user.phoneNo}
        onChangeText={(text) => setUser({ ...user, phoneNo: text })}
      />

      <TextInput
        style={styles.input}
        placeholder="Address"
        placeholderTextColor="#757575"
        value={user.address}
        onChangeText={(text) => setUser({ ...user, address: text })}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleUpdate} disabled={loading}>
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8E8E8',
  },
  changePhotoText: {
    color: '#6A5ACD',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    width: '90%',
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginVertical: 8,
    backgroundColor: '#FFFFFF',
    color: '#000000',
    fontSize: 15,
  },
  saveButton: {
    marginTop: 25,
    backgroundColor: '#B39DDB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    width: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
