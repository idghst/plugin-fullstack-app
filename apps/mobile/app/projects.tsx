import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { ApiError } from '@starter/api-client';
import type { Project } from '@starter/contracts';
import { api, message, useSession } from '../src/session';
import { Action, Field, Loading, colors, styles } from '../src/components';
export default function Projects() {
  const session = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [target, setTarget] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setProjects((await api.project.list()).items);
  }, []);
  useEffect(() => {
    if (session.user)
      void load()
        .catch((error) => setError(message(error)))
        .finally(() => setLoading(false));
  }, [session.user, load]);
  if (!session.ready) return <Loading />;
  if (!session.user) return <Redirect href="/sign-in" />;
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (error) {
      setError(message(error));
      if (error instanceof ApiError && error.status === 401) session.expire();
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    setName('');
    setDescription('');
    setEditing(null);
  }
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={busy}
              onRefresh={() => void run(load)}
              tintColor={colors.green}
            />
          }
        >
          <View style={styles.row}>
            <Text style={[styles.brand, { marginBottom: 0 }]}>↗ Project Studio</Text>
            <Action
              title="Sign out"
              secondary
              disabled={busy}
              onPress={() => void run(session.signOut)}
            />
          </View>
          <Text style={[styles.muted, { marginTop: 12, marginBottom: 30 }]}>
            {session.user.email}
          </Text>
          <Text style={styles.eyebrow}>YOUR WORKSPACE</Text>
          <Text style={styles.title}>Ideas, moving forward.</Text>
          <Text style={styles.subtitle}>Start small. Build something good.</Text>
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {editing ? 'Edit project' : 'Create something new'}
            </Text>
            <Field
              label="Project name"
              placeholder="A name for your idea"
              value={name}
              onChangeText={setName}
              maxLength={100}
              editable={!busy}
            />
            <Field
              label="Description"
              placeholder="What are you working toward?"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={2000}
              editable={!busy}
            />
            <Action
              title={busy ? 'Saving…' : editing ? 'Save changes' : 'Create project'}
              disabled={busy || !name.trim()}
              onPress={() =>
                void run(async () => {
                  if (editing)
                    await api.project.update(editing, {
                      name: name.trim(),
                      description: description.trim(),
                    });
                  else
                    await api.project.create({
                      name: name.trim(),
                      description: description.trim(),
                    });
                  await load();
                  reset();
                })
              }
            />
            {editing ? (
              <View style={{ marginTop: 10 }}>
                <Action title="Cancel" secondary onPress={reset} disabled={busy} />
              </View>
            ) : null}
          </View>
          <View style={[styles.row, { marginBottom: 18 }]}>
            <Text style={[styles.cardTitle, { marginBottom: 0 }]}>
              All projects · {projects.length}
            </Text>
            <Action title="Refresh" secondary disabled={busy} onPress={() => void run(load)} />
          </View>
          {loading ? (
            <ActivityIndicator color={colors.green} />
          ) : projects.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.empty}>
                A blank canvas, for now.{'\n'}Create your first project above.
              </Text>
            </View>
          ) : (
            projects.map((project) => (
              <View style={styles.card} key={project.id}>
                <Text style={styles.projectTitle}>{project.name}</Text>
                <Text style={styles.description}>
                  {project.description || 'No description yet.'}
                </Text>
                <Text style={styles.muted}>
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </Text>
                <View style={styles.actions}>
                  <Action
                    title="Edit"
                    label={`Edit ${project.name}`}
                    secondary
                    disabled={busy}
                    onPress={() =>
                      void run(async () => {
                        const detail = await api.project.get(project.id);
                        setEditing(detail.id);
                        setName(detail.name);
                        setDescription(detail.description);
                      })
                    }
                  />
                  <Action
                    title="Delete"
                    label={`Delete ${project.name}`}
                    secondary
                    disabled={busy}
                    onPress={() => {
                      setError('');
                      setTarget(project);
                    }}
                  />
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        visible={!!target}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setTarget(null);
        }}
      >
        <View
          style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#13291fa6' }}
        >
          <View accessibilityViewIsModal style={styles.card}>
            <Text style={styles.cardTitle}>Delete project?</Text>
            <Text style={styles.description}>“{target?.name}” will be permanently deleted.</Text>
            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
            <Action
              title="Confirm delete"
              destructive
              disabled={busy}
              onPress={() => {
                if (target)
                  void run(async () => {
                    await api.project.delete(target.id);
                    await load();
                    if (editing === target.id) reset();
                    setTarget(null);
                  });
              }}
            />
            <View style={{ marginTop: 10 }}>
              <Action title="Cancel" secondary disabled={busy} onPress={() => setTarget(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
