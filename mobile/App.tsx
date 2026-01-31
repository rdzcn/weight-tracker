import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, Button, FlatList, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:8000';

interface WeightEntry {
  id: number;
  weight: number;
  timestamp: string;
  method: string;
}

interface User {
  id: number;
  email: string;
  created_at: string;
}

// Auth helper functions
const getToken = async () => AsyncStorage.getItem('token');
const setToken = async (token: string) => AsyncStorage.setItem('token', token);
const removeToken = async () => AsyncStorage.removeItem('token');
const getUser = async (): Promise<User | null> => {
  const user = await AsyncStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};
const setUser = async (user: User) => AsyncStorage.setItem('user', JSON.stringify(user));
const removeUser = async () => AsyncStorage.removeItem('user');

const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = await getToken();
  const headers: HeadersInit = {
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
};

// Landing Page Component
function LandingPage({ onLogin }: { onLogin: (user: User, token: string) => void }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(false);

  useEffect(() => {
    // Handle deep linking for magic link verification
    const handleUrl = async (event: { url: string }) => {
      const { url } = event;
      const parsed = Linking.parse(url);
      
      if (parsed.path === 'auth/verify' && parsed.queryParams?.token) {
        verifyMagicLink(parsed.queryParams.token as string);
      }
    };

    // Check for initial URL (app opened via link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl({ url });
      }
    });

    // Listen for URL events while app is open
    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, []);

  const verifyMagicLink = async (token: string) => {
    setVerifyingToken(true);
    try {
      const response = await fetch(`${API_URL}/auth/verify?token=${token}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Verification failed');
      }
      const data = await response.json();
      onLogin(data.user, data.access_token);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to verify magic link');
    } finally {
      setVerifyingToken(false);
    }
  };

  const requestMagicLink = async () => {
    if (!email) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/request-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to send magic link');
      }
      
      setEmailSent(true);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send magic link');
    } finally {
      setIsLoading(false);
    }
  };

  if (verifyingToken) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Verifying your magic link...</Text>
      </View>
    );
  }

  if (emailSent) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>Check your email! 📧</Text>
        <Text style={styles.subtitle}>We sent a magic link to</Text>
        <Text style={styles.email}>{email}</Text>
        <Text style={styles.hint}>Click the link in the email to sign in. The link expires in 15 minutes.</Text>
        <Button title="Use a different email" onPress={() => setEmailSent(false)} />
      </View>
    );
  }

  return (
    <View style={styles.centerContainer}>
      <Text style={styles.title}>Weight Tracker</Text>
      <Text style={styles.subtitle}>Track your weight with manual entries or photos</Text>
      <TextInput
        style={styles.emailInput}
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!isLoading}
      />
      <View style={styles.fullWidthButton}>
        <Button 
          title={isLoading ? 'Sending...' : 'Send Magic Link'} 
          onPress={requestMagicLink}
          disabled={isLoading || !email}
        />
      </View>
      <Text style={styles.hint}>We'll email you a magic link to sign in. No password needed!</Text>
    </View>
  );
}

// Weight Tracker Component (Protected)
function WeightTrackerScreen({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [weight, setWeight] = useState('');
  const [data, setData] = useState<WeightEntry[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchWeights();
  }, []);

  const fetchWeights = async () => {
    try {
      const response = await authFetch(`${API_URL}/weights`);
      if (response.status === 401) {
        onLogout();
        return;
      }
      const weights = await response.json();
      setData(weights);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch weights');
    }
  };

  const submitWeight = async () => {
    if (!weight) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('weight', weight);
      await authFetch(`${API_URL}/weight`, {
        method: 'POST',
        body: formData,
      });
      setWeight('');
      fetchWeights();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit weight');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWeight = async (id: number) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            try {
              const response = await authFetch(`${API_URL}/weight/${id}`, {
                method: 'DELETE',
              });
              if (!response.ok) throw new Error('Failed to delete');
              fetchWeights();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete weight entry');
            } finally {
              setDeletingId(null);
            }
          },
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
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);

      await authFetch(`${API_URL}/weight`, {
        method: 'POST',
        body: formData,
      });
      fetchWeights();
      Alert.alert('Success', 'Weight extracted from photo!');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setIsLoading(false);
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
      <View style={styles.header}>
        <Text style={styles.title}>Weight Tracker</Text>
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.userEmail}>{user.email}</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Enter weight (kg)"
        value={weight}
        onChangeText={setWeight}
        keyboardType="numeric"
        editable={!isLoading}
      />
      <Button title={isLoading ? 'Submitting...' : 'Submit'} onPress={submitWeight} disabled={isLoading || !weight} />
      
      <View style={styles.buttonRow}>
        <View style={styles.buttonContainer}>
          <Button title="Take Photo" onPress={takePhoto} disabled={isLoading} />
        </View>
        <View style={styles.buttonContainer}>
          <Button title="Select Photo" onPress={pickImage} disabled={isLoading} />
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
        ListEmptyComponent={
          <Text style={styles.emptyText}>No entries yet</Text>
        }
      />
      <StatusBar style="auto" />
    </View>
  );
}

// Root App Component
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check for stored auth on mount
    const checkAuth = async () => {
      const token = await getToken();
      const storedUser = await getUser();
      
      if (token && storedUser) {
        setUser(storedUser);
      }
      setIsInitialized(true);
    };
    
    checkAuth();
  }, []);

  const handleLogin = async (user: User, token: string) => {
    await setToken(token);
    await setUser(user);
    setUser(user);
  };

  const handleLogout = async () => {
    await removeToken();
    await removeUser();
    setUser(null);
  };

  if (!isInitialized) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!user) {
    return <LandingPage onLogin={handleLogin} />;
  }

  return <WeightTrackerScreen user={user} onLogout={handleLogout} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  email: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    marginBottom: 12,
    fontSize: 16,
  },
  fullWidthButton: {
    width: '100%',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 10,
    gap: 10,
  },
  buttonContainer: {
    flex: 1,
  },
  item: {
    padding: 12,
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
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
});