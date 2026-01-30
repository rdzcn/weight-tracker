import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, Button, FlatList, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface WeightEntry {
  id: number;
  weight: number;
  timestamp: string;
  method: string;
}

export default function App() {
  const [weight, setWeight] = useState('');
  const [data, setData] = useState<WeightEntry[]>([]);

  useEffect(() => {
    fetchWeights();
  }, []);

  const fetchWeights = async () => {
    try {
      const response = await fetch('http://localhost:8000/weights');
      const weights = await response.json();
      setData(weights);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch weights');
    }
  };

  const submitWeight = async () => {
    if (!weight) return;
    try {
      const formData = new FormData();
      formData.append('weight', weight);
      await fetch('http://localhost:8000/weight', {
        method: 'POST',
        body: formData,
      });
      setWeight('');
      fetchWeights();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit weight');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera roll permissions are required to select photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permissions are required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0]);
    }
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);

      await fetch('http://localhost:8000/weight', {
        method: 'POST',
        body: formData,
      });
      fetchWeights();
      Alert.alert('Success', 'Weight extracted from photo!');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weight Tracker</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter weight"
        value={weight}
        onChangeText={setWeight}
        keyboardType="numeric"
      />
      <Button title="Submit" onPress={submitWeight} />
      <View style={styles.buttonRow}>
        <Button title="Take Photo" onPress={takePhoto} />
        <Button title="Select Photo" onPress={pickImage} />
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item.weight} kg - {new Date(item.timestamp).toLocaleDateString()}</Text>
          </View>
        )}
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
