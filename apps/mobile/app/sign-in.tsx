import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useSession, message } from '../src/session';
import { Action, Field, Loading, styles } from '../src/components';
export default function SignIn() {
  const session = useSession();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!session.ready) return <Loading />;
  if (session.user) return <Redirect href="/projects" />;
  async function submit() {
    if (!email.includes('@') || password.length < 12) {
      setError('Enter a valid email and a password with at least 12 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await session.signIn(email, password, register);
      setPassword('');
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={styles.brand}>↗ Project Studio</Text>
          <Text style={styles.eyebrow}>MAKE ROOM FOR GOOD IDEAS</Text>
          <Text style={styles.title}>Your next great project.</Text>
          <Text style={styles.subtitle}>
            A calm place to organize what you’re building, wherever you work.
          </Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{register ? 'A fresh start' : 'Welcome back'}</Text>
            {error || session.startupError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error || session.startupError}
              </Text>
            ) : null}
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="you@example.com"
              editable={!busy}
              maxLength={254}
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={register ? 'new-password' : 'current-password'}
              placeholder="At least 12 characters"
              editable={!busy}
              maxLength={128}
            />
            <Action
              title={busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
              onPress={() => void submit()}
              disabled={busy}
            />
            <View style={{ marginTop: 12 }}>
              <Action
                title={register ? 'Back to sign in' : 'Sign up'}
                secondary
                onPress={() => {
                  setRegister(!register);
                  setError('');
                }}
                disabled={busy}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
