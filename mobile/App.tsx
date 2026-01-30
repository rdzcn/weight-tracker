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
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  const deleteWeight = async (id: number) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            setDeletingId(id);
            try {
              const response = await fetch(`http://localhost:8000/weight/${id}`, {
                method: 'DELETE',
              });
              if (!response.ok) {
                throw new Error('Failed to delete');
              }
              fetchWeights();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete weight entry');
            } finally {
              setDeletingId(null);
            }
          },
          style: 'destructive',
        },
      ]
    );
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${dayOfWeek}, ${day}/${month}/${year} ${hours}:${minutes}`;
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
        <View style={styles.buttonContainer}>
          <Button title="Take Photo" onPress={takePhoto} />
        </View>
        <View style={styles.buttonContainer}>
          <Button title="Select Photo" onPress={pickImage} />
        </View>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.itemContent}>
              <Text style={styles.itemWeight}>{item.weight} kg</Text>
              <Text style={styles.itemMethod}>({item.method === 'ocr' ? 'Photo' : 'Manual'})</Text>
              <Text style={styles.itemDate}>{formatDate(item.timestamp)}</Text>
            </View>
            <Button 
              title="Delete" 
              onPress={() => deleteWeight(item.id)}
              disabled={deletingId === item.id}
              color="#ff4444"
            />
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
    gap: 10,
  },
  buttonContainer: {
    flex: 1,
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemWeight: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  itemMethod: {
    fontSize: 12,
    color: '#666',
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});

